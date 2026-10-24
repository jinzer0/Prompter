import { forwardRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"

type FocusTarget = {
  readonly focus: () => void
}

export type FocusDialogInput = {
  readonly initialFocus: FocusTarget
  readonly restoreFocus: FocusTarget | null
}

export function focusDialog({ initialFocus, restoreFocus }: FocusDialogInput): () => void {
  initialFocus.focus()
  return () => restoreFocus?.focus()
}

type DialogKeyEvent = {
  readonly key: string
  readonly preventDefault: () => void
}

export function handleDialogKeyDown({
  event,
  onCancel,
}: {
  readonly event: DialogKeyEvent
  readonly onCancel: () => Promise<void> | void
}): void {
  if (event.key !== "Escape") return

  event.preventDefault()
  void onCancel()
}

type DialogShellProps = {
  readonly children: ReactNode
  readonly description: ReactNode
  readonly descriptionId: string
  readonly onCancel: () => Promise<void> | void
  readonly role: "alertdialog" | "dialog"
  readonly title: ReactNode
  readonly titleId: string
}

export const DialogShell = forwardRef<HTMLDialogElement, DialogShellProps>(function DialogShell(
  { children, description, descriptionId, onCancel, role, title, titleId },
  ref,
) {
  return (
    <dialog
      ref={ref}
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="m-auto max-h-[calc(100dvh-32px)] w-full max-w-lg overflow-y-auto bg-transparent p-4 text-inherit backdrop:bg-shell/90"
      role={role}
      onCancel={(event) => {
        if (event.defaultPrevented) return
        event.preventDefault()
        void onCancel()
      }}
      onKeyDown={(event: ReactKeyboardEvent<HTMLDialogElement>) => {
        if (!event.defaultPrevented) handleDialogKeyDown({ event, onCancel })
      }}
    >
      <Card className="min-w-0 w-full max-w-lg shadow-panel">
        <CardHeader>
          <CardTitle id={titleId}>{title}</CardTitle>
          <CardDescription id={descriptionId}>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </dialog>
  )
})
