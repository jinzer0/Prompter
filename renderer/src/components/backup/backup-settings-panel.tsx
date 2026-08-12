import type { BackupImportResult, Project } from "../../../../electron/ipc-types"
import { useBackup } from "../../hooks/use-backup"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { BackupExportActions } from "./backup-export-actions"
import { BackupImportActions } from "./backup-import-actions"

type BackupSettingsPanelProps = {
  readonly projects: readonly Project[]
  readonly selectedPromptAssetId: string | null
  readonly selectedProjectId: string | null
  readonly onImportComplete: (result: BackupImportResult) => Promise<void> | void
  readonly onViewImportedProject: (projectId: string) => void
}

export function BackupSettingsPanel({
  onImportComplete,
  onViewImportedProject,
  projects,
  selectedPromptAssetId,
  selectedProjectId,
}: BackupSettingsPanelProps) {
  const backup = useBackup(onImportComplete)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & Import</CardTitle>
        <CardDescription>
          Backup files are plaintext JSON unless you choose encrypted full or project export. Import
          adds copies and never overwrites existing prompts, templates, harnesses, or projects.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <BackupExportActions
          backup={backup}
          selectedProjectId={selectedProjectId}
          selectedPromptAssetId={selectedPromptAssetId}
        />
        <p className="text-[12px] leading-5 text-muted">
          Settings, secret values, and key status are excluded. Plaintext warnings show masked
          evidence only. Passphrases are never stored and cannot be recovered.
        </p>
        <BackupImportActions
          backup={backup}
          onViewImportedProject={onViewImportedProject}
          projects={projects}
          selectedProjectId={selectedProjectId}
        />
        {backup.message !== null && (
          <output className="block text-[12px] text-muted-strong" aria-live="polite">
            {backup.message}
          </output>
        )}
      </CardContent>
    </Card>
  )
}
