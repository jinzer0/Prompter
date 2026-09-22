import type { InputHTMLAttributes } from "react"

import { cn } from "../../lib/utils"

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      data-testid="ui-checkbox"
      type="checkbox"
      className={cn(
        "mt-1 size-4 shrink-0 rounded-control accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}
