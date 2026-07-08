import { cva, type VariantProps } from "class-variance-authority"
import type { HTMLAttributes } from "react"

import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex min-h-[22px] items-center whitespace-nowrap rounded-full border px-2.5 text-[11px] font-medium leading-none tracking-[0.02em]",
  {
    variants: {
      variant: {
        neutral: "border-border bg-panel-muted text-muted-strong",
        accent: "border-accent/35 bg-accent/12 text-foreground",
        success: "border-success/35 bg-panel-muted text-success",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
)

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span data-testid="ui-badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}
