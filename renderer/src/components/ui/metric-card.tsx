import type { ReactNode } from "react"

import { cn } from "../../lib/utils"

type MetricGridProps = {
  readonly children: ReactNode
  readonly className?: string
}

export function MetricGrid({ children, className }: MetricGridProps) {
  return <dl className={cn("grid grid-cols-2 gap-2", className)}>{children}</dl>
}

type MetricCardProps = {
  readonly label: ReactNode
  readonly value: ReactNode
  readonly className?: string
  readonly labelClassName?: string
  readonly valueClassName?: string
}

export function MetricCard({
  className,
  label,
  labelClassName,
  value,
  valueClassName,
}: MetricCardProps) {
  return (
    <div className={cn("rounded-card border border-border bg-panel-muted p-2", className)}>
      <dt className={cn("font-mono text-[11px] text-muted", labelClassName)}>{label}</dt>
      <dd className={cn("mt-1 text-[13px] font-medium text-foreground", valueClassName)}>
        {value}
      </dd>
    </div>
  )
}
