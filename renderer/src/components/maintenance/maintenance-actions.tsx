import { useState } from "react"

import type {
  MaintenanceActionPreview,
  MaintenanceActionResult,
  PreparedMaintenanceAction,
  PrepareMaintenanceActionInput,
} from "../../../../electron/ipc-types"
import { Button } from "../ui/button"
import { Select } from "../ui/select"
import { prepareInputFromAction, severityLabel } from "./maintenance-labels"

type MaintenanceActionPreviewListProps = {
  readonly actions: readonly MaintenanceActionPreview[]
  readonly isWorking: boolean
  readonly selectedActionInput: PrepareMaintenanceActionInput | null
  readonly onSelectAction: (input: PrepareMaintenanceActionInput | null) => void
}

export function MaintenanceActionPreviewList({
  actions,
  isWorking,
  onSelectAction,
  selectedActionInput,
}: MaintenanceActionPreviewListProps) {
  const [canonicalTagIds, setCanonicalTagIds] = useState<Record<string, string>>({})

  if (actions.length === 0) {
    return (
      <div className="rounded-card border border-border bg-panel-muted p-3 text-[12px] leading-5 text-muted">
        No action previews are available. Finding-only categories remain visible in the findings
        ledger.
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {actions.map((action) => {
        const actionKey = `${action.actionType}-${action.affectedEntityIds.join("-")}`
        const canonicalTagId = canonicalTagIds[actionKey] ?? action.affectedEntityIds[0] ?? ""
        const input = prepareInputFromAction(action, canonicalTagId)
        const isSelected = selectedActionInput?.actionType === action.actionType

        return (
          <li key={actionKey} className="rounded-card border border-border bg-panel-muted p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[13px] font-medium text-foreground">{action.title}</p>
                <p className="text-[12px] leading-5 text-muted-strong">{action.description}</p>
              </div>
              <span className="rounded-full border border-border bg-panel-elevated px-2.5 py-1 font-mono text-[11px] text-muted">
                {severityLabel(action.severity)} / {action.estimatedChangeCount} change(s)
              </span>
            </div>

            <div className="mt-3 space-y-2 text-[12px] leading-5 text-muted">
              <p>
                Impact: {action.affectedEntityIds.length} {action.affectedEntityType} id(s).
                {action.relationshipChanging
                  ? " Relationships may change."
                  : " Relationships stay intact."}
                {action.destructive
                  ? " Rows may be deleted."
                  : " No destructive delete is planned."}
              </p>
              {action.backupRecommendation !== null && (
                <p className="rounded-card border border-border bg-panel-elevated p-2 text-muted-strong">
                  Backup recommended: {action.backupRecommendation}
                </p>
              )}
              {action.actionType === "merge_duplicate_tags" && (
                <div className="grid gap-2 text-muted-strong">
                  <span className="font-mono text-[11px] text-muted">canonical tag id</span>
                  <Select
                    aria-label="Canonical duplicate tag"
                    disabled={isWorking}
                    value={canonicalTagId}
                    onChange={(event) =>
                      setCanonicalTagIds({
                        ...canonicalTagIds,
                        [actionKey]: event.currentTarget.value,
                      })
                    }
                  >
                    {action.affectedEntityIds.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={isSelected ? "default" : "secondary"}
                disabled={isWorking || input === null}
                onClick={() => onSelectAction(input)}
              >
                {isSelected ? "Selected for preview" : "Select for preview"}
              </Button>
              {isSelected && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isWorking}
                  onClick={() => onSelectAction(null)}
                >
                  Clear selection
                </Button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

type PreparedActionPanelProps = {
  readonly actionPhase: string
  readonly isWorking: boolean
  readonly preparedAction: PreparedMaintenanceAction | null
  readonly resultSummary: MaintenanceActionResult | null
  readonly selectedActionInput: PrepareMaintenanceActionInput | null
  readonly onCancel: () => void
  readonly onExecute: () => void
  readonly onPrepare: () => void
}

export function canExecuteMaintenanceAction({
  actionPhase,
  isWorking,
  preparedAction,
}: Pick<PreparedActionPanelProps, "actionPhase" | "isWorking" | "preparedAction">): boolean {
  return preparedAction !== null && !isWorking && actionPhase === "prepared"
}

export function PreparedActionPanel({
  actionPhase,
  isWorking,
  onCancel,
  onExecute,
  onPrepare,
  preparedAction,
  resultSummary,
  selectedActionInput,
}: PreparedActionPanelProps) {
  const canExecute = canExecuteMaintenanceAction({ actionPhase, isWorking, preparedAction })

  return (
    <div className="space-y-3 rounded-card border border-border bg-panel-muted p-3">
      <div className="space-y-1">
        <p className="text-[13px] font-medium text-foreground">Action session</p>
        <p className="text-[12px] leading-5 text-muted">
          Prepare creates a main-owned preview session. Execute is unavailable until that preview
          exists.
        </p>
      </div>

      {selectedActionInput !== null && preparedAction === null && (
        <Button type="button" disabled={isWorking} onClick={onPrepare}>
          {actionPhase === "preparing" ? "Preparing..." : "Prepare selected action"}
        </Button>
      )}

      {preparedAction !== null && (
        <div className="space-y-3 rounded-card border border-border bg-panel-elevated p-3">
          <div className="space-y-1">
            <p className="text-[13px] font-medium text-foreground">
              {preparedAction.preview.title}
            </p>
            <p className="text-[12px] leading-5 text-muted-strong">
              {preparedAction.preview.description}
            </p>
            <p className="font-mono text-[11px] text-muted">
              Session expires at {preparedAction.expiresAt}; confirmation required:{" "}
              {preparedAction.requiresConfirmation ? "yes" : "no"}
            </p>
          </div>
          {preparedAction.preview.backupRecommendation !== null && (
            <p className="rounded-card border border-border bg-panel-muted p-2 text-[12px] leading-5 text-muted-strong">
              Backup recommended before execute: {preparedAction.preview.backupRecommendation}
            </p>
          )}
          <ul className="space-y-1 text-[12px] leading-5 text-muted">
            {preparedAction.affectedDisplayNames.map((name) => (
              <li key={name}>Affected: {name}</li>
            ))}
            {preparedAction.warnings.map((warning) => (
              <li key={warning}>Warning: {warning}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={!canExecute} onClick={onExecute}>
              {actionPhase === "executing" ? "Executing..." : "Execute prepared action"}
            </Button>
            <Button type="button" variant="ghost" disabled={isWorking} onClick={onCancel}>
              {actionPhase === "cancelling" ? "Cancelling..." : "Cancel session"}
            </Button>
          </div>
        </div>
      )}

      {resultSummary !== null && (
        <div className="rounded-card border border-border bg-panel-elevated p-3 text-[12px] leading-5 text-muted-strong">
          <p className="text-[13px] font-medium text-foreground">Result: {resultSummary.status}</p>
          <p>{resultSummary.message}</p>
          <p className="font-mono text-[11px] text-muted">
            Changed {resultSummary.changedCount}; skipped {resultSummary.skippedCount}.
          </p>
          {resultSummary.warnings.map((warning) => (
            <p key={warning}>Warning: {warning}</p>
          ))}
        </div>
      )}
    </div>
  )
}
