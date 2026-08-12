import type { useBackup } from "../../hooks/use-backup"
import { Button } from "../ui/button"
import { CountGrid } from "./backup-panel-parts"
import { EncryptedBackupDialog } from "./encrypted-backup-dialog"
import { PlaintextBackupDialog } from "./plaintext-backup-dialog"

type BackupController = ReturnType<typeof useBackup>

type BackupExportActionsProps = {
  readonly backup: BackupController
  readonly selectedProjectId: string | null
  readonly selectedPromptAssetId: string | null
}

const backupActionButtonClass = "backup-action-button"

export function BackupExportActions({
  backup,
  selectedProjectId,
  selectedPromptAssetId,
}: BackupExportActionsProps) {
  const isExporting =
    backup.state.kind === "working" &&
    (backup.state.operation === "plaintext_export" ||
      backup.state.operation === "plaintext_save" ||
      backup.state.operation === "encrypted_prepare" ||
      backup.state.operation === "encrypted_save")

  return (
    <>
      <div className="grid gap-2">
        <Button
          className={backupActionButtonClass}
          data-menu-action-target="backup-export-full"
          variant="secondary"
          disabled={backup.isWorking}
          onClick={() => void backup.exportFullBackup()}
        >
          {isExporting ? "Exporting..." : "Export full backup"}
        </Button>
        <Button
          className={backupActionButtonClass}
          data-menu-action-target="backup-export-project"
          variant="secondary"
          disabled={backup.isWorking || selectedProjectId === null}
          onClick={() => {
            if (selectedProjectId !== null) void backup.exportProjectBackup(selectedProjectId)
          }}
        >
          Export project backup
        </Button>
        <Button
          className={backupActionButtonClass}
          data-menu-action-target="backup-export-prompt-assets"
          variant="secondary"
          disabled={backup.isWorking || selectedPromptAssetId === null}
          onClick={() => {
            if (selectedPromptAssetId !== null) {
              void backup.exportPromptAssetsBackup(selectedPromptAssetId)
            }
          }}
        >
          Export selected prompt pack
        </Button>
        <Button
          className={backupActionButtonClass}
          data-menu-action-target="backup-export-prompt-templates"
          variant="secondary"
          disabled={backup.isWorking}
          onClick={() => void backup.exportPromptTemplatesPack()}
        >
          Export prompt templates
        </Button>
        <Button
          className={backupActionButtonClass}
          data-menu-action-target="backup-export-harness-templates"
          variant="secondary"
          disabled={backup.isWorking}
          onClick={() => void backup.exportHarnessTemplatesPack()}
        >
          Export harness templates
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Button
          className="h-auto min-h-8 whitespace-normal py-2"
          variant="secondary"
          disabled={backup.isWorking}
          onClick={() => void backup.prepareEncryptedBackup({ backupType: "full" })}
        >
          Export encrypted full backup
        </Button>
        <Button
          className="h-auto min-h-8 whitespace-normal py-2"
          variant="secondary"
          disabled={backup.isWorking || selectedProjectId === null}
          onClick={() => {
            if (selectedProjectId !== null) {
              void backup.prepareEncryptedBackup({
                backupType: "project",
                projectId: selectedProjectId,
              })
            }
          }}
        >
          Export encrypted project backup
        </Button>
      </div>

      {backup.exportResult !== null && !backup.exportResult.cancelled && (
        <div className="space-y-2 rounded-card border border-border bg-panel-muted p-3">
          <p className="text-[13px] font-medium text-foreground">Export ready</p>
          {"itemCounts" in backup.exportResult && (
            <CountGrid counts={backup.exportResult.itemCounts} />
          )}
        </div>
      )}

      {backup.state.kind === "plaintext_confirmation" && (
        <PlaintextBackupDialog
          confirmation={backup.state.confirmation}
          onCancel={backup.cancelBackupDialog}
          onConfirm={backup.confirmPlaintextExport}
        />
      )}
      {backup.state.kind === "encrypted_export" && (
        <EncryptedBackupDialog
          state={backup.state}
          onCancel={backup.cancelBackupDialog}
          onSubmit={backup.saveEncryptedBackup}
        />
      )}
    </>
  )
}
