import { randomUUID } from "node:crypto"
import { writeFile } from "node:fs/promises"

import { afterEach, describe, expect, it } from "vitest"

import { createBackupExportService } from "../electron/backup/backup-export-service.js"
import { createBackupExportSessionStore } from "../electron/backup/backup-export-session-store.js"
import { createBackupImportSessionStore } from "../electron/backup/backup-session-store.js"
import { createBackupValidationService } from "../electron/backup/backup-validation-service.js"
import {
  createEncryptedBackupCrypto,
  EncryptedBackupDecryptionError,
} from "../electron/backup/encrypted-backup-crypto.js"
import {
  createEncryptedBackupImportSessionStore,
  EncryptedBackupImportSessionUnavailableError,
} from "../electron/backup/encrypted-backup-import-session-store.js"
import {
  cleanupBackupTestResources,
  createBackupImportTestDatabase,
  createFakeBackupNative,
  createTempBackupFile,
  fullImportEnvelope,
} from "./phase16-backup-test-helpers.js"
import { createDeferred } from "./phase18-insights-renderer-fixtures.js"

afterEach(async () => {
  await cleanupBackupTestResources()
})

describe("Phase 19 backup lifecycle", () => {
  it("keeps a prepared export current after the native save dialog is cancelled", async () => {
    // Given: a safe prepared backup and a native seam that always cancels saving.
    const source = await createBackupImportTestDatabase()
    const sessions = createBackupExportSessionStore()
    const native = createFakeBackupNative()
    const service = createBackupExportService({
      db: source.db,
      native: native.native,
      exportSessions: sessions,
      crypto: createEncryptedBackupCrypto(),
    })

    try {
      // When: the same encrypted backup is submitted twice after cancellation.
      const prepared = await service.prepareEncryptedBackup({ backupType: "full" })
      const first = await service.savePreparedEncryptedBackup({
        preparedBackupSessionId: prepared.preparedBackupSessionId,
        passphrase: "correct passphrase",
      })
      const second = await service.savePreparedEncryptedBackup({
        preparedBackupSessionId: prepared.preparedBackupSessionId,
        passphrase: "correct passphrase",
      })

      // Then: cancellation does not terminalize the payload or prevent retrying the current preview.
      expect(first).toMatchObject({ cancelled: true })
      expect(second).toMatchObject({ cancelled: true })
      expect(sessions.getBackupExportSession(prepared.preparedBackupSessionId)).toMatchObject({
        status: "ready",
      })
      expect(native.calls.showSaveDialog).toBe(2)
    } finally {
      source.close()
    }
  })

  it("creates one plaintext preview when concurrent correct unlocks share a claimed session", async () => {
    // Given: a locked file whose first correct decrypt is held before plaintext handoff.
    const backup = fullImportEnvelope()
    const encrypted = await createEncryptedBackupCrypto().encryptBackupEnvelope({
      backupEnvelope: backup,
      passphrase: "correct passphrase",
    })
    const filePath = await createTempBackupFile("")
    await writeFile(filePath, JSON.stringify(encrypted), "utf8")
    const deferred = createDeferred<typeof backup>()
    let decryptCalls = 0
    let previewIds = 0
    const crypto: ReturnType<typeof createEncryptedBackupCrypto> = {
      encryptBackupEnvelope: createEncryptedBackupCrypto().encryptBackupEnvelope,
      async decryptBackupEnvelope() {
        decryptCalls += 1
        return deferred.promise
      },
    }
    const sessions = createBackupImportSessionStore({
      now: () => 1_000,
      createId: () => {
        previewIds += 1
        return "00000000-0000-4000-8000-000000000199"
      },
    })
    const encryptedSessions = createEncryptedBackupImportSessionStore({ createId: randomUUID })
    const validation = createBackupValidationService({
      native: createFakeBackupNative({ openFilePath: filePath }).native,
      sessions,
      encryptedImportSessions: encryptedSessions,
      crypto,
    })
    const locked = await validation.validateEncryptedBackupFile()
    if (locked.status !== "passphrase_required") {
      throw new Error("Expected an encrypted backup session")
    }
    // When: a second correct unlock arrives while the first holds the lease.
    const first = validation.unlockEncryptedBackup({
      encryptedImportSessionId: locked.encryptedImportSessionId,
      passphrase: "correct passphrase",
    })
    const second = validation.unlockEncryptedBackup({
      encryptedImportSessionId: locked.encryptedImportSessionId,
      passphrase: "correct passphrase",
    })

    // Then: only the lease holder decrypts and creates the one plaintext import session.
    expect(decryptCalls).toBe(1)
    await expect(second).rejects.toMatchObject({ failure: { code: "session_consumed" } })
    deferred.resolve(backup)
    expect(await first).toMatchObject({ status: "ready" })
    expect(previewIds).toBe(1)
    expect(
      encryptedSessions.getEncryptedBackupImportSession(locked.encryptedImportSessionId),
    ).toBeNull()
  })

  it("expires a failed decrypt claim that crosses its TTL", async () => {
    // Given: a pending decrypt for an encrypted session with a deterministic short TTL.
    const backup = fullImportEnvelope()
    const encrypted = await createEncryptedBackupCrypto().encryptBackupEnvelope({
      backupEnvelope: backup,
      passphrase: "correct passphrase",
    })
    const filePath = await createTempBackupFile("")
    await writeFile(filePath, JSON.stringify(encrypted), "utf8")
    const clock = { now: 1_000 }
    const deferred = createDeferred<typeof backup>()
    const crypto: ReturnType<typeof createEncryptedBackupCrypto> = {
      encryptBackupEnvelope: createEncryptedBackupCrypto().encryptBackupEnvelope,
      async decryptBackupEnvelope() {
        return deferred.promise
      },
    }
    const encryptedSessions = createEncryptedBackupImportSessionStore({
      now: () => clock.now,
      createId: randomUUID,
      ttlMs: 10,
    })
    const validation = createBackupValidationService({
      native: createFakeBackupNative({ openFilePath: filePath }).native,
      sessions: createBackupImportSessionStore({ now: () => clock.now, createId: randomUUID }),
      encryptedImportSessions: encryptedSessions,
      crypto,
    })
    const locked = await validation.validateEncryptedBackupFile()
    if (locked.status !== "passphrase_required") {
      throw new Error("Expected an encrypted backup session")
    }
    const claimedSession = encryptedSessions.getEncryptedBackupImportSession(
      locked.encryptedImportSessionId,
    )
    if (claimedSession === null) {
      throw new Error("Expected the locked encrypted backup payload")
    }

    // When: the decrypt fails after the claimed session reaches its expiry.
    const unlock = validation.unlockEncryptedBackup({
      encryptedImportSessionId: locked.encryptedImportSessionId,
      passphrase: "wrong passphrase",
    })
    clock.now = 1_010
    deferred.reject(new EncryptedBackupDecryptionError())

    // Then: the failed claim releases no payload and preserves the exact expired terminal code.
    await expect(unlock).resolves.toMatchObject({ status: "invalid_passphrase" })
    expect(claimedSession.status).toBe("expired")
    expect(
      encryptedSessions.getEncryptedBackupImportSession(locked.encryptedImportSessionId),
    ).toBeNull()
    try {
      encryptedSessions.requireReadyEncryptedBackupImportSession(locked.encryptedImportSessionId)
    } catch (error) {
      if (error instanceof EncryptedBackupImportSessionUnavailableError) {
        expect(error.failure.code).toBe("session_expired")
      } else {
        throw error
      }
      return
    }
    throw new Error("Expected the expired encrypted import session to be unavailable")
  })
})
