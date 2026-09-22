import type { SensitiveScanResult } from "../../../../electron/ipc-types"
import { MetricCard, MetricGrid } from "../ui/metric-card"

const findingCounts = [
  ["Critical", "criticalCount"],
  ["High", "highCount"],
  ["Medium", "mediumCount"],
  ["Low", "lowCount"],
] as const satisfies readonly (readonly [string, keyof SensitiveScanResult])[]

export function PrivacyScanCounts({ scan }: { readonly scan: SensitiveScanResult }) {
  return (
    <MetricGrid>
      {findingCounts.map(([label, key]) => (
        <MetricCard key={key} label={label} value={scan[key]} />
      ))}
    </MetricGrid>
  )
}
