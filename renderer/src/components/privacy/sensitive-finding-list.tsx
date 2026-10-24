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
    <li className="min-w-0 border-b border-border-subtle py-4 last:border-b-0 [overflow-wrap:anywhere]">
      <div className="flex flex-wrap items-center gap-2">
        <SensitiveFindingBadge severity={finding.severity} />
        <Badge variant="neutral">{categoryLabels[finding.category]}</Badge>
        <Badge variant="neutral">{finding.confidence} confidence</Badge>
      </div>
      <div className="mt-3 space-y-1">
        <p className="text-[14px] font-medium leading-6 text-foreground">{finding.label}</p>
        <p className="text-[12px] leading-5 text-muted-strong">{finding.description}</p>
      </div>
      <dl className="mt-3 grid gap-2 text-[12px] md:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-muted">Field</dt>
          <dd className="break-all font-mono text-[12px] text-muted-strong">
            {finding.location.field}
          </dd>
        </div>
        <div className="min-w-0 md:col-span-2">
          <dt className="text-muted">Masked evidence</dt>
          <dd>
            <code className="break-all font-mono text-[12px] text-foreground">
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
      <div className="border-l-2 border-accent py-2 pl-3 text-[14px] leading-6 text-muted">
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
    <div className="min-w-0 space-y-5 [overflow-wrap:anywhere]">
      {groups.map((group) => (
        <section key={group.key} className="min-w-0" aria-labelledby={`finding-group-${group.key}`}>
          <h4
            id={`finding-group-${group.key}`}
            className="border-b border-border-subtle pb-3 text-[14px] font-medium capitalize text-foreground"
          >
            {group.label}
            <span className="ml-2 font-mono text-[12px] font-normal text-muted">
              {entityLabel(group.findings[0]?.location.entityType ?? "finding")}
            </span>
          </h4>
          <ul className="min-w-0">
            {group.findings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} onNavigate={onNavigate} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
