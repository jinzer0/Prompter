import { type FormEvent, useEffect, useState } from "react"

import type { PromptAsset, PromptVersion } from "../../../electron/ipc-types"
import {
  type NormalizedPromptTemplateFromVersionForm,
  normalizePromptTemplateFromVersionForm,
  type PromptTemplateFromVersionFormField,
  type PromptTemplateFromVersionFormInput,
} from "../lib/prompt-template-form"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"

type SavePromptTemplateFromVersionProps = {
  readonly selectedAsset: PromptAsset
  readonly selectedVersion: PromptVersion
  readonly onSaved: () => void
}

type FieldError = {
  readonly field: PromptTemplateFromVersionFormField
  readonly message: string
}

function formFromVersion(
  selectedAsset: PromptAsset,
  selectedVersion: PromptVersion,
): PromptTemplateFromVersionFormInput {
  return {
    name: `${selectedAsset.title} Template`,
    description: "",
    templateBody: selectedVersion.compiledPrompt,
  }
}

export function SavePromptTemplateFromVersion({
  selectedAsset,
  selectedVersion,
  onSaved,
}: SavePromptTemplateFromVersionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<PromptTemplateFromVersionFormInput>(
    formFromVersion(selectedAsset, selectedVersion),
  )
  const [fieldError, setFieldError] = useState<FieldError | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setForm(formFromVersion(selectedAsset, selectedVersion))
    setFieldError(null)
    setMessage(null)
  }, [selectedAsset, selectedVersion])

  async function submitForm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldError(null)
    setMessage(null)

    const result = normalizePromptTemplateFromVersionForm(
      form,
      selectedAsset.id,
      selectedVersion.id,
    )

    if (!result.ok) {
      setFieldError({ field: result.field, message: result.message })
      return
    }

    const normalized: NormalizedPromptTemplateFromVersionForm = result.value

    setIsSaving(true)
    try {
      await window.prompter.promptTemplates.createFromVersion(normalized.bridgeInput)
      setMessage("Prompt template saved from version.")
      onSaved()
      setIsOpen(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Prompt template could not be saved")
    } finally {
      setIsSaving(false)
    }
  }

  function errorFor(field: PromptTemplateFromVersionFormField): string | null {
    return fieldError?.field === field ? fieldError.message : null
  }

  return (
    <div className="space-y-3 rounded-card border border-border bg-panel-muted p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-medium text-muted-strong">Save as Prompt Template</p>
          <p className="text-[12px] leading-5 text-muted">
            Seed editable template body from this version's compiled prompt.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setIsOpen((current) => !current)}>
          {isOpen ? "Close Template Save" : "Save as template"}
        </Button>
      </div>

      {isOpen && (
        <form className="space-y-3" onSubmit={submitForm}>
          <Input
            aria-label="Version prompt template name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.currentTarget.value })}
          />
          {errorFor("name") !== null && (
            <p className="text-[12px] text-muted-strong">{errorFor("name")}</p>
          )}
          <Input
            aria-label="Version prompt template description"
            placeholder="Optional description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.currentTarget.value })}
          />
          <Textarea
            aria-label="Version prompt template body"
            value={form.templateBody}
            onChange={(event) => setForm({ ...form, templateBody: event.currentTarget.value })}
          />
          {errorFor("templateBody") !== null && (
            <p className="text-[12px] text-muted-strong">{errorFor("templateBody")}</p>
          )}
          {message !== null && <p className="text-[12px] text-muted-strong">{message}</p>}
          <Button type="submit" disabled={isSaving}>
            Create Prompt Template From Version
          </Button>
        </form>
      )}
    </div>
  )
}
