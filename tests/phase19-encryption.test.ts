import { Buffer } from "node:buffer"
import { describe, expect, it } from "vitest"

import {
  createEncryptedBackupCrypto,
  EncryptedBackupDecryptionError,
} from "../electron/backup/encrypted-backup-crypto.js"
import { backupEnvelopeSchema } from "../electron/ipc-contract.js"
import type { BackupEnvelope } from "../electron/ipc-types.js"

const backupEnvelope: BackupEnvelope = backupEnvelopeSchema.parse({
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
    sourceSummary: "Phase 19 encrypted backup source",
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

function createCrypto() {
  const randomValues = [Buffer.alloc(16, 11), Buffer.alloc(12, 22)]
  let randomIndex = 0

  return createEncryptedBackupCrypto({
    randomBytes: (size) => {
      const value = randomValues[randomIndex]
      randomIndex += 1
      if (value === undefined || value.length !== size) {
        throw new Error("Unexpected random-byte request")
      }
      return Buffer.from(value)
    },
  })
}

function captureDecryptionFailure(action: () => Promise<unknown>) {
  return action().then(
    () => {
      throw new Error("Expected encrypted backup decryption to fail")
    },
    (error: unknown) => {
      if (error instanceof EncryptedBackupDecryptionError) {
        return error
      }
      throw error
    },
  )
}

describe("Phase 19 encrypted backup crypto", () => {
  it("round-trips a backup with AES-256-GCM and the fixed scrypt parameters", async () => {
    // Given: a trusted in-memory backup and deterministic random salt and IV bytes.
    const crypto = createCrypto()

    // When: the backup is encrypted and unlocked with its original passphrase.
    const encrypted = await crypto.encryptBackupEnvelope({
      backupEnvelope,
      passphrase: "correct horse battery staple",
    })
    const decrypted = await crypto.decryptBackupEnvelope({
      encryptedBackup: encrypted,
      passphrase: "correct horse battery staple",
    })

    // Then: the ciphertext has no plaintext and the complete backup round-trips.
    expect(encrypted).toMatchObject({
      encrypted: true,
      encryption: {
        algorithm: "aes-256-gcm",
        kdf: "scrypt",
        cost: 16_384,
        blockSize: 8,
        parallelization: 1,
        keyLength: 32,
        salt: Buffer.alloc(16, 11).toString("base64"),
        iv: Buffer.alloc(12, 22).toString("base64"),
      },
      metadata: {
        backupType: "full",
        excludesSecrets: true,
        itemCounts: backupEnvelope.metadata.itemCounts,
      },
    })
    expect(Buffer.from(encrypted.encryption.authTag, "base64")).toHaveLength(16)
    expect(JSON.stringify(encrypted)).not.toContain("Phase 19 encrypted backup source")
    expect(decrypted).toEqual(backupEnvelope)
  })

  it("returns one generic error for a wrong passphrase", async () => {
    // Given: an encrypted backup created with a different passphrase.
    const crypto = createCrypto()
    const encrypted = await crypto.encryptBackupEnvelope({
      backupEnvelope,
      passphrase: "correct passphrase",
    })

    // When: the backup is unlocked with the wrong passphrase.
    const failure = await captureDecryptionFailure(() =>
      crypto.decryptBackupEnvelope({ encryptedBackup: encrypted, passphrase: "wrong passphrase" }),
    )

    // Then: the failure exposes no cryptographic or passphrase detail.
    expect(failure.message).toBe("The passphrase could not unlock this backup.")
  })

  it("rejects tampered outer metadata through authenticated additional data", async () => {
    // Given: an encrypted backup whose visible item count is changed after encryption.
    const crypto = createCrypto()
    const encrypted = await crypto.encryptBackupEnvelope({
      backupEnvelope,
      passphrase: "correct passphrase",
    })
    const tampered = {
      ...encrypted,
      metadata: {
        ...encrypted.metadata,
        itemCounts: { ...encrypted.metadata.itemCounts, promptAssets: 1 },
      },
    }

    // When: the tampered backup is unlocked with the original passphrase.
    const failure = await captureDecryptionFailure(() =>
      crypto.decryptBackupEnvelope({ encryptedBackup: tampered, passphrase: "correct passphrase" }),
    )

    // Then: authenticated metadata fails with the same sanitized result.
    expect(failure.message).toBe("The passphrase could not unlock this backup.")
  })
})
