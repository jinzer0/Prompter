import { cva, type VariantProps } from "class-variance-authority"
import { forwardRef, type TextareaHTMLAttributes } from "react"

import { cn } from "../../lib/utils"

const textareaVariants = cva(
  "min-h-40 w-full resize-none rounded-control border p-4 text-[14px] leading-6 outline-none transition-colors duration-150 ease-out placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50 read-only:cursor-default",
  {
    variants: {
      variant: {
        editable: "border-border bg-panel-elevated text-foreground",
        preview: "border-border-subtle bg-panel-elevated font-mono text-[14px] text-foreground",
      },
    },
    defaultVariants: {
      variant: "editable",
    },
  },
)

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  VariantProps<typeof textareaVariants>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, variant, ...props },
  ref,
) {
  return (
    <textarea
      data-testid="ui-textarea"
      ref={ref}
      className={cn(textareaVariants({ variant }), className)}
      {...props}
    />
  )
})
