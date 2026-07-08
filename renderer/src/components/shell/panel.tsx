import type { HTMLAttributes } from "react"

import { cn } from "../../lib/utils"

export type PanelProps = HTMLAttributes<HTMLElement> & {
  readonly headingId: string
}

export function Panel({ className, headingId, ...props }: PanelProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex min-w-0 flex-col rounded-panel border border-border-subtle bg-panel p-5 shadow-panel",
        className,
      )}
      {...props}
    />
  )
}
