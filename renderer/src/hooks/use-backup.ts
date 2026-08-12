import { useState } from "react"

import type { BackupImportResult } from "../../../electron/ipc-types"
import { canSubmitBackupImport } from "./backup-helpers"
import {
  type BackupState,
  backupExportResult,
  backupImportResult,
  backupMessage,
  backupPreview,
} from "./backup-state"
import { useBackupExport } from "./use-backup-export"
import { useBackupImport } from "./use-backup-import"

export { canSubmitBackupImport, importBackupInputFromPreview } from "./backup-helpers"
export type { BackupState } from "./backup-state"

export type BackupImportCompleteHandler = (result: BackupImportResult) => Promise<void> | void

export function useBackup(onImportComplete: BackupImportCompleteHandler) {
  const [state, setState] = useState<BackupState>({ kind: "idle" })
  const backupExport = useBackupExport(state, setState)
  const backupImport = useBackupImport({ onImportComplete, setState, state })
  const preview = backupPreview(state)
  const isWorking = state.kind === "working"

  return {
    ...backupExport,
    ...backupImport,
    canImport: canSubmitBackupImport({
      destinationProjectId: backupImport.destinationProjectId,
      isImportConfirmed: backupImport.isImportConfirmed,
      isWorking,
      preview,
    }),
    exportResult: backupExportResult(state),
    importResult: backupImportResult(state),
    isWorking,
    message: backupMessage(state),
    preview,
    resetBackup: () => {
      setState({ kind: "idle" })
      backupImport.resetImportChoices()
    },
    state,
  }
}
