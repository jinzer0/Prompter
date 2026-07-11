import { type FormEvent, useEffect, useState } from "react"

import type { HarnessTemplate } from "../../../electron/ipc-types"
import {
  type HarnessTemplateFormField,
  type HarnessTemplateFormInput,
  type NormalizedHarnessTemplateForm,
  normalizeHarnessTemplateForm,
} from "../lib/harness-template-form"
import {
  parseScenario,
  parseTargetAgent,
  scenarioOptions,
  targetAgentOptions,
} from "../lib/prompter-options"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select } from "./ui/select"
import { Textarea } from "./ui/textarea"

export type HarnessTemplateEditorMode = "create" | "edit"

type HarnessTemplateEditorProps = {
  readonly isSaving: boolean
  readonly mode: HarnessTemplateEditorMode
  readonly selectedTemplate: HarnessTemplate | null
  readonly onCancel: () => void
  readonly onSubmit: (input: NormalizedHarnessTemplateForm) => Promise<void>
}

type FieldError = {
  readonly field: HarnessTemplateFormField
  readonly message: string
}

const emptyHarnessTemplateForm: HarnessTemplateFormInput = {
  name: "",
  scenario: "feature",
  targetAgent: "generic_agent",
  templateBody: "",
  requiredFields: "",
  clarificationPolicy: "",
}

function formFromTemplate(template: HarnessTemplate | null): HarnessTemplateFormInput {
  if (template === null) {
    return emptyHarnessTemplateForm
  }

  return {
    name: template.name,
    scenario: template.scenario,
    targetAgent: template.targetAgent,
    templateBody: template.templateBody,
    requiredFields: template.requiredFields ?? "",
    clarificationPolicy: template.clarificationPolicy ?? "",
  }
}

export function HarnessTemplateEditor({
  isSaving,
  mode,
  selectedTemplate,
  onCancel,
  onSubmit,
}: HarnessTemplateEditorProps) {
  const [form, setForm] = useState<HarnessTemplateFormInput>(formFromTemplate(selectedTemplate))
  const [fieldError, setFieldError] = useState<FieldError | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setForm(formFromTemplate(mode === "create" ? null : selectedTemplate))
    setFieldError(null)
    setMessage(null)
  }, [mode, selectedTemplate])

  async function submitForm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldError(null)
    setMessage(null)

    const result = normalizeHarnessTemplateForm(form)

    if (!result.ok) {
      setFieldError({ field: result.field, message: result.message })
      return
    }

    try {
      await onSubmit(result.value)
      setMessage(mode === "create" ? "Harness template created." : "Harness template saved.")
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message)
        return
      }

      throw error
    }
  }

  function errorFor(field: HarnessTemplateFormField): string | null {
    return fieldError?.field === field ? fieldError.message : null
  }

  return (
    <form
      className="space-y-3 rounded-card border border-border bg-panel-muted p-3"
      onSubmit={submitForm}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            {mode === "create" ? "New harness" : "Edit harness"}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            JSON fields are validated locally before bridge calls.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Close
        </Button>
      </div>

      <Input
        aria-label="Harness name"
        placeholder="Harness name"
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.currentTarget.value })}
      />
      {errorFor("name") !== null && (
        <p className="text-[12px] text-muted-strong">{errorFor("name")}</p>
      )}

      <div className="grid gap-2">
        <Select
          aria-label="Scenario"
          value={form.scenario}
          onChange={(event) =>
            setForm({ ...form, scenario: parseScenario(event.currentTarget.value) })
          }
        >
          {scenarioOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Target agent"
          value={form.targetAgent}
          onChange={(event) =>
            setForm({ ...form, targetAgent: parseTargetAgent(event.currentTarget.value) })
          }
        >
          {targetAgentOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <Textarea
        aria-label="Template body"
        placeholder="Template body"
        value={form.templateBody}
        onChange={(event) => setForm({ ...form, templateBody: event.currentTarget.value })}
      />
      {errorFor("templateBody") !== null && (
        <p className="text-[12px] text-muted-strong">{errorFor("templateBody")}</p>
      )}

      <Textarea
        aria-label="Required fields JSON"
        className="min-h-24 font-mono text-[12px] leading-5"
        placeholder='["originalInput"]'
        value={form.requiredFields}
        onChange={(event) => setForm({ ...form, requiredFields: event.currentTarget.value })}
      />
      {errorFor("requiredFields") !== null && (
        <p className="text-[12px] text-muted-strong">{errorFor("requiredFields")}</p>
      )}

      <Textarea
        aria-label="Clarification policy JSON"
        className="min-h-24 font-mono text-[12px] leading-5"
        placeholder='{"mode":"ask_when_missing"}'
        value={form.clarificationPolicy}
        onChange={(event) => setForm({ ...form, clarificationPolicy: event.currentTarget.value })}
      />
      {errorFor("clarificationPolicy") !== null && (
        <p className="text-[12px] text-muted-strong">{errorFor("clarificationPolicy")}</p>
      )}

      {message !== null && <p className="text-[12px] text-muted-strong">{message}</p>}
      <Button className="w-full" type="submit" disabled={isSaving}>
        Save Harness
      </Button>
    </form>
  )
}
