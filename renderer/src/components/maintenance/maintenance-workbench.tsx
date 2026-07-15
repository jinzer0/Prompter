import type { Project } from "../../../../electron/ipc-types"
import { useMaintenance } from "../../hooks/use-maintenance"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { MaintenanceActionPreviewList, PreparedActionPanel } from "./maintenance-actions"
import { MaintenanceFindings, MaintenanceSummaryCards } from "./maintenance-findings"
import { MaintenanceScanControls } from "./maintenance-scan-controls"

type MaintenanceWorkbenchProps = {
  readonly projects: readonly Project[]
  readonly selectedProjectId: string | null
}

export type MaintenanceController = ReturnType<typeof useMaintenance>

export function MaintenanceWorkbench({ projects, selectedProjectId }: MaintenanceWorkbenchProps) {
  const maintenance = useMaintenance({ currentProjectId: selectedProjectId })
  const selectedProjectName =
    projects.find((project) => project.id === selectedProjectId)?.name ?? null

  return (
    <MaintenanceWorkbenchView maintenance={maintenance} selectedProjectName={selectedProjectName} />
  )
}

type MaintenanceWorkbenchViewProps = {
  readonly maintenance: MaintenanceController
  readonly selectedProjectName: string | null
}

export function MaintenanceWorkbenchView({
  maintenance,
  selectedProjectName,
}: MaintenanceWorkbenchViewProps) {
  return (
    <Card
      aria-labelledby="settings-maintenance-heading"
      className="focus:outline-none focus:ring-2 focus:ring-accent/45"
      data-menu-action-target="settings-maintenance"
      tabIndex={-1}
    >
      <CardHeader>
        <CardTitle id="settings-maintenance-heading">Maintenance</CardTitle>
        <CardDescription>
          Scan the library, inspect focused findings, prepare guarded repair sessions, and rescan
          after a confirmed action.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <MaintenanceScanControls
          canFilterCurrentProject={maintenance.canFilterCurrentProject}
          currentProjectOnly={maintenance.currentProjectOnly}
          isWorking={maintenance.isWorking}
          scanOptions={maintenance.scanOptions}
          scanPhase={maintenance.scanPhase}
          selectedProjectName={selectedProjectName}
          onCurrentProjectFilterChange={maintenance.setCurrentProjectFilter}
          onScan={() => void maintenance.scanLibrary()}
          onScanOptionsChange={maintenance.setScanOptions}
        />

        {maintenance.error !== null && (
          <output className="block text-[12px] leading-5 text-muted-strong" aria-live="polite">
            {maintenance.error.message}
          </output>
        )}

        {maintenance.scanStale && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-panel-muted p-3">
            <p className="text-[12px] leading-5 text-muted-strong">
              Scan data is stale after the last action. Rescan before preparing another change.
            </p>
            <Button
              type="button"
              variant="secondary"
              disabled={!maintenance.canRescan}
              onClick={() => void maintenance.rescan()}
            >
              Rescan library
            </Button>
          </div>
        )}

        <section className="space-y-3" aria-labelledby="maintenance-summary-heading">
          <h3
            id="maintenance-summary-heading"
            className="text-[14px] font-semibold text-foreground"
          >
            Scan summary
          </h3>
          <MaintenanceSummaryCards summary={maintenance.scanSummary} />
        </section>

        <section className="space-y-3" aria-labelledby="maintenance-findings-heading">
          <h3
            id="maintenance-findings-heading"
            className="text-[14px] font-semibold text-foreground"
          >
            Findings
          </h3>
          <MaintenanceFindings findings={maintenance.findings} />
        </section>

        <section className="space-y-3" aria-labelledby="maintenance-actions-heading">
          <h3
            id="maintenance-actions-heading"
            className="text-[14px] font-semibold text-foreground"
          >
            Action previews
          </h3>
          <MaintenanceActionPreviewList
            actions={maintenance.recommendedActions}
            isWorking={maintenance.isWorking}
            selectedActionInput={maintenance.selectedActionInput}
            onSelectAction={maintenance.setSelectedActionInput}
          />
          <PreparedActionPanel
            actionPhase={maintenance.actionPhase}
            isWorking={maintenance.isWorking}
            preparedAction={maintenance.preparedAction}
            resultSummary={maintenance.resultSummary}
            selectedActionInput={maintenance.selectedActionInput}
            onCancel={() => void maintenance.cancelActionSession()}
            onExecute={() => void maintenance.executeAction()}
            onPrepare={() => void maintenance.prepareAction()}
          />
        </section>
      </CardContent>
    </Card>
  )
}
