import { readFile } from "node:fs/promises"

import { afterEach, describe, expect, it } from "vitest"

import {
  BackupExportPrivacyConfirmationRequiredError,
  createBackupExportService,
} from "../electron/backup/backup-export-service.js"
import { createBackupExportSessionStore } from "../electron/backup/backup-export-session-store.js"
import { createBackupImportService } from "../electron/backup/backup-import-service.js"
import { createBackupImportSessionStore } from "../electron/backup/backup-session-store.js"
import { createBackupValidationService } from "../electron/backup/backup-validation-service.js"
import { createEncryptedBackupCrypto } from "../electron/backup/encrypted-backup-crypto.js"
import { createEncryptedBackupImportSessionStore } from "../electron/backup/encrypted-backup-import-session-store.js"
import { encryptedBackupEnvelopeSchema } from "../electron/backup/encrypted-backup-schemas.js"
import { createPrivacyConfirmationSessionStore } from "../electron/privacy/privacy-confirmation-session-store.js"
import {
  cleanupBackupTestResources,
  createBackupImportTestDatabase,
  createFakeBackupNative,
  createTempBackupFile,
  seedBackupDatabase,
} from "./phase16-backup-test-helpers.js"

afterEach(async () => {
  await cleanupBackupTestResources()
})

async function capturePrivacyConfirmation(action: () => Promise<unknown>) {
  try {
    await action()
  } catch (error) {
    if (error instanceof BackupExportPrivacyConfirmationRequiredError) {
      return error
    }
    throw error
  }
  throw new Error("Expected backup privacy confirmation")
}

describe("Phase 19 backup services", () => {
  it("prepares an encrypted full backup without file I/O and writes only an AES-GCM envelope", async () => {
    // Given: a seeded library, a recording native boundary, and memory-only export sessions.
    const source = await createBackupImportTestDatabase()
    seedBackupDatabase(source)
    const filePath = await createTempBackupFile("")
    const native = createFakeBackupNative({ saveFilePath: filePath })
    const service = createBackupExportService({
      db: source.db,
      native: native.native,
      exportSessions: createBackupExportSessionStore(),
      crypto: createEncryptedBackupCrypto(),
    })

    try {
      // When: main prepares and saves the encrypted backup with a transient passphrase.
      const prepared = await service.prepareEncryptedBackup({ backupType: "full" })
      expect(native.calls).toMatchObject({ showSaveDialog: 0, writeFile: 0 })
      const saved = await service.savePreparedEncryptedBackup({
        preparedBackupSessionId: prepared.preparedBackupSessionId,
        passphrase: "correct horse battery staple",
      })
      const content = await readFile(filePath, "utf8")
      const encrypted = encryptedBackupEnvelopeSchema.parse(JSON.parse(content))

      // Then: preparation never reaches the dialog, and the saved JSON has no plaintext prompt or key.
      expect(native.calls).toMatchObject({ showSaveDialog: 1, writeFile: 1 })
      expect(prepared).toMatchObject({ backupType: "full", privacyScan: { source: "backup" } })
      expect(saved).toEqual({
        cancelled: false,
        backupType: "full",
        message: "Encrypted backup exported",
      })
      expect(encrypted).toMatchObject({ encrypted: true, metadata: { backupType: "full" } })
      expect(content).not.toContain("Backup helper prompt")
      expect(content).not.toContain("openai_api_key")
    } finally {
      source.close()
    }
  })

  it("requires an explicit masked confirmation before an unsafe plaintext save and blocks replay", async () => {
    // Given: a backup containing a key-shaped prompt value and a native save cancellation.
    const source = await createBackupImportTestDatabase()
    source.services.createPromptWithInitialVersion({
      projectId: null,
      title: "Sensitive backup prompt",
      scenario: "feature",
      targetAgent: "codex",
      originalInput: "sk-proj-abcdefghijklmnopqrstuvwx",
      compiledPrompt: "safe",
    })
    const native = createFakeBackupNative()
    const service = createBackupExportService({
      db: source.db,
      native: native.native,
      exportSessions: createBackupExportSessionStore(),
      privacyConfirmationSessions: createPrivacyConfirmationSessionStore(),
    })

    try {
      // When: the direct plaintext export reaches its privacy gate, then its prepared save is retried.
      const required = await capturePrivacyConfirmation(() => service.exportFullBackup({}))
      const cancelled = await service.savePreparedPlaintextBackup({
        preparedBackupSessionId: required.preparedBackupSessionId,
        privacyConfirmationSessionId: required.privacyConfirmationSessionId,
      })
      const replay = service.savePreparedPlaintextBackup({
        preparedBackupSessionId: required.preparedBackupSessionId,
        privacyConfirmationSessionId: required.privacyConfirmationSessionId,
      })

      // Then: disclosure is masked, plaintext is explicit, and neither cancellation nor replay writes.
      expect(required).toMatchObject({
        plaintext: true,
        scanResult: { safeToProceed: false, source: "backup" },
      })
      expect(JSON.stringify(required)).not.toContain("sk-proj-abcdefghijklmnopqrstuvwx")
      expect(cancelled).toEqual({
        cancelled: true,
        backupType: "full",
        itemCounts: expect.any(Object),
        message: "Backup export cancelled",
      })
      await expect(replay).rejects.toThrow("Privacy confirmation session is unavailable.")
      expect(native.calls).toMatchObject({ showSaveDialog: 1, writeFile: 0 })
    } finally {
      source.close()
    }
  })

  it("unlocks an encrypted file into the existing validation preview session and safe-duplicate import", async () => {
    // Given: one encrypted source file and a separate import database with fresh session stores.
    const source = await createBackupImportTestDatabase()
    const fixture = seedBackupDatabase(source)
    const target = await createBackupImportTestDatabase()
    const filePath = await createTempBackupFile("")
    const exportNative = createFakeBackupNative({ saveFilePath: filePath })
    const encryptedExport = createBackupExportService({
      db: source.db,
      native: exportNative.native,
      exportSessions: createBackupExportSessionStore(),
      crypto: createEncryptedBackupCrypto(),
    })
    const importSessions = createBackupImportSessionStore({
      now: () => 1_000,
      createId: () => "00000000-0000-4000-8000-000000000197",
    })
    const encryptedImportSessions = createEncryptedBackupImportSessionStore({
      createId: () => "00000000-0000-4000-8000-000000000198",
    })
    const validation = createBackupValidationService({
      db: target.db,
      native: createFakeBackupNative({ openFilePath: filePath }).native,
      sessions: importSessions,
      encryptedImportSessions,
      crypto: createEncryptedBackupCrypto(),
    })

    try {
      // When: the encrypted file is selected, rejected once, then unlocked and imported normally.
      const prepared = await encryptedExport.prepareEncryptedBackup({ backupType: "full" })
      await encryptedExport.savePreparedEncryptedBackup({
        preparedBackupSessionId: prepared.preparedBackupSessionId,
        passphrase: "correct passphrase",
      })
      const locked = await validation.validateEncryptedBackupFile()
      if (locked.status !== "passphrase_required") {
        throw new Error("Expected encrypted backup to require a passphrase")
      }
      const wrong = await validation.unlockEncryptedBackup({
        encryptedImportSessionId: locked.encryptedImportSessionId,
        passphrase: "wrong passphrase",
      })
      const unlocked = await validation.unlockEncryptedBackup({
        encryptedImportSessionId: locked.encryptedImportSessionId,
        passphrase: "correct passphrase",
      })
      if (unlocked.status !== "ready") {
        throw new Error("Expected an import preview after unlock")
      }
      const imported = await createBackupImportService({
        db: target.db,
        sqlite: target.sqlite,
        sessions: importSessions,
      }).importBackup({
        importSessionId: unlocked.preview.importSessionId,
        previewFingerprint: unlocked.preview.previewFingerprint,
        previewRevision: unlocked.preview.previewRevision,
        strategy: "safe_duplicate",
      })

      // Then: wrong passwords are generic/retryable and correct unlock joins the existing importer.
      expect(wrong).toEqual({
        status: "invalid_passphrase",
        message: "The passphrase could not unlock this backup.",
      })
      expect(unlocked.preview).toMatchObject({ backupType: "full", previewRevision: 1 })
      expect(imported).toMatchObject({ backupType: "full", searchIndexStatus: "updated" })
      expect(imported.createdPromptAssetIds).not.toContain(fixture.promptAssetId)
    } finally {
      source.close()
      target.close()
    }
  })
})
