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
        "min-w-0 rounded-xl border p-3 text-left transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        selected
          ? "border-border-subtle bg-panel"
          : "border-transparent bg-transparent hover:bg-panel-elevated",
        className,
      )}
      {...props}
    />
  )
}
