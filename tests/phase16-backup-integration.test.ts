import { randomUUID } from "node:crypto"
import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"

import { BackupImportDestinationProjectError } from "../electron/backup/backup-import-service"
import { createBackupImportSessionStore } from "../electron/backup/backup-session-store"
import {
  type BackupValidationError,
  createBackupValidationService,
} from "../electron/backup/backup-validation-service"
import { DEFAULT_HARNESS_TEMPLATE_IDS } from "../electron/db/default-harness-templates"
import {
  type BackupExportTestScenario,
  backupImportCounts,
  cleanupBackupTestResources,
  createBackupImportTestDatabase,
  createFakeBackupNative,
  createTempBackupFile,
  exportBackupScenario,
  integrationBackupImportInput,
  prepareBackupImportScenario,
  rawReviewTexts,
  reopenBackupImportTestDatabase,
  seedBackupDatabase,
} from "./phase16-backup-test-helpers"

// allow: SIZE_OK - one cross-layer suite proves all five backup envelopes through the same services.
const forbiddenExportText = [
  "phase16-secret-value",
  "maskedKey",
  "secretStatus",
  "keyStatus",
] as const
const importedAssetSchema = z.object({ id: z.string(), projectId: z.string().nullable() })
const importedReviewSchema = z.object({
  dimensionScores: z.string(),
  strengths: z.string(),
  issues: z.string(),
  suggestions: z.string(),
  missingSections: z.string(),
  warnings: z.string(),
  recommendedClarifyingQuestions: z.string(),
  snapshot: z.string(),
})

afterEach(async () => {
  await cleanupBackupTestResources()
})

async function exportSafeBackup(scenario: BackupExportTestScenario) {
  scenario.database.sqlite.exec(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('integration-secret', 'phase16-secret-value maskedKey secretStatus keyStatus', 1)",
  )
  const exported = await exportBackupScenario(scenario)
  const databasePath = z
    .object({ file: z.string() })
    .parse(scenario.database.sqlite.prepare("PRAGMA database_list").get()).file
  expect(exported.text).not.toContain('"settings"')
  expect(exported.text).not.toContain(exported.filePath)
  expect(exported.text).not.toContain(databasePath)
  for (const forbidden of forbiddenExportText) {
    expect(exported.text).not.toContain(forbidden)
  }
  return exported
}

describe("Phase 16 backup export, validation, and import integration", () => {
  it("round-trips a full backup with searchable byte-exact reviews after restart", async () => {
    // Given: every supported source entity exported to an OS-temp backup file.
    const source = await createBackupImportTestDatabase()
    const fixture = seedBackupDatabase(source)
    const target = await createBackupImportTestDatabase()
    const exported = await exportSafeBackup({ backupType: "full", database: source, fixture })
    const flow = await prepareBackupImportScenario(exported.filePath, target)

    // When: the validated preview imports and the destination database restarts.
    const result = await flow.service.importBackup(integrationBackupImportInput(flow.preview))
    const importedAssetId = result.createdPromptAssetIds[0]
    if (importedAssetId === undefined) {
      throw new TypeError("Expected an imported prompt asset")
    }
    const reopened = reopenBackupImportTestDatabase(target)

    // Then: current prompt search and raw review JSON survive the restart unchanged.
    expect(flow.preview.backupType).toBe("full")
    expect(
      reopened.services.searchPrompts({
        query: "Backup helper prompt",
        limit: 50,
        offset: 0,
        sortBy: "relevance",
        sortDirection: "desc",
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ promptAsset: expect.objectContaining({ id: importedAssetId }) }),
      ]),
    )
    expect(
      importedReviewSchema.parse(
        reopened.sqlite
          .prepare(
            "SELECT dimension_scores AS dimensionScores, strengths, issues, suggestions, missing_sections AS missingSections, warnings, recommended_clarifying_questions AS recommendedClarifyingQuestions, snapshot FROM prompt_quality_reviews INNER JOIN prompt_versions ON prompt_versions.id = prompt_quality_reviews.prompt_version_id WHERE prompt_versions.prompt_asset_id = ?",
          )
          .get(importedAssetId),
      ),
    ).toEqual(rawReviewTexts)
  })

  it("drops external project lineage with an import warning", async () => {
    // Given: a project backup whose prompt derives from a prompt outside the selected project.
    const source = await createBackupImportTestDatabase()
    const fixture = seedBackupDatabase(source)
    const externalProject = source.services.createProject({ name: "External lineage" })
    const externalPrompt = source.services.createPromptWithInitialVersion({
      projectId: externalProject.id,
      title: "External parent",
      scenario: "feature",
      targetAgent: "codex",
      originalInput: "parent",
      compiledPrompt: "parent",
    })
    source.sqlite
      .prepare(
        "UPDATE prompt_assets SET parent_prompt_id = ?, parent_prompt_version_id = ?, derivation_type = 'derived' WHERE id = ?",
      )
      .run(externalPrompt.asset.id, externalPrompt.version.id, fixture.promptAssetId)
    const target = await createBackupImportTestDatabase()
    const exported = await exportSafeBackup({ backupType: "project", database: source, fixture })
    const flow = await prepareBackupImportScenario(exported.filePath, target)

    // When: the selected project is imported without its external parent.
    const result = await flow.service.importBackup(integrationBackupImportInput(flow.preview))

    // Then: lineage is null and the consequence is explicit.
    expect(flow.preview.backupType).toBe("project")
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "external_reference_removed", entityType: "prompt_asset" }),
      ]),
    )
    expect(
      target.sqlite
        .prepare(
          "SELECT parent_prompt_id AS parentPromptId, parent_prompt_version_id AS parentPromptVersionId, derivation_type AS derivationType FROM prompt_assets WHERE title = 'Backup helper prompt'",
        )
        .get(),
    ).toEqual({ parentPromptId: null, parentPromptVersionId: null, derivationType: null })
  })

  it("requires an explicit prompt-pack destination before writing", async () => {
    // Given: a validated prompt asset pack and an existing destination project.
    const source = await createBackupImportTestDatabase()
    const fixture = seedBackupDatabase(source)
    const target = await createBackupImportTestDatabase()
    const destination = target.services.createProject({ name: "Pack destination" })
    const exported = await exportSafeBackup({
      backupType: "prompt_assets",
      database: source,
      fixture,
    })
    const flow = await prepareBackupImportScenario(exported.filePath, target)
    const before = backupImportCounts(target)

    // When: import is attempted without the preview-required destination.
    await expect(
      flow.service.importBackup(integrationBackupImportInput(flow.preview)),
    ).rejects.toBeInstanceOf(BackupImportDestinationProjectError)

    // Then: no row changes, and the same ready preview succeeds once a destination is explicit.
    expect(flow.preview.requiresDestinationProject).toBe(true)
    expect(backupImportCounts(target)).toEqual(before)
    const result = await flow.service.importBackup(
      integrationBackupImportInput(flow.preview, destination.id),
    )
    const imported = importedAssetSchema.parse(
      target.sqlite
        .prepare("SELECT id, project_id AS projectId FROM prompt_assets WHERE title = ?")
        .get("Backup helper prompt"),
    )
    expect(result.backupType).toBe("prompt_assets")
    expect(imported.projectId).toBe(destination.id)
  })

  it("nulls source references from an imported prompt-template pack", async () => {
    // Given: a template-only export that retains source IDs absent from the pack.
    const source = await createBackupImportTestDatabase()
    const fixture = seedBackupDatabase(source)
    const target = await createBackupImportTestDatabase()
    const exported = await exportSafeBackup({
      backupType: "prompt_templates",
      database: source,
      fixture,
    })
    const flow = await prepareBackupImportScenario(exported.filePath, target)

    // When: the validated template pack imports.
    const result = await flow.service.importBackup(integrationBackupImportInput(flow.preview))

    // Then: absent source references become null with an external-reference warning.
    expect(flow.preview.backupType).toBe("prompt_templates")
    expect(
      target.sqlite
        .prepare(
          "SELECT source_prompt_asset_id AS assetId, source_prompt_version_id AS versionId FROM prompt_templates WHERE template_body = '{{objective}}'",
        )
        .get(),
    ).toEqual({ assetId: null, versionId: null })
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "external_reference_removed",
          entityType: "prompt_template",
        }),
      ]),
    )
  })

  it("de-duplicates an exported default harness template by its built-in ID", async () => {
    // Given: a default harness pack exported from one installation into another fresh installation.
    const source = await createBackupImportTestDatabase()
    const fixture = seedBackupDatabase(source)
    const target = await createBackupImportTestDatabase()
    const exported = await exportSafeBackup({
      backupType: "harness_templates",
      database: source,
      fixture,
      harnessTemplateId: DEFAULT_HARNESS_TEMPLATE_IDS.feature,
    })
    const flow = await prepareBackupImportScenario(exported.filePath, target)
    const before = backupImportCounts(target)

    // When: the validated default harness pack imports.
    const result = await flow.service.importBackup(integrationBackupImportInput(flow.preview))

    // Then: the built-in row is reused, no duplicate is created, and the warning is explicit.
    expect(flow.preview.backupType).toBe("harness_templates")
    expect(result.createdHarnessTemplateIds).toEqual([])
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "default_harness_template_reused",
          sourceId: DEFAULT_HARNESS_TEMPLATE_IDS.feature,
        }),
      ]),
    )
    expect(backupImportCounts(target)).toEqual(before)
  })

  it.each(
    (
      ["full", "project", "prompt_assets", "prompt_templates", "harness_templates"] as const
    ).flatMap((backupType) => [
      { backupType, corruption: "forbidden key" as const },
      { backupType, corruption: "unsupported version" as const },
    ]),
  )("rejects $backupType with $corruption before database writes", async ({
    backupType,
    corruption,
  }) => {
    // Given: one real exported envelope corrupted at the file boundary.
    const source = await createBackupImportTestDatabase()
    const fixture = seedBackupDatabase(source)
    const target = await createBackupImportTestDatabase()
    const exported = await exportSafeBackup({ backupType, database: source, fixture })
    const invalid =
      corruption === "forbidden key"
        ? { ...exported.envelope, data: { ...exported.envelope.data, settings: [] } }
        : { ...exported.envelope, schemaVersion: 2 }
    const filePath = await createTempBackupFile(
      JSON.stringify(invalid),
      `${backupType}-invalid.json`,
    )
    const sessions = createBackupImportSessionStore({ now: () => 1_000, createId: randomUUID })
    const native = createFakeBackupNative({ openFilePath: filePath })
    const before = backupImportCounts(target)

    // When: strict validation parses the corrupted file.
    const promise = createBackupValidationService({
      native: native.native,
      sessions,
    }).validateBackupFile()

    // Then: validation rejects before any relational or FTS write.
    await expect(promise).rejects.toMatchObject({
      code: "invalid_envelope",
    } satisfies Partial<BackupValidationError>)
    expect(backupImportCounts(target)).toEqual(before)
  })
})
