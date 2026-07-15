import { randomUUID } from "node:crypto"
import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"

import {
  BackupImportDestinationProjectError,
  BackupImportPreviewMismatchError,
  BackupImportResolutionError,
  createBackupImportService,
} from "../electron/backup/backup-import-service"
import { createBackupImportSessionStore } from "../electron/backup/backup-session-store"
import {
  type BackupImportCheckpoint,
  backupImportCounts,
  backupImportInput,
  cleanupBackupTestResources,
  createBackupImportFailureInjector,
  createBackupImportSession,
  createBackupImportTestDatabase,
  fullEnvelopeWithMissingCurrentVersion,
  fullImportEnvelope,
  InjectedBackupTestFailure,
  importEnvelope,
  importFixtureIds,
  projectEnvelopeWithExternalLineage,
  rawReviewTexts,
} from "./phase16-backup-test-helpers"

// allow: SIZE_OK - one transactional import suite covers all required write and rollback boundaries.
const importedAssetSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
})
const reviewTextSchema = z.object({
  dimensionScores: z.literal(rawReviewTexts.dimensionScores),
  strengths: z.literal(rawReviewTexts.strengths),
  issues: z.literal(rawReviewTexts.issues),
  suggestions: z.literal(rawReviewTexts.suggestions),
  missingSections: z.literal(rawReviewTexts.missingSections),
  warnings: z.literal(rawReviewTexts.warnings),
  recommendedClarifyingQuestions: z.literal(rawReviewTexts.recommendedClarifyingQuestions),
  snapshot: z.literal(rawReviewTexts.snapshot),
})

afterEach(async () => {
  await cleanupBackupTestResources()
})

describe("Phase 16 backup import", () => {
  it("safe-duplicates a full backup, reuses tags, preserves review text, and indexes current prompts", async () => {
    // Given: name conflicts, a reusable tag, a searchable baseline, and a ready full-backup session.
    const database = await createBackupImportTestDatabase()
    const sessions = createBackupImportSessionStore({ now: () => 1_000, createId: randomUUID })
    const existingProject = database.services.createProject({ name: "Project" })
    const existingTag = database.services.createTag({ name: "shared" })
    database.services.createPromptTemplate({
      name: "Template",
      scenario: "feature",
      targetAgent: "codex",
      templateBody: "x",
    })
    database.services.createHarnessTemplate({
      name: "Harness",
      scenario: "feature",
      targetAgent: "codex",
      templateBody: "x",
    })
    database.services.createPromptWithInitialVersion({
      projectId: existingProject.id,
      title: "Baseline",
      scenario: "feature",
      targetAgent: "codex",
      originalInput: "baseline phrase",
      compiledPrompt: "baseline phrase",
    })
    const session = createBackupImportSession(sessions, fullImportEnvelope())
    const service = createBackupImportService({
      db: database.db,
      sqlite: database.sqlite,
      sessions,
    })

    // When: the trusted preview is imported with the only supported strategy.
    const result = await service.importBackup(backupImportInput(session.id))

    // Then: non-tag rows are new, raw review JSON is byte-preserved, and FTS can find the copy.
    const importedAsset = importedAssetSchema.parse(
      database.sqlite
        .prepare("SELECT id, project_id AS projectId FROM prompt_assets WHERE title = ?")
        .get("Imported search phrase"),
    )
    const rawReview = reviewTextSchema.parse(
      database.sqlite
        .prepare(
          "SELECT dimension_scores AS dimensionScores, strengths, issues, suggestions, missing_sections AS missingSections, warnings, recommended_clarifying_questions AS recommendedClarifyingQuestions, snapshot FROM prompt_quality_reviews INNER JOIN prompt_versions ON prompt_versions.id = prompt_quality_reviews.prompt_version_id WHERE prompt_versions.prompt_asset_id = ?",
        )
        .get(importedAsset.id),
    )
    const tagId = z
      .object({ tagId: z.string().uuid() })
      .parse(
        database.sqlite
          .prepare("SELECT tag_id AS tagId FROM prompt_tags WHERE prompt_asset_id = ?")
          .get(importedAsset.id),
      ).tagId
    expect(result).toMatchObject({ backupType: "full", searchIndexStatus: "updated" })
    expect(result.createdProjectIds).not.toContain(importFixtureIds.project)
    expect(result.createdPromptAssetIds).toEqual([importedAsset.id])
    expect(result.createdPromptTemplateIds).not.toContain(importFixtureIds.template)
    expect(result.createdHarnessTemplateIds).not.toContain(importFixtureIds.harness)
    expect(tagId).toBe(existingTag.id)
    expect(rawReview).toEqual(rawReviewTexts)
    expect(
      database.services.searchPrompts({
        query: "imported search phrase",
        limit: 50,
        offset: 0,
        sortBy: "relevance",
        sortDirection: "desc",
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ promptAsset: expect.objectContaining({ id: importedAsset.id }) }),
      ]),
    )
    expect(
      database.services.searchPrompts({
        query: "baseline phrase",
        limit: 50,
        offset: 0,
        sortBy: "relevance",
        sortDirection: "desc",
      }),
    ).toHaveLength(1)
    expect(sessions.getImportSession(session.id)?.status).toBe("consumed")
  })

  it.each([
    { name: "project", envelope: projectEnvelopeWithExternalLineage(), destination: false },
    { name: "prompt assets", envelope: importEnvelope("prompt_assets"), destination: true },
    { name: "prompt templates", envelope: importEnvelope("prompt_templates"), destination: false },
    {
      name: "harness templates",
      envelope: importEnvelope("harness_templates"),
      destination: false,
    },
  ])("imports a representative %s pack with its scoped resolution rules", async ({
    envelope,
    destination,
  }) => {
    // Given: a ready session for each supported pack and a destination project when required.
    const database = await createBackupImportTestDatabase()
    const sessions = createBackupImportSessionStore({ now: () => 1_000, createId: randomUUID })
    const destinationProject = database.services.createProject({ name: "Destination" })
    const session = createBackupImportSession(sessions, envelope)
    const service = createBackupImportService({
      db: database.db,
      sqlite: database.sqlite,
      sessions,
    })

    // When: each pack is imported through the same service boundary.
    const result = await service.importBackup(
      backupImportInput(session.id, destination ? destinationProject.id : undefined),
    )

    // Then: scoped rows are copied, project packs null external refs, and asset packs redirect projects.
    expect(result.backupType).toBe(envelope.backupType)
    if (envelope.backupType === "project") {
      const lineage = z
        .object({
          parentPromptId: z.string().nullable(),
          parentPromptVersionId: z.string().nullable(),
        })
        .parse(
          database.sqlite
            .prepare(
              "SELECT parent_prompt_id AS parentPromptId, parent_prompt_version_id AS parentPromptVersionId FROM prompt_assets WHERE title = ?",
            )
            .get("Imported search phrase"),
        )
      expect(lineage).toEqual({ parentPromptId: null, parentPromptVersionId: null })
      expect(result.warnings.length).toBeGreaterThan(0)
    }
    if (envelope.backupType === "prompt_assets") {
      const imported = importedAssetSchema.parse(
        database.sqlite
          .prepare("SELECT id, project_id AS projectId FROM prompt_assets WHERE title = ?")
          .get("Imported search phrase"),
      )
      expect(imported.projectId).toBe(destinationProject.id)
    }
    if (envelope.backupType === "prompt_templates") {
      const sources = z
        .object({ assetId: z.string().nullable(), versionId: z.string().nullable() })
        .parse(
          database.sqlite
            .prepare(
              "SELECT source_prompt_asset_id AS assetId, source_prompt_version_id AS versionId FROM prompt_templates WHERE template_body = ?",
            )
            .get("{{objective}}"),
        )
      expect(sources).toEqual({ assetId: null, versionId: null })
      expect(result.warnings.length).toBeGreaterThan(0)
    }
    if (envelope.backupType === "harness_templates") {
      expect(result.createdHarnessTemplateIds).not.toContain(importFixtureIds.harness)
    }
  })

  it.each<readonly [BackupImportCheckpoint]>([
    ["after_assets"],
    ["after_versions"],
    ["after_quality_reviews"],
    ["during_fts_update"],
  ])("rolls back data and FTS when %s fails after validation", async (checkpoint) => {
    // Given: a ready full import, existing searchable data, and one injected post-validation failure.
    const database = await createBackupImportTestDatabase()
    const sessions = createBackupImportSessionStore({ now: () => 1_000, createId: randomUUID })
    database.services.createPromptWithInitialVersion({
      projectId: null,
      title: "Baseline",
      scenario: "feature",
      targetAgent: "codex",
      originalInput: "baseline",
      compiledPrompt: "baseline",
    })
    const session = createBackupImportSession(sessions, fullImportEnvelope())
    const service = createBackupImportService({
      db: database.db,
      sqlite: database.sqlite,
      sessions,
      onWriteCheckpoint: createBackupImportFailureInjector(checkpoint),
    })
    const before = backupImportCounts(database)

    // When: the transaction reaches the configured failure point.
    await expect(service.importBackup(backupImportInput(session.id))).rejects.toBeInstanceOf(
      InjectedBackupTestFailure,
    )

    // Then: every table including FTS is unchanged and the post-validation session is consumed.
    expect(backupImportCounts(database)).toEqual(before)
    expect(sessions.getImportSession(session.id)?.status).toBe("consumed")
  })

  it("keeps pre-write destination, preview, and malformed-current failures retry-safe", async () => {
    // Given: prompt-asset and full sessions that fail before a transaction can begin.
    const database = await createBackupImportTestDatabase()
    const sessions = createBackupImportSessionStore({ now: () => 1_000, createId: randomUUID })
    const promptAssetsSession = createBackupImportSession(sessions, importEnvelope("prompt_assets"))
    const fullSession = createBackupImportSession(sessions, fullImportEnvelope())
    const malformedSession = createBackupImportSession(
      sessions,
      fullEnvelopeWithMissingCurrentVersion(),
    )
    const service = createBackupImportService({
      db: database.db,
      sqlite: database.sqlite,
      sessions,
    })
    const before = backupImportCounts(database)

    // When: destination, preview, and current-version validation fail before writes.
    await expect(
      service.importBackup(backupImportInput(promptAssetsSession.id)),
    ).rejects.toBeInstanceOf(BackupImportDestinationProjectError)
    await expect(
      service.importBackup(backupImportInput(promptAssetsSession.id, randomUUID())),
    ).rejects.toBeInstanceOf(BackupImportDestinationProjectError)
    await expect(
      service.importBackup({
        ...backupImportInput(fullSession.id),
        previewFingerprint: "b".repeat(64),
      }),
    ).rejects.toBeInstanceOf(BackupImportPreviewMismatchError)
    await expect(
      service.importBackup({ ...backupImportInput(fullSession.id), previewRevision: 2 }),
    ).rejects.toBeInstanceOf(BackupImportPreviewMismatchError)
    await expect(
      service.importBackup(backupImportInput(malformedSession.id)),
    ).rejects.toBeInstanceOf(BackupImportResolutionError)

    // Then: nothing is written and every failed pre-write session remains ready for a corrected retry.
    expect(backupImportCounts(database)).toEqual(before)
    expect(sessions.getImportSession(promptAssetsSession.id)?.status).toBe("ready")
    expect(sessions.getImportSession(fullSession.id)?.status).toBe("ready")
    expect(sessions.getImportSession(malformedSession.id)?.status).toBe("ready")
  })
})
