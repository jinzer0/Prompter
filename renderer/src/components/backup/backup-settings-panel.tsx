import type { BackupImportResult, Project } from "../../../../electron/ipc-types"
import { useBackup } from "../../hooks/use-backup"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import {
  BackupLedger,
  backupTypeLabel,
  CountGrid,
  DestinationSelector,
  ImportSummary,
} from "./backup-panel-parts"

type BackupSettingsPanelProps = {
  readonly projects: readonly Project[]
  readonly selectedPromptAssetId: string | null
  readonly selectedProjectId: string | null
  readonly onImportComplete: (result: BackupImportResult) => Promise<void> | void
  readonly onViewImportedProject: (projectId: string) => void
}

const backupActionButtonClass = "backup-action-button"

export function BackupSettingsPanel({
  onImportComplete,
  onViewImportedProject,
  projects,
  selectedPromptAssetId,
  selectedProjectId,
}: BackupSettingsPanelProps) {
  const backup = useBackup(onImportComplete)
  const preview = backup.state.preview
  const destinationProjectId = backup.destinationProjectId
  const hasProjects = projects.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & Import</CardTitle>
        <CardDescription>
          Backup files are plaintext JSON. Import adds copies and never overwrites existing prompts,
          templates, harnesses, or projects.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          <Button
            className={backupActionButtonClass}
            data-menu-action-target="backup-export-full"
            type="button"
            variant="secondary"
            disabled={backup.isWorking}
            onClick={() => void backup.exportFullBackup()}
          >
            {backup.state.phase === "exporting" ? "Exporting..." : "Export full backup"}
          </Button>
          <Button
            className={backupActionButtonClass}
            data-menu-action-target="backup-export-project"
            type="button"
            variant="secondary"
            disabled={backup.isWorking || selectedProjectId === null}
            onClick={() => {
              if (selectedProjectId !== null) {
                void backup.exportProjectBackup(selectedProjectId)
              }
            }}
          >
            Export project backup
          </Button>
          <Button
            className={backupActionButtonClass}
            data-menu-action-target="backup-export-prompt-assets"
            type="button"
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
            type="button"
            variant="secondary"
            disabled={backup.isWorking}
            onClick={() => void backup.exportPromptTemplatesPack()}
          >
            Export prompt templates
          </Button>
          <Button
            className={backupActionButtonClass}
            data-menu-action-target="backup-export-harness-templates"
            type="button"
            variant="secondary"
            disabled={backup.isWorking}
            onClick={() => void backup.exportHarnessTemplatesPack()}
          >
            Export harness templates
          </Button>
          <Button
            className={backupActionButtonClass}
            data-menu-action-target="backup-import-open"
            type="button"
            variant="ghost"
            disabled={backup.isWorking}
            onClick={() => void backup.validateBackupFile()}
          >
            {backup.state.phase === "validating" ? "Opening..." : "Validate / open backup"}
          </Button>
        </div>

        <p className="text-[12px] leading-5 text-muted">
          Settings, secret values, and key status are excluded. Prompt asset packs require an
          explicit destination project before import can start. Project and prompt exports use the
          current Settings context; template exports include all available templates.
        </p>

        {backup.state.message !== null && (
          <output className="block text-[12px] text-muted-strong" aria-live="polite">
            {backup.state.message}
          </output>
        )}

        {backup.state.exportResult !== null && !backup.state.exportResult.cancelled && (
          <div className="space-y-2 rounded-card border border-border bg-panel-muted p-3">
            <p className="text-[13px] font-medium text-foreground">Export ready</p>
            <CountGrid counts={backup.state.exportResult.itemCounts} />
          </div>
        )}

        {preview !== null && (
          <div className="space-y-3 rounded-card border border-border bg-panel-muted p-3">
            <div className="space-y-1">
              <p className="text-[13px] font-medium text-foreground">
                {backupTypeLabel(preview.backupType)} preview
              </p>
              <p className="text-[12px] leading-5 text-muted">
                Plaintext backup, schema v{preview.schemaVersion}. Import strategy is safe
                duplicate.
              </p>
            </div>
            <CountGrid counts={preview.itemCounts} />
            {preview.requiresDestinationProject && (
              <DestinationSelector
                destinationProjectId={destinationProjectId}
                disabled={backup.isWorking || !hasProjects}
                projects={projects}
                onChange={backup.setDestinationProjectId}
              />
            )}
            {preview.requiresDestinationProject &&
              selectedProjectId !== null &&
              destinationProjectId.length === 0 && (
                <p className="text-[12px] leading-5 text-muted">
                  Current project is available, but import stays disabled until you explicitly
                  choose a destination.
                </p>
              )}
            <BackupLedger preview={preview} />
            <label className="flex items-start gap-2 text-[12px] leading-5 text-muted-strong">
              <input
                className="mt-1 accent-accent"
                type="checkbox"
                checked={backup.isImportConfirmed}
                disabled={backup.isWorking}
                onChange={(event) => backup.setIsImportConfirmed(event.currentTarget.checked)}
              />
              <span>I understand import adds copies only and never overwrites existing data.</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!backup.canImport}
                onClick={() => void backup.importBackup()}
              >
                {backup.state.phase === "importing" ? "Importing..." : "Import backup copies"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={backup.isWorking}
                onClick={() => void backup.cancelImportSession()}
              >
                Cancel import
              </Button>
            </div>
          </div>
        )}

        {backup.state.phase === "failure" && backup.state.failureKind === "import" && (
          <p className="text-[12px] leading-5 text-muted-strong">
            Rollback complete. Review the preview, reopen the file, and try again if needed.
          </p>
        )}

        {backup.state.importResult !== null && (
          <ImportSummary
            result={backup.state.importResult}
            onViewImportedProject={onViewImportedProject}
          />
        )}
      </CardContent>
    </Card>
  )
}
