import type { PromptCompilerInput } from "../lib/prompt-compiler/types"
import {
  parseScenario,
  parseTargetAgent,
  scenarioOptions,
  targetAgentOptions,
} from "../lib/prompter-options"
import { Input } from "./ui/input"
import { Select } from "./ui/select"
import { Textarea } from "./ui/textarea"

type PromptCompilerFormProps = {
  readonly draft: PromptCompilerInput
  readonly onChange: (draft: PromptCompilerInput) => void
}

export function PromptCompilerForm({ draft, onChange }: PromptCompilerFormProps) {
  return (
    <div className="space-y-3">
      <Input
        aria-label="Compiler title"
        placeholder="Optional title"
        value={draft.title ?? ""}
        onChange={(event) => onChange({ ...draft, title: event.currentTarget.value })}
      />
      <Textarea
        aria-label="Original request"
        placeholder="Original request"
        value={draft.originalInput}
        onChange={(event) => onChange({ ...draft, originalInput: event.currentTarget.value })}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <Select
          aria-label="Compile mode"
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
          aria-label="Compile runner"
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
        aria-label="Project context"
        placeholder="Project context"
        value={draft.projectContext ?? ""}
        onChange={(event) => onChange({ ...draft, projectContext: event.currentTarget.value })}
      />
      <Input
        aria-label="Compiler stack"
        placeholder="Tech stack"
        value={draft.techStack ?? ""}
        onChange={(event) => onChange({ ...draft, techStack: event.currentTarget.value })}
      />
      <Textarea
        aria-label="Constraints"
        placeholder="Constraints"
        value={draft.constraints ?? ""}
        onChange={(event) => onChange({ ...draft, constraints: event.currentTarget.value })}
      />
      <Textarea
        aria-label="Acceptance criteria"
        placeholder="Acceptance criteria"
        value={draft.acceptanceCriteria ?? ""}
        onChange={(event) => onChange({ ...draft, acceptanceCriteria: event.currentTarget.value })}
      />
      <Textarea
        aria-label="Validation commands"
        placeholder="Validation commands"
        value={draft.validationCommands ?? ""}
        onChange={(event) => onChange({ ...draft, validationCommands: event.currentTarget.value })}
      />
      <Textarea
        aria-label="Additional notes"
        placeholder="Additional notes"
        value={draft.additionalNotes ?? ""}
        onChange={(event) => onChange({ ...draft, additionalNotes: event.currentTarget.value })}
      />
    </div>
  )
}
