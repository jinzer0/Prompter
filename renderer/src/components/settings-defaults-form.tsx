import type { FormEvent } from "react"

import { useAppearance } from "../hooks/use-appearance"
import type { DefaultsForm } from "../hooks/use-settings-panel"
import {
  appThemeOptions,
  parseAppTheme,
  parseScenario,
  parseTargetAgent,
  scenarioOptions,
  targetAgentOptions,
} from "../lib/prompter-options"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Select } from "./ui/select"

type SettingsDefaultsFormProps = {
  readonly form: DefaultsForm | null
  readonly isSaving: boolean
  readonly message: string | null
  readonly onChange: (form: DefaultsForm) => void
  readonly onSave: (form: DefaultsForm) => Promise<void>
}

export function SettingsDefaultsForm({
  form,
  isSaving,
  message,
  onChange,
  onSave,
}: SettingsDefaultsFormProps) {
  const appearance = useAppearance()
  const savedAppearanceLabel = appThemeOptions.find(
    (option) => option.value === appearance.preference,
  )?.label

  async function submitDefaults(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (form !== null && !isSaving) {
      await onSave(form)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>화면 및 기본값</CardTitle>
        <CardDescription>앱 테마와 컴파일러 기본값을 관리합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {form === null ? (
          <p className="text-[12px] text-muted">Loading settings...</p>
        ) : (
          <form className="space-y-3" onSubmit={submitDefaults}>
            <fieldset className="space-y-3" disabled={isSaving}>
              <SettingsDefaultsControls form={form} onChange={onChange} />
              <p className="text-[12px] text-muted-strong" aria-live="polite">
                Saved appearance: {savedAppearanceLabel}. Current theme:{" "}
                {appearance.effectiveTheme === "dark" ? "Dark" : "Light"}.
              </p>
              {form.appTheme !== appearance.preference && (
                <p className="text-[14px] text-muted-strong">
                  Unsaved appearance selection. Save defaults to apply; the saved appearance remains
                  active until saving succeeds.
                </p>
              )}
              {message !== null && (
                <p className="text-[14px] text-muted-strong" role="status">
                  {message}
                </p>
              )}
              <Button className="w-full" type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save defaults"}
              </Button>
            </fieldset>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

type SettingsDefaultsControlsProps = {
  readonly form: DefaultsForm
  readonly onChange: (form: DefaultsForm) => void
}

function SettingsDefaultsControls({ form, onChange }: SettingsDefaultsControlsProps) {
  return (
    <>
      <label
        htmlFor="settings-default-model"
        className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:items-center"
      >
        <span className="text-[14px] font-medium">Default model</span>
        <Input
          id="settings-default-model"
          aria-label="Default model"
          value={form.defaultModel}
          onChange={(event) => onChange({ ...form, defaultModel: event.currentTarget.value })}
        />
      </label>
      <label
        htmlFor="settings-default-agent"
        className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:items-center"
      >
        <span className="text-[14px] font-medium">Default target agent</span>
        <Select
          id="settings-default-agent"
          aria-label="Default target agent"
          value={form.defaultTargetAgent}
          onChange={(event) =>
            onChange({ ...form, defaultTargetAgent: parseTargetAgent(event.currentTarget.value) })
          }
        >
          {targetAgentOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>
      <label
        htmlFor="settings-default-project"
        className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:items-center"
      >
        <span className="text-[14px] font-medium">Default project ID</span>
        <Input
          id="settings-default-project"
          aria-label="Default project ID"
          placeholder="프로젝트 ID (선택 사항)"
          value={form.defaultProjectId}
          onChange={(event) => onChange({ ...form, defaultProjectId: event.currentTarget.value })}
        />
      </label>
      <label
        htmlFor="settings-default-scenario"
        className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:items-center"
      >
        <span className="text-[14px] font-medium">Default scenario</span>
        <Select
          id="settings-default-scenario"
          aria-label="Default scenario"
          value={form.defaultScenario}
          onChange={(event) =>
            onChange({ ...form, defaultScenario: parseScenario(event.currentTarget.value) })
          }
        >
          {scenarioOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>
      <label
        htmlFor="settings-app-theme"
        className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:items-center"
      >
        <span className="text-[14px] font-medium">App theme</span>
        <Select
          id="settings-app-theme"
          aria-label="App theme"
          value={form.appTheme}
          onChange={(event) =>
            onChange({ ...form, appTheme: parseAppTheme(event.currentTarget.value) })
          }
        >
          {appThemeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>
      <label
        htmlFor="settings-compiler-language"
        className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:items-center"
      >
        <span className="text-[14px] font-medium">Compiler default language</span>
        <Input
          id="settings-compiler-language"
          aria-label="Compiler default language"
          value={form.compilerDefaultLanguage}
          onChange={(event) =>
            onChange({ ...form, compilerDefaultLanguage: event.currentTarget.value })
          }
        />
      </label>
    </>
  )
}
