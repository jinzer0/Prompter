import type { MaintenanceScanOptions } from "../../hooks/maintenance-state"
import { Button } from "../ui/button"
import { type ScanOptionKey, scanOptionRows } from "./maintenance-labels"

type MaintenanceScanControlsProps = {
  readonly canFilterCurrentProject: boolean
  readonly currentProjectOnly: boolean
  readonly isWorking: boolean
  readonly scanOptions: MaintenanceScanOptions
  readonly scanPhase: string
  readonly selectedProjectName: string | null
  readonly onCurrentProjectFilterChange: (enabled: boolean) => void
  readonly onScan: () => void
  readonly onScanOptionsChange: (options: MaintenanceScanOptions) => void
}

export function MaintenanceScanControls({
  canFilterCurrentProject,
  currentProjectOnly,
  isWorking,
  onCurrentProjectFilterChange,
  onScan,
  onScanOptionsChange,
  scanOptions,
  scanPhase,
  selectedProjectName,
}: MaintenanceScanControlsProps) {
  function setScanOption(key: ScanOptionKey, enabled: boolean): void {
    onScanOptionsChange({ ...scanOptions, [key]: enabled })
  }

  return (
    <div className="space-y-3 rounded-card border border-border bg-panel-muted p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[13px] font-medium text-foreground">Scan scope and classes</p>
          <p className="text-[12px] leading-5 text-muted">
            Whole-library scan is the default. Enable current-project scope only when you want the
            selected project context applied.
          </p>
        </div>
        <Button type="button" disabled={isWorking} onClick={onScan}>
          {scanPhase === "scanning" ? "Scanning..." : "Run maintenance scan"}
        </Button>
      </div>

      <label className="flex items-start gap-2 rounded-card border border-border bg-panel-elevated p-2 text-[12px] leading-5 text-muted-strong">
        <input
          className="mt-1 accent-accent"
          type="checkbox"
          checked={currentProjectOnly}
          disabled={!canFilterCurrentProject || isWorking}
          onChange={(event) => onCurrentProjectFilterChange(event.currentTarget.checked)}
        />
        <span>
          Current project only
          <span className="block text-muted">
            {selectedProjectName === null
              ? "Select a project to enable this filter."
              : `Available for ${selectedProjectName}.`}
          </span>
        </span>
      </label>

      <div className="grid gap-2 md:grid-cols-2">
        {scanOptionRows.map((option) => (
          <label
            key={option.key}
            className="flex items-start gap-2 rounded-card border border-border bg-panel-elevated p-2 text-[12px] leading-5 text-muted-strong"
          >
            <input
              className="mt-1 accent-accent"
              type="checkbox"
              checked={scanOptions[option.key]}
              disabled={isWorking}
              onChange={(event) => setScanOption(option.key, event.currentTarget.checked)}
            />
            <span>
              {option.label}
              <span className="block text-muted">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
