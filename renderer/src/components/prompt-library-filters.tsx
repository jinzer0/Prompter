import type { TagWithCount } from "../../../electron/ipc-types"
import type { PromptScenario, TargetAgent } from "../lib/prompter-options"
import { scenarioOptions, targetAgentOptions } from "../lib/prompter-options"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select } from "./ui/select"

export type ScenarioFilter = PromptScenario | ""
export type TargetAgentFilter = TargetAgent | ""

type PromptLibraryFiltersProps = {
  readonly query: string
  readonly scenario: ScenarioFilter
  readonly selectedTagIds: readonly string[]
  readonly tagCounts: readonly TagWithCount[]
  readonly targetAgent: TargetAgentFilter
  readonly onClear: () => void
  readonly onQueryChange: (query: string) => void
  readonly onScenarioChange: (scenario: ScenarioFilter) => void
  readonly onTagToggle: (tagId: string) => void
  readonly onTargetAgentChange: (targetAgent: TargetAgentFilter) => void
}

function scenarioFilterFromValue(value: string): ScenarioFilter {
  return scenarioOptions.find((option) => option.value === value)?.value ?? ""
}

function targetAgentFilterFromValue(value: string): TargetAgentFilter {
  return targetAgentOptions.find((option) => option.value === value)?.value ?? ""
}

export function PromptLibraryFilters({
  query,
  scenario,
  selectedTagIds,
  tagCounts,
  targetAgent,
  onClear,
  onQueryChange,
  onScenarioChange,
  onTagToggle,
  onTargetAgentChange,
}: PromptLibraryFiltersProps) {
  return (
    <section className="mt-4 space-y-3 rounded-card border border-border bg-panel-elevated p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Input
          data-menu-action-target="search-prompts"
          aria-label="Search prompts"
          placeholder="Search prompts"
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
        />
        <Select
          aria-label="Scenario filter"
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
          aria-label="Target agent filter"
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
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {tagCounts.map((tag) => (
          <Button
            key={tag.id}
            aria-label={`Filter tag ${tag.name}`}
            aria-pressed={selectedTagIds.includes(tag.id)}
            size="sm"
            variant={selectedTagIds.includes(tag.id) ? "default" : "secondary"}
            onClick={() => onTagToggle(tag.id)}
          >
            {tag.name} <span aria-hidden="true">({tag.promptCount})</span>
          </Button>
        ))}
        {tagCounts.length === 0 && <p className="text-[12px] text-muted">No tags yet</p>}
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear search filters
        </Button>
      </div>
    </section>
  )
}
