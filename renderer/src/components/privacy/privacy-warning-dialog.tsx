import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef } from "react"

import type { PrivacyWarningState } from "../../hooks/use-privacy-warning"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { SensitiveFindingList } from "./sensitive-finding-list"

type FocusTarget = {
  readonly focus: () => void
}

type FocusPrivacyDialogInput = {
  readonly initialFocus: FocusTarget
  readonly restoreFocus: FocusTarget | null
}

type PrivacyDialogKeyEvent = {
  readonly key: string
  readonly preventDefault: () => void
}

type HandlePrivacyDialogKeyDownInput = {
  readonly event: PrivacyDialogKeyEvent
  readonly onCancel: () => Promise<void> | void
}

type PrivacyWarningDialogProps = {
  readonly confirmLabel: string
  readonly onCancel: () => Promise<void> | void
  readonly onConfirm: () => Promise<void> | void
  readonly state: PrivacyWarningState
}

function assertNever(value: never): never {
  throw new TypeError(`Unexpected privacy warning state: ${JSON.stringify(value)}`)
}

export function focusPrivacyDialog({
  initialFocus,
  restoreFocus,
}: FocusPrivacyDialogInput): () => void {
  initialFocus.focus()
  return () => restoreFocus?.focus()
}

export function handlePrivacyDialogKeyDown({
  event,
  onCancel,
}: HandlePrivacyDialogKeyDownInput): void {
  if (event.key !== "Escape") return

  event.preventDefault()
  void onCancel()
}

export function PrivacyWarningDialog({
  confirmLabel,
  onCancel,
  onConfirm,
  state,
}: PrivacyWarningDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const actionRegion = useRef<HTMLDivElement>(null)

  useEffect(() => {
    switch (state.kind) {
      case "idle":
        return
      case "confirmation_required":
        break
      default:
        return assertNever(state)
    }

    const region = actionRegion.current
    if (region === null) return
    const initialFocus = region.querySelector<HTMLButtonElement>("[data-privacy-cancel]")
    if (initialFocus === null) return
    const dialogElement = dialog.current
    if (dialogElement === null) return

    const restoreFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogElement.showModal()
    const restore = focusPrivacyDialog({ initialFocus, restoreFocus })
    return () => {
      dialogElement.close()
      restore()
    }
  }, [state])

  switch (state.kind) {
    case "idle":
      return null
    case "confirmation_required":
      return (
        <dialog
          ref={dialog}
          aria-describedby="privacy-warning-description"
          aria-labelledby="privacy-warning-title"
          aria-modal="true"
          className="m-auto max-h-full w-full max-w-lg bg-transparent p-4 text-inherit backdrop:bg-shell/90"
          role="alertdialog"
          onKeyDown={(event: ReactKeyboardEvent<HTMLDialogElement>) =>
            handlePrivacyDialogKeyDown({ event, onCancel })
          }
        >
          <Card className="max-h-full w-full max-w-lg overflow-y-auto shadow-panel">
            <CardHeader>
              <CardTitle id="privacy-warning-title">Sensitive content needs review</CardTitle>
              <CardDescription id="privacy-warning-description">
                High-risk findings were detected. Review masked evidence before continuing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="flex flex-wrap items-center gap-2"
                role="status"
                aria-label="Privacy finding severity summary"
              >
                <Badge variant="accent">{state.scanResult.findingCount} finding(s)</Badge>
                {state.scanResult.criticalCount > 0 && (
                  <Badge variant="neutral">{state.scanResult.criticalCount} critical</Badge>
                )}
                {state.scanResult.highCount > 0 && (
                  <Badge variant="neutral">{state.scanResult.highCount} high</Badge>
                )}
                {state.scanResult.mediumCount > 0 && (
                  <Badge variant="neutral">{state.scanResult.mediumCount} medium</Badge>
                )}
                {state.scanResult.lowCount > 0 && (
                  <Badge variant="neutral">{state.scanResult.lowCount} low</Badge>
                )}
              </div>
              <SensitiveFindingList findings={state.scanResult.findings} />
              <div ref={actionRegion} className="flex flex-wrap justify-end gap-2">
                <Button data-privacy-cancel variant="secondary" onClick={() => void onCancel()}>
                  Cancel and review
                </Button>
                <Button onClick={() => void onConfirm()}>{confirmLabel}</Button>
              </div>
            </CardContent>
          </Card>
        </dialog>
      )
    default:
      return assertNever(state)
  }
}
