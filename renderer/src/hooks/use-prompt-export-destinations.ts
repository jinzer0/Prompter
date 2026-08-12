import { useEffect, useRef, useState } from "react"

import { COMPILER_PROJECT_REBIND_REQUIRED_MESSAGE } from "../lib/compiler-project-binding"
import {
  type CapturedPromptExportAction,
  captureCopyPromptExportAction,
  captureSavePromptExportAction,
  executeCapturedPromptExportAction,
  type PromptExportActionBridge,
  type PromptExportActionOutcome,
  type PromptExportSnapshot,
  promptExportSnapshotsMatch,
} from "../lib/prompt-export-privacy-actions"
import { usePrivacyWarning } from "./use-privacy-warning"

type UsePromptExportDestinationsConfig = {
  readonly canSaveToFile: boolean
  readonly setMessage: (message: string | null) => void
  readonly snapshot: PromptExportSnapshot
}

function assertNever(value: never): never {
  throw new TypeError(`Unexpected prompt export state: ${JSON.stringify(value)}`)
}

function promptExportActionBridge(): PromptExportActionBridge {
  return {
    copyText: window.prompter.clipboard.copyText,
    savePromptToFile: window.prompter.exports.savePromptToFile,
  }
}

export function usePromptExportDestinations({
  canSaveToFile,
  setMessage,
  snapshot,
}: UsePromptExportDestinationsConfig) {
  const [isWorking, setIsWorking] = useState(false)
  const [pendingDestination, setPendingDestination] = useState<"copy" | "save" | null>(null)
  const pendingSnapshot = useRef<PromptExportSnapshot | null>(null)
  const currentSnapshot = useRef(snapshot)
  currentSnapshot.current = snapshot
  const privacyWarning = usePrivacyWarning()
  const hasContent = snapshot.rawContent.trim().length > 0

  useEffect(() => {
    const pending = pendingSnapshot.current
    if (
      pending !== null &&
      (pending.exportBase !== snapshot.exportBase ||
        pending.format !== snapshot.format ||
        pending.rawContent !== snapshot.rawContent)
    ) {
      void privacyWarning.cancel()
    }
  }, [privacyWarning.cancel, snapshot.exportBase, snapshot.format, snapshot.rawContent])

  function clearPendingConfirmation(): void {
    pendingSnapshot.current = null
    setPendingDestination(null)
  }

  function setFinalActionMessage(
    action: CapturedPromptExportAction,
    outcome: Exclude<PromptExportActionOutcome, { readonly kind: "confirmation_required" }>,
  ): void {
    switch (outcome.kind) {
      case "completed":
        setMessage(`${outcome.destination === "copy" ? "Copied" : "Saved"} ${action.label}.`)
        return
      case "native_save_cancelled":
        setMessage("Save cancelled.")
        return
      default:
        assertNever(outcome)
    }
  }

  async function retryConfirmedAction(
    action: CapturedPromptExportAction,
    privacyConfirmationSessionId: string,
  ): Promise<void> {
    clearPendingConfirmation()
    setIsWorking(true)
    try {
      const outcome = await executeCapturedPromptExportAction({
        action,
        bridge: promptExportActionBridge(),
        privacyConfirmationSessionId,
      })
      if (outcome.kind === "confirmation_required") {
        setMessage("Privacy confirmation expired. Start the export again.")
        return
      }
      setFinalActionMessage(action, outcome)
    } catch (error) {
      if (!(error instanceof Error)) throw error
      setMessage(error.message)
    } finally {
      setIsWorking(false)
    }
  }

  async function executeInitialAction(
    action: CapturedPromptExportAction,
    capturedSnapshot: PromptExportSnapshot,
  ): Promise<void> {
    const outcome = await executeCapturedPromptExportAction({
      action,
      bridge: promptExportActionBridge(),
    })
    if (outcome.kind !== "confirmation_required") {
      setFinalActionMessage(action, outcome)
      return
    }
    if (!promptExportSnapshotsMatch(capturedSnapshot, currentSnapshot.current)) {
      setMessage("Export content changed. Start the export again.")
      return
    }

    pendingSnapshot.current = capturedSnapshot
    setPendingDestination(action.destination)
    privacyWarning.open({
      scanResult: outcome.scanResult,
      retry: () => retryConfirmedAction(action, outcome.privacyConfirmationSessionId),
      onCancel: () => {
        clearPendingConfirmation()
        setMessage(
          action.destination === "copy"
            ? "Copy cancelled for privacy review."
            : "Save cancelled for privacy review.",
        )
      },
    })
  }

  async function runInitialAction(
    capturedSnapshot: PromptExportSnapshot,
    captureAction: () => Promise<CapturedPromptExportAction | null>,
  ): Promise<void> {
    setIsWorking(true)
    setMessage(null)
    try {
      const action = await captureAction()
      if (action === null) {
        setMessage("No content to export.")
        return
      }
      if (!promptExportSnapshotsMatch(capturedSnapshot, currentSnapshot.current)) {
        setMessage("Export content changed. Start the export again.")
        return
      }
      await executeInitialAction(action, capturedSnapshot)
    } catch (error) {
      if (!(error instanceof Error)) throw error
      setMessage(error.message)
    } finally {
      setIsWorking(false)
    }
  }

  async function copyExport(): Promise<void> {
    const capturedSnapshot = snapshot
    await runInitialAction(capturedSnapshot, () =>
      captureCopyPromptExportAction({
        formatPrompt: window.prompter.exports.formatPrompt,
        snapshot: capturedSnapshot,
      }),
    )
  }

  async function saveExport(): Promise<void> {
    if (!canSaveToFile) {
      setMessage(COMPILER_PROJECT_REBIND_REQUIRED_MESSAGE)
      return
    }
    if (!hasContent) {
      setMessage("No content to export.")
      return
    }

    const capturedSnapshot = snapshot
    await runInitialAction(capturedSnapshot, async () =>
      captureSavePromptExportAction(capturedSnapshot),
    )
  }

  return {
    cancelPrivacyWarning: privacyWarning.cancel,
    confirmPrivacyWarning: privacyWarning.confirm,
    confirmationLabel: pendingDestination === "save" ? "Continue saving" : "Continue copying",
    copyExport,
    isConfirmationPending: privacyWarning.state.kind === "confirmation_required",
    isWorking,
    privacyWarningState: privacyWarning.state,
    saveExport,
  }
}
