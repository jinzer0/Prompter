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
      className="min-w-0 space-y-3 rounded-card border border-transparent bg-panel p-4 text-[14px] [overflow-wrap:anywhere]"
      onSubmit={submitForm}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-muted">
            {mode === "create" ? "New prompt template" : "Edit prompt template"}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            Prompt templates render into compiler output only after explicit apply.
          </p>
        </div>
        <Button
          className="h-auto min-w-0 whitespace-normal text-[14px]"
          size="sm"
          variant="ghost"
          onClick={onCancel}
        >
          Close
        </Button>
      </div>

      <Input
        aria-label="Prompt template name"
        className="min-w-0 max-w-full"
        placeholder="Prompt template name"
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.currentTarget.value })}
      />
      {errorFor("name") !== null && (
        <p className="text-[14px] text-muted-strong">{errorFor("name")}</p>
      )}

      <Input
        aria-label="Prompt template description"
        className="min-w-0 max-w-full"
        placeholder="Optional description"
        value={form.description}
        onChange={(event) => setForm({ ...form, description: event.currentTarget.value })}
      />

      <div className="grid min-w-0 gap-2">
        <Select
          aria-label="Prompt template scenario"
          className="min-w-0 max-w-full"
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
          className="min-w-0 max-w-full"
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
        className="min-w-0 max-w-full"
        placeholder="Prompt template body with {{variables}}"
        value={form.templateBody}
        onChange={(event) => setForm({ ...form, templateBody: event.currentTarget.value })}
      />
      {errorFor("templateBody") !== null && (
        <p className="text-[14px] text-muted-strong">{errorFor("templateBody")}</p>
      )}

      {message !== null && <p className="text-[14px] text-muted-strong">{message}</p>}
      <Button className="h-auto w-full min-w-0 whitespace-normal" type="submit" disabled={isSaving}>
        Save Prompt Template
      </Button>
    </form>
  )
}
