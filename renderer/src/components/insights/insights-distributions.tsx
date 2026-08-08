import type {
  ScenarioDistributionInsights,
  TargetAgentDistributionInsights,
} from "../../../../electron/ipc-types"
import { formatInsightCount, formatInsightLabel, formatInsightScore } from "./insights-format"
import { InsightListEmpty, InsightPanel, InsightProgress } from "./insights-ui"

export function ScenarioDistributionPanel({
  insights,
}: {
  readonly insights: ScenarioDistributionInsights
}) {
  return (
    <InsightPanel
      headingId="insights-scenario-heading"
      title="Scenario distribution"
      description="Prompt coverage, quality, and recent activity by scenario."
    >
      {insights.items.length === 0 ? (
        <InsightListEmpty>No scenario data in this scope.</InsightListEmpty>
      ) : (
        <ul className="space-y-2">
          {insights.items.map((item) => (
            <InsightProgress
              key={item.scenario}
              label={formatInsightLabel(item.scenario)}
              percentage={item.percentage}
              details={`${formatInsightCount(item.count)} prompts · ${formatInsightScore(item.averageQualityScore)} average · ${formatInsightCount(item.recentPromptCount)} recent · ${formatInsightCount(item.unevaluatedCurrentPromptCount)} unevaluated`}
            />
          ))}
        </ul>
      )}
    </InsightPanel>
  )
}

export function TargetAgentDistributionPanel({
  insights,
}: {
  readonly insights: TargetAgentDistributionInsights
}) {
  return (
    <InsightPanel
      headingId="insights-agent-heading"
      title="Target agents"
      description="Prompt share and current quality by target agent."
    >
      {insights.items.length === 0 ? (
        <InsightListEmpty>No target-agent data in this scope.</InsightListEmpty>
      ) : (
        <ul className="space-y-2">
          {insights.items.map((item) => (
            <InsightProgress
              key={item.targetAgent}
              label={formatInsightLabel(item.targetAgent)}
              percentage={item.percentage}
              details={`${formatInsightCount(item.count)} prompts · ${formatInsightScore(item.averageQualityScore)} average · ${item.mostCommonScenario === null ? "No leading scenario" : formatInsightLabel(item.mostCommonScenario)} · ${formatInsightCount(item.unevaluatedCurrentPromptCount)} unevaluated`}
            />
          ))}
        </ul>
      )}
    </InsightPanel>
  )
}
