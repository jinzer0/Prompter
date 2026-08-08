import type { MaintenanceSnapshot, ProjectContextInsights } from "../../../../electron/ipc-types"
import { Button } from "../ui/button"
import { formatInsightCount } from "./insights-format"
import {
  type InsightsNavigate,
  maintenanceNavigation,
  projectContextNavigation,
} from "./insights-navigation-actions"
import { InsightListEmpty, InsightMetric, InsightPanel } from "./insights-ui"

type ProjectContextInsightsPanelProps = {
  readonly insights: ProjectContextInsights
  readonly onNavigate: InsightsNavigate
}

export function ProjectContextInsightsPanel({
  insights,
  onNavigate,
}: ProjectContextInsightsPanelProps) {
  return (
    <InsightPanel
      headingId="insights-context-heading"
      title="Project context"
      description="Profile coverage and missing compiler-context fields."
    >
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <InsightMetric
          label="Without default"
          value={formatInsightCount(insights.projectsWithoutDefaultProfileCount)}
        />
        <InsightMetric
          label="Missing tech stack"
          value={formatInsightCount(insights.profilesWithoutTechStackCount)}
        />
        <InsightMetric
          label="Missing validation"
          value={formatInsightCount(insights.profilesWithoutValidationCommandsCount)}
        />
        <InsightMetric
          label="Missing forbidden actions"
          value={formatInsightCount(insights.profilesWithoutForbiddenActionsCount)}
        />
        <InsightMetric
          label="With repository path"
          value={formatInsightCount(insights.repoPathProfileCount)}
        />
      </dl>
      <section className="mt-4 space-y-2" aria-label="Project context profiles">
        <h4 className="text-[12px] font-semibold text-foreground">Profiles by project</h4>
        {insights.projectProfiles.length === 0 ? (
          <InsightListEmpty>No project context profiles in this scope.</InsightListEmpty>
        ) : (
          <ul className="space-y-1">
            {insights.projectProfiles.map((item) => (
              <li key={item.projectId}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => onNavigate(projectContextNavigation(item.projectId))}
                >
                  <span>{item.projectName}</span>
                  <span className="text-muted">
                    {formatInsightCount(item.profileCount)} profiles
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </InsightPanel>
  )
}

type MaintenanceSnapshotPanelProps = {
  readonly onNavigate: InsightsNavigate
  readonly snapshot: MaintenanceSnapshot
}

export function MaintenanceSnapshotPanel({ onNavigate, snapshot }: MaintenanceSnapshotPanelProps) {
  return (
    <InsightPanel
      headingId="insights-maintenance-heading"
      title="Maintenance snapshot"
      description="Read-only maintenance availability for this dashboard."
    >
      <p className="text-[12px] leading-5 text-muted-strong">
        Maintenance reports are not persisted, so the latest snapshot is {snapshot.status}.
      </p>
      <Button
        variant="secondary"
        size="sm"
        className="mt-3"
        onClick={() => onNavigate(maintenanceNavigation())}
      >
        Open Maintenance
      </Button>
    </InsightPanel>
  )
}
