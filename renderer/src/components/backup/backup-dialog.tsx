import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useRef } from "react"

import { focusPrivacyDialog, handlePrivacyDialogKeyDown } from "../privacy/privacy-warning-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type BackupDialogProps = {
  readonly children: ReactNode
  readonly description: string
  readonly descriptionId: string
  readonly onCancel: () => Promise<void> | void
  readonly role: "alertdialog" | "dialog"
  readonly title: string
  readonly titleId: string
}

export function BackupDialog({
  children,
  description,
  descriptionId,
  onCancel,
  role,
  title,
  titleId,
}: BackupDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogElement = dialog.current
    if (dialogElement === null) return
    const initialFocus = dialogElement.querySelector<HTMLButtonElement>(
      "[data-backup-dialog-cancel]",
    )
    if (initialFocus === null) return
    const restoreFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogElement.showModal()
    const restore = focusPrivacyDialog({ initialFocus, restoreFocus })
    return () => {
      dialogElement.close()
      restore()
    }
  }, [])

  return (
    <dialog
      ref={dialog}
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="m-auto max-h-full w-full max-w-lg bg-transparent p-4 text-inherit backdrop:bg-shell/90"
      role={role}
      onKeyDown={(event: ReactKeyboardEvent<HTMLDialogElement>) =>
        handlePrivacyDialogKeyDown({ event, onCancel })
      }
    >
      <Card className="max-h-full w-full max-w-lg overflow-y-auto shadow-panel">
        <CardHeader>
          <CardTitle id={titleId}>{title}</CardTitle>
          <CardDescription id={descriptionId}>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </dialog>
  )
}
