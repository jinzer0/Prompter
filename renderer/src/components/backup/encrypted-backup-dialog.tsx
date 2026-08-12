import { type FormEvent, useId, useState } from "react"

import type { BackupState } from "../../hooks/backup-state"
import { PrivacyScanWarnings } from "../privacy/privacy-scan-warnings"
import { SensitiveFindingList } from "../privacy/sensitive-finding-list"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { BackupDialog } from "./backup-dialog"
import { PrivacyScanCounts } from "./privacy-scan-counts"

type EncryptedExportState = Extract<BackupState, { readonly kind: "encrypted_export" }>

type EncryptedBackupDialogProps = {
  readonly onCancel: () => Promise<void> | void
  readonly onSubmit: (passphrase: string) => Promise<void> | void
  readonly state: EncryptedExportState
}

export function EncryptedBackupDialog({ onCancel, onSubmit, state }: EncryptedBackupDialogProps) {
  const [passphrase, setPassphrase] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState<string | null>(null)
  const passphraseId = useId()
  const confirmationId = useId()

  function clearPassphrases(): void {
    setPassphrase("")
    setConfirmation("")
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (passphrase.length === 0 || passphrase !== confirmation) {
      setError("Passphrase and confirmation must match exactly.")
      return
    }
    const submittedPassphrase = passphrase
    clearPassphrases()
    setError(null)
    await onSubmit(submittedPassphrase)
  }

  function cancel(): void {
    clearPassphrases()
    setError(null)
    void onCancel()
  }

  const description =
    state.confirmation === null
      ? "Review masked findings, then choose a passphrase for this encrypted backup."
      : "Privacy confirmation is required before saving an encrypted backup. Re-enter the passphrase to continue."

  return (
    <BackupDialog
      description={description}
      descriptionId="encrypted-backup-description"
      onCancel={cancel}
      role="alertdialog"
      title={`Encrypted ${state.preview.backupType} backup`}
      titleId="encrypted-backup-title"
    >
      <PrivacyScanCounts scan={state.preview.privacyScan} />
      <PrivacyScanWarnings warnings={state.preview.privacyScan.warnings} />
      <SensitiveFindingList findings={state.preview.privacyScan.findings} />
      <p className="break-words text-[12px] leading-5 text-muted-strong">
        Prompter cannot recover this passphrase. Store it somewhere safe before saving.
      </p>
      <form className="space-y-3" onSubmit={(event) => void submit(event)}>
        <label className="grid gap-2" htmlFor={passphraseId}>
          <span className="font-mono text-[11px] text-muted">passphrase</span>
          <Input
            autoComplete="new-password"
            id={passphraseId}
            type="password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.currentTarget.value)}
          />
        </label>
        <label className="grid gap-2" htmlFor={confirmationId}>
          <span className="font-mono text-[11px] text-muted">confirm passphrase</span>
          <Input
            autoComplete="new-password"
            id={confirmationId}
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.currentTarget.value)}
          />
        </label>
        {error !== null && (
          <p className="text-[12px] leading-5 text-muted-strong" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button data-backup-dialog-cancel variant="secondary" onClick={cancel}>
            Cancel export
          </Button>
          <Button type="submit">Save encrypted backup</Button>
        </div>
      </form>
    </BackupDialog>
  )
}
