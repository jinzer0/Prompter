import { cva, type VariantProps } from "class-variance-authority"
import type { ButtonHTMLAttributes } from "react"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-control border text-[12px] font-medium tracking-[0.02em] transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-accent/60 bg-tint text-foreground hover:border-accent-hover hover:bg-panel-elevated active:bg-panel-muted",
        secondary:
          "border-border bg-panel-elevated text-muted-strong hover:bg-panel-muted hover:text-foreground active:bg-panel",
        ghost:
          "border-transparent bg-transparent text-muted hover:bg-panel-elevated hover:text-muted-strong active:bg-panel-muted",
      },
      size: {
        default: "px-4",
        sm: "min-h-7 px-3 text-[11px]",
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
