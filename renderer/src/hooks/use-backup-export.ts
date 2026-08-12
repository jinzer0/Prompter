import type { Dispatch, SetStateAction } from "react"

import type {
  PlaintextBackupExportResponse,
  PrepareEncryptedBackupInput,
} from "../../../electron/ipc-types"
import { backupErrorMessage } from "./backup-helpers"
import type { BackupState } from "./backup-state"

type BackupStateSetter = Dispatch<SetStateAction<BackupState>>

export function useBackupExport(state: BackupState, setState: BackupStateSetter) {
  function fail(error: unknown, fallback: string): void {
    setState({
      kind: "failure",
      failureKind: "export",
      message: backupErrorMessage(error, fallback),
    })
  }

  function settlePlaintextResponse(response: PlaintextBackupExportResponse): void {
    if ("status" in response) {
      setState({
        kind: "plaintext_confirmation",
        confirmation: response,
        message: response.message,
      })
      return
    }
    setState({
      kind: "exported",
      result: response,
      message: response.cancelled ? "Backup export cancelled." : response.message,
    })
  }

  async function runPlaintextExport(
    operation: () => Promise<PlaintextBackupExportResponse>,
    pendingMessage: string,
    fallback: string,
  ): Promise<void> {
    setState({ kind: "working", operation: "plaintext_export", message: pendingMessage })
    try {
      settlePlaintextResponse(await operation())
    } catch (error) {
      fail(error, fallback)
    }
  }

  async function confirmPlaintextExport(): Promise<void> {
    if (state.kind !== "plaintext_confirmation") return
    const { preparedBackupSessionId, privacyConfirmationSessionId } = state.confirmation
    setState({
      kind: "working",
      operation: "plaintext_save",
      message: "Saving confirmed plaintext backup...",
    })
    try {
      settlePlaintextResponse(
        await window.prompter.backup.savePreparedPlaintextBackup({
          preparedBackupSessionId,
          privacyConfirmationSessionId,
        }),
      )
    } catch (error) {
      fail(error, "Plaintext backup could not be saved.")
    }
  }

  async function prepareEncryptedBackup(input: PrepareEncryptedBackupInput): Promise<void> {
    setState({
      kind: "working",
      operation: "encrypted_prepare",
      message: "Preparing encrypted backup...",
    })
    try {
      const prepared = await window.prompter.backup.prepareEncryptedBackup(input)
      setState({
        kind: "encrypted_export",
        preview: prepared,
        confirmation: null,
        message: "Encrypted backup prepared. Review findings and choose a passphrase.",
      })
    } catch (error) {
      fail(error, "Encrypted backup could not be prepared.")
    }
  }

  async function saveEncryptedBackup(passphrase: string): Promise<void> {
    if (state.kind !== "encrypted_export") return
    const { confirmation, preview } = state
    setState({
      kind: "working",
      operation: "encrypted_save",
      message: "Encrypting and saving backup...",
    })
    try {
      const response = await window.prompter.backup.savePreparedEncryptedBackup({
        preparedBackupSessionId: preview.preparedBackupSessionId,
        passphrase,
        ...(confirmation === null
          ? {}
          : { privacyConfirmationSessionId: confirmation.privacyConfirmationSessionId }),
      })
      if ("status" in response) {
        setState({
          kind: "encrypted_export",
          preview,
          confirmation: response,
          message: response.message,
        })
        return
      }
      if (response.cancelled) {
        setState({
          kind: "encrypted_export",
          preview,
          confirmation: null,
          message: "Encrypted backup export cancelled.",
        })
        return
      }
      setState({
        kind: "exported",
        result: response,
        message: response.message,
      })
    } catch (error) {
      if (!(error instanceof Error)) throw error
      setState({
        kind: "failure",
        failureKind: "export",
        message: "Encrypted backup could not be saved.",
      })
    }
  }

  return {
    cancelBackupDialog: () => setState({ kind: "cancelled", message: "Backup export cancelled." }),
    confirmPlaintextExport,
    exportFullBackup: () =>
      runPlaintextExport(
        () => window.prompter.backup.exportFullBackup({}),
        "Preparing full backup...",
        "Backup export failed.",
      ),
    exportHarnessTemplatesPack: () =>
      runPlaintextExport(
        () => window.prompter.backup.exportHarnessTemplatesPack({ includeAllUserTemplates: true }),
        "Preparing harness pack...",
        "Harness template backup export failed.",
      ),
    exportProjectBackup: (projectId: string) =>
      runPlaintextExport(
        () => window.prompter.backup.exportProjectBackup({ projectId }),
        "Preparing project backup...",
        "Project backup export failed.",
      ),
    exportPromptAssetsBackup: (promptAssetId: string) =>
      runPlaintextExport(
        () => window.prompter.backup.exportPromptAssetsBackup({ promptAssetIds: [promptAssetId] }),
        "Preparing prompt pack...",
        "Prompt asset backup export failed.",
      ),
    exportPromptTemplatesPack: () =>
      runPlaintextExport(
        () => window.prompter.backup.exportPromptTemplatesPack({ includeAll: true }),
        "Preparing template pack...",
        "Prompt template backup export failed.",
      ),
    prepareEncryptedBackup,
    saveEncryptedBackup,
  }
}
