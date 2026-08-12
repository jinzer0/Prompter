import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "node:crypto"
// biome-ignore lint/style/useNodejsImportProtocol: installed Node typings cannot resolve node:buffer.
import { Buffer } from "buffer"

import { backupEnvelopeSchema } from "../ipc-contract.js"
import type { BackupEnvelope } from "../ipc-types.js"
import {
  type EncryptedBackupEnvelope,
  encryptedBackupEnvelopeSchema,
} from "./encrypted-backup-schemas.js"

export const ENCRYPTED_BACKUP_SCRYPT_COST = 16_384
export const ENCRYPTED_BACKUP_SCRYPT_BLOCK_SIZE = 8
export const ENCRYPTED_BACKUP_SCRYPT_PARALLELIZATION = 1
export const ENCRYPTED_BACKUP_KEY_LENGTH = 32
export const ENCRYPTED_BACKUP_SALT_LENGTH = 16
export const ENCRYPTED_BACKUP_IV_LENGTH = 12
export const ENCRYPTED_BACKUP_AUTH_TAG_LENGTH = 16

type EncryptBackupEnvelopeInput = {
  readonly backupEnvelope: BackupEnvelope
  readonly passphrase: string
}

type DecryptBackupEnvelopeInput = {
  readonly encryptedBackup: EncryptedBackupEnvelope
  readonly passphrase: string
}

type EncryptedBackupCryptoDependencies = {
  readonly randomBytes?: (size: number) => Buffer
}

type AuthenticatedHeader = Omit<EncryptedBackupEnvelope, "ciphertext" | "encryption"> & {
  readonly encryption: Omit<EncryptedBackupEnvelope["encryption"], "authTag">
}

const scryptOptions = {
  cost: ENCRYPTED_BACKUP_SCRYPT_COST,
  blockSize: ENCRYPTED_BACKUP_SCRYPT_BLOCK_SIZE,
  parallelization: ENCRYPTED_BACKUP_SCRYPT_PARALLELIZATION,
} as const

export class EncryptedBackupDecryptionError extends Error {
  readonly name = "EncryptedBackupDecryptionError"

  constructor() {
    super("The passphrase could not unlock this backup.")
  }
}

function deriveKey(passphrase: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(passphrase, salt, ENCRYPTED_BACKUP_KEY_LENGTH, scryptOptions, (error, derivedKey) => {
      if (error !== null) {
        reject(error)
        return
      }
      resolve(Buffer.from(derivedKey))
    })
  })
}

function authenticatedHeader(encryptedBackup: EncryptedBackupEnvelope): AuthenticatedHeader {
  const { authTag, ...encryption } = encryptedBackup.encryption
  return {
    schemaVersion: encryptedBackup.schemaVersion,
    appName: encryptedBackup.appName,
    encrypted: encryptedBackup.encrypted,
    encryption,
    exportedAt: encryptedBackup.exportedAt,
    metadata: encryptedBackup.metadata,
  }
}

function authenticatedData(encryptedBackup: EncryptedBackupEnvelope): Buffer {
  return Buffer.from(JSON.stringify(authenticatedHeader(encryptedBackup)), "utf8")
}

function hasMatchingOuterMetadata(
  encryptedBackup: EncryptedBackupEnvelope,
  backupEnvelope: BackupEnvelope,
): boolean {
  return (
    encryptedBackup.exportedAt === backupEnvelope.exportedAt &&
    encryptedBackup.metadata.backupType === backupEnvelope.backupType &&
    encryptedBackup.metadata.excludesSecrets === backupEnvelope.metadata.excludesSecrets &&
    JSON.stringify(encryptedBackup.metadata.itemCounts) ===
      JSON.stringify(backupEnvelope.metadata.itemCounts)
  )
}

export function createEncryptedBackupCrypto(dependencies: EncryptedBackupCryptoDependencies = {}) {
  const generateRandomBytes = dependencies.randomBytes ?? randomBytes

  return {
    async encryptBackupEnvelope(
      input: EncryptBackupEnvelopeInput,
    ): Promise<EncryptedBackupEnvelope> {
      const salt = generateRandomBytes(ENCRYPTED_BACKUP_SALT_LENGTH)
      const iv = generateRandomBytes(ENCRYPTED_BACKUP_IV_LENGTH)
      let key: Buffer | undefined
      let plaintext: Buffer | undefined
      let aad: Buffer | undefined
      let ciphertext: Buffer | undefined
      let authTag: Buffer | undefined

      try {
        key = await deriveKey(input.passphrase, salt)
        plaintext = Buffer.from(JSON.stringify(input.backupEnvelope), "utf8")
        const draft = {
          schemaVersion: 1,
          appName: "Prompter",
          encrypted: true,
          encryption: {
            algorithm: "aes-256-gcm",
            kdf: "scrypt",
            cost: ENCRYPTED_BACKUP_SCRYPT_COST,
            blockSize: ENCRYPTED_BACKUP_SCRYPT_BLOCK_SIZE,
            parallelization: ENCRYPTED_BACKUP_SCRYPT_PARALLELIZATION,
            keyLength: ENCRYPTED_BACKUP_KEY_LENGTH,
            salt: salt.toString("base64"),
            iv: iv.toString("base64"),
            authTag: Buffer.alloc(ENCRYPTED_BACKUP_AUTH_TAG_LENGTH).toString("base64"),
          },
          ciphertext: "AA==",
          exportedAt: input.backupEnvelope.exportedAt,
          metadata: {
            backupType: input.backupEnvelope.backupType,
            excludesSecrets: true,
            itemCounts: input.backupEnvelope.metadata.itemCounts,
          },
        }
        const header = encryptedBackupEnvelopeSchema.parse(draft)
        aad = authenticatedData(header)
        const cipher = createCipheriv("aes-256-gcm", key, iv, {
          authTagLength: ENCRYPTED_BACKUP_AUTH_TAG_LENGTH,
        })
        cipher.setAAD(aad)
        ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
        authTag = cipher.getAuthTag()

        return encryptedBackupEnvelopeSchema.parse({
          ...header,
          encryption: { ...header.encryption, authTag: authTag.toString("base64") },
          ciphertext: ciphertext.toString("base64"),
        })
      } finally {
        key?.fill(0)
        plaintext?.fill(0)
        aad?.fill(0)
        ciphertext?.fill(0)
        authTag?.fill(0)
        salt.fill(0)
        iv.fill(0)
      }
    },

    async decryptBackupEnvelope(input: DecryptBackupEnvelopeInput): Promise<BackupEnvelope> {
      let key: Buffer | undefined
      let aad: Buffer | undefined
      let ciphertext: Buffer | undefined
      let authTag: Buffer | undefined
      let plaintext: Buffer | undefined
      let salt: Buffer | undefined
      let iv: Buffer | undefined

      try {
        const encryptedBackup = encryptedBackupEnvelopeSchema.parse(input.encryptedBackup)
        salt = Buffer.from(encryptedBackup.encryption.salt, "base64")
        iv = Buffer.from(encryptedBackup.encryption.iv, "base64")
        authTag = Buffer.from(encryptedBackup.encryption.authTag, "base64")
        ciphertext = Buffer.from(encryptedBackup.ciphertext, "base64")
        key = await deriveKey(input.passphrase, salt)
        aad = authenticatedData(encryptedBackup)
        const decipher = createDecipheriv("aes-256-gcm", key, iv, {
          authTagLength: ENCRYPTED_BACKUP_AUTH_TAG_LENGTH,
        })
        decipher.setAAD(aad)
        decipher.setAuthTag(authTag)
        plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
        const backupEnvelope = backupEnvelopeSchema.parse(JSON.parse(plaintext.toString("utf8")))
        if (!hasMatchingOuterMetadata(encryptedBackup, backupEnvelope)) {
          throw new EncryptedBackupDecryptionError()
        }
        return backupEnvelope
      } catch {
        throw new EncryptedBackupDecryptionError()
      } finally {
        key?.fill(0)
        aad?.fill(0)
        ciphertext?.fill(0)
        authTag?.fill(0)
        plaintext?.fill(0)
        salt?.fill(0)
        iv?.fill(0)
      }
    },
  }
}
