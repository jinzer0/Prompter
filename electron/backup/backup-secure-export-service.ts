import { backupExportResultSchema } from "../ipc-contract.js"
import type { BackupEnvelope, BackupExportResult, BackupType } from "../ipc-types.js"
import {
  createPrivacyConfirmationSessionStore,
  type PrivacyConfirmationSessionStore,
} from "../privacy/privacy-confirmation-session-store.js"
import { backupPayloadFields, scanSensitivePayload } from "../privacy/scan-sensitive-payload.js"
import { saveEncryptedBackup } from "./backup-encrypted-save.js"
import {
  type BackupExportSessionStore,
  createBackupExportSessionStore,
} from "./backup-export-session-store.js"
import type { BackupNativeService } from "./backup-native-service.js"
import { createEncryptedBackupCrypto } from "./encrypted-backup-crypto.js"
import {
  type PreparedEncryptedBackupPreview,
  preparedEncryptedBackupPreviewSchema,
  type SavePreparedEncryptedBackupInput,
  type SavePreparedEncryptedBackupResult,
  savePreparedEncryptedBackupInputSchema,
} from "./encrypted-backup-schemas.js"

export type PreparedPlaintextBackupInput = {
  readonly preparedBackupSessionId: string
  readonly privacyConfirmationSessionId?: string
}

type BackupPrivacyConfirmation = {
  readonly plaintext: boolean
  readonly preparedBackupSessionId: string
  readonly privacyConfirmationSessionId: string
  readonly scanResult: ReturnType<typeof scanSensitivePayload>
  readonly backupType: BackupType
  readonly itemCounts: BackupEnvelope["metadata"]["itemCounts"]
}

export class BackupExportPrivacyConfirmationRequiredError extends Error {
  readonly name = "BackupExportPrivacyConfirmationRequiredError"

  constructor(readonly confirmation: BackupPrivacyConfirmation) {
    super(
      confirmation.plaintext
        ? "Privacy confirmation is required before saving a plaintext backup."
        : "Privacy confirmation is required before saving an encrypted backup.",
    )
  }

  get plaintext(): boolean {
    return this.confirmation.plaintext
  }

  get preparedBackupSessionId(): string {
    return this.confirmation.preparedBackupSessionId
  }

  get privacyConfirmationSessionId(): string {
    return this.confirmation.privacyConfirmationSessionId
  }

  get scanResult(): ReturnType<typeof scanSensitivePayload> {
    return this.confirmation.scanResult
  }

  get backupType(): BackupType {
    return this.confirmation.backupType
  }

  get itemCounts(): BackupEnvelope["metadata"]["itemCounts"] {
    return this.confirmation.itemCounts
  }
}

export type BackupSecureExportServiceDependencies = {
  readonly native: BackupNativeService
  readonly plaintextFilenames: Readonly<Record<BackupType, string>>
  readonly exportSessions?: BackupExportSessionStore
  readonly privacyConfirmationSessions?: PrivacyConfirmationSessionStore
  readonly crypto?: ReturnType<typeof createEncryptedBackupCrypto>
  readonly getWarnBeforeBackup?: () => boolean
}

function serializedEnvelope(backup: BackupEnvelope): string {
  return JSON.stringify(backup)
}

function scanBackupEnvelope(backup: BackupEnvelope): ReturnType<typeof scanSensitivePayload> {
  return scanSensitivePayload({ source: "backup", fields: backupPayloadFields(backup) })
}

function requiresBackupPrivacyConfirmation(
  scanResult: ReturnType<typeof scanSensitivePayload>,
  warnBeforeBackup: boolean,
): boolean {
  return (
    !scanResult.safeToProceed ||
    scanResult.criticalCount > 0 ||
    scanResult.highCount > 0 ||
    (warnBeforeBackup && (scanResult.mediumCount > 0 || scanResult.lowCount > 0))
  )
}

function saveEnvelope(input: {
  readonly backup: BackupEnvelope
  readonly native: BackupNativeService
  readonly plaintextFilenames: Readonly<Record<BackupType, string>>
}): Promise<BackupExportResult> {
  return input.native
    .saveBackup({
      defaultFilename: input.plaintextFilenames[input.backup.backupType],
      content: JSON.stringify(input.backup, null, 2),
    })
    .then((saved) =>
      backupExportResultSchema.parse({
        cancelled: saved.cancelled,
        backupType: input.backup.backupType,
        itemCounts: input.backup.metadata.itemCounts,
        message: saved.cancelled ? "Backup export cancelled" : "Backup exported",
      }),
    )
}

export function createBackupSecureExportService(
  dependencies: BackupSecureExportServiceDependencies,
) {
  const exportSessions = dependencies.exportSessions ?? createBackupExportSessionStore()
  const privacyConfirmationSessions =
    dependencies.privacyConfirmationSessions ?? createPrivacyConfirmationSessionStore()
  const crypto = dependencies.crypto ?? createEncryptedBackupCrypto()
  const getWarnBeforeBackup = dependencies.getWarnBeforeBackup ?? (() => true)

  function requireConfirmation(input: {
    readonly backup: BackupEnvelope
    readonly plaintext: boolean
    readonly scanResult: ReturnType<typeof scanSensitivePayload>
    readonly preparedBackupSessionId: string
  }): never {
    const confirmation = privacyConfirmationSessions.createPrivacyConfirmationSession({
      action: input.plaintext ? "plaintext_backup" : "encrypted_backup",
      payload: serializedEnvelope(input.backup),
      maskedResult: input.scanResult,
    })
    throw new BackupExportPrivacyConfirmationRequiredError({
      plaintext: input.plaintext,
      preparedBackupSessionId: input.preparedBackupSessionId,
      privacyConfirmationSessionId: confirmation.id,
      scanResult: input.scanResult,
      backupType: input.backup.backupType,
      itemCounts: input.backup.metadata.itemCounts,
    })
  }

  function consumeConfirmation(input: {
    readonly backup: BackupEnvelope
    readonly plaintext: boolean
    readonly privacyConfirmationSessionId: string
  }): void {
    privacyConfirmationSessions.consumePrivacyConfirmationSession({
      privacyConfirmationSessionId: input.privacyConfirmationSessionId,
      action: input.plaintext ? "plaintext_backup" : "encrypted_backup",
      payload: serializedEnvelope(input.backup),
    })
  }

  async function savePreparedPlaintextBackup(
    input: PreparedPlaintextBackupInput,
  ): Promise<BackupExportResult> {
    const session = exportSessions.requireReadyBackupExportSession(input.preparedBackupSessionId)
    const scanResult = scanBackupEnvelope(session.backupEnvelope)
    if (requiresBackupPrivacyConfirmation(scanResult, getWarnBeforeBackup())) {
      if (input.privacyConfirmationSessionId === undefined) {
        requireConfirmation({
          backup: session.backupEnvelope,
          plaintext: true,
          scanResult,
          preparedBackupSessionId: session.id,
        })
      }
      consumeConfirmation({
        backup: session.backupEnvelope,
        plaintext: true,
        privacyConfirmationSessionId: input.privacyConfirmationSessionId,
      })
    }
    const result = await saveEnvelope({
      backup: session.backupEnvelope,
      native: dependencies.native,
      plaintextFilenames: dependencies.plaintextFilenames,
    })
    if (!result.cancelled) {
      exportSessions.consumeBackupExportSessionAfterSuccess(session.id)
    }
    return result
  }

  async function savePlaintextBackup(backup: BackupEnvelope): Promise<BackupExportResult> {
    const scanResult = scanBackupEnvelope(backup)
    if (requiresBackupPrivacyConfirmation(scanResult, getWarnBeforeBackup())) {
      const session = exportSessions.createBackupExportSession({ backupEnvelope: backup })
      requireConfirmation({
        backup,
        plaintext: true,
        scanResult,
        preparedBackupSessionId: session.id,
      })
    }
    return saveEnvelope({
      backup,
      native: dependencies.native,
      plaintextFilenames: dependencies.plaintextFilenames,
    })
  }

  function prepareEncryptedBackup(backup: BackupEnvelope): PreparedEncryptedBackupPreview {
    const session = exportSessions.createBackupExportSession({ backupEnvelope: backup })
    return preparedEncryptedBackupPreviewSchema.parse({
      preparedBackupSessionId: session.id,
      backupType: backup.backupType,
      privacyScan: scanBackupEnvelope(backup),
    })
  }

  async function savePreparedEncryptedBackup(
    input: SavePreparedEncryptedBackupInput,
  ): Promise<SavePreparedEncryptedBackupResult> {
    const parsed = savePreparedEncryptedBackupInputSchema.parse(input)
    const session = exportSessions.requireReadyBackupExportSession(parsed.preparedBackupSessionId)
    const scanResult = scanBackupEnvelope(session.backupEnvelope)
    if (requiresBackupPrivacyConfirmation(scanResult, getWarnBeforeBackup())) {
      if (parsed.privacyConfirmationSessionId === undefined) {
        requireConfirmation({
          backup: session.backupEnvelope,
          plaintext: false,
          scanResult,
          preparedBackupSessionId: session.id,
        })
      }
      consumeConfirmation({
        backup: session.backupEnvelope,
        plaintext: false,
        privacyConfirmationSessionId: parsed.privacyConfirmationSessionId,
      })
    }
    const saved = await saveEncryptedBackup({
      backupEnvelope: session.backupEnvelope,
      backupType: session.backupType,
      passphrase: parsed.passphrase,
      crypto,
      native: dependencies.native,
    })
    if (!saved.cancelled) {
      exportSessions.consumeBackupExportSessionAfterSuccess(session.id)
    }
    return saved
  }

  return {
    prepareEncryptedBackup,
    savePlaintextBackup,
    savePreparedEncryptedBackup,
    savePreparedPlaintextBackup,
  }
}
