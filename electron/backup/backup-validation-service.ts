import type { AppDatabase } from "../db/repositories/common.js"
import {
  BACKUP_FILE_MAX_BYTES,
  backupEnvelopeSchema,
  backupValidationResultSchema,
  cancelImportSessionInputSchema,
  cancelImportSessionResultSchema,
  encryptedBackupUnlockValidationResultSchema,
} from "../ipc-contract.js"
import type {
  BackupEnvelope,
  BackupValidationResult,
  CancelImportSessionInput,
  CancelImportSessionResult,
} from "../ipc-types.js"
import type { BackupNativeService } from "./backup-native-service.js"
import type { BackupImportSessionStore, BackupResolutionPlan } from "./backup-session-store.js"
import { createBackupPreviewDetails } from "./backup-validation-preview.js"
import {
  createEncryptedBackupCrypto,
  EncryptedBackupDecryptionError,
} from "./encrypted-backup-crypto.js"
import {
  createEncryptedBackupImportSessionStore,
  type EncryptedBackupImportSessionStore,
} from "./encrypted-backup-import-session-store.js"
import {
  type EncryptedBackupEnvelope,
  encryptedBackupEnvelopeSchema,
  type UnlockEncryptedBackupInput,
  unlockEncryptedBackupInputSchema,
  type ValidateEncryptedBackupResult,
  validateEncryptedBackupResultSchema,
} from "./encrypted-backup-schemas.js"

type BackupValidationServiceDependencies = {
  readonly db?: AppDatabase
  readonly native: BackupNativeService
  readonly sessions: BackupImportSessionStore
  readonly encryptedImportSessions?: EncryptedBackupImportSessionStore
  readonly crypto?: ReturnType<typeof createEncryptedBackupCrypto>
}

export class BackupValidationError extends Error {
  readonly name = "BackupValidationError"

  constructor(
    readonly code: "invalid_json" | "file_too_large" | "invalid_envelope" | "encrypted_backup",
    message: string,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause })
  }
}

function normalizedEnvelopeText(envelope: BackupEnvelope): string {
  return JSON.stringify(envelope)
}

function parseEnvelope(content: string): BackupEnvelope {
  const parsed = parseJson(content)
  if (encryptedBackupEnvelopeSchema.safeParse(parsed).success) {
    throw new BackupValidationError(
      "encrypted_backup",
      "Encrypted backups must be unlocked before validation",
    )
  }
  const validated = backupEnvelopeSchema.safeParse(parsed)
  if (!validated.success) {
    throw new BackupValidationError("invalid_envelope", "Backup file does not match the v1 schema")
  }
  return validated.data
}

function parseEncryptedEnvelope(content: string): EncryptedBackupEnvelope {
  const validated = encryptedBackupEnvelopeSchema.safeParse(parseJson(content))
  if (!validated.success) {
    throw new BackupValidationError(
      "invalid_envelope",
      "Backup file does not match the encrypted v1 schema",
    )
  }
  return validated.data
}

function parseJson(content: string): unknown {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new BackupValidationError("invalid_json", "Backup file is not valid JSON", error)
    }
    throw error
  }
  return parsed
}

export function createBackupValidationService(dependencies: BackupValidationServiceDependencies) {
  const encryptedImportSessions =
    dependencies.encryptedImportSessions ?? createEncryptedBackupImportSessionStore()
  const crypto = dependencies.crypto ?? createEncryptedBackupCrypto()

  function createPreview(envelope: BackupEnvelope): BackupValidationResult {
    const details = createBackupPreviewDetails(envelope, dependencies.db)
    const resolutionPlan: BackupResolutionPlan = details
    const session = dependencies.sessions.createImportSession({
      envelope,
      resolutionPlan,
      previewFingerprint: dependencies.native.hashText(normalizedEnvelopeText(envelope)),
      preview: {
        backupType: envelope.backupType,
        schemaVersion: envelope.schemaVersion,
        exportedAt: envelope.exportedAt,
        itemCounts: details.itemCounts,
        conflicts: [...details.conflicts],
        warnings: [...details.warnings],
        consequences: [...details.consequences],
        requiresDestinationProject: details.requiresDestinationProject,
        excludesSecrets: envelope.metadata.excludesSecrets,
        excludesSecretStatus: envelope.metadata.excludesSecretStatus,
        includesSettings: envelope.metadata.includesSettings,
        plaintext: envelope.metadata.plaintext,
      },
    })
    return backupValidationResultSchema.parse({ cancelled: false, preview: session.preview })
  }

  return {
    async validateBackupFile(): Promise<BackupValidationResult> {
      dependencies.sessions.cleanupExpiredSessions()
      const opened = await dependencies.native.openBackupFile()
      if ("cancelled" in opened) {
        return backupValidationResultSchema.parse({ cancelled: true })
      }
      const size = await dependencies.native.getBackupFileSize(opened.filePath)
      if (size > BACKUP_FILE_MAX_BYTES) {
        throw new BackupValidationError(
          "file_too_large",
          `Backup file exceeds the ${BACKUP_FILE_MAX_BYTES}-byte limit`,
        )
      }
      const envelope = parseEnvelope(await dependencies.native.readBackupFile(opened.filePath))
      return createPreview(envelope)
    },
    async cancelImportSession(input: CancelImportSessionInput): Promise<CancelImportSessionResult> {
      const parsed = cancelImportSessionInputSchema.parse(input)
      dependencies.sessions.cancelImportSession(parsed.importSessionId)
      return cancelImportSessionResultSchema.parse({ cancelled: true })
    },
    async validateEncryptedBackupFile(): Promise<ValidateEncryptedBackupResult> {
      dependencies.sessions.cleanupExpiredSessions()
      encryptedImportSessions.expireEncryptedBackupImportSessions()
      const opened = await dependencies.native.openBackupFile()
      if ("cancelled" in opened) {
        return validateEncryptedBackupResultSchema.parse({ status: "cancelled" })
      }
      const size = await dependencies.native.getBackupFileSize(opened.filePath)
      if (size > BACKUP_FILE_MAX_BYTES) {
        throw new BackupValidationError(
          "file_too_large",
          `Backup file exceeds the ${BACKUP_FILE_MAX_BYTES}-byte limit`,
        )
      }
      const encryptedBackup = parseEncryptedEnvelope(
        await dependencies.native.readBackupFile(opened.filePath),
      )
      const session = encryptedImportSessions.createEncryptedBackupImportSession({
        encryptedBackup,
      })
      return validateEncryptedBackupResultSchema.parse({
        status: "passphrase_required",
        encryptedImportSessionId: session.id,
        backupType: encryptedBackup.metadata.backupType,
        exportedAt: encryptedBackup.exportedAt,
      })
    },
    async unlockEncryptedBackup(input: UnlockEncryptedBackupInput) {
      const parsed = unlockEncryptedBackupInputSchema.parse(input)
      const session = encryptedImportSessions.claimEncryptedBackupImportSession(
        parsed.encryptedImportSessionId,
      )
      try {
        const envelope = await crypto.decryptBackupEnvelope({
          encryptedBackup: session.encryptedBackup,
          passphrase: parsed.passphrase,
        })
        const preview = createPreview(envelope)
        encryptedImportSessions.consumeEncryptedBackupImportSessionAfterSuccess(session.id)
        return encryptedBackupUnlockValidationResultSchema.parse({
          status: "ready",
          preview: preview.cancelled ? undefined : preview.preview,
        })
      } catch (error) {
        encryptedImportSessions.releaseEncryptedBackupImportSessionClaim(session)
        if (error instanceof EncryptedBackupDecryptionError) {
          return encryptedBackupUnlockValidationResultSchema.parse({
            status: "invalid_passphrase",
            message: error.message,
          })
        }
        throw error
      }
    },
  }
}
