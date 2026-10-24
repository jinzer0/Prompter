import type { PromptTemplate } from "../../../electron/ipc-types"
import type { PromptScenario, TargetAgent } from "../lib/prompter-options"
import {
  scenarioLabel,
  scenarioOptions,
  targetAgentLabel,
  targetAgentOptions,
} from "../lib/prompter-options"
import { SidebarItem } from "./shell/sidebar-item"
import { Button } from "./ui/button"
import { EmptyState } from "./ui/empty-state"
import { Input } from "./ui/input"
import { Select } from "./ui/select"

export type PromptTemplateScenarioFilter = PromptScenario | ""
export type PromptTemplateTargetAgentFilter = TargetAgent | ""

type PromptTemplateSidebarSectionProps = {
  readonly error: string | null
  readonly hasActiveFilters: boolean
  readonly query: string
  readonly scenario: PromptTemplateScenarioFilter
  readonly selectedTemplateId: string | null
  readonly status: "idle" | "loading" | "ready" | "error"
  readonly targetAgent: PromptTemplateTargetAgentFilter
  readonly templates: readonly PromptTemplate[]
  readonly onClearFilters: () => void
  readonly onDuplicateSelected: () => void
  readonly onNewTemplate: () => void
  readonly onQueryChange: (query: string) => void
  readonly onRequestDelete: () => void
  readonly onScenarioChange: (scenario: PromptTemplateScenarioFilter) => void
  readonly onSelectTemplate: (id: string) => void
  readonly onTargetAgentChange: (targetAgent: PromptTemplateTargetAgentFilter) => void
}

function scenarioFilterFromValue(value: string): PromptTemplateScenarioFilter {
  return scenarioOptions.find((option) => option.value === value)?.value ?? ""
}

function targetAgentFilterFromValue(value: string): PromptTemplateTargetAgentFilter {
  return targetAgentOptions.find((option) => option.value === value)?.value ?? ""
}

function sourceLabel(template: PromptTemplate): string {
  return template.sourcePromptVersionId === null ? "Source-less" : "Saved from prompt version"
}

export function PromptTemplateSidebarSection({
  error,
  hasActiveFilters,
  query,
  scenario,
  selectedTemplateId,
  status,
  targetAgent,
  templates,
  onClearFilters,
  onDuplicateSelected,
  onNewTemplate,
  onQueryChange,
  onRequestDelete,
  onScenarioChange,
  onSelectTemplate,
  onTargetAgentChange,
}: PromptTemplateSidebarSectionProps) {
  const hasSelection = selectedTemplateId !== null

  return (
    <section
      className="min-w-0 space-y-3 rounded-card bg-panel p-4 [overflow-wrap:anywhere]"
      aria-labelledby="prompt-templates-heading"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h2
          id="prompt-templates-heading"
          className="min-w-0 text-[17px] font-semibold text-foreground"
        >
          Prompt Templates
        </h2>
        <Button
          aria-label="New Prompt Template"
          className="h-auto min-w-0 whitespace-normal text-[14px]"
          variant="ghost"
          size="sm"
          onClick={onNewTemplate}
        >
          New
        </Button>
      </div>

      <div className="min-w-0 space-y-2">
        <Input
          aria-label="Search prompt templates"
          className="min-w-0 max-w-full"
          placeholder="Search templates"
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
        />
        <Select
          aria-label="Prompt template scenario filter"
          className="min-w-0 max-w-full"
          value={scenario}
          onChange={(event) => onScenarioChange(scenarioFilterFromValue(event.currentTarget.value))}
        >
          <option value="">All scenarios</option>
          {scenarioOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Prompt template target agent filter"
          className="min-w-0 max-w-full"
          value={targetAgent}
          onChange={(event) =>
            onTargetAgentChange(targetAgentFilterFromValue(event.currentTarget.value))
          }
        >
          <option value="">All agents</option>
          {targetAgentOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button
            className="h-auto min-w-0 whitespace-normal text-[14px]"
            size="sm"
            variant="secondary"
            disabled={!hasSelection}
            aria-label="Duplicate Prompt Template"
            onClick={onDuplicateSelected}
          >
            Duplicate
          </Button>
          <Button
            aria-label="Delete Prompt Template"
            className="h-auto min-w-0 whitespace-normal text-[14px]"
            size="sm"
            variant="ghost"
            disabled={!hasSelection}
            onClick={onRequestDelete}
          >
            Delete
          </Button>
          {hasActiveFilters && (
            <Button
              className="h-auto min-w-0 whitespace-normal text-[14px]"
              size="sm"
              variant="ghost"
              onClick={onClearFilters}
            >
              Clear prompt template filters
            </Button>
          )}
        </div>
      </div>

      <div className="min-w-0 divide-y divide-border-subtle">
        {status === "loading" && (
          <p className="text-[12px] text-muted">Loading prompt templates...</p>
        )}
        {status === "error" && <p className="text-[12px] text-muted-strong">{error}</p>}
        {templates.map((template) => {
          const isSelected = template.id === selectedTemplateId

          return (
            <SidebarItem
              key={template.id}
              aria-current={isSelected ? "page" : undefined}
              aria-label={`${template.name}, ${scenarioLabel(template.scenario)}, ${targetAgentLabel(
                template.targetAgent,
              )}, ${sourceLabel(template)}`}
              className="h-auto min-h-14 min-w-0 flex-wrap items-start gap-2 whitespace-normal rounded-none py-2"
              variant={isSelected ? "active" : "default"}
              onClick={() => onSelectTemplate(template.id)}
            >
              <span className="flex min-w-0 flex-col items-start gap-1">
                <span className="max-w-full text-[14px] [overflow-wrap:anywhere]">
                  {template.name}
                </span>
                <span className="max-w-full text-[12px] font-normal text-muted [overflow-wrap:anywhere]">
                  {scenarioLabel(template.scenario)} · {targetAgentLabel(template.targetAgent)}
                </span>
                <span className="max-w-full font-mono text-[12px] font-normal text-muted [overflow-wrap:anywhere]">
                  {sourceLabel(template)}
                </span>
              </span>
            </SidebarItem>
          )
        })}
      </div>

      {status === "ready" && templates.length === 0 && !hasActiveFilters && (
        <EmptyState
          title="No prompt templates yet"
          description="Create a source-less template or save one from a prompt version."
        />
      )}
      {status === "ready" && templates.length === 0 && hasActiveFilters && (
        <EmptyState
          title="No prompt templates match your filters"
          description="Clear prompt template filters or adjust the query."
        />
      )}
    </section>
  )
}
