import type { BackupImportResult, ElectronBridge, Project } from "../../../electron/ipc-types"
import { useSettingsPanel } from "../hooks/use-settings-panel"
import { AppLockSettingsPanel } from "./app-lock/app-lock-settings-panel"
import { BackupSettingsPanel } from "./backup/backup-settings-panel"
import { MaintenanceWorkbench } from "./maintenance/maintenance-workbench"
import { OpenAIKeyCard } from "./openai-key-card"
import { SettingsDefaultsForm } from "./settings-defaults-form"
import { Badge } from "./ui/badge"

type SettingsPanelProps = {
  readonly appLockBridge: ElectronBridge["appLock"]
  readonly projects: readonly Project[]
  readonly selectedPromptAssetId: string | null
  readonly selectedProjectId: string | null
  readonly refreshSignal: number
  readonly onBackupImportComplete: (result: BackupImportResult) => Promise<void> | void
  readonly onAppLockStateChange: () => Promise<void>
  readonly onViewImportedProject: (projectId: string) => void
}

export function SettingsPanel({
  appLockBridge,
  onAppLockStateChange,
  onBackupImportComplete,
  onViewImportedProject,
  projects,
  refreshSignal,
  selectedPromptAssetId,
  selectedProjectId,
}: SettingsPanelProps) {
  const settings = useSettingsPanel(refreshSignal)

  return (
    <section
      className="space-y-3"
      aria-labelledby="settings-heading"
      data-insights-target="settings"
      data-menu-action-target="settings-panel"
      tabIndex={-1}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="settings-heading" className="text-[16px] font-semibold text-foreground">
          Settings
        </h2>
        <Badge variant={settings.keyStatus?.hasKey ? "success" : "neutral"}>Phase 9</Badge>
      </div>

      <SettingsDefaultsForm
        form={settings.defaultsForm}
        isSaving={settings.isSavingDefaults}
        message={settings.defaultsMessage}
        onChange={settings.setDefaultsForm}
        onSave={settings.saveDefaults}
      />

      <OpenAIKeyCard
        apiKey={settings.apiKey}
        isDeleting={settings.isDeletingKey}
        isSaving={settings.isSavingKey}
        message={settings.keyMessage}
        onAPIKeyChange={settings.setAPIKey}
        onDelete={settings.deleteKey}
        onSave={settings.saveKey}
        status={settings.keyStatus}
      />

      <AppLockSettingsPanel bridge={appLockBridge} onStateChange={onAppLockStateChange} />

      <MaintenanceWorkbench projects={projects} selectedProjectId={selectedProjectId} />

      <BackupSettingsPanel
        projects={projects}
        selectedPromptAssetId={selectedPromptAssetId}
        selectedProjectId={selectedProjectId}
        onImportComplete={onBackupImportComplete}
        onViewImportedProject={onViewImportedProject}
      />
    </section>
  )
}
