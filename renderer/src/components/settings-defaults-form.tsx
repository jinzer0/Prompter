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
    <Card role="group" aria-labelledby="settings-defaults-heading">
      <CardHeader className="px-5 pt-5">
        <CardTitle id="settings-defaults-heading">화면 및 기본값</CardTitle>
        <CardDescription>앱 테마와 컴파일러 기본값을 관리합니다.</CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {form === null ? (
          <p className="text-[12px] text-muted">Loading settings...</p>
        ) : (
          <form onSubmit={submitDefaults}>
            <fieldset className="min-w-0 space-y-4" disabled={isSaving}>
              <SettingsDefaultsControls form={form} onChange={onChange} />
              <p className="text-[12px] text-muted-strong" aria-live="polite">
                Saved appearance: {savedAppearanceLabel}. Current theme:{" "}
                {appearance.effectiveTheme === "dark" ? "Dark" : "Light"}.
              </p>
              {form.appTheme !== appearance.preference && (
                <p className="text-[12px] text-muted-strong">
                  Unsaved appearance selection. Save defaults to apply; the saved appearance remains
                  active until saving succeeds.
                </p>
              )}
              {message !== null && (
                <p className="text-[14px] text-muted-strong" role="status">
                  {message}
                </p>
              )}
              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save defaults"}
                </Button>
              </div>
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
    <div className="divide-y divide-border-subtle border-y border-border-subtle">
      <label
        htmlFor="settings-default-model"
        className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-center sm:gap-6"
      >
        <span>
          <span className="block text-[14px] font-medium text-foreground">Default model</span>
          <span className="mt-1 block text-[12px] text-muted-strong">
            컴파일러에서 사용할 기본 모델입니다.
          </span>
        </span>
        <Input
          id="settings-default-model"
          aria-label="Default model"
          value={form.defaultModel}
          onChange={(event) => onChange({ ...form, defaultModel: event.currentTarget.value })}
        />
      </label>
      <label
        htmlFor="settings-default-agent"
        className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-center sm:gap-6"
      >
        <span>
          <span className="block text-[14px] font-medium text-foreground">
            Default target agent
          </span>
          <span className="mt-1 block text-[12px] text-muted-strong">
            새 컴파일 요청의 대상 에이전트입니다.
          </span>
        </span>
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
        className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-center sm:gap-6"
      >
        <span>
          <span className="block text-[14px] font-medium text-foreground">Default project ID</span>
          <span className="mt-1 block text-[12px] text-muted-strong">
            기본 프로젝트를 선택 사항으로 지정합니다.
          </span>
        </span>
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
        className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-center sm:gap-6"
      >
        <span>
          <span className="block text-[14px] font-medium text-foreground">Default scenario</span>
          <span className="mt-1 block text-[12px] text-muted-strong">
            새 컴파일 요청의 기본 시나리오입니다.
          </span>
        </span>
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
        className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-center sm:gap-6"
      >
        <span>
          <span className="block text-[14px] font-medium text-foreground">App theme</span>
          <span className="mt-1 block text-[12px] text-muted-strong">
            시스템 설정을 따르거나 밝게 · 어둡게 선택합니다.
          </span>
        </span>
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
        className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-center sm:gap-6"
      >
        <span>
          <span className="block text-[14px] font-medium text-foreground">
            Compiler default language
          </span>
          <span className="mt-1 block text-[12px] text-muted-strong">
            컴파일 결과에 사용할 기본 언어입니다.
          </span>
        </span>
        <Input
          id="settings-compiler-language"
          aria-label="Compiler default language"
          value={form.compilerDefaultLanguage}
          onChange={(event) =>
            onChange({ ...form, compilerDefaultLanguage: event.currentTarget.value })
          }
        />
      </label>
    </div>
  )
}
