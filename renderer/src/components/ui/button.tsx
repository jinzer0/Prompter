import { cva, type VariantProps } from "class-variance-authority"
import type { ButtonHTMLAttributes } from "react"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-control border text-[14px] font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-accent bg-accent text-on-accent hover:border-accent-hover hover:bg-accent-hover active:bg-accent-hover",
        secondary:
          "border-border bg-panel text-foreground hover:bg-panel-elevated active:bg-panel-muted",
        ghost:
          "border-transparent bg-transparent text-muted hover:bg-panel-elevated hover:text-muted-strong active:bg-panel-muted",
      },
      size: {
        default: "px-3",
        sm: "min-h-7 px-3 text-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button
      data-testid="ui-button"
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
