import { type FormEvent, useEffect, useState } from "react"

import type { ProjectContextProfile } from "../../../electron/ipc-types"
import {
  emptyProjectContextProfileForm,
  type NormalizedProjectContextProfileForm,
  normalizeProjectContextProfileForm,
  type ProjectContextProfileFormField,
  type ProjectContextProfileFormInput,
  type ProjectContextProfileTextField,
  projectContextProfileFormFromProfile,
  projectContextProfileTextFields,
} from "../lib/project-context-profile-form"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"

export type ProjectContextProfileEditorMode = "create" | "edit"

type ProjectContextProfileEditorProps = {
  readonly isSaving: boolean
  readonly mode: ProjectContextProfileEditorMode
  readonly selectedProfile: ProjectContextProfile | null
  readonly onCancel: () => void
  readonly onSubmit: (input: NormalizedProjectContextProfileForm) => Promise<void>
}

type FieldError = {
  readonly field: ProjectContextProfileFormField
  readonly message: string
}

function formForMode(
  mode: ProjectContextProfileEditorMode,
  selectedProfile: ProjectContextProfile | null,
): ProjectContextProfileFormInput {
  return mode === "create"
    ? emptyProjectContextProfileForm
    : projectContextProfileFormFromProfile(selectedProfile)
}

export function ProjectContextProfileEditor({
  isSaving,
  mode,
  selectedProfile,
  onCancel,
  onSubmit,
}: ProjectContextProfileEditorProps) {
  const [form, setForm] = useState<ProjectContextProfileFormInput>(
    formForMode(mode, selectedProfile),
  )
  const [fieldError, setFieldError] = useState<FieldError | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setForm(formForMode(mode, selectedProfile))
    setFieldError(null)
    setMessage(null)
  }, [mode, selectedProfile])

  async function submitForm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldError(null)
    setMessage(null)

    const result = normalizeProjectContextProfileForm(form)

    if (!result.ok) {
      setFieldError({ field: result.field, message: result.message })
      return
    }

    try {
      await onSubmit(result.value)
      setMessage(mode === "create" ? "Context profile created." : "Context profile saved.")
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message)
        return
      }

      throw error
    }
  }

  function updateTextField(field: ProjectContextProfileTextField, value: string): void {
    setForm({ ...form, [field]: value })
  }

  function errorFor(field: ProjectContextProfileFormField): string | null {
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
            {mode === "create" ? "New context profile" : "Edit context profile"}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            Profile body fields keep whitespace exactly; only the name is trimmed.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Close
        </Button>
      </div>

      <Input
        aria-label="Context profile name"
        placeholder="Context profile name"
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.currentTarget.value })}
      />
      {errorFor("name") !== null && (
        <p className="text-[12px] text-muted-strong">{errorFor("name")}</p>
      )}

      <label className="flex items-center gap-2 text-[12px] text-muted-strong">
        <input
          type="checkbox"
          className="size-4 rounded-control accent-accent"
          checked={form.isDefault}
          onChange={(event) => setForm({ ...form, isDefault: event.currentTarget.checked })}
        />
        Use as default context profile
      </label>

      {projectContextProfileTextFields.map((field) => (
        <label
          key={field.field}
          htmlFor={`context-profile-${field.field}`}
          className="block space-y-1 text-[12px] text-muted-strong"
        >
          <span>{field.label}</span>
          <Textarea
            aria-label={field.label}
            id={`context-profile-${field.field}`}
            className="min-h-24 font-mono text-[12px] leading-5"
            placeholder={field.placeholder}
            value={form[field.field]}
            onChange={(event) => updateTextField(field.field, event.currentTarget.value)}
          />
        </label>
      ))}

      {message !== null && <p className="text-[12px] text-muted-strong">{message}</p>}
      <Button className="w-full" type="submit" disabled={isSaving}>
        Save Context Profile
      </Button>
    </form>
  )
}
