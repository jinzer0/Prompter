import { useSettingsPanel } from "../hooks/use-settings-panel"
import { OpenAIKeyCard } from "./openai-key-card"
import { SettingsDefaultsForm } from "./settings-defaults-form"
import { Badge } from "./ui/badge"

export function SettingsPanel() {
  const settings = useSettingsPanel()

  return (
    <section
      className="space-y-3"
      aria-labelledby="settings-heading"
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
    </section>
  )
}
