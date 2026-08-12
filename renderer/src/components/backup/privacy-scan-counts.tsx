import type { SensitiveScanResult } from "../../../../electron/ipc-types"

const findingCounts = [
  ["Critical", "criticalCount"],
  ["High", "highCount"],
  ["Medium", "mediumCount"],
  ["Low", "lowCount"],
] as const satisfies readonly (readonly [string, keyof SensitiveScanResult])[]

export function PrivacyScanCounts({ scan }: { readonly scan: SensitiveScanResult }) {
  return (
    <dl className="grid grid-cols-2 gap-2">
      {findingCounts.map(([label, key]) => (
        <div key={key} className="rounded-card border border-border bg-panel-muted p-2">
          <dt className="font-mono text-[11px] text-muted">{label}</dt>
          <dd className="mt-1 text-[13px] font-medium text-foreground">{scan[key]}</dd>
        </div>
      ))}
    </dl>
  )
}
