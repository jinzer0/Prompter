import { type FormEvent, useEffect, useState } from "react"

import type { PromptTemplate } from "../../../electron/ipc-types"
import {
  type NormalizedPromptTemplateForm,
  normalizePromptTemplateForm,
  type PromptTemplateFormField,
  type PromptTemplateFormInput,
  promptTemplateFormFromTemplate,
} from "../lib/prompt-template-form"
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

export type PromptTemplateEditorMode = "create" | "edit"

type PromptTemplateEditorProps = {
  readonly isSaving: boolean
  readonly mode: PromptTemplateEditorMode
  readonly selectedTemplate: PromptTemplate | null
  readonly onCancel: () => void
  readonly onSubmit: (input: NormalizedPromptTemplateForm) => Promise<void>
}

type FieldError = {
  readonly field: PromptTemplateFormField
  readonly message: string
}

export function PromptTemplateEditor({
  isSaving,
  mode,
  selectedTemplate,
  onCancel,
  onSubmit,
}: PromptTemplateEditorProps) {
  const [form, setForm] = useState<PromptTemplateFormInput>(
    promptTemplateFormFromTemplate(selectedTemplate),
  )
  const [fieldError, setFieldError] = useState<FieldError | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setForm(promptTemplateFormFromTemplate(mode === "create" ? null : selectedTemplate))
    setFieldError(null)
    setMessage(null)
  }, [mode, selectedTemplate])

  async function submitForm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldError(null)
    setMessage(null)

    const result = normalizePromptTemplateForm(form)

    if (!result.ok) {
      setFieldError({ field: result.field, message: result.message })
      return
    }

    try {
      await onSubmit(result.value)
      setMessage(mode === "create" ? "Prompt template created." : "Prompt template saved.")
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message)
        return
      }

      throw error
    }
  }

  function errorFor(field: PromptTemplateFormField): string | null {
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
            {mode === "create" ? "New prompt template" : "Edit prompt template"}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            Prompt templates render into compiler output only after explicit apply.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Close
        </Button>
      </div>

      <Input
        aria-label="Prompt template name"
        placeholder="Prompt template name"
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.currentTarget.value })}
      />
      {errorFor("name") !== null && (
        <p className="text-[12px] text-muted-strong">{errorFor("name")}</p>
      )}

      <Input
        aria-label="Prompt template description"
        placeholder="Optional description"
        value={form.description}
        onChange={(event) => setForm({ ...form, description: event.currentTarget.value })}
      />

      <div className="grid gap-2">
        <Select
          aria-label="Prompt template scenario"
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
          aria-label="Prompt template target agent"
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
        aria-label="Prompt template body"
        placeholder="Prompt template body with {{variables}}"
        value={form.templateBody}
        onChange={(event) => setForm({ ...form, templateBody: event.currentTarget.value })}
      />
      {errorFor("templateBody") !== null && (
        <p className="text-[12px] text-muted-strong">{errorFor("templateBody")}</p>
      )}

      {message !== null && <p className="text-[12px] text-muted-strong">{message}</p>}
      <Button className="w-full" type="submit" disabled={isSaving}>
        Save Prompt Template
      </Button>
    </form>
  )
}
