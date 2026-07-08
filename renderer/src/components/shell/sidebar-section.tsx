import { EmptyState } from "../ui/empty-state"
import { SidebarItem } from "./sidebar-item"

type SidebarSectionItem = {
  readonly label: string
  readonly meta: string
  readonly variant: "active" | "default" | "muted"
}

export const sidebarSections = [
  {
    title: "Tags",
    emptyTitle: "No tags yet",
    emptyDescription: "Tags will organize prompts without changing this shell.",
    items: [],
  },
  {
    title: "Harnesses",
    emptyTitle: "No harnesses yet",
    emptyDescription: "Evaluation harnesses stay empty until testing features arrive.",
    items: [],
  },
] as const satisfies readonly {
  readonly emptyDescription: string
  readonly emptyTitle: string
  readonly items: readonly SidebarSectionItem[]
  readonly title: string
}[]

export function SidebarSection({
  emptyDescription,
  emptyTitle,
  items,
  title,
}: {
  readonly emptyDescription: string
  readonly emptyTitle: string
  readonly items: readonly SidebarSectionItem[]
  readonly title: string
}) {
  return (
    <section className="space-y-3" aria-labelledby={`${title.toLowerCase()}-heading`}>
      <div className="flex items-center justify-between">
        <h2
          id={`${title.toLowerCase()}-heading`}
          className="text-[16px] font-semibold text-foreground"
        >
          {title}
        </h2>
      </div>
      {items.length > 0 && (
        <div className="space-y-1">
          {items.map((item) => (
            <SidebarItem
              key={item.label}
              variant={item.variant}
              aria-current={item.variant === "active" ? "page" : undefined}
            >
              <span>{item.label}</span>
              <span className="font-mono text-[11px] text-muted">{item.meta}</span>
            </SidebarItem>
          ))}
        </div>
      )}
      {items.length === 0 && <EmptyState title={emptyTitle} description={emptyDescription} />}
    </section>
  )
}
