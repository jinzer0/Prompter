import type {
  VersionActivityInsights,
  VersionedPromptInsight,
} from "../../../../electron/ipc-types"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { formatInsightCount, formatInsightTimestamp } from "./insights-format"
import { type InsightsNavigate, versionPromptNavigation } from "./insights-navigation-actions"
import { InsightListEmpty, InsightMetric, InsightPanel } from "./insights-ui"

type VersionPromptListProps = {
  readonly items: readonly VersionedPromptInsight[]
  readonly onNavigate: InsightsNavigate
  readonly title: string
}

function VersionPromptList({ items, onNavigate, title }: VersionPromptListProps) {
  return (
    <section className="space-y-2" aria-label={title}>
      <h4 className="text-[12px] font-semibold text-foreground">{title}</h4>
      {items.length === 0 ? (
        <InsightListEmpty>No matching prompts.</InsightListEmpty>
      ) : (
        <ul className="space-y-1">
          {items.map((prompt) => {
            const navigation = versionPromptNavigation(prompt)
            const versionCount = `${formatInsightCount(prompt.versionCount)} versions`

            return (
              <li key={`${title}-${prompt.promptAssetId}`}>
                {navigation === null ? (
                  <div className="flex items-center justify-between gap-3 px-2 py-2 text-[11px]">
                    <span className="min-w-0 truncate text-muted-strong">{prompt.title}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-muted">{versionCount}</span>
                      <Badge>Orphaned project</Badge>
                    </span>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto w-full justify-between gap-3 px-2 py-2 text-left"
                    onClick={() => onNavigate(navigation)}
                  >
                    <span className="min-w-0 truncate">{prompt.title}</span>
                    <span className="text-muted">{versionCount}</span>
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

type VersionActivityPanelProps = {
  readonly insights: VersionActivityInsights
  readonly onNavigate: InsightsNavigate
}

export function VersionActivityPanel({ insights, onNavigate }: VersionActivityPanelProps) {
  return (
    <InsightPanel
      headingId="insights-versions-heading"
      title="Version activity"
      description="Creation volume, version depth, stale current prompts, and activity trend."
    >
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InsightMetric
          label="Last 7 days"
          value={formatInsightCount(insights.recentVersionCounts.last7Days)}
        />
        <InsightMetric
          label="Last 30 days"
          value={formatInsightCount(insights.recentVersionCounts.last30Days)}
        />
        <InsightMetric
          label="All versions"
          value={formatInsightCount(insights.recentVersionCounts.all)}
        />
        <InsightMetric
          label="Average per prompt"
          value={insights.averageVersionsPerPrompt.toFixed(1)}
        />
      </dl>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <VersionPromptList
          title="Most-versioned prompts"
          items={insights.mostVersionedPrompts}
          onNavigate={onNavigate}
        />
        <VersionPromptList
          title="Stale current prompts"
          items={insights.staleCurrentPrompts}
          onNavigate={onNavigate}
        />
        <section className="space-y-2" aria-label="Version activity trend">
          <h4 className="text-[12px] font-semibold text-foreground">Activity trend</h4>
          {insights.activity.length === 0 ? (
            <InsightListEmpty>No version activity in this range.</InsightListEmpty>
          ) : (
            <ol className="space-y-1 text-[12px] text-muted">
              {insights.activity.map((point) => (
                <li key={point.timestamp} className="flex justify-between gap-3">
                  <time dateTime={new Date(point.timestamp).toISOString()}>
                    {formatInsightTimestamp(point.timestamp)}
                  </time>
                  <span>{formatInsightCount(point.versionCount)} versions</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </InsightPanel>
  )
}
