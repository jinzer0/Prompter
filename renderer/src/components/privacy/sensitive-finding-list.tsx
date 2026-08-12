import type { SensitiveFinding } from "../../../../electron/ipc-types"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { SensitiveFindingBadge } from "./sensitive-finding-badge"

const categoryLabels = {
  openai_api_key: "OpenAI API key",
  github_token: "GitHub token",
  bearer_token: "Bearer token",
  aws_access_key: "AWS access key",
  private_key: "Private key",
  environment_secret: "Environment secret",
  url_secret: "URL secret",
  email_address: "Email address",
  phone_number: "Phone number",
  national_id: "National ID",
  internal_url: "Internal URL",
  private_ip: "Private IP",
} as const satisfies Record<SensitiveFinding["category"], string>

export type SensitiveFindingNavigationHandler = (location: SensitiveFinding["location"]) => void

type SensitiveFindingListProps = {
  readonly findings: readonly SensitiveFinding[]
  readonly onNavigate?: SensitiveFindingNavigationHandler | undefined
}

type FindingGroup = {
  readonly findings: readonly SensitiveFinding[]
  readonly key: string
  readonly label: string
}

function entityLabel(entityType: string): string {
  return entityType.replaceAll("_", " ")
}

function FindingCard({
  finding,
  onNavigate,
}: {
  readonly finding: SensitiveFinding
  readonly onNavigate?: SensitiveFindingNavigationHandler | undefined
}) {
  return (
    <li className="rounded-card border border-border bg-panel-muted p-3">
      <div className="flex flex-wrap items-center gap-2">
        <SensitiveFindingBadge severity={finding.severity} />
        <Badge variant="neutral">{categoryLabels[finding.category]}</Badge>
        <Badge variant="neutral">{finding.confidence} confidence</Badge>
      </div>
      <div className="mt-3 space-y-1">
        <p className="text-[14px] font-medium text-foreground">{finding.label}</p>
        <p className="text-[12px] leading-5 text-muted-strong">{finding.description}</p>
      </div>
      <dl className="mt-3 grid gap-2 text-[12px] md:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-muted">Field</dt>
          <dd className="break-all font-mono text-[11px] text-muted-strong">
            {finding.location.field}
          </dd>
        </div>
        <div className="min-w-0 md:col-span-2">
          <dt className="text-muted">Masked evidence</dt>
          <dd>
            <code className="break-all font-mono text-[11px] text-foreground">
              {finding.evidenceMasked}
            </code>
          </dd>
        </div>
        <div className="min-w-0 md:col-span-2">
          <dt className="text-muted">Recommendation</dt>
          <dd className="leading-5 text-muted-strong">{finding.recommendation}</dd>
        </div>
      </dl>
      {onNavigate !== undefined && (
        <Button
          className="mt-3"
          size="sm"
          variant="ghost"
          onClick={() => onNavigate(finding.location)}
        >
          Open finding location
        </Button>
      )}
    </li>
  )
}

export function SensitiveFindingList({ findings, onNavigate }: SensitiveFindingListProps) {
  if (findings.length === 0) {
    return (
      <div className="rounded-card border border-border bg-panel-muted p-3 text-[12px] leading-5 text-muted">
        No sensitive findings were detected in this manual scan.
      </div>
    )
  }

  const groupedFindings = new Map<string, SensitiveFinding[]>()
  for (const finding of findings) {
    const key = `${finding.location.entityType}:${finding.location.entityId ?? "unscoped"}`
    groupedFindings.set(key, [...(groupedFindings.get(key) ?? []), finding])
  }
  const groups: readonly FindingGroup[] = [...groupedFindings.entries()].map(
    ([key, entityFindings]) => ({
      findings: entityFindings,
      key,
      label:
        entityFindings[0]?.location.previewLabel ??
        entityLabel(entityFindings[0]?.location.entityType ?? "finding"),
    }),
  )

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <section
          key={group.key}
          className="space-y-2"
          aria-labelledby={`finding-group-${group.key}`}
        >
          <h4
            id={`finding-group-${group.key}`}
            className="text-[12px] font-medium capitalize text-muted-strong"
          >
            {group.label}
            <span className="ml-2 font-mono text-[11px] font-normal text-muted">
              {entityLabel(group.findings[0]?.location.entityType ?? "finding")}
            </span>
          </h4>
          <ul className="space-y-2">
            {group.findings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} onNavigate={onNavigate} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
