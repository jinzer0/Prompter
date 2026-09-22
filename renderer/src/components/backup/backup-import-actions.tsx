import type { Project } from "../../../../electron/ipc-types"
import type { useBackup } from "../../hooks/use-backup"
import { Button } from "../ui/button"
import { Checkbox } from "../ui/checkbox"
import { MutedWell } from "../ui/muted-well"
import { HelperText } from "../ui/text"
import {
  BackupLedger,
  backupTypeLabel,
  CountGrid,
  DestinationSelector,
  ImportSummary,
} from "./backup-panel-parts"
import { EncryptedImportDialog } from "./encrypted-import-dialog"

type BackupController = ReturnType<typeof useBackup>

type BackupImportActionsProps = {
  readonly backup: BackupController
  readonly onViewImportedProject: (projectId: string) => void
  readonly projects: readonly Project[]
  readonly selectedProjectId: string | null
}

export function BackupImportActions({
  backup,
  onViewImportedProject,
  projects,
  selectedProjectId,
}: BackupImportActionsProps) {
  const preview = backup.preview
  const isOpening =
    backup.state.kind === "working" &&
    (backup.state.operation === "plaintext_validation" ||
      backup.state.operation === "encrypted_validation")

  return (
    <>
      <div className="grid grid-cols-1 gap-2">
        <Button
          className="backup-action-button h-auto min-h-8 whitespace-normal py-2"
          data-menu-action-target="backup-import-open"
          variant="ghost"
          disabled={backup.isWorking}
          onClick={() => void backup.validateBackupFile()}
        >
          {isOpening ? "Opening..." : "Validate / open backup"}
        </Button>
        <Button
          className="h-auto min-h-8 whitespace-normal py-2"
          variant="ghost"
          disabled={backup.isWorking}
          onClick={() => void backup.validateEncryptedBackupFile()}
        >
          Open encrypted backup
        </Button>
      </div>

      {preview !== null && (
        <MutedWell>
          <div className="space-y-1">
            <p className="text-[13px] font-medium text-foreground">
              {backupTypeLabel(preview.backupType)} preview
            </p>
            <p className="text-[12px] leading-5 text-muted">
              Validated backup, schema v{preview.schemaVersion}. Import strategy is safe duplicate.
            </p>
          </div>
          <CountGrid counts={preview.itemCounts} />
          {preview.requiresDestinationProject && (
            <DestinationSelector
              destinationProjectId={backup.destinationProjectId}
              disabled={backup.isWorking || projects.length === 0}
              projects={projects}
              onChange={backup.setDestinationProjectId}
            />
          )}
          {preview.requiresDestinationProject &&
            selectedProjectId !== null &&
            backup.destinationProjectId.length === 0 && (
              <HelperText className="text-muted">
                Current project is available, but import stays disabled until you explicitly choose
                a destination.
              </HelperText>
            )}
          <BackupLedger preview={preview} />
          <label
            htmlFor="backup-import-confirmed"
            className="flex items-start gap-2 text-[12px] leading-5 text-muted-strong"
          >
            <Checkbox
              id="backup-import-confirmed"
              checked={backup.isImportConfirmed}
              disabled={backup.isWorking}
              onChange={(event) => backup.setIsImportConfirmed(event.currentTarget.checked)}
            />
            <span>I understand import adds copies only and never overwrites existing data.</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!backup.canImport} onClick={() => void backup.importBackup()}>
              {backup.state.kind === "working" && backup.state.operation === "import"
                ? "Importing..."
                : "Import backup copies"}
            </Button>
            <Button
              variant="ghost"
              disabled={backup.isWorking}
              onClick={() => void backup.cancelImportSession()}
            >
              Cancel import
            </Button>
          </div>
        </MutedWell>
      )}

      {backup.state.kind === "import_failure" && (
        <HelperText>
          Rollback complete. Review the preview, reopen the file, and try again if needed.
        </HelperText>
      )}
      {backup.importResult !== null && (
        <ImportSummary result={backup.importResult} onViewImportedProject={onViewImportedProject} />
      )}
      {backup.state.kind === "encrypted_import" && (
        <EncryptedImportDialog
          state={backup.state}
          onCancel={backup.cancelEncryptedImport}
          onUnlock={backup.unlockEncryptedBackup}
        />
      )}
    </>
  )
}
