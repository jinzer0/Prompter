import type { BackupValidationPreview, ImportBackupInput } from "../../../electron/ipc-types"

export type BackupImportGateInput = {
  readonly destinationProjectId: string
  readonly isImportConfirmed: boolean
  readonly isWorking: boolean
  readonly preview: BackupValidationPreview | null
}

export function canSubmitBackupImport(input: BackupImportGateInput): boolean {
  if (input.preview === null || input.isWorking || !input.isImportConfirmed) {
    return false
  }

  if (input.preview.requiresDestinationProject) {
    return input.destinationProjectId.trim().length > 0
  }

  return true
}

export function importBackupInputFromPreview(
  preview: BackupValidationPreview,
  destinationProjectId: string,
): ImportBackupInput {
  const trimmedDestinationProjectId = destinationProjectId.trim()

  return {
    importSessionId: preview.importSessionId,
    previewFingerprint: preview.previewFingerprint,
    previewRevision: preview.previewRevision,
    strategy: "safe_duplicate",
    ...(trimmedDestinationProjectId.length > 0
      ? { destinationProjectId: trimmedDestinationProjectId }
      : {}),
  }
}

export function backupErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}
