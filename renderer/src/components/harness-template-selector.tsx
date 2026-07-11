import type { HarnessTemplate } from "../../../electron/ipc-types"
import type { PromptScenario, TargetAgent } from "../lib/prompter-options"
import { Select } from "./ui/select"

export const HARNESS_TEMPLATE_MISMATCH_WARNING =
  "Selected harness scenario or target agent differs from the current compiler draft." as const

type HarnessTemplateSelectorProps = {
  readonly error: string | null
  readonly scenario: PromptScenario
  readonly selectedTemplateId: string | null
  readonly status: "idle" | "loading" | "ready" | "error"
  readonly targetAgent: TargetAgent
  readonly templates: readonly HarnessTemplate[]
  readonly onChange: (id: string | null) => void
}

function matchesDraft(
  template: HarnessTemplate,
  scenario: PromptScenario,
  targetAgent: TargetAgent,
): boolean {
  return template.scenario === scenario && template.targetAgent === targetAgent
}

function orderedTemplates(
  templates: readonly HarnessTemplate[],
  scenario: PromptScenario,
  targetAgent: TargetAgent,
): readonly HarnessTemplate[] {
  const matchingTemplates = templates.filter((template) =>
    matchesDraft(template, scenario, targetAgent),
  )
  const otherTemplates = templates.filter(
    (template) => !matchesDraft(template, scenario, targetAgent),
  )

  return [...matchingTemplates, ...otherTemplates]
}

export function HarnessTemplateSelector({
  error,
  scenario,
  selectedTemplateId,
  status,
  targetAgent,
  templates,
  onChange,
}: HarnessTemplateSelectorProps) {
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null
  const hasMismatch =
    selectedTemplate !== null && !matchesDraft(selectedTemplate, scenario, targetAgent)
  const sortedTemplates = orderedTemplates(templates, scenario, targetAgent)

  return (
    <section className="space-y-2 rounded-card border border-border bg-panel-muted p-3">
      <div className="space-y-1">
        <label className="text-[12px] font-medium text-muted-strong" htmlFor="harness-template">
          Harness template
        </label>
        <Select
          id="harness-template"
          aria-label="Harness template"
          value={selectedTemplateId ?? ""}
          onChange={(event) => onChange(event.currentTarget.value || null)}
        >
          <option value="">Default compiler template</option>
          {sortedTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </Select>
      </div>
      {status === "loading" && <p className="text-[12px] text-muted">Loading harnesses...</p>}
      {status === "error" && <p className="text-[12px] text-muted-strong">{error}</p>}
      {hasMismatch && (
        <p className="text-[12px] text-muted-strong">{HARNESS_TEMPLATE_MISMATCH_WARNING}</p>
      )}
    </section>
  )
}
