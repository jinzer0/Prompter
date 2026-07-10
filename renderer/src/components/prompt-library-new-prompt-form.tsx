import type { FormEvent } from "react"

import type { PromptScenario, TargetAgent } from "../lib/prompter-options"
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

export type PromptDraft = {
  readonly title: string
  readonly scenario: PromptScenario
  readonly targetAgent: TargetAgent
  readonly originalInput: string
  readonly compiledPrompt: string
}

export const emptyPromptDraft: PromptDraft = {
  title: "",
  scenario: "feature",
  targetAgent: "codex",
  originalInput: "",
  compiledPrompt: "",
}

type PromptLibraryNewPromptFormProps = {
  readonly draft: PromptDraft
  readonly isSaving: boolean
  readonly message: string | null
  readonly onChange: (draft: PromptDraft) => void
  readonly onSubmit: () => Promise<void>
}

export function PromptLibraryNewPromptForm({
  draft,
  isSaving,
  message,
  onChange,
  onSubmit,
}: PromptLibraryNewPromptFormProps) {
  function submitPrompt(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    void onSubmit()
  }

  return (
    <form
      className="mt-4 space-y-3 rounded-card border border-border bg-panel-elevated p-4"
      onSubmit={submitPrompt}
    >
      <Input
        aria-label="Prompt title"
        placeholder="Prompt title"
        value={draft.title}
        onChange={(event) => onChange({ ...draft, title: event.currentTarget.value })}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <Select
          aria-label="Scenario"
          value={draft.scenario}
          onChange={(event) =>
            onChange({ ...draft, scenario: parseScenario(event.currentTarget.value) })
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
          value={draft.targetAgent}
          onChange={(event) =>
            onChange({ ...draft, targetAgent: parseTargetAgent(event.currentTarget.value) })
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
        aria-label="Original input"
        placeholder="Original input"
        value={draft.originalInput}
        onChange={(event) => onChange({ ...draft, originalInput: event.currentTarget.value })}
      />
      <Textarea
        aria-label="Compiled prompt"
        placeholder="Compiled prompt"
        value={draft.compiledPrompt}
        onChange={(event) => onChange({ ...draft, compiledPrompt: event.currentTarget.value })}
      />
      {message !== null && <p className="text-[12px] text-muted-strong">{message}</p>}
      {isSaving && <p className="text-[12px] text-muted">Saving prompt...</p>}
      <Button type="submit" disabled={isSaving}>
        Save Prompt
      </Button>
    </form>
  )
}
