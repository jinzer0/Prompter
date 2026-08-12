import type { SensitiveFinding } from "../../../../electron/ipc-types"
import { Badge, type BadgeProps } from "../ui/badge"

type SensitiveFindingSeverity = SensitiveFinding["severity"]

type SensitiveFindingBadgeProps = {
  readonly severity: SensitiveFindingSeverity
}

function assertNever(value: never): never {
  throw new TypeError(`Unexpected sensitive finding severity: ${value}`)
}

export function sensitiveFindingSeverityLabel(severity: SensitiveFindingSeverity): string {
  switch (severity) {
    case "low":
      return "Low severity"
    case "medium":
      return "Medium severity"
    case "high":
      return "High severity"
    case "critical":
      return "Critical severity"
    default:
      return assertNever(severity)
  }
}

function badgeVariant(severity: SensitiveFindingSeverity): BadgeProps["variant"] {
  switch (severity) {
    case "low":
      return "neutral"
    case "medium":
    case "high":
    case "critical":
      return "accent"
    default:
      return assertNever(severity)
  }
}

export function SensitiveFindingBadge({ severity }: SensitiveFindingBadgeProps) {
  return <Badge variant={badgeVariant(severity)}>{sensitiveFindingSeverityLabel(severity)}</Badge>
}
