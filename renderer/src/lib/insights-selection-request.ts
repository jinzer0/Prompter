type SelectionRequest = {
  readonly id: string
  readonly requestId: number
}

type SelectionRequestInput = {
  readonly appliedRequestId: number | null
  readonly itemIds: readonly string[]
  readonly reloadedRequestId: number | null
  readonly request: SelectionRequest | null
  readonly status: "idle" | "loading" | "ready" | "error"
}

export type SelectionRequestResolution =
  | { readonly kind: "reload" }
  | { readonly kind: "select"; readonly id: string; readonly requestId: number }
  | { readonly kind: "wait" }

export function resolveInsightsSelectionRequest({
  appliedRequestId,
  itemIds,
  reloadedRequestId,
  request,
  status,
}: SelectionRequestInput): SelectionRequestResolution {
  if (request === null || request.requestId === appliedRequestId || status !== "ready") {
    return { kind: "wait" }
  }
  if (itemIds.includes(request.id)) {
    return { kind: "select", id: request.id, requestId: request.requestId }
  }
  return request.requestId === reloadedRequestId ? { kind: "wait" } : { kind: "reload" }
}

type InsightsFocusableElement = {
  readonly focus: () => void
  readonly scrollIntoView: (options: ScrollIntoViewOptions) => void
}

export function focusInsightsElement(element: InsightsFocusableElement): void {
  element.focus()
  element.scrollIntoView({ block: "nearest" })
}

export function focusInsightsTarget(target: string): void {
  requestAnimationFrame(() => {
    const element = document.querySelector<HTMLElement>(`[data-insights-target="${target}"]`)
    if (element !== null) focusInsightsElement(element)
  })
}
