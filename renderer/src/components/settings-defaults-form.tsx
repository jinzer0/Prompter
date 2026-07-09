import type { FormEvent } from "react"

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
  async function submitDefaults(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (form !== null) {
      await onSave(form)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Defaults</CardTitle>
        <CardDescription>Non-secret compiler defaults saved to SQLite settings.</CardDescription>
      </CardHeader>
      <CardContent>
        {form === null ? (
          <p className="text-[12px] text-muted">Loading settings...</p>
        ) : (
          <form className="space-y-3" onSubmit={submitDefaults}>
            <SettingsDefaultsControls form={form} onChange={onChange} />
            {message !== null && <p className="text-[12px] text-muted-strong">{message}</p>}
            <Button className="w-full" type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save defaults"}
            </Button>
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
      <Input
        aria-label="Default model"
        value={form.defaultModel}
        onChange={(event) => onChange({ ...form, defaultModel: event.currentTarget.value })}
      />
      <Select
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
      <Input
        aria-label="Default project ID"
        placeholder="Optional project UUID"
        value={form.defaultProjectId}
        onChange={(event) => onChange({ ...form, defaultProjectId: event.currentTarget.value })}
      />
      <Select
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
      <Select
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
      <Input
        aria-label="Compiler default language"
        value={form.compilerDefaultLanguage}
        onChange={(event) =>
          onChange({ ...form, compilerDefaultLanguage: event.currentTarget.value })
        }
      />
    </>
  )
}
