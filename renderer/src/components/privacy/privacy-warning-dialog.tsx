import { useEffect, useRef } from "react"

import type { PrivacyWarningState } from "../../hooks/use-privacy-warning"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { DialogShell, focusDialog } from "../ui/dialog"
import { SensitiveFindingList } from "./sensitive-finding-list"

type PrivacyWarningDialogProps = {
  readonly confirmLabel: string
  readonly onCancel: () => Promise<void> | void
  readonly onConfirm: () => Promise<void> | void
  readonly state: PrivacyWarningState
}

function assertNever(value: never): never {
  throw new TypeError(`Unexpected privacy warning state: ${JSON.stringify(value)}`)
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
    const restore = focusDialog({ initialFocus, restoreFocus })
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
        <DialogShell
          ref={dialog}
          description="High-risk findings were detected. Review masked evidence before continuing."
          descriptionId="privacy-warning-description"
          onCancel={onCancel}
          role="alertdialog"
          title="Sensitive content needs review"
          titleId="privacy-warning-title"
        >
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
        </DialogShell>
      )
    default:
      return assertNever(state)
  }
}
