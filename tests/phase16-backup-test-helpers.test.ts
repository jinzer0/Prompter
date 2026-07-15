import { randomUUID } from "node:crypto"

import { afterEach, describe, expect, it } from "vitest"

import { createBackupExportService } from "../electron/backup/backup-export-service"
import { BackupNativeWriteError } from "../electron/backup/backup-native-service"
import { createBackupImportSessionStore } from "../electron/backup/backup-session-store"
import {
  type BackupValidationError,
  createBackupValidationService,
} from "../electron/backup/backup-validation-service"
import {
  backupImportCounts,
  cleanupBackupTestResources,
  createBackupImportTestDatabase,
  createFakeBackupNative,
  createTempBackupFile,
  forbiddenBackupEnvelopeText,
  fullImportEnvelope,
  InjectedBackupTestFailure,
  importEnvelope,
  rawReviewTexts,
  readBackupFtsRows,
  readRawBackupRows,
  seedBackupDatabase,
} from "./phase16-backup-test-helpers"

afterEach(async () => {
  await cleanupBackupTestResources()
})

describe("Phase 16 backup test helpers", () => {
  it("builds every supported backup type with byte-preserved review JSON", () => {
    // Given: the shared complete backup fixture.
    const full = fullImportEnvelope()

    // When: each supported backup envelope is requested from the fixture helper.
    const backupTypes = [
      importEnvelope("full"),
      importEnvelope("project"),
      importEnvelope("prompt_assets"),
      importEnvelope("prompt_templates"),
      importEnvelope("harness_templates"),
    ].map((envelope) => envelope.backupType)

    // Then: all v1 types are available and review JSON text retains its exact source bytes.
    expect(backupTypes).toEqual([
      "full",
      "project",
      "prompt_assets",
      "prompt_templates",
      "harness_templates",
    ])
    expect(full.data.promptQualityReviews[0]).toMatchObject(rawReviewTexts)
  })

  it("seeds and inspects every supported database entity plus FTS", async () => {
    // Given: a migrated temporary database managed by the shared lifecycle helper.
    const database = await createBackupImportTestDatabase()

    // When: one related cross-layer fixture is seeded and read through raw inspection helpers.
    const fixture = seedBackupDatabase(database)
    const rows = readRawBackupRows(database, fixture)
    const ftsRows = readBackupFtsRows(database, fixture.promptAssetId)

    // Then: every supported row exists, the review text is exact, and the prompt is indexed.
    expect(Object.values(rows).every((row) => row !== undefined)).toBe(true)
    expect(rows.review).toMatchObject(rawReviewTexts)
    expect(ftsRows).toEqual([
      {
        promptAssetId: fixture.promptAssetId,
        title: "Backup helper prompt",
        originalInput: "Seed the backup helper.",
        compiledPrompt: "# Objective\nSeed every supported backup entity.",
      },
    ])
  })

  it("injects native export and validation failures at their real service seams", async () => {
    // Given: a seeded database, a valid temp backup, and native fakes configured to fail.
    const database = await createBackupImportTestDatabase()
    seedBackupDatabase(database)
    const savePath = await createTempBackupFile("")
    const validPath = await createTempBackupFile(JSON.stringify(fullImportEnvelope()))
    const exportNative = createFakeBackupNative({
      saveFilePath: savePath,
      failurePoint: "write_file",
    })
    const validationNative = createFakeBackupNative({
      openFilePath: validPath,
      failurePoint: "hash_text",
    })
    const sessions = createBackupImportSessionStore({ now: () => 1_000, createId: randomUUID })

    // When: export reaches file writing and validation reaches fingerprint hashing.
    const exportPromise = createBackupExportService({
      db: database.db,
      native: exportNative.native,
    }).exportFullBackup({})
    const validationPromise = createBackupValidationService({
      native: validationNative.native,
      sessions,
    }).validateBackupFile()

    // Then: both helpers fail at the configured production injection points.
    await expect(exportPromise).rejects.toBeInstanceOf(BackupNativeWriteError)
    await expect(validationPromise).rejects.toBeInstanceOf(InjectedBackupTestFailure)
    expect(exportNative.calls.writeFile).toBe(1)
    expect(validationNative.calls.hashText).toBe(1)
  })

  it("rejects a helper-generated forbidden key before any database write", async () => {
    // Given: a non-empty database and a backup file containing a forbidden settings key.
    const database = await createBackupImportTestDatabase()
    seedBackupDatabase(database)
    const before = backupImportCounts(database)
    const filePath = await createTempBackupFile(forbiddenBackupEnvelopeText())
    const native = createFakeBackupNative({ openFilePath: filePath })
    const sessions = createBackupImportSessionStore({ now: () => 1_000, createId: randomUUID })

    // When: strict validation reads the helper-generated invalid fixture.
    const promise = createBackupValidationService({
      native: native.native,
      sessions,
    }).validateBackupFile()

    // Then: validation rejects it without touching relational or FTS rows.
    await expect(promise).rejects.toMatchObject({
      code: "invalid_envelope",
    } satisfies Partial<BackupValidationError>)
    expect(backupImportCounts(database)).toEqual(before)
    expect(native.calls).toMatchObject({ showOpenDialog: 1, getFileSize: 1, readFile: 1 })
  })
})
