import type { HTMLAttributes } from "react"

import { cn } from "../../lib/utils"

export type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  readonly description: string
  readonly label?: string
  readonly title: string
}

export function EmptyState({ className, description, label, title, ...props }: EmptyStateProps) {
  return (
    <div
      data-testid="ui-empty-state"
      className={cn("rounded-card border border-border-subtle bg-panel-muted p-4", className)}
      {...props}
    >
      {label ? (
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
          {label}
        </p>
      ) : null}
      <p className="text-[13px] font-medium text-muted-strong">{title}</p>
      <p className="mt-1 text-[12px] leading-5 text-muted">{description}</p>
    </div>
  )
}
