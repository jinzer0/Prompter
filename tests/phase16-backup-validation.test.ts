import { randomUUID } from "node:crypto"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"

import { createBackupImportSessionStore } from "../electron/backup/backup-session-store"
import type { BackupValidationError } from "../electron/backup/backup-validation-service"
import { openPrompterDatabase } from "../electron/db/connection"
import { DEFAULT_HARNESS_TEMPLATE_IDS } from "../electron/db/default-harness-templates"
import { BACKUP_FILE_MAX_BYTES, backupEnvelopeSchema } from "../electron/ipc-contract"
import { fullImportEnvelope, importFixtureIds } from "./phase16-backup-import-fixtures"
import "./phase16-backup-validation-preview-regression"
import {
  cleanupValidationDirectories,
  createHarness,
  fullEnvelope,
  projectId,
  promptAssetsEnvelope,
  tempDirectory,
} from "./phase16-backup-validation-fixtures"

const countSchema = z.object({ count: z.number() })

afterEach(async () => {
  await cleanupValidationDirectories()
})

describe("Phase 16 backup validation", () => {
  it("returns a renderer-safe preview with recomputed counts and no database writes", async () => {
    // Given: a selected valid backup and a temporary database with an existing project.
    const directory = await tempDirectory()
    const filePath = join(directory, "library.json")
    const database = openPrompterDatabase({
      databasePath: join(directory, "prompter.sqlite"),
      migrationsFolder: join(process.cwd(), "drizzle"),
    })
    database.sqlite.exec(
      `insert into projects (id, name, created_at, updated_at) values ('${projectId}', 'Existing', 1, 1)`,
    )
    await writeFile(filePath, JSON.stringify(fullEnvelope()), "utf8")

    try {
      const before = countSchema.parse(
        database.sqlite.prepare("select count(*) as count from projects").get(),
      )
      const harness = createHarness(filePath)

      // When: the main-process validation service opens and reads the backup through its native seam.
      const result = await harness.service.validateBackupFile()

      // Then: only preview data is returned, parsed row counts are authoritative, and the database is unchanged.
      const after = countSchema.parse(
        database.sqlite.prepare("select count(*) as count from projects").get(),
      )
      expect(result).toMatchObject({
        cancelled: false,
        preview: { backupType: "full", previewRevision: 1 },
      })
      if (result.cancelled) {
        throw new Error("Expected a validation preview")
      }
      expect(result.preview.itemCounts.projects).toBe(1)
      expect(result.preview.warnings.map((warning) => warning.code)).toContain(
        "metadata_counts_recomputed",
      )
      expect(result.preview.consequences.map((consequence) => consequence.code)).toContain(
        "safe_duplicate",
      )
      expect(Object.hasOwn(result.preview, "filePath")).toBe(false)
      expect(Object.hasOwn(result.preview, "data")).toBe(false)
      expect(harness.sessions.getImportSession(result.preview.importSessionId)).toMatchObject({
        createdAt: 1_000,
        expiresAt: 901_000,
        status: "ready",
        envelope: fullEnvelope(),
        resolutionPlan: { itemCounts: result.preview.itemCounts },
      })
      expect(harness.calls).toEqual({ opened: 1, sized: 1, read: 1 })
      expect(after).toEqual(before)
    } finally {
      database.close()
    }
  })

  it("requires a destination project for prompt asset backups", async () => {
    // Given: a selected prompt-asset pack.
    const directory = await tempDirectory()
    const filePath = join(directory, "prompts.json")
    await writeFile(filePath, JSON.stringify(promptAssetsEnvelope()), "utf8")

    // When: the pack is validated.
    const result = await createHarness(filePath).service.validateBackupFile()

    // Then: its preview requires the later explicit destination-project handoff.
    expect(result).toMatchObject({
      cancelled: false,
      preview: { requiresDestinationProject: true },
    })
    if (result.cancelled) {
      throw new Error("Expected a validation preview")
    }
    expect(result.preview.consequences).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "destination_project_required" })]),
    )
  })

  it("previews DB-backed conflicts, warnings, and preliminary resolution consequences", async () => {
    // Given: a full backup whose names, tag, default harness, and lineage overlap destination DB state.
    const directory = await tempDirectory()
    const filePath = join(directory, "conflicting-library.json")
    const database = openPrompterDatabase({
      databasePath: join(directory, "preview.sqlite"),
      migrationsFolder: join(process.cwd(), "drizzle"),
    })
    const source = fullImportEnvelope()
    const envelope = backupEnvelopeSchema.parse({
      ...source,
      data: {
        ...source.data,
        promptAssets: source.data.promptAssets.map((asset) => ({
          ...asset,
          parentPromptId: importFixtureIds.externalAsset,
          parentPromptVersionId: importFixtureIds.externalVersion,
          derivationType: "derived",
        })),
        harnessTemplates: source.data.harnessTemplates.map((template) => ({
          ...template,
          id: DEFAULT_HARNESS_TEMPLATE_IDS.feature,
        })),
      },
    })
    database.sqlite.exec(
      `insert into projects (id, name, created_at, updated_at) values ('aaaaaaaa-1111-4111-8111-111111111111', 'Project', 1, 1);` +
        `insert into tags (id, name, created_at) values ('aaaaaaaa-2222-4222-8222-222222222222', 'shared', 1);` +
        `insert into prompt_templates (id, name, scenario, target_agent, template_body, created_at, updated_at) values ('aaaaaaaa-3333-4333-8333-333333333333', 'Template', 'feature', 'codex', '{{existing}}', 1, 1);`,
    )
    await writeFile(filePath, JSON.stringify(envelope), "utf8")

    try {
      const harness = createHarness(filePath, database.db)

      // When: validation creates a read-only import session before import starts.
      const result = await harness.service.validateBackupFile()

      // Then: the preview contains preliminary resolution evidence from destination DB context.
      if (result.cancelled) {
        throw new Error("Expected a validation preview")
      }
      expect(result.preview.conflicts.map((conflict) => conflict.code)).toEqual(
        expect.arrayContaining(["project_name_conflict", "prompt_template_name_conflict"]),
      )
      expect(result.preview.conflicts[0]?.resolution).toEqual(expect.any(String))
      expect(result.preview.warnings.map((warning) => warning.code)).toEqual(
        expect.arrayContaining(["external_reference_removed", "default_harness_template_reused"]),
      )
      expect(result.preview.consequences.map((consequence) => consequence.code)).toContain(
        "existing_tags_reused",
      )
    } finally {
      database.close()
    }
  })

  it("returns cancellation without sizing or reading when the open dialog is cancelled", async () => {
    // Given: an open dialog without a selected file.
    const harness = createHarness()

    // When: validation is requested.
    const result = await harness.service.validateBackupFile()

    // Then: no file access occurs and the typed cancellation result is returned.
    expect(result).toEqual({ cancelled: true })
    expect(harness.calls).toEqual({ opened: 1, sized: 0, read: 0 })
  })

  it("rejects invalid JSON before creating an import session", async () => {
    // Given: a selected malformed JSON file.
    const directory = await tempDirectory()
    const filePath = join(directory, "invalid.json")
    await writeFile(filePath, "{ invalid", "utf8")
    const harness = createHarness(filePath)

    // When: validation parses the file boundary.
    const promise = harness.service.validateBackupFile()

    // Then: the failure is typed and no session exists.
    await expect(promise).rejects.toMatchObject({
      code: "invalid_json",
    } satisfies Partial<BackupValidationError>)
  })

  it("rejects files over the byte limit before reading or parsing them", async () => {
    // Given: a selected backup whose native byte-size seam reports more than 50 MiB.
    const directory = await tempDirectory()
    const filePath = join(directory, "large.json")
    await writeFile(filePath, "{}", "utf8")
    const harness = createHarness(filePath)
    harness.setDeclaredSize(BACKUP_FILE_MAX_BYTES + 1)

    // When: validation checks file size.
    const promise = harness.service.validateBackupFile()

    // Then: it fails without reading the content.
    await expect(promise).rejects.toMatchObject({
      code: "file_too_large",
    } satisfies Partial<BackupValidationError>)
    expect(harness.calls).toEqual({ opened: 1, sized: 1, read: 0 })
  })

  it.each([
    ["unknown envelope key", { ...fullEnvelope(), unexpected: true }],
    ["forbidden data key", { ...fullEnvelope(), data: { ...fullEnvelope().data, settings: [] } }],
    ["unsupported schema version", { ...fullEnvelope(), schemaVersion: 2 }],
    ["schema mismatch", { ...fullEnvelope(), exportedAt: "yesterday" }],
  ])("rejects a %s without creating a session", async (_description, invalidEnvelope) => {
    // Given: a selected JSON file that is not a strict v1 backup envelope.
    const directory = await tempDirectory()
    const filePath = join(directory, "invalid-envelope.json")
    await writeFile(filePath, JSON.stringify(invalidEnvelope), "utf8")
    const harness = createHarness(filePath)

    // When: validation applies the strict envelope schema.
    const promise = harness.service.validateBackupFile()

    // Then: it reports a typed invalid-envelope failure.
    await expect(promise).rejects.toMatchObject({
      code: "invalid_envelope",
    } satisfies Partial<BackupValidationError>)
  })

  it("uses a normalized validated envelope for stable preview fingerprints", async () => {
    // Given: equivalent selected backups whose source object key order differs.
    const directory = await tempDirectory()
    const firstPath = join(directory, "first.json")
    const secondPath = join(directory, "second.json")
    const envelope = fullEnvelope()
    await writeFile(firstPath, JSON.stringify(envelope), "utf8")
    await writeFile(
      secondPath,
      JSON.stringify({
        data: envelope.data,
        metadata: envelope.metadata,
        exportedAt: 100,
        backupType: "full",
        appName: "Prompter",
        schemaVersion: 1,
      }),
      "utf8",
    )
    const harness = createHarness(firstPath)

    // When: both files are validated through the same in-memory store.
    const first = await harness.service.validateBackupFile()
    harness.selectFile(secondPath)
    const second = await harness.service.validateBackupFile()

    // Then: source formatting cannot change the trusted import preview fingerprint.
    expect(first).toMatchObject({ cancelled: false })
    expect(second).toMatchObject({ cancelled: false })
    if (first.cancelled || second.cancelled) {
      throw new Error("Expected validation previews")
    }
    expect(second.preview.previewFingerprint).toBe(first.preview.previewFingerprint)
  })

  it("expires, cancels, consumes, and loses sessions on restart", async () => {
    // Given: a validated selected backup and its memory-only session store.
    const directory = await tempDirectory()
    const filePath = join(directory, "library.json")
    await writeFile(filePath, JSON.stringify(fullEnvelope()), "utf8")
    const harness = createHarness(filePath)
    const validated = await harness.service.validateBackupFile()
    if (validated.cancelled) {
      throw new Error("Expected a validation preview")
    }

    // When: the clock advances, a fresh session is cancelled, and another is consumed after failure.
    harness.setNow(validated.preview.expiresAt)
    expect(() =>
      harness.sessions.requireReadyImportSession(validated.preview.importSessionId),
    ).toThrow("expired")
    expect(harness.sessions.getImportSession(validated.preview.importSessionId)?.status).toBe(
      "expired",
    )
    const cancellable = await harness.service.validateBackupFile()
    if (cancellable.cancelled) {
      throw new Error("Expected a validation preview")
    }
    await expect(
      harness.service.cancelImportSession({ importSessionId: cancellable.preview.importSessionId }),
    ).resolves.toEqual({ cancelled: true })
    const failed = await harness.service.validateBackupFile()
    if (failed.cancelled) {
      throw new Error("Expected a validation preview")
    }
    harness.sessions.consumeImportSessionAfterFailure(failed.preview.importSessionId)

    // Then: each terminal state is visible only in this process and a new store has no old IDs.
    expect(harness.sessions.getImportSession(cancellable.preview.importSessionId)?.status).toBe(
      "cancelled",
    )
    expect(harness.sessions.getImportSession(failed.preview.importSessionId)?.status).toBe(
      "consumed",
    )
    const restarted = createBackupImportSessionStore({ now: () => 1_000, createId: randomUUID })
    expect(restarted.getImportSession(cancellable.preview.importSessionId)).toBeNull()
  })
})
