import type { HarnessTemplate } from "../../../electron/ipc-types"
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

export type HarnessScenarioFilter = PromptScenario | ""
export type HarnessTargetAgentFilter = TargetAgent | ""

type HarnessTemplateSidebarSectionProps = {
  readonly error: string | null
  readonly hasActiveFilters: boolean
  readonly query: string
  readonly scenario: HarnessScenarioFilter
  readonly selectedTemplateId: string | null
  readonly status: "idle" | "loading" | "ready" | "error"
  readonly targetAgent: HarnessTargetAgentFilter
  readonly templates: readonly HarnessTemplate[]
  readonly onClearFilters: () => void
  readonly onDuplicateSelected: () => void
  readonly onNewTemplate: () => void
  readonly onQueryChange: (query: string) => void
  readonly onRequestDelete: () => void
  readonly onScenarioChange: (scenario: HarnessScenarioFilter) => void
  readonly onSelectTemplate: (id: string) => void
  readonly onTargetAgentChange: (targetAgent: HarnessTargetAgentFilter) => void
}

function scenarioFilterFromValue(value: string): HarnessScenarioFilter {
  return scenarioOptions.find((option) => option.value === value)?.value ?? ""
}

function targetAgentFilterFromValue(value: string): HarnessTargetAgentFilter {
  return targetAgentOptions.find((option) => option.value === value)?.value ?? ""
}

function formatUpdatedAt(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 16).replace("T", " ")
}

export function HarnessTemplateSidebarSection({
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
}: HarnessTemplateSidebarSectionProps) {
  const hasSelection = selectedTemplateId !== null

  return (
    <section
      className="min-w-0 space-y-3 rounded-card bg-panel p-4 [overflow-wrap:anywhere]"
      aria-labelledby="harnesses-heading"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h2 id="harnesses-heading" className="min-w-0 text-[17px] font-semibold text-foreground">
          Harnesses
        </h2>
        <Button
          aria-label="New Harness"
          className="h-auto min-w-0 max-w-full whitespace-normal"
          variant="ghost"
          size="sm"
          onClick={onNewTemplate}
        >
          New
        </Button>
      </div>

      <div className="min-w-0 space-y-2">
        <Input
          aria-label="Search harnesses"
          className="min-w-0 max-w-full text-[14px]"
          placeholder="Search harnesses"
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
        />
        <Select
          aria-label="Harness scenario filter"
          className="min-w-0 max-w-full text-[14px]"
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
          aria-label="Harness target agent filter"
          className="min-w-0 max-w-full text-[14px]"
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
        <div className="flex flex-wrap gap-2">
          <Button
            className="h-auto min-w-0 max-w-full whitespace-normal"
            size="sm"
            variant="secondary"
            disabled={!hasSelection}
            aria-label="Duplicate Harness"
            onClick={onDuplicateSelected}
          >
            Duplicate
          </Button>
          <Button
            aria-label="Delete Harness"
            className="h-auto min-w-0 max-w-full whitespace-normal"
            size="sm"
            variant="ghost"
            disabled={!hasSelection}
            onClick={onRequestDelete}
          >
            Delete
          </Button>
          {hasActiveFilters && (
            <Button
              className="h-auto min-w-0 max-w-full whitespace-normal"
              size="sm"
              variant="ghost"
              onClick={onClearFilters}
            >
              Clear harness filters
            </Button>
          )}
        </div>
      </div>

      <div className="min-w-0 divide-y divide-border-subtle">
        {status === "loading" && <p className="text-[12px] text-muted">Loading harnesses...</p>}
        {status === "error" && <p className="text-[12px] text-muted-strong">{error}</p>}
        {templates.map((template) => {
          const updatedAt = formatUpdatedAt(template.updatedAt)
          const isSelected = template.id === selectedTemplateId

          return (
            <SidebarItem
              key={template.id}
              aria-current={isSelected ? "page" : undefined}
              aria-label={`${template.name}, ${scenarioLabel(template.scenario)}, ${targetAgentLabel(
                template.targetAgent,
              )}, Updated ${updatedAt}`}
              className="h-auto min-h-14 min-w-0 max-w-full items-start gap-2 rounded-none py-2 whitespace-normal [overflow-wrap:anywhere]"
              variant={isSelected ? "active" : "default"}
              onClick={() => onSelectTemplate(template.id)}
            >
              <span className="flex min-w-0 max-w-full flex-col items-start gap-1">
                <span className="max-w-full whitespace-normal text-[14px]">{template.name}</span>
                <span className="max-w-full text-[12px] font-normal text-muted">
                  {scenarioLabel(template.scenario)} · {targetAgentLabel(template.targetAgent)}
                </span>
                <span className="max-w-full font-mono text-[12px] font-normal text-muted">
                  Updated {updatedAt}
                </span>
              </span>
            </SidebarItem>
          )
        })}
      </div>

      {status === "ready" && templates.length === 0 && !hasActiveFilters && (
        <EmptyState
          title="No harnesses yet"
          description="Harness templates appear here after seed or creation."
        />
      )}
      {status === "ready" && templates.length === 0 && hasActiveFilters && (
        <EmptyState
          title="No harnesses match your filters"
          description="Clear harness filters or adjust the query."
        />
      )}
    </section>
  )
}
