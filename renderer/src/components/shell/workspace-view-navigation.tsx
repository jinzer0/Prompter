import type { WorkspaceView } from "../../hooks/use-insights-workspace-navigation"
import { SidebarItem } from "./sidebar-item"

type WorkspaceViewNavigationProps = {
  readonly onOpenInsights: () => void
  readonly onOpenPrivacy: () => void
  readonly workspaceView: WorkspaceView
}

export function WorkspaceViewNavigation({
  onOpenInsights,
  onOpenPrivacy,
  workspaceView,
}: WorkspaceViewNavigationProps) {
  return (
    <nav className="mt-4" aria-label="Workspace views">
      <SidebarItem
        data-menu-action-target="library-insights"
        aria-current={workspaceView === "insights" ? "page" : undefined}
        variant={workspaceView === "insights" ? "active" : "default"}
        onClick={onOpenInsights}
      >
        Library Insights
      </SidebarItem>
      <SidebarItem
        className="mt-1"
        data-menu-action-target="privacy-center"
        aria-current={workspaceView === "privacy" ? "page" : undefined}
        variant={workspaceView === "privacy" ? "active" : "default"}
        onClick={onOpenPrivacy}
      >
        Privacy Center
      </SidebarItem>
    </nav>
  )
}
