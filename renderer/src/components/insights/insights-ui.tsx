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
    <Card role="region" aria-labelledby={headingId} className="min-w-0 [overflow-wrap:anywhere]">
      <CardHeader className="p-5 pb-3">
        <CardTitle id={headingId} className="text-[17px] tracking-[-0.02em]">
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-2 text-[14px] leading-6">{children}</CardContent>
    </Card>
  )
}

type InsightMetricProps = {
  readonly label: string
  readonly value: ReactNode
}

export function InsightMetric({ label, value }: InsightMetricProps) {
  return (
    <div className="min-w-0 border-b border-border-subtle py-3">
      <dt className="text-[12px] font-medium leading-5 text-muted">{label}</dt>
      <dd className="mt-1 text-[16px] font-semibold leading-6 text-foreground">{value}</dd>
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
    <li className="min-w-0 space-y-2 border-b border-border-subtle py-4 last:border-b-0">
      <div className="flex items-center justify-between gap-3 text-[14px]">
        <span className="min-w-0 font-medium text-foreground">{label}</span>
        <span className="shrink-0 text-[12px] text-muted">{percentage.toFixed(1)}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label} share`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className="h-2 overflow-hidden rounded-sm bg-panel-muted"
      >
        <div className="h-full rounded-sm bg-accent" style={{ width: `${width}%` }} />
      </div>
      <div className="text-[12px] leading-5 text-muted">{details}</div>
    </li>
  )
}

export function InsightListEmpty({ children }: { readonly children: ReactNode }) {
  return <p className="text-[12px] leading-5 text-muted">{children}</p>
}
