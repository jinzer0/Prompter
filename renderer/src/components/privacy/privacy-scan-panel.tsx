import type { PrivacyScanState } from "../../hooks/use-privacy-scan"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { PrivacyScanWarnings } from "./privacy-scan-warnings"
import {
  SensitiveFindingList,
  type SensitiveFindingNavigationHandler,
} from "./sensitive-finding-list"

type PrivacyScanPanelProps = {
  readonly description: string
  readonly headingId: string
  readonly onNavigate?: SensitiveFindingNavigationHandler | undefined
  readonly onScan: () => void
  readonly scanDisabled?: boolean
  readonly scanDisabledReason?: string | undefined
  readonly scanLabel?: string
  readonly state: PrivacyScanState
  readonly title: string
}

function assertNever(value: never): never {
  throw new TypeError(`Unexpected privacy scan state: ${JSON.stringify(value)}`)
}

function scanButton(
  state: PrivacyScanState,
  scanDisabled: boolean,
): {
  readonly disabled: boolean
  readonly label: string
} {
  switch (state.kind) {
    case "idle":
    case "ready":
    case "error":
      return { disabled: scanDisabled, label: "Run privacy scan" }
    case "scanning":
      return { disabled: true, label: "Scanning..." }
    default:
      return assertNever(state)
  }
}

function ScanResult({
  onNavigate,
  state,
}: {
  readonly onNavigate?: SensitiveFindingNavigationHandler | undefined
  readonly state: Extract<PrivacyScanState, { readonly kind: "ready" }>
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" role="status" aria-live="polite">
        <Badge variant={state.result.safeToProceed ? "success" : "accent"}>
          {state.result.findingCount} finding(s)
        </Badge>
        <Badge variant="neutral">{state.result.source} source</Badge>
        <Badge variant="neutral">{state.result.criticalCount} critical</Badge>
        <Badge variant="neutral">{state.result.highCount} high</Badge>
        <Badge variant="neutral">{state.result.mediumCount} medium</Badge>
        <Badge variant="neutral">{state.result.lowCount} low</Badge>
      </div>
      <PrivacyScanWarnings warnings={state.result.warnings} />
      <SensitiveFindingList findings={state.result.findings} onNavigate={onNavigate} />
      <p className="text-[12px] leading-5 text-muted">
        Pattern-based findings can include possible false positives. Review the masked evidence and
        source field before taking action.
      </p>
    </div>
  )
}

function ScanState({
  onNavigate,
  onScan,
  scanDisabled,
  state,
}: {
  readonly onNavigate?: SensitiveFindingNavigationHandler | undefined
  readonly onScan: () => void
  readonly scanDisabled: boolean
  readonly state: PrivacyScanState
}) {
  switch (state.kind) {
    case "idle":
      return (
        <p className="text-[12px] leading-5 text-muted">
          No scan has run. Content stays unchanged until you request a scan.
        </p>
      )
    case "scanning":
      return (
        <p className="text-[12px] leading-5 text-muted-strong" role="status" aria-live="polite">
          Scanning requested content...
        </p>
      )
    case "ready":
      return <ScanResult onNavigate={onNavigate} state={state} />
    case "error":
      return (
        <div className="space-y-2" role="alert">
          <p className="text-[12px] leading-5 text-muted-strong">{state.message}</p>
          <Button disabled={scanDisabled} size="sm" variant="secondary" onClick={onScan}>
            Retry privacy scan
          </Button>
        </div>
      )
    default:
      return assertNever(state)
  }
}

export function PrivacyScanPanel({
  description,
  headingId,
  onNavigate,
  onScan,
  scanDisabled = false,
  scanDisabledReason,
  scanLabel,
  state,
  title,
}: PrivacyScanPanelProps) {
  const scanAction = scanButton(state, scanDisabled)

  return (
    <Card aria-labelledby={headingId}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle id={headingId}>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button disabled={scanAction.disabled} onClick={onScan}>
            {scanLabel ?? scanAction.label}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {scanDisabled && scanDisabledReason !== undefined && (
          <p className="mb-3 text-[12px] leading-5 text-muted-strong">{scanDisabledReason}</p>
        )}
        <ScanState
          onNavigate={onNavigate}
          onScan={onScan}
          scanDisabled={scanDisabled}
          state={state}
        />
      </CardContent>
    </Card>
  )
}
