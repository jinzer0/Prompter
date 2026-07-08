import type { ButtonHTMLAttributes, HTMLAttributes } from "react"

import { cn } from "../../lib/utils"

export type TabsProps = HTMLAttributes<HTMLDivElement> & {
  readonly defaultValue: string
}

export function Tabs({ className, defaultValue, ...props }: TabsProps) {
  return (
    <div
      data-testid="ui-tabs"
      data-default-value={defaultValue}
      className={cn("space-y-3", className)}
      {...props}
    />
  )
}

export type TabsListProps = HTMLAttributes<HTMLDivElement>

export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex rounded-control border border-border bg-panel-muted p-1",
        className,
      )}
      {...props}
    />
  )
}

export type TabsTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly active?: boolean
  readonly value: string
}

export function TabsTrigger({
  active = false,
  className,
  type = "button",
  value,
  ...props
}: TabsTriggerProps) {
  return (
    <button
      role="tab"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      data-value={value}
      type={type}
      className={cn(
        "h-7 rounded-control px-3 text-[12px] font-medium text-muted transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45",
        active && "bg-accent/12 text-foreground",
        !active && "hover:bg-panel-elevated hover:text-muted-strong",
        className,
      )}
      {...props}
    />
  )
}

export type TabsContentProps = HTMLAttributes<HTMLDivElement> & {
  readonly value: string
}

export function TabsContent({ className, value, ...props }: TabsContentProps) {
  return (
    <div role="tabpanel" data-value={value} className={cn("outline-none", className)} {...props} />
  )
}
