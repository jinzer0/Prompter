import { describe, expect, it } from "vitest"

import {
  BACKUP_EXPORT_SESSION_TTL_MS,
  BackupExportSessionUnavailableError,
  createBackupExportSessionStore,
} from "../electron/backup/backup-export-session-store.js"
import {
  BackupImportSessionStateError,
  createBackupImportSessionStore,
} from "../electron/backup/backup-session-store.js"
import {
  createEncryptedBackupImportSessionStore,
  ENCRYPTED_BACKUP_IMPORT_SESSION_TTL_MS,
  EncryptedBackupImportSessionUnavailableError,
} from "../electron/backup/encrypted-backup-import-session-store.js"
import { encryptedBackupEnvelopeSchema } from "../electron/backup/encrypted-backup-schemas.js"
import { backupEnvelopeSchema } from "../electron/ipc-contract.js"

const backupEnvelope = backupEnvelopeSchema.parse({
  schemaVersion: 1,
  appName: "Prompter",
  backupType: "full",
  exportedAt: 1_000,
  metadata: {
    itemCounts: {
      projects: 0,
      promptAssets: 0,
      promptVersions: 0,
      tags: 0,
      promptTags: 0,
      harnessTemplates: 0,
      projectContextProfiles: 0,
      promptTemplates: 0,
      promptQualityReviews: 0,
    },
    sourceSummary: "Session-only backup",
    excludesSecrets: true,
    excludesSecretStatus: true,
    includesSettings: false,
    plaintext: true,
    schemaVersion: 1,
  },
  data: {
    projects: [],
    promptAssets: [],
    promptVersions: [],
    tags: [],
    promptTags: [],
    harnessTemplates: [],
    projectContextProfiles: [],
    promptTemplates: [],
    promptQualityReviews: [],
  },
})

const encryptedBackup = encryptedBackupEnvelopeSchema.parse({
  schemaVersion: 1,
  appName: "Prompter",
  encrypted: true,
  encryption: {
    algorithm: "aes-256-gcm",
    kdf: "scrypt",
    cost: 16_384,
    blockSize: 8,
    parallelization: 1,
    keyLength: 32,
    salt: "c2FsdC1mb3Itc2Vzc2lvbg==",
    iv: "MTIzNDU2Nzg5MDEy",
    authTag: "MTIzNDU2Nzg5MDEyMzQ1Ng==",
  },
  ciphertext: "Y2lwaGVydGV4dC1mb3Itc2Vzc2lvbg==",
  exportedAt: 1_000,
  metadata: {
    backupType: "full",
    excludesSecrets: true,
    itemCounts: backupEnvelope.metadata.itemCounts,
  },
})

function captureExportFailure(action: () => unknown) {
  try {
    action()
  } catch (error) {
    if (error instanceof BackupExportSessionUnavailableError) {
      return error.failure
    }
    throw error
  }
  throw new Error("Expected export session to be unavailable")
}

function captureImportFailure(action: () => unknown) {
  try {
    action()
  } catch (error) {
    if (error instanceof EncryptedBackupImportSessionUnavailableError) {
      return error.failure
    }
    throw error
  }
  throw new Error("Expected encrypted import session to be unavailable")
}

function createPlainImportSession(store: ReturnType<typeof createBackupImportSessionStore>) {
  return store.createImportSession({
    envelope: backupEnvelope,
    resolutionPlan: {
      itemCounts: backupEnvelope.metadata.itemCounts,
      conflicts: [],
      warnings: [],
      consequences: [],
      requiresDestinationProject: false,
    },
    previewFingerprint: "a".repeat(64),
    preview: {
      backupType: "full",
      schemaVersion: 1,
      exportedAt: 1_000,
      itemCounts: backupEnvelope.metadata.itemCounts,
      conflicts: [],
      warnings: [],
      consequences: [],
      requiresDestinationProject: false,
      excludesSecrets: true,
      excludesSecretStatus: true,
      includesSettings: false,
      plaintext: true,
    },
  })
}

describe("Phase 19 encrypted backup session stores", () => {
  it("holds a trusted plaintext export envelope in memory only until a successful save", () => {
    // Given: a deterministic prepared-export store.
    const clock = { now: 10_000 }
    const store = createBackupExportSessionStore({
      now: () => clock.now,
      createId: () => "00000000-0000-4000-8000-000000000191",
    })

    // When: main prepares and then saves an encrypted export session.
    const session = store.createBackupExportSession({ backupEnvelope })
    store.consumeBackupExportSessionAfterSuccess(session.id)

    // Then: it never stores a passphrase and cannot be replayed after success.
    expect(session.expiresAt).toBe(clock.now + BACKUP_EXPORT_SESSION_TTL_MS)
    expect(session).not.toHaveProperty("passphrase")
    expect(session.status).toBe("consumed")
    expect(store.getBackupExportSession(session.id)).toBeNull()
    expect(captureExportFailure(() => store.requireReadyBackupExportSession(session.id))).toEqual({
      code: "session_consumed",
      message: "Encrypted backup export session is unavailable.",
    })
  })

  it("keeps an encrypted import retryable after a failed unlock and consumes only success", () => {
    // Given: a deterministic encrypted-import session with no decrypted content.
    const store = createEncryptedBackupImportSessionStore({
      now: () => 20_000,
      createId: () => "00000000-0000-4000-8000-000000000192",
    })
    const session = store.createEncryptedBackupImportSession({ encryptedBackup })

    // When: a wrong passphrase retry is preserved before a successful unlock.
    store.preserveEncryptedBackupImportSessionAfterInvalidPassphrase(session.id)
    store.consumeEncryptedBackupImportSessionAfterSuccess(session.id)

    // Then: no passphrase or plaintext is retained and successful unlock is one-use.
    expect(session.expiresAt).toBe(20_000 + ENCRYPTED_BACKUP_IMPORT_SESSION_TTL_MS)
    expect(session).not.toHaveProperty("passphrase")
    expect(session).not.toHaveProperty("decryptedBackup")
    expect(session.status).toBe("consumed")
    expect(store.getEncryptedBackupImportSession(session.id)).toBeNull()
    expect(
      captureImportFailure(() => store.requireReadyEncryptedBackupImportSession(session.id)),
    ).toEqual({
      code: "session_consumed",
      message: "Encrypted backup import session is unavailable.",
    })
  })

  it("blocks forged, cancelled, and expired session identifiers", () => {
    // Given: independent export and encrypted-import stores with injectable clocks.
    const exportClock = { now: 30_000 }
    const importClock = { now: 40_000 }
    const exportStore = createBackupExportSessionStore({
      now: () => exportClock.now,
      createId: () => "00000000-0000-4000-8000-000000000193",
    })
    const importStore = createEncryptedBackupImportSessionStore({
      now: () => importClock.now,
      createId: () => "00000000-0000-4000-8000-000000000194",
    })
    const exportSession = exportStore.createBackupExportSession({ backupEnvelope })
    const importSession = importStore.createEncryptedBackupImportSession({ encryptedBackup })

    // When: a forged id is used, export is cancelled, and import reaches its TTL boundary.
    const forged = captureImportFailure(() =>
      importStore.requireReadyEncryptedBackupImportSession("00000000-0000-4000-8000-000000000199"),
    )
    exportStore.cancelBackupExportSession(exportSession.id)
    importClock.now = importSession.expiresAt
    const expired = captureImportFailure(() =>
      importStore.requireReadyEncryptedBackupImportSession(importSession.id),
    )

    // Then: each terminal state is explicit and disclosure-free.
    expect(forged.code).toBe("session_not_found")
    expect(exportStore.getBackupExportSession(exportSession.id)).toBeNull()
    expect(expired.code).toBe("session_expired")
    expect(importStore.getEncryptedBackupImportSession(importSession.id)).toBeNull()
  })

  it("releases import payloads while retaining every terminal state for exact ready checks", () => {
    // Given: one deterministic plain-import store and three independent previews.
    const clock = { now: 50_000 }
    let nextId = 0
    const ids = [
      "00000000-0000-4000-8000-000000000195",
      "00000000-0000-4000-8000-000000000196",
      "00000000-0000-4000-8000-000000000197",
    ]
    const store = createBackupImportSessionStore({
      now: () => clock.now,
      createId: () => {
        const id = ids[nextId]
        if (id === undefined) {
          throw new Error("Expected another deterministic import session id")
        }
        nextId += 1
        return id
      },
    })
    const cancelled = createPlainImportSession(store)
    const consumed = createPlainImportSession(store)
    const expired = createPlainImportSession(store)

    // When: each preview reaches a distinct terminal state.
    store.cancelImportSession(cancelled.id)
    store.consumeImportSessionAfterSuccess(consumed.id)
    clock.now = expired.expiresAt
    expect(() => store.requireReadyImportSession(expired.id)).toThrow(BackupImportSessionStateError)

    // Then: payload getters release all three terminal payloads while ready checks preserve status.
    expect(store.getImportSession(cancelled.id)).toBeNull()
    expect(store.getImportSession(consumed.id)).toBeNull()
    expect(store.getImportSession(expired.id)).toBeNull()
    for (const [session, status] of [
      [cancelled, "cancelled"],
      [consumed, "consumed"],
      [expired, "expired"],
    ] as const) {
      try {
        store.requireReadyImportSession(session.id)
      } catch (error) {
        if (error instanceof BackupImportSessionStateError) {
          expect(error.status).toBe(status)
          continue
        }
        throw error
      }
      throw new Error("Expected import session to be terminal")
    }
  })
})
