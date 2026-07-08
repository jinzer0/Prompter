import { cva, type VariantProps } from "class-variance-authority"
import type { ButtonHTMLAttributes } from "react"

import { cn } from "../../lib/utils"

const sidebarItemVariants = cva(
  "flex min-h-7 w-full items-center justify-between rounded-control px-3 text-left text-[12px] font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "text-muted-strong hover:bg-panel-elevated hover:text-foreground",
        active: "bg-accent/12 text-foreground",
        muted: "text-muted hover:bg-panel-elevated hover:text-muted-strong",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export type SidebarItemProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof sidebarItemVariants>

export function SidebarItem({ className, type = "button", variant, ...props }: SidebarItemProps) {
  return (
    <button
      data-testid="ui-sidebar-item"
      type={type}
      className={cn(sidebarItemVariants({ variant }), className)}
      {...props}
    />
  )
}
