import type {
  InsightsDateRange,
  InsightsFilterInput,
  Project,
} from "../../../../electron/ipc-types"
import { Select } from "../ui/select"

type ProjectFilterChange = (projectId: string | null) => void
type DateRangeChange = (dateRange: InsightsDateRange) => void

export function changeInsightsProjectFilter(value: string, onChange: ProjectFilterChange): void {
  onChange(value === "all" ? null : value)
}

export function changeInsightsDateRangeFilter(value: string, onChange: DateRangeChange): void {
  switch (value) {
    case "all":
    case "7d":
    case "30d":
    case "90d":
    case "year":
      onChange(value)
      return
    default:
      onChange("all")
  }
}

type InsightsFiltersProps = {
  readonly filters: InsightsFilterInput
  readonly onDateRangeChange: DateRangeChange
  readonly onProjectChange: ProjectFilterChange
  readonly projects: readonly Project[]
}

export function InsightsFilters({
  filters,
  onDateRangeChange,
  onProjectChange,
  projects,
}: InsightsFiltersProps) {
  return (
    <div className="grid gap-3 rounded-card border border-border-subtle bg-panel-muted p-3 md:grid-cols-2">
      <label
        htmlFor="insights-project-filter"
        className="space-y-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted"
      >
        Project
        <Select
          id="insights-project-filter"
          aria-label="Project filter"
          value={filters.projectId ?? "all"}
          onChange={(event) =>
            changeInsightsProjectFilter(event.currentTarget.value, onProjectChange)
          }
        >
          <option value="all">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </label>
      <label
        htmlFor="insights-date-range"
        className="space-y-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted"
      >
        Date range
        <Select
          id="insights-date-range"
          aria-label="Date range"
          value={filters.dateRange}
          onChange={(event) =>
            changeInsightsDateRangeFilter(event.currentTarget.value, onDateRangeChange)
          }
        >
          <option value="all">All time</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="year">This year</option>
        </Select>
      </label>
    </div>
  )
}
