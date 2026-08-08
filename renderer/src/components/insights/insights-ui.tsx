import type { ReactNode } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type InsightPanelProps = {
  readonly children: ReactNode
  readonly description: string
  readonly headingId: string
  readonly title: string
}

export function InsightPanel({ children, description, headingId, title }: InsightPanelProps) {
  return (
    <Card role="region" aria-labelledby={headingId} className="min-w-0">
      <CardHeader>
        <CardTitle id={headingId}>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

type InsightMetricProps = {
  readonly label: string
  readonly value: ReactNode
}

export function InsightMetric({ label, value }: InsightMetricProps) {
  return (
    <div className="rounded-card border border-border-subtle bg-panel-muted p-3">
      <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="mt-1 text-[16px] font-semibold text-foreground">{value}</dd>
    </div>
  )
}

type InsightProgressProps = {
  readonly details: ReactNode
  readonly label: string
  readonly percentage: number
}

export function InsightProgress({ details, label, percentage }: InsightProgressProps) {
  const width = Math.min(100, Math.max(0, percentage))
  return (
    <li className="space-y-2 rounded-card border border-border-subtle bg-panel-muted p-3">
      <div className="flex items-center justify-between gap-3 text-[12px]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted">{percentage.toFixed(1)}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label} share`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className="h-2 overflow-hidden rounded-full bg-panel"
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${width}%` }} />
      </div>
      <div className="text-[11px] leading-5 text-muted">{details}</div>
    </li>
  )
}

export function InsightListEmpty({ children }: { readonly children: ReactNode }) {
  return <p className="text-[12px] leading-5 text-muted">{children}</p>
}
