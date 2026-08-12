import { type FormEvent, useId, useState } from "react"

import type { BackupState } from "../../hooks/backup-state"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { BackupDialog } from "./backup-dialog"

type EncryptedImportState = Extract<BackupState, { readonly kind: "encrypted_import" }>

type EncryptedImportDialogProps = {
  readonly onCancel: () => Promise<void> | void
  readonly onUnlock: (passphrase: string) => Promise<void> | void
  readonly state: EncryptedImportState
}

type SafeDateFormat = {
  readonly dateTime: string | null
  readonly text: string
}

const MAX_DATE_TIMESTAMP = 8_640_000_000_000_000
const unavailableDate = { dateTime: null, text: "Date unavailable" } as const

function formatSafeDate(timestamp: number): SafeDateFormat {
  if (!Number.isFinite(timestamp) || Math.abs(timestamp) > MAX_DATE_TIMESTAMP) {
    return unavailableDate
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return unavailableDate

  return { dateTime: date.toISOString(), text: date.toLocaleString() }
}

export function EncryptedImportDialog({ onCancel, onUnlock, state }: EncryptedImportDialogProps) {
  const [passphrase, setPassphrase] = useState("")
  const passphraseId = useId()
  const exportedAt = formatSafeDate(state.locked.exportedAt)

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (passphrase.length === 0) return
    const submittedPassphrase = passphrase
    setPassphrase("")
    await onUnlock(submittedPassphrase)
  }

  function cancel(): void {
    setPassphrase("")
    void onCancel()
  }

  return (
    <BackupDialog
      description="Only locked file metadata is visible until the passphrase succeeds."
      descriptionId="encrypted-import-description"
      onCancel={cancel}
      role="dialog"
      title="Unlock encrypted backup"
      titleId="encrypted-import-title"
    >
      <dl className="grid grid-cols-2 gap-2 text-[12px]">
        <div className="rounded-card border border-border bg-panel-muted p-2">
          <dt className="text-muted">Backup type</dt>
          <dd className="mt-1 font-medium text-foreground">{state.locked.backupType}</dd>
        </div>
        <div className="rounded-card border border-border bg-panel-muted p-2">
          <dt className="text-muted">Exported</dt>
          <dd className="mt-1 text-foreground">
            {exportedAt.dateTime === null ? (
              exportedAt.text
            ) : (
              <time dateTime={exportedAt.dateTime}>{exportedAt.text}</time>
            )}
          </dd>
        </div>
      </dl>
      <form className="space-y-3" onSubmit={(event) => void submit(event)}>
        <label className="grid gap-2" htmlFor={passphraseId}>
          <span className="font-mono text-[11px] text-muted">passphrase</span>
          <Input
            autoComplete="current-password"
            id={passphraseId}
            type="password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.currentTarget.value)}
          />
        </label>
        {state.error !== null && (
          <p className="text-[12px] leading-5 text-muted-strong" role="alert">
            {state.error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button data-backup-dialog-cancel variant="secondary" onClick={cancel}>
            Cancel import
          </Button>
          <Button type="submit" disabled={passphrase.length === 0}>
            Unlock backup
          </Button>
        </div>
      </form>
    </BackupDialog>
  )
}
