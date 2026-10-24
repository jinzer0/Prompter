import type { SelectHTMLAttributes } from "react"

import { cn } from "../../lib/utils"

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      data-testid="ui-select"
      className={cn(
        "h-8 w-full rounded-control border border-border bg-panel px-3 text-[14px] text-foreground outline-none transition-colors duration-150 ease-out focus:border-accent focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}
