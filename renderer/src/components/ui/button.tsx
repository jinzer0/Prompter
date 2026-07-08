import { cva, type VariantProps } from "class-variance-authority"
import type { ButtonHTMLAttributes } from "react"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-control border text-[12px] font-medium tracking-[0.02em] transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-accent/35 bg-accent/90 text-foreground hover:border-accent-hover/60 hover:bg-accent-hover/90 active:bg-accent/75",
        secondary:
          "border-border bg-panel-elevated text-muted-strong hover:bg-panel-muted hover:text-foreground active:bg-panel",
        ghost:
          "border-transparent bg-transparent text-muted hover:bg-panel-elevated hover:text-muted-strong active:bg-panel-muted",
      },
      size: {
        default: "px-4",
        sm: "h-7 px-3 text-[11px]",
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
