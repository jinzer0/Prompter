import type { TagInsights, TagUsageInsight } from "../../../../electron/ipc-types"
import { Button } from "../ui/button"
import { formatInsightCount, formatInsightLabel } from "./insights-format"
import {
  type InsightsNavigate,
  maintenanceNavigation,
  projectNavigation,
  tagNavigation,
} from "./insights-navigation-actions"
import { InsightListEmpty, InsightMetric, InsightPanel } from "./insights-ui"

type TagUsageListProps = {
  readonly items: readonly TagUsageInsight[]
  readonly onNavigate: InsightsNavigate
  readonly projectId: string | null
  readonly title: string
}

function TagUsageList({ items, onNavigate, projectId, title }: TagUsageListProps) {
  return (
    <section className="space-y-2" aria-label={title}>
      <h4 className="text-[12px] font-semibold text-foreground">{title}</h4>
      {items.length === 0 ? (
        <InsightListEmpty>No matching tags.</InsightListEmpty>
      ) : (
        <ul className="space-y-1">
          {items.map((tag) => (
            <li key={`${title}-${tag.tagId}`}>
              {projectId === null ? (
                <div className="flex items-center justify-between gap-3 px-3 py-2 text-[11px] text-muted-strong">
                  <span>{tag.name}</span>
                  <span className="text-muted">{formatInsightCount(tag.promptCount)}</span>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => onNavigate(tagNavigation(projectId, tag.tagId))}
                >
                  <span>{tag.name}</span>
                  <span className="text-muted">{formatInsightCount(tag.promptCount)}</span>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

type TagInsightsPanelProps = {
  readonly insights: TagInsights
  readonly onNavigate: InsightsNavigate
  readonly projectId: string | null
}

export function TagInsightsPanel({ insights, onNavigate, projectId }: TagInsightsPanelProps) {
  return (
    <InsightPanel
      headingId="insights-tags-heading"
      title="Tags"
      description="Usage concentration, project coverage, scenario frequency, and hygiene signals."
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        <InsightMetric label="Unused tags" value={formatInsightCount(insights.unusedTagCount)} />
        <InsightMetric
          label="Duplicate candidates"
          value={formatInsightCount(insights.duplicateTagCandidateCount)}
        />
      </dl>
      {insights.unusedTagCount > 0 ? (
        <div className="mt-3 flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => onNavigate(maintenanceNavigation())}>
            Open unused tags in Maintenance
          </Button>
        </div>
      ) : null}
      {projectId === null ? (
        <p className="mt-3 text-[12px] leading-5 text-muted">
          Select a project filter to open tag results in the prompt library.
        </p>
      ) : null}
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <TagUsageList
          title="Most used"
          items={insights.mostUsedTags}
          onNavigate={onNavigate}
          projectId={projectId}
        />
        <TagUsageList
          title="Low-quality concentration"
          items={insights.lowQualityTagConcentration}
          onNavigate={onNavigate}
          projectId={projectId}
        />
        <section className="min-w-0 space-y-2" aria-label="Project tag distribution">
          <h4 className="text-[12px] font-semibold text-foreground">Project distribution</h4>
          {insights.projectTagDistribution.length === 0 ? (
            <InsightListEmpty>No project tag data.</InsightListEmpty>
          ) : (
            <ul className="min-w-0 space-y-1">
              {insights.projectTagDistribution.map((item) => (
                <li key={item.projectId} className="min-w-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto min-w-0 w-full justify-between gap-3 py-2 text-left"
                    onClick={() => onNavigate(projectNavigation(item.projectId))}
                  >
                    <span className="min-w-0 truncate">{item.projectName}</span>
                    <span className="shrink-0 text-muted">
                      {formatInsightCount(item.tagCount)} tags ·{" "}
                      {formatInsightCount(item.taggedPromptCount)} prompts
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="min-w-0 space-y-2" aria-label="Scenario tag frequency">
          <h4 className="text-[12px] font-semibold text-foreground">Scenario frequency</h4>
          {insights.scenarioTagFrequency.length === 0 ? (
            <InsightListEmpty>No scenario tag data.</InsightListEmpty>
          ) : (
            <ul className="min-w-0 space-y-1">
              {insights.scenarioTagFrequency.map((item) => (
                <li key={`${item.scenario}-${item.tagId}`} className="min-w-0">
                  {projectId === null ? (
                    <div className="flex min-w-0 items-center justify-between gap-3 px-3 py-2 text-[11px] text-muted-strong">
                      <span className="min-w-0 truncate">{item.tagName}</span>
                      <span className="shrink-0 text-muted">
                        {formatInsightLabel(item.scenario)} · {formatInsightCount(item.promptCount)}
                      </span>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto min-w-0 w-full justify-between gap-3 py-2 text-left"
                      onClick={() => onNavigate(tagNavigation(projectId, item.tagId))}
                    >
                      <span className="min-w-0 truncate">{item.tagName}</span>
                      <span className="shrink-0 text-muted">
                        {formatInsightLabel(item.scenario)} · {formatInsightCount(item.promptCount)}
                      </span>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </InsightPanel>
  )
}
