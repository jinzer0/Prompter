import type { Project } from "../../../../electron/ipc-types"
import { type UseInsightsResult, useInsights } from "../../hooks/use-insights"
import type { InsightsNavigationIntent } from "../../lib/insights-navigation"
import { Panel } from "../shell/panel"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { EmptyState } from "../ui/empty-state"
import {
  MaintenanceSnapshotPanel,
  ProjectContextInsightsPanel,
} from "./insights-context-maintenance"
import { ScenarioDistributionPanel, TargetAgentDistributionPanel } from "./insights-distributions"
import { InsightsFilters } from "./insights-filters"
import { ProjectHealthPanel } from "./insights-project-health"
import { QualityInsightsPanel } from "./insights-quality"
import { InsightsSummary } from "./insights-summary"
import { TagInsightsPanel } from "./insights-tags"
import { TemplateInsightsPanel } from "./insights-templates"
import { VersionActivityPanel } from "./insights-versions"

export type InsightsDashboardController = UseInsightsResult

type InsightsDashboardProps = {
  readonly onBackToLibrary: () => void
  readonly onNavigate: (intent: InsightsNavigationIntent) => void
  readonly projects: readonly Project[]
}

export function InsightsDashboard(props: InsightsDashboardProps) {
  const insights = useInsights()
  return <InsightsDashboardView {...props} insights={insights} />
}

type InsightsDashboardViewProps = InsightsDashboardProps & {
  readonly insights: InsightsDashboardController
}

function assertNever(value: never): never {
  throw new TypeError(`Unexpected insights dashboard state: ${JSON.stringify(value)}`)
}

function DashboardContent({
  insights,
  onNavigate,
}: Pick<InsightsDashboardViewProps, "insights" | "onNavigate">) {
  switch (insights.phase) {
    case "loading":
      return (
        <Card role="status" aria-live="polite">
          <CardHeader>
            <CardTitle>Loading insights</CardTitle>
            <CardDescription>Reading the current dashboard scope.</CardDescription>
          </CardHeader>
        </Card>
      )
    case "empty":
      return (
        <EmptyState
          label="Insights"
          title="No project or prompt inventory"
          description="Create a project or prompt before opening library insights."
        />
      )
    case "error":
      return (
        <Card role="alert">
          <CardHeader>
            <CardTitle>Insights unavailable</CardTitle>
            <CardDescription>{insights.error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void insights.retry()}>Retry insights</Button>
          </CardContent>
        </Card>
      )
    case "ready":
      return (
        <div className="grid gap-4">
          <InsightsSummary summary={insights.data.dashboardSummary} />
          <ProjectHealthPanel insights={insights.data.projectHealth} onNavigate={onNavigate} />
          <div className="grid gap-4 xl:grid-cols-2">
            <ScenarioDistributionPanel insights={insights.data.scenarioDistribution} />
            <TargetAgentDistributionPanel insights={insights.data.targetAgentDistribution} />
          </div>
          <QualityInsightsPanel insights={insights.data.quality} onNavigate={onNavigate} />
          <VersionActivityPanel insights={insights.data.versionActivity} onNavigate={onNavigate} />
          <TagInsightsPanel
            insights={insights.data.tags}
            onNavigate={onNavigate}
            projectId={insights.filters.projectId}
          />
          <TemplateInsightsPanel
            insights={insights.data.templates}
            onNavigate={onNavigate}
            projectFiltered={insights.filters.projectId !== null}
          />
          <div className="grid gap-4 xl:grid-cols-2">
            <ProjectContextInsightsPanel
              insights={insights.data.projectContexts}
              onNavigate={onNavigate}
            />
            <MaintenanceSnapshotPanel
              snapshot={insights.data.maintenance}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      )
    default:
      return assertNever(insights)
  }
}

export function InsightsDashboardView({
  insights,
  onBackToLibrary,
  onNavigate,
  projects,
}: InsightsDashboardViewProps) {
  return (
    <Panel headingId="insights-dashboard-heading" className="h-full min-h-0 gap-4 overflow-auto">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Read-only analytics
          </p>
          <h2
            id="insights-dashboard-heading"
            className="mt-1 text-[24px] font-medium text-foreground"
          >
            Insights Dashboard
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            Inspect library health without changing prompts, projects, or maintenance state.
          </p>
        </div>
        <Button variant="secondary" onClick={onBackToLibrary}>
          Back to library
        </Button>
      </header>
      <InsightsFilters
        filters={insights.filters}
        projects={projects}
        onProjectChange={insights.setProjectId}
        onDateRangeChange={insights.setDateRange}
      />
      <DashboardContent insights={insights} onNavigate={onNavigate} />
    </Panel>
  )
}
