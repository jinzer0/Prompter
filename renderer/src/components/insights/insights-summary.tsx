import type { DashboardSummary } from "../../../../electron/ipc-types"
import { formatInsightCount, formatInsightScore, formatInsightTimestamp } from "./insights-format"
import { InsightMetric, InsightPanel } from "./insights-ui"

export function InsightsSummary({ summary }: { readonly summary: DashboardSummary }) {
  const metrics = [
    ["Projects", formatInsightCount(summary.projectCount)],
    ["Prompt assets", formatInsightCount(summary.promptAssetCount)],
    ["Prompt versions", formatInsightCount(summary.promptVersionCount)],
    ["Tags", formatInsightCount(summary.tagCount)],
    ["Prompt templates", formatInsightCount(summary.promptTemplateCount)],
    ["Harness templates", formatInsightCount(summary.harnessTemplateCount)],
    ["Context profiles", formatInsightCount(summary.projectContextProfileCount)],
    ["Average quality", formatInsightScore(summary.averageQualityScore)],
    ["Unevaluated current", formatInsightCount(summary.unevaluatedCurrentPromptCount)],
    [
      "Maintenance issues",
      summary.maintenanceIssueCount === null
        ? "Unavailable"
        : formatInsightCount(summary.maintenanceIssueCount),
    ],
    ["Last update", formatInsightTimestamp(summary.lastUpdatedAt)],
  ] as const

  return (
    <InsightPanel
      headingId="insights-summary-heading"
      title="Library summary"
      description="Inventory and quality totals for the active dashboard scope."
    >
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <InsightMetric key={label} label={label} value={value} />
        ))}
      </dl>
    </InsightPanel>
  )
}
