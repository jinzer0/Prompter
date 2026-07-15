import type {
  MaintenanceCategory,
  MaintenanceFinding,
  MaintenanceScanSummary,
} from "../../../../electron/ipc-types"
import { Badge } from "../ui/badge"
import { categoryLabel, severityLabel } from "./maintenance-labels"

const categoryOrder = [
  "duplicate_prompts",
  "duplicate_tags",
  "unused_tags",
  "empty_prompt_assets",
  "current_version_issues",
  "search_index_health",
  "prompt_template_issues",
  "harness_template_issues",
  "quality_review_findings",
] as const satisfies readonly MaintenanceCategory[]

type MaintenanceSummaryProps = {
  readonly summary: MaintenanceScanSummary | null
}

export function MaintenanceSummaryCards({ summary }: MaintenanceSummaryProps) {
  if (summary === null) {
    return (
      <div className="rounded-card border border-border bg-panel-muted p-3 text-[12px] leading-5 text-muted">
        Run a scan to populate finding counts and action previews.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <SummaryCard label="Total findings" value={summary.totalFindings} />
        <SummaryCard label="High" value={summary.severityCounts.high} />
        <SummaryCard label="Medium" value={summary.severityCounts.medium} />
        <SummaryCard label="Low" value={summary.severityCounts.low} />
      </dl>
      {summary.truncated && (
        <p className="rounded-card border border-border bg-panel-muted p-2 text-[12px] leading-5 text-muted-strong">
          Scan results were capped. Narrow the scan options or rescan after actions.
        </p>
      )}
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {categoryOrder.map((category) => (
          <SummaryCard
            key={category}
            label={categoryLabel(category)}
            value={summary.categoryCounts[category] ?? 0}
          />
        ))}
      </dl>
    </div>
  )
}

function SummaryCard({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="rounded-card border border-border bg-panel-muted p-2">
      <dt className="font-mono text-[11px] text-muted">{label}</dt>
      <dd className="mt-1 text-[13px] font-medium text-foreground">{value}</dd>
    </div>
  )
}

type MaintenanceFindingsProps = {
  readonly findings: readonly MaintenanceFinding[]
}

export function MaintenanceFindings({ findings }: MaintenanceFindingsProps) {
  if (findings.length === 0) {
    return (
      <div className="rounded-card border border-border bg-panel-muted p-3 text-[12px] leading-5 text-muted">
        No findings are loaded yet. Duplicate prompts will appear here as finding-only compare/open
        candidates and never as merge/delete actions.
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {findings.map((finding) => (
        <li key={finding.id} className="rounded-card border border-border bg-panel-muted p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={finding.severity === "low" ? "neutral" : "accent"}>
              {severityLabel(finding.severity)} severity
            </Badge>
            <Badge variant="neutral">{categoryLabel(finding.category)}</Badge>
            {finding.category === "duplicate_prompts" && (
              <Badge variant="neutral">Finding-only</Badge>
            )}
          </div>
          <p className="mt-2 text-[13px] font-medium text-foreground">{finding.title}</p>
          <p className="mt-1 text-[12px] leading-5 text-muted-strong">{finding.description}</p>
          <p className="mt-2 font-mono text-[11px] text-muted">
            {finding.affectedEntityIds.length} {finding.affectedEntityType} id(s) affected
          </p>
          {finding.category === "duplicate_prompts" && (
            <p className="mt-2 text-[12px] leading-5 text-muted">
              Compare/open candidate only. Phase 17 does not merge or delete duplicate prompts.
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
