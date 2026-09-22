import type { ButtonHTMLAttributes } from "react"

import { cn } from "../../lib/utils"

export type SelectableCardProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly selected: boolean
}

export function SelectableCard({
  className,
  selected,
  type = "button",
  ...props
}: SelectableCardProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "rounded-card border bg-panel-elevated p-4 text-left transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45",
        selected ? "border-accent/35" : "border-border hover:border-border-subtle",
        className,
      )}
      {...props}
    />
  )
}
