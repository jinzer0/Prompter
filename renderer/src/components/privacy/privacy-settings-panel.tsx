import type { FormEvent } from "react"

import {
  type PrivacySettingsBridge,
  type PrivacySettingsKey,
  type UsePrivacySettingsResult,
  usePrivacySettings,
} from "../../hooks/use-privacy-settings"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

const privacySettingRows = [
  {
    key: "warnBeforeLLM",
    label: "Warn before LLM requests",
    description: "Require review when a future LLM action contains sensitive findings.",
  },
  {
    key: "warnBeforeExport",
    label: "Warn before exports",
    description: "Require review before future prompt and template exports proceed.",
  },
  {
    key: "warnBeforeBackup",
    label: "Warn before backups",
    description: "Require review before future backup preparation proceeds.",
  },
  {
    key: "enableLibraryScan",
    label: "Enable manual library scans",
    description: "Allow user-requested library scans without scheduling or automatic scanning.",
  },
] as const satisfies readonly {
  readonly key: PrivacySettingsKey
  readonly label: string
  readonly description: string
}[]

type PrivacySettingsPanelProps = {
  readonly bridge: PrivacySettingsBridge | null
}

type PrivacySettingsPanelViewProps = {
  readonly controller: UsePrivacySettingsResult
}

export function PrivacySettingsPanelView({ controller }: PrivacySettingsPanelViewProps) {
  function submitSettings(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    void controller.save()
  }

  return (
    <Card aria-labelledby="privacy-settings-heading">
      <CardHeader>
        <CardTitle id="privacy-settings-heading">Privacy settings</CardTitle>
        <CardDescription>
          Configure warning gates. Scans remain manual and never alter draft content.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={submitSettings}>
          <div className="grid gap-2 md:grid-cols-2">
            {privacySettingRows.map((row) => (
              <label
                key={row.key}
                className="flex items-start gap-2 rounded-card border border-border bg-panel-muted p-3 text-[12px] leading-5 text-muted-strong"
              >
                <input
                  className="mt-1 accent-accent"
                  type="checkbox"
                  checked={controller.settings[row.key]}
                  disabled={controller.isWorking}
                  onChange={(event) => controller.setSetting(row.key, event.currentTarget.checked)}
                />
                <span>
                  <span className="block font-medium text-foreground">{row.label}</span>
                  <span className="block text-muted">{row.description}</span>
                </span>
              </label>
            ))}
          </div>

          {controller.message !== null && (
            <output className="block text-[12px] leading-5 text-muted-strong" aria-live="polite">
              {controller.message}
            </output>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12px] leading-5 text-muted">
              {controller.canPersist
                ? "Changes save through the local privacy settings bridge."
                : "Persistence becomes available when the privacy bridge is connected."}
            </p>
            <Button type="submit" disabled={!controller.canPersist || controller.isWorking}>
              {controller.isSaving ? "Saving..." : "Save privacy settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function PrivacySettingsPanel({ bridge }: PrivacySettingsPanelProps) {
  return <PrivacySettingsPanelView controller={usePrivacySettings(bridge)} />
}
