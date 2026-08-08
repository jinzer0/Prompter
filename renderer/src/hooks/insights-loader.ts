import type { InsightsBridge, InsightsFilterInput } from "../../../electron/ipc-types"
import type { InsightsData, InsightsStateEvent } from "./insights-state"

type InsightsEventSink = (event: InsightsStateEvent) => void

async function loadAllInsights(
  insights: InsightsBridge,
  filters: InsightsFilterInput,
): Promise<InsightsData> {
  const [
    dashboardSummary,
    projectHealth,
    scenarioDistribution,
    targetAgentDistribution,
    quality,
    versionActivity,
    tags,
    templates,
    projectContexts,
    maintenance,
  ] = await Promise.all([
    insights.getDashboardSummary(filters),
    insights.getProjectHealth(filters),
    insights.getScenarioDistribution(filters),
    insights.getTargetAgentDistribution(filters),
    insights.getQualityInsights(filters),
    insights.getVersionActivity(filters),
    insights.getTagInsights(filters),
    insights.getTemplateInsights(filters),
    insights.getProjectContextInsights(filters),
    insights.getMaintenanceSnapshot(filters),
  ])

  return {
    dashboardSummary,
    projectHealth,
    scenarioDistribution,
    targetAgentDistribution,
    quality,
    versionActivity,
    tags,
    templates,
    projectContexts,
    maintenance,
  }
}

export type InsightsLoader = {
  readonly invalidate: () => void
  readonly load: (filters: InsightsFilterInput) => Promise<void>
}

export function createInsightsLoader(
  insights: InsightsBridge,
  onEvent: InsightsEventSink,
): InsightsLoader {
  let currentGeneration = 0

  return {
    invalidate(): void {
      currentGeneration += 1
    },
    async load(filters): Promise<void> {
      currentGeneration += 1
      const requestedGeneration = currentGeneration
      const snapshot = Object.freeze({ ...filters })
      onEvent({ kind: "load_started", filters: snapshot })

      try {
        const data = await loadAllInsights(insights, snapshot)
        if (requestedGeneration === currentGeneration) {
          onEvent({ kind: "load_succeeded", filters: snapshot, data })
        }
      } catch {
        if (requestedGeneration !== currentGeneration) {
          return
        }
        onEvent({
          kind: "load_failed",
          filters: snapshot,
          message: "Insights could not be loaded.",
        })
      }
    },
  }
}
