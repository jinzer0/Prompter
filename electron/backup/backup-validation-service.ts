import type { AppDatabase } from "../db/repositories/common.js"
import {
  BACKUP_FILE_MAX_BYTES,
  backupEnvelopeSchema,
  backupValidationResultSchema,
  cancelImportSessionInputSchema,
  cancelImportSessionResultSchema,
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

type BackupValidationServiceDependencies = {
  readonly db?: AppDatabase
  readonly native: BackupNativeService
  readonly sessions: BackupImportSessionStore
}

export class BackupValidationError extends Error {
  readonly name = "BackupValidationError"

  constructor(
    readonly code: "invalid_json" | "file_too_large" | "invalid_envelope",
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
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new BackupValidationError("invalid_json", "Backup file is not valid JSON", error)
    }
    throw error
  }
  const validated = backupEnvelopeSchema.safeParse(parsed)
  if (!validated.success) {
    throw new BackupValidationError("invalid_envelope", "Backup file does not match the v1 schema")
  }
  return validated.data
}

export function createBackupValidationService(dependencies: BackupValidationServiceDependencies) {
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
    },
    async cancelImportSession(input: CancelImportSessionInput): Promise<CancelImportSessionResult> {
      const parsed = cancelImportSessionInputSchema.parse(input)
      dependencies.sessions.cancelImportSession(parsed.importSessionId)
      return cancelImportSessionResultSchema.parse({ cancelled: true })
    },
  }
}
