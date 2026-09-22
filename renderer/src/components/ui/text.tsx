import type { HTMLAttributes } from "react"

import { cn } from "../../lib/utils"

export type TextProps<T extends HTMLElement> = HTMLAttributes<T>

export function HelperText({ className, ...props }: TextProps<HTMLParagraphElement>) {
  return <p className={cn("text-[12px] leading-5 text-muted-strong", className)} {...props} />
}

export function MetaLabel({ className, ...props }: TextProps<HTMLSpanElement>) {
  return <span className={cn("font-mono text-[11px] text-muted", className)} {...props} />
}

export function StatusText({ className, ...props }: TextProps<HTMLOutputElement>) {
  return (
    <output className={cn("block text-[12px] leading-5 text-muted-strong", className)} {...props} />
  )
}
