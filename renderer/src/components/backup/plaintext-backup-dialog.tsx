import type { BackupConfirmation } from "../../hooks/backup-state"
import { PrivacyScanWarnings } from "../privacy/privacy-scan-warnings"
import { SensitiveFindingList } from "../privacy/sensitive-finding-list"
import { Button } from "../ui/button"
import { BackupDialog } from "./backup-dialog"
import { CountGrid } from "./backup-panel-parts"
import { PrivacyScanCounts } from "./privacy-scan-counts"

type PlaintextBackupDialogProps = {
  readonly confirmation: BackupConfirmation
  readonly onCancel: () => Promise<void> | void
  readonly onConfirm: () => Promise<void> | void
}

export function PlaintextBackupDialog({
  confirmation,
  onCancel,
  onConfirm,
}: PlaintextBackupDialogProps) {
  return (
    <BackupDialog
      description="Privacy confirmation is required before saving a plaintext backup."
      descriptionId="plaintext-backup-warning-description"
      onCancel={onCancel}
      role="alertdialog"
      title="Review plaintext backup"
      titleId="plaintext-backup-warning-title"
    >
      <CountGrid counts={confirmation.itemCounts} />
      <PrivacyScanCounts scan={confirmation.scanResult} />
      <PrivacyScanWarnings warnings={confirmation.scanResult.warnings} />
      <SensitiveFindingList findings={confirmation.scanResult.findings} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button data-backup-dialog-cancel variant="secondary" onClick={() => void onCancel()}>
          Cancel export
        </Button>
        <Button onClick={() => void onConfirm()}>Continue with plaintext</Button>
      </div>
    </BackupDialog>
  )
}
