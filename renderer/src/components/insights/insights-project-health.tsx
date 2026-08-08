import { useMemo, useState } from "react"

import type { ProjectHealthInsight, ProjectHealthInsights } from "../../../../electron/ipc-types"
import { Button } from "../ui/button"
import { Select } from "../ui/select"
import { formatInsightCount, formatInsightScore, formatInsightTimestamp } from "./insights-format"
import {
  type InsightsNavigate,
  projectContextNavigation,
  projectNavigation,
} from "./insights-navigation-actions"
import { InsightListEmpty, InsightPanel } from "./insights-ui"

type ProjectHealthSort =
  | "last_updated_desc"
  | "prompt_count_desc"
  | "average_quality_asc"
  | "unevaluated_desc"

function projectHealthSort(value: string): ProjectHealthSort {
  switch (value) {
    case "prompt_count_desc":
    case "average_quality_asc":
    case "unevaluated_desc":
      return value
    default:
      return "last_updated_desc"
  }
}

function assertNever(value: never): never {
  throw new TypeError(`Unexpected project health sort: ${value}`)
}

function compareProjects(
  first: ProjectHealthInsight,
  second: ProjectHealthInsight,
  sort: ProjectHealthSort,
): number {
  switch (sort) {
    case "last_updated_desc":
      return (second.lastUpdatedAt ?? -1) - (first.lastUpdatedAt ?? -1)
    case "prompt_count_desc":
      return second.promptAssetCount - first.promptAssetCount
    case "average_quality_asc":
      return (
        (first.averageQualityScore ?? Number.POSITIVE_INFINITY) -
        (second.averageQualityScore ?? Number.POSITIVE_INFINITY)
      )
    case "unevaluated_desc":
      return second.unevaluatedCurrentPromptCount - first.unevaluatedCurrentPromptCount
    default:
      return assertNever(sort)
  }
}

type ProjectHealthPanelProps = {
  readonly insights: ProjectHealthInsights
  readonly onNavigate: InsightsNavigate
}

export function ProjectHealthPanel({ insights, onNavigate }: ProjectHealthPanelProps) {
  const [sort, setSort] = useState<ProjectHealthSort>("last_updated_desc")
  const projects = useMemo(
    () => [...insights.projects].sort((first, second) => compareProjects(first, second, sort)),
    [insights.projects, sort],
  )

  return (
    <InsightPanel
      headingId="insights-project-health-heading"
      title="Project health"
      description="Sortable project inventory, quality, coverage, and recency."
    >
      <div className="mb-3 max-w-64">
        <Select
          aria-label="Project health sort"
          value={sort}
          onChange={(event) => setSort(projectHealthSort(event.currentTarget.value))}
        >
          <option value="last_updated_desc">Last updated descending</option>
          <option value="prompt_count_desc">Prompt count descending</option>
          <option value="average_quality_asc">Average quality ascending</option>
          <option value="unevaluated_desc">Unevaluated descending</option>
        </Select>
      </div>
      {projects.length === 0 ? (
        <InsightListEmpty>No projects in this scope.</InsightListEmpty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-left text-[12px]">
            <thead className="text-[11px] uppercase tracking-[0.06em] text-muted">
              <tr className="border-b border-border">
                {[
                  "Project",
                  "Prompts",
                  "Versions",
                  "Avg quality",
                  "Unevaluated",
                  "Tags",
                  "Context",
                  "Version-heavy",
                  "Empty",
                  "Last updated",
                ].map((heading) => (
                  <th key={heading} scope="col" className="px-2 py-2 font-medium">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.projectId} className="border-b border-border-subtle">
                  <td className="px-2 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto justify-start px-0 text-left"
                      onClick={() => onNavigate(projectNavigation(project.projectId))}
                    >
                      {project.projectName}
                    </Button>
                  </td>
                  <td className="px-2 py-2">{formatInsightCount(project.promptAssetCount)}</td>
                  <td className="px-2 py-2">{formatInsightCount(project.promptVersionCount)}</td>
                  <td className="px-2 py-2">{formatInsightScore(project.averageQualityScore)}</td>
                  <td className="px-2 py-2">
                    {formatInsightCount(project.unevaluatedCurrentPromptCount)}
                  </td>
                  <td className="px-2 py-2">{formatInsightCount(project.tagCount)}</td>
                  <td className="px-2 py-2">
                    <span className="flex items-center gap-2">
                      <span>{formatInsightCount(project.contextProfileCount)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1"
                        aria-label={`Open ${project.projectName} project context`}
                        onClick={() => onNavigate(projectContextNavigation(project.projectId))}
                      >
                        Open
                      </Button>
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    {formatInsightCount(project.versionHeavyPromptCount)}
                  </td>
                  <td className="px-2 py-2">{formatInsightCount(project.emptyPromptCount)}</td>
                  <td className="px-2 py-2">{formatInsightTimestamp(project.lastUpdatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </InsightPanel>
  )
}
