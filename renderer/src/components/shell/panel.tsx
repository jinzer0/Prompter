import type { HTMLAttributes } from "react"

import { cn } from "../../lib/utils"

export type PanelProps = HTMLAttributes<HTMLElement> & {
  readonly headingId: string
}

export function Panel({ className, headingId, ...props }: PanelProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex min-h-0 min-w-0 flex-col overflow-y-auto bg-panel p-4", className)}
      {...props}
    />
  )
}
