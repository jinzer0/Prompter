import { type Dispatch, type SetStateAction, useState } from "react"

import type { PromptCompilerInput } from "../lib/prompt-compiler/types"

export const QUICK_CAPTURE_LONG_TEXT_THRESHOLD = 20000

type PendingClipboardImport = {
  readonly text: string
  readonly length: number
}

type UseCompilerQuickCaptureConfig = {
  readonly draft: PromptCompilerInput
  readonly setDraft: Dispatch<SetStateAction<PromptCompilerInput>>
  readonly resetImportedDraftState: () => void
  readonly setMessage: Dispatch<SetStateAction<string | null>>
}

export function useCompilerQuickCapture({
  draft,
  resetImportedDraftState,
  setDraft,
  setMessage,
}: UseCompilerQuickCaptureConfig) {
  const [pendingClipboardImport, setPendingClipboardImport] =
    useState<PendingClipboardImport | null>(null)
  const [originalRequestFocusSignal, setOriginalRequestFocusSignal] = useState(0)
  const [isReadingClipboard, setIsReadingClipboard] = useState(false)

  function focusOriginalRequest(): void {
    setOriginalRequestFocusSignal((current) => current + 1)
  }

  function applyClipboardImport(imported: PendingClipboardImport): void {
    setDraft((current) => ({ ...current, originalInput: imported.text }))
    resetImportedDraftState()
    setPendingClipboardImport(null)
    setMessage(
      imported.length >= QUICK_CAPTURE_LONG_TEXT_THRESHOLD
        ? "Imported clipboard text is very long; review it before analysis or compile."
        : "Clipboard text imported.",
    )
    focusOriginalRequest()
  }

  async function importFromClipboard(): Promise<void> {
    setIsReadingClipboard(true)

    try {
      const result = await window.prompter.clipboard.readText()

      if (result.isEmpty) {
        setPendingClipboardImport(null)
        setMessage("Clipboard does not contain text to import.")
        return
      }

      const clipboardImport = { text: result.text, length: result.length }

      if (clipboardImport.text === draft.originalInput) {
        setPendingClipboardImport(null)
        setMessage("Clipboard text is already in the original request.")
        focusOriginalRequest()
        return
      }

      if (draft.originalInput.length > 0) {
        setPendingClipboardImport(clipboardImport)
        return
      }

      applyClipboardImport(clipboardImport)
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      setPendingClipboardImport(null)
      setMessage("Clipboard text could not be imported.")
    } finally {
      setIsReadingClipboard(false)
    }
  }

  function confirmClipboardImport(): void {
    if (pendingClipboardImport !== null) {
      applyClipboardImport(pendingClipboardImport)
    }
  }

  function cancelClipboardImport(): void {
    setPendingClipboardImport(null)
  }

  return {
    cancelClipboardImport,
    confirmClipboardImport,
    importFromClipboard,
    isReadingClipboard,
    originalRequestFocusSignal,
    pendingClipboardImport,
  }
}
