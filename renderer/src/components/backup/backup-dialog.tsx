import { type ReactNode, useEffect, useRef } from "react"

import { DialogShell, focusDialog } from "../ui/dialog"

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
    const restore = focusDialog({ initialFocus, restoreFocus })
    return () => {
      dialogElement.close()
      restore()
    }
  }, [])

  return (
    <DialogShell
      ref={dialog}
      description={description}
      descriptionId={descriptionId}
      onCancel={onCancel}
      role={role}
      title={title}
      titleId={titleId}
    >
      {children}
    </DialogShell>
  )
}
