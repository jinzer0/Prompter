import type {
  CopyTextInput,
  CopyTextResponse,
  ExportPromptResult,
  FormatPromptForExportInput,
  SavePromptToFileInput,
  SavePromptToFileResponse,
  SensitiveScanResult,
} from "../../../electron/ipc-types"
import type { PromptExportBase, PromptExportChoice } from "./prompt-export"

export type PromptExportSnapshot = {
  readonly exportBase: PromptExportBase | null
  readonly format: PromptExportChoice
  readonly label: string
  readonly rawContent: string
}

type CapturedCopyPromptExportAction = {
  readonly content: string
  readonly destination: "copy"
  readonly format: PromptExportChoice
  readonly label: string
}

type CapturedSavePromptExportAction = {
  readonly destination: "save"
  readonly format: PromptExportChoice
  readonly input: SavePromptToFileInput
  readonly label: string
}

export type CapturedPromptExportAction =
  | CapturedCopyPromptExportAction
  | CapturedSavePromptExportAction

export type PromptExportActionBridge = {
  readonly copyText: (input: CopyTextInput) => Promise<CopyTextResponse>
  readonly savePromptToFile: (input: SavePromptToFileInput) => Promise<SavePromptToFileResponse>
}

export type PromptExportActionOutcome =
  | { readonly kind: "completed"; readonly destination: "copy" | "save" }
  | { readonly kind: "native_save_cancelled" }
  | {
      readonly kind: "confirmation_required"
      readonly privacyConfirmationSessionId: string
      readonly scanResult: SensitiveScanResult
    }

export function promptExportSnapshotsMatch(
  captured: PromptExportSnapshot,
  current: PromptExportSnapshot,
): boolean {
  return (
    JSON.stringify(captured.exportBase) === JSON.stringify(current.exportBase) &&
    captured.format === current.format &&
    captured.rawContent === current.rawContent
  )
}

type CaptureCopyPromptExportActionInput = {
  readonly formatPrompt: (input: FormatPromptForExportInput) => Promise<ExportPromptResult>
  readonly snapshot: PromptExportSnapshot
}

export async function captureCopyPromptExportAction({
  formatPrompt,
  snapshot,
}: CaptureCopyPromptExportActionInput): Promise<CapturedCopyPromptExportAction | null> {
  if (snapshot.format === "raw") {
    return {
      content: snapshot.rawContent,
      destination: "copy",
      format: snapshot.format,
      label: snapshot.label,
    }
  }
  if (snapshot.exportBase === null) return null

  const formatted = await formatPrompt({
    ...snapshot.exportBase,
    compiledPrompt: snapshot.rawContent,
    format: snapshot.format,
  })
  return {
    content: formatted.content,
    destination: "copy",
    format: snapshot.format,
    label: snapshot.label,
  }
}

export function captureSavePromptExportAction(
  snapshot: PromptExportSnapshot,
): CapturedSavePromptExportAction | null {
  if (snapshot.format === "raw") {
    return {
      destination: "save",
      format: snapshot.format,
      input: { content: snapshot.rawContent, format: "markdown" },
      label: snapshot.label,
    }
  }
  if (snapshot.exportBase === null) return null

  return {
    destination: "save",
    format: snapshot.format,
    input: {
      ...snapshot.exportBase,
      compiledPrompt: snapshot.rawContent,
      format: snapshot.format,
    },
    label: snapshot.label,
  }
}

type ExecuteCapturedPromptExportActionInput = {
  readonly action: CapturedPromptExportAction
  readonly bridge: PromptExportActionBridge
  readonly privacyConfirmationSessionId?: string
}

function confirmationOutcome(
  result: Extract<CopyTextResponse | SavePromptToFileResponse, { status: "confirmation_required" }>,
): PromptExportActionOutcome {
  return {
    kind: "confirmation_required",
    privacyConfirmationSessionId: result.privacyConfirmationSessionId,
    scanResult: result.scanResult,
  }
}

export async function executeCapturedPromptExportAction({
  action,
  bridge,
  privacyConfirmationSessionId,
}: ExecuteCapturedPromptExportActionInput): Promise<PromptExportActionOutcome> {
  switch (action.destination) {
    case "copy": {
      const result = await bridge.copyText({
        text: action.content,
        ...(privacyConfirmationSessionId === undefined ? {} : { privacyConfirmationSessionId }),
      })
      return "status" in result
        ? confirmationOutcome(result)
        : { kind: "completed", destination: "copy" }
    }
    case "save": {
      const result = await bridge.savePromptToFile({
        ...action.input,
        ...(privacyConfirmationSessionId === undefined ? {} : { privacyConfirmationSessionId }),
      })
      if ("status" in result) return confirmationOutcome(result)
      return result.cancelled
        ? { kind: "native_save_cancelled" }
        : { kind: "completed", destination: "save" }
    }
  }
}
