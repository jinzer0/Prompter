import { type Dispatch, type SetStateAction, useState } from "react"

import type { BackupImportResult } from "../../../electron/ipc-types"
import { backupErrorMessage, importBackupInputFromPreview } from "./backup-helpers"
import { assertNever, type BackupState, backupPreview } from "./backup-state"

type UseBackupImportInput = {
  readonly onImportComplete: (result: BackupImportResult) => Promise<void> | void
  readonly setState: Dispatch<SetStateAction<BackupState>>
  readonly state: BackupState
}

export function useBackupImport({ onImportComplete, setState, state }: UseBackupImportInput) {
  const [destinationProjectId, setDestinationProjectId] = useState("")
  const [isImportConfirmed, setIsImportConfirmed] = useState(false)
  const preview = backupPreview(state)

  function resetImportChoices(): void {
    setDestinationProjectId("")
    setIsImportConfirmed(false)
  }

  function validationFailure(error: unknown, fallback: string): void {
    setState({
      kind: "failure",
      failureKind: "validation",
      message: backupErrorMessage(error, fallback),
    })
  }

  async function validateBackupFile(): Promise<void> {
    setState({
      kind: "working",
      operation: "plaintext_validation",
      message: "Opening backup file...",
    })
    resetImportChoices()
    try {
      const result = await window.prompter.backup.validateBackupFile()
      if (result.cancelled) {
        setState({ kind: "cancelled", message: "Backup import cancelled." })
        return
      }
      setState({
        kind: "preview",
        preview: result.preview,
        message: "Backup preview ready. Review the copy plan before importing.",
      })
    } catch (error) {
      validationFailure(error, "Backup file could not be validated.")
    }
  }

  async function validateEncryptedBackupFile(): Promise<void> {
    setState({
      kind: "working",
      operation: "encrypted_validation",
      message: "Opening encrypted backup...",
    })
    resetImportChoices()
    try {
      const result = await window.prompter.backup.validateEncryptedBackupFile()
      switch (result.status) {
        case "cancelled":
          setState({ kind: "cancelled", message: "Encrypted backup import cancelled." })
          return
        case "passphrase_required":
          setState({
            kind: "encrypted_import",
            locked: result,
            error: null,
            message: "Encrypted backup locked. Enter its passphrase to continue.",
          })
          return
        default:
          return assertNever(result)
      }
    } catch (error) {
      validationFailure(error, "Encrypted backup file could not be validated.")
    }
  }

  async function unlockEncryptedBackup(passphrase: string): Promise<void> {
    if (state.kind !== "encrypted_import") return
    const locked = state.locked
    setState({
      kind: "working",
      operation: "encrypted_unlock",
      message: "Unlocking encrypted backup...",
    })
    try {
      const result = await window.prompter.backup.unlockEncryptedBackup({
        encryptedImportSessionId: locked.encryptedImportSessionId,
        passphrase,
      })
      switch (result.status) {
        case "invalid_passphrase":
          setState({
            kind: "encrypted_import",
            locked,
            error: "The passphrase could not unlock this backup.",
            message: "Encrypted backup remains locked. Try again.",
          })
          return
        case "ready":
          setState({
            kind: "preview",
            preview: result.preview,
            message: "Backup preview ready. Review the copy plan before importing.",
          })
          return
        default:
          return assertNever(result)
      }
    } catch (error) {
      if (!(error instanceof Error)) throw error
      setState({
        kind: "encrypted_import",
        locked,
        error: "The encrypted backup could not be unlocked.",
        message: "Encrypted backup remains locked. Try again.",
      })
    }
  }

  async function importBackup(): Promise<void> {
    if (preview === null) return
    setState({ kind: "working", operation: "import", message: "Importing backup copies..." })
    try {
      const result = await window.prompter.backup.importBackup(
        importBackupInputFromPreview(preview, destinationProjectId),
      )
      await onImportComplete(result)
      setState({ kind: "success", result, message: result.message })
      setIsImportConfirmed(false)
    } catch (error) {
      setState({
        kind: "import_failure",
        preview,
        message: `${backupErrorMessage(error, "Backup import failed.")} Import rolled back; no copies were added.`,
      })
    }
  }

  async function cancelImportSession(): Promise<void> {
    if (preview === null) {
      setState({ kind: "cancelled", message: "Backup import cancelled." })
      return
    }
    setState({ kind: "working", operation: "cancel", message: "Cancelling backup import..." })
    try {
      await window.prompter.backup.cancelImportSession({ importSessionId: preview.importSessionId })
      resetImportChoices()
      setState({ kind: "cancelled", message: "Backup import cancelled." })
    } catch (error) {
      setState({
        kind: "failure",
        failureKind: "cancel",
        message: backupErrorMessage(error, "Backup import session could not be cancelled."),
      })
    }
  }

  return {
    cancelEncryptedImport: () =>
      setState({ kind: "cancelled", message: "Encrypted backup import cancelled." }),
    cancelImportSession,
    destinationProjectId,
    importBackup,
    isImportConfirmed,
    resetImportChoices,
    setDestinationProjectId,
    setIsImportConfirmed,
    unlockEncryptedBackup,
    validateBackupFile,
    validateEncryptedBackupFile,
  }
}
