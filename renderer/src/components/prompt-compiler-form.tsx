import type { ReactNode, Ref } from "react"

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
  readonly children?: ReactNode
  readonly draft: PromptCompilerInput
  readonly originalRequestRef?: Ref<HTMLTextAreaElement>
  readonly onChange: (draft: PromptCompilerInput) => void
}

export function PromptCompilerForm({
  children,
  draft,
  originalRequestRef,
  onChange,
}: PromptCompilerFormProps) {
  return (
    <div className="space-y-3">
      <label className="block text-[14px] font-medium" htmlFor="compiler-original-request">
        핵심 요청
      </label>
      <Textarea
        id="compiler-original-request"
        data-privacy-field="originalInput"
        aria-label="Original request"
        placeholder="Original request"
        ref={originalRequestRef}
        value={draft.originalInput}
        onChange={(event) => onChange({ ...draft, originalInput: event.currentTarget.value })}
      />
      <details className="border-y border-border-subtle py-3">
        <summary className="cursor-pointer text-[14px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          추가 옵션
        </summary>
        <section
          aria-label="컴파일러 추가 옵션"
          className="mt-3 max-h-96 space-y-3 overflow-y-auto p-1"
        >
          <Input
            aria-label="Compiler title"
            placeholder="Optional title"
            value={draft.title ?? ""}
            onChange={(event) => onChange({ ...draft, title: event.currentTarget.value })}
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
            data-privacy-field="projectContext"
            aria-label="Project context"
            placeholder="Project context"
            value={draft.projectContext ?? ""}
            onChange={(event) => onChange({ ...draft, projectContext: event.currentTarget.value })}
          />
          <Input
            data-privacy-field="techStack"
            aria-label="Compiler stack"
            placeholder="Tech stack"
            value={draft.techStack ?? ""}
            onChange={(event) => onChange({ ...draft, techStack: event.currentTarget.value })}
          />
          <Textarea
            data-privacy-field="constraints"
            aria-label="Constraints"
            placeholder="Constraints"
            value={draft.constraints ?? ""}
            onChange={(event) => onChange({ ...draft, constraints: event.currentTarget.value })}
          />
          <Textarea
            data-privacy-field="acceptanceCriteria"
            aria-label="Acceptance criteria"
            placeholder="Acceptance criteria"
            value={draft.acceptanceCriteria ?? ""}
            onChange={(event) =>
              onChange({ ...draft, acceptanceCriteria: event.currentTarget.value })
            }
          />
          <Textarea
            data-privacy-field="validationCommands"
            aria-label="Validation commands"
            placeholder="Validation commands"
            value={draft.validationCommands ?? ""}
            onChange={(event) =>
              onChange({ ...draft, validationCommands: event.currentTarget.value })
            }
          />
          <Textarea
            data-privacy-field="additionalNotes"
            aria-label="Additional notes"
            placeholder="Additional notes"
            value={draft.additionalNotes ?? ""}
            onChange={(event) => onChange({ ...draft, additionalNotes: event.currentTarget.value })}
          />
          {children}
        </section>
      </details>
    </div>
  )
}
