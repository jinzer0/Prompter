import type { InputHTMLAttributes } from "react"

import { cn } from "../../lib/utils"

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      data-testid="ui-input"
      className={cn(
        "h-8 w-full rounded-control border border-border bg-panel-muted px-3 text-[14px] text-foreground outline-none transition-colors duration-150 ease-out placeholder:text-muted focus:border-accent/65 focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}
