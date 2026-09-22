import type { HTMLAttributes } from "react"

import { cn } from "../../lib/utils"

export type MutedWellProps = HTMLAttributes<HTMLDivElement>

export function MutedWell({ className, ...props }: MutedWellProps) {
  return (
    <div
      className={cn("space-y-3 rounded-card border border-border bg-panel-muted p-3", className)}
      {...props}
    />
  )
}
