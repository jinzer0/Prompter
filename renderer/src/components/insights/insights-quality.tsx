import type { QualityInsights, QualityPromptInsight } from "../../../../electron/ipc-types"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { formatInsightLabel, formatInsightScore } from "./insights-format"
import { type InsightsNavigate, promptQualityNavigation } from "./insights-navigation-actions"
import { InsightListEmpty, InsightMetric, InsightPanel, InsightProgress } from "./insights-ui"

type QualityPromptListProps = {
  readonly items: readonly QualityPromptInsight[]
  readonly onNavigate: InsightsNavigate
  readonly title: string
}

function QualityPromptList({ items, onNavigate, title }: QualityPromptListProps) {
  return (
    <section className="space-y-2" aria-label={title}>
      <h4 className="text-[12px] font-semibold text-foreground">{title}</h4>
      {items.length === 0 ? (
        <InsightListEmpty>No matching prompts.</InsightListEmpty>
      ) : (
        <ul className="space-y-1">
          {items.map((prompt) => {
            const navigation = promptQualityNavigation(prompt)

            return (
              <li key={`${title}-${prompt.promptAssetId}`}>
                {navigation === null ? (
                  <div className="flex items-center justify-between gap-3 px-2 py-2 text-[11px]">
                    <span className="min-w-0 truncate text-muted-strong">{prompt.title}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-muted">{formatInsightScore(prompt.qualityScore)}</span>
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
                    <span className="text-muted">{formatInsightScore(prompt.qualityScore)}</span>
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

type QualityInsightsPanelProps = {
  readonly insights: QualityInsights
  readonly onNavigate: InsightsNavigate
}

export function QualityInsightsPanel({ insights, onNavigate }: QualityInsightsPanelProps) {
  return (
    <InsightPanel
      headingId="insights-quality-heading"
      title="Quality"
      description="Current score distribution, strongest prompts, weak prompts, and coverage gaps."
    >
      <dl className="mb-4 grid gap-3 sm:grid-cols-3">
        <InsightMetric
          label="Average score"
          value={formatInsightScore(insights.averageQualityScore)}
        />
        <InsightMetric label="Scenario averages" value={insights.scenarioAverageScores.length} />
        <InsightMetric label="Agent averages" value={insights.targetAgentAverageScores.length} />
      </dl>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-2" aria-label="Quality buckets">
          <h4 className="text-[12px] font-semibold text-foreground">Quality buckets</h4>
          <ul className="space-y-2">
            {insights.scoreDistribution.map((bucket) => (
              <InsightProgress
                key={bucket.bucket}
                label={formatInsightLabel(bucket.bucket)}
                percentage={bucket.percentage}
                details={`${bucket.count.toLocaleString("en-US")} prompts`}
              />
            ))}
          </ul>
        </section>
        <div className="space-y-4">
          <QualityPromptList
            title="Lowest quality current prompts"
            items={insights.lowestQualityCurrentPrompts}
            onNavigate={onNavigate}
          />
          <QualityPromptList
            title="Highest quality prompts"
            items={insights.highestQualityPrompts}
            onNavigate={onNavigate}
          />
          <QualityPromptList
            title="Unevaluated current prompts"
            items={insights.unevaluatedCurrentPrompts}
            onNavigate={onNavigate}
          />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <section aria-label="Scenario quality averages">
          <h4 className="mb-2 text-[12px] font-semibold text-foreground">Scenario averages</h4>
          <ul className="space-y-1 text-[12px] text-muted">
            {insights.scenarioAverageScores.map((item) => (
              <li key={item.scenario} className="flex justify-between gap-3">
                <span>{formatInsightLabel(item.scenario)}</span>
                <span>{formatInsightScore(item.averageQualityScore)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-label="Target agent quality averages">
          <h4 className="mb-2 text-[12px] font-semibold text-foreground">Agent averages</h4>
          <ul className="space-y-1 text-[12px] text-muted">
            {insights.targetAgentAverageScores.map((item) => (
              <li key={item.targetAgent} className="flex justify-between gap-3">
                <span>{formatInsightLabel(item.targetAgent)}</span>
                <span>{formatInsightScore(item.averageQualityScore)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </InsightPanel>
  )
}
