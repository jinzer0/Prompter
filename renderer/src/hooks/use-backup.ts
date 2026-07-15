import { useState } from "react"

import type {
  BackupExportResult,
  BackupImportResult,
  BackupValidationPreview,
} from "../../../electron/ipc-types"
import {
  backupErrorMessage,
  canSubmitBackupImport,
  importBackupInputFromPreview,
} from "./backup-helpers"

export { canSubmitBackupImport, importBackupInputFromPreview } from "./backup-helpers"

export type BackupPhase =
  | "idle"
  | "exporting"
  | "exported"
  | "validating"
  | "preview"
  | "importing"
  | "success"
  | "failure"
  | "cancelled"

export type BackupState = {
  readonly phase: BackupPhase
  readonly message: string | null
  readonly exportResult: BackupExportResult | null
  readonly preview: BackupValidationPreview | null
  readonly importResult: BackupImportResult | null
  readonly failureKind: "export" | "validation" | "import" | "cancel" | null
}

export type BackupImportCompleteHandler = (result: BackupImportResult) => Promise<void> | void

const initialBackupState: BackupState = {
  phase: "idle",
  message: null,
  exportResult: null,
  preview: null,
  importResult: null,
  failureKind: null,
}

export function useBackup(onImportComplete: BackupImportCompleteHandler) {
  const [state, setState] = useState<BackupState>(initialBackupState)
  const [destinationProjectId, setDestinationProjectId] = useState("")
  const [isImportConfirmed, setIsImportConfirmed] = useState(false)

  const isWorking =
    state.phase === "exporting" || state.phase === "validating" || state.phase === "importing"
  const canImport = canSubmitBackupImport({
    destinationProjectId,
    isImportConfirmed,
    isWorking,
    preview: state.preview,
  })

  async function exportFullBackup(): Promise<void> {
    setState({ ...initialBackupState, phase: "exporting", message: "Preparing full backup..." })

    try {
      const result = await window.prompter.backup.exportFullBackup({})
      setState({
        ...initialBackupState,
        exportResult: result,
        phase: "exported",
        message: result.cancelled ? "Backup export cancelled." : result.message,
      })
    } catch (error) {
      setState({
        ...initialBackupState,
        failureKind: "export",
        phase: "failure",
        message: backupErrorMessage(error, "Backup export failed."),
      })
    }
  }

  async function exportProjectBackup(projectId: string): Promise<void> {
    setState({ ...initialBackupState, phase: "exporting", message: "Preparing project backup..." })

    try {
      const result = await window.prompter.backup.exportProjectBackup({ projectId })
      setState({
        ...initialBackupState,
        exportResult: result,
        phase: "exported",
        message: result.cancelled ? "Backup export cancelled." : result.message,
      })
    } catch (error) {
      setState({
        ...initialBackupState,
        failureKind: "export",
        phase: "failure",
        message: backupErrorMessage(error, "Project backup export failed."),
      })
    }
  }

  async function exportPromptAssetsBackup(promptAssetId: string): Promise<void> {
    setState({ ...initialBackupState, phase: "exporting", message: "Preparing prompt pack..." })

    try {
      const result = await window.prompter.backup.exportPromptAssetsBackup({
        promptAssetIds: [promptAssetId],
      })
      setState({
        ...initialBackupState,
        exportResult: result,
        phase: "exported",
        message: result.cancelled ? "Backup export cancelled." : result.message,
      })
    } catch (error) {
      setState({
        ...initialBackupState,
        failureKind: "export",
        phase: "failure",
        message: backupErrorMessage(error, "Prompt asset backup export failed."),
      })
    }
  }

  async function exportPromptTemplatesPack(): Promise<void> {
    setState({ ...initialBackupState, phase: "exporting", message: "Preparing template pack..." })

    try {
      const result = await window.prompter.backup.exportPromptTemplatesPack({ includeAll: true })
      setState({
        ...initialBackupState,
        exportResult: result,
        phase: "exported",
        message: result.cancelled ? "Backup export cancelled." : result.message,
      })
    } catch (error) {
      setState({
        ...initialBackupState,
        failureKind: "export",
        phase: "failure",
        message: backupErrorMessage(error, "Prompt template backup export failed."),
      })
    }
  }

  async function exportHarnessTemplatesPack(): Promise<void> {
    setState({ ...initialBackupState, phase: "exporting", message: "Preparing harness pack..." })

    try {
      const result = await window.prompter.backup.exportHarnessTemplatesPack({
        includeAllUserTemplates: true,
      })
      setState({
        ...initialBackupState,
        exportResult: result,
        phase: "exported",
        message: result.cancelled ? "Backup export cancelled." : result.message,
      })
    } catch (error) {
      setState({
        ...initialBackupState,
        failureKind: "export",
        phase: "failure",
        message: backupErrorMessage(error, "Harness template backup export failed."),
      })
    }
  }

  async function validateBackupFile(): Promise<void> {
    setState({ ...initialBackupState, phase: "validating", message: "Opening backup file..." })
    setDestinationProjectId("")
    setIsImportConfirmed(false)

    try {
      const result = await window.prompter.backup.validateBackupFile()

      if (result.cancelled) {
        setState({ ...initialBackupState, phase: "cancelled", message: "Backup import cancelled." })
        return
      }

      setState({
        ...initialBackupState,
        phase: "preview",
        preview: result.preview,
        message: "Backup preview ready. Review the copy plan before importing.",
      })
    } catch (error) {
      setState({
        ...initialBackupState,
        failureKind: "validation",
        phase: "failure",
        message: backupErrorMessage(error, "Backup file could not be validated."),
      })
    }
  }

  async function importBackup(): Promise<void> {
    const preview = state.preview

    if (preview === null) {
      return
    }

    setState((current) => ({
      ...current,
      phase: "importing",
      message: "Importing backup copies...",
    }))

    try {
      const result = await window.prompter.backup.importBackup(
        importBackupInputFromPreview(preview, destinationProjectId),
      )
      await onImportComplete(result)
      setState({
        ...initialBackupState,
        importResult: result,
        phase: "success",
        message: result.message,
      })
      setIsImportConfirmed(false)
    } catch (error) {
      setState((current) => ({
        ...current,
        failureKind: "import",
        phase: "failure",
        message: `${backupErrorMessage(error, "Backup import failed.")} Import rolled back; no copies were added.`,
      }))
    }
  }

  async function cancelImportSession(): Promise<void> {
    const preview = state.preview

    if (preview === null) {
      setState({ ...initialBackupState, phase: "cancelled", message: "Backup import cancelled." })
      return
    }

    try {
      await window.prompter.backup.cancelImportSession({ importSessionId: preview.importSessionId })
      setState({ ...initialBackupState, phase: "cancelled", message: "Backup import cancelled." })
      setDestinationProjectId("")
      setIsImportConfirmed(false)
    } catch (error) {
      setState((current) => ({
        ...current,
        failureKind: "cancel",
        phase: "failure",
        message: backupErrorMessage(error, "Backup import session could not be cancelled."),
      }))
    }
  }

  function resetBackup(): void {
    setState(initialBackupState)
    setDestinationProjectId("")
    setIsImportConfirmed(false)
  }

  return {
    canImport,
    cancelImportSession,
    destinationProjectId,
    exportFullBackup,
    exportHarnessTemplatesPack,
    exportProjectBackup,
    exportPromptAssetsBackup,
    exportPromptTemplatesPack,
    importBackup,
    isImportConfirmed,
    isWorking,
    resetBackup,
    setDestinationProjectId,
    setIsImportConfirmed,
    state,
    validateBackupFile,
  }
}
