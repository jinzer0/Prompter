import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

import type { InsightsSelectionRequest } from "../renderer/src/hooks/use-insights-workspace-navigation"
import {
  focusInsightsElement,
  resolveInsightsSelectionRequest,
} from "../renderer/src/lib/insights-selection-request"

const request = { id: "target-id", requestId: 7 } satisfies InsightsSelectionRequest

describe("Phase 18 Insights manager selection", () => {
  it("reloads an unfiltered template list once when filters exclude the request", () => {
    // Given: a ready filtered list that excludes a new selection request.
    // When: the manager resolves the request before and after its reload starts.
    const first = resolveInsightsSelectionRequest({
      appliedRequestId: null,
      itemIds: ["filtered-id"],
      reloadedRequestId: null,
      request,
      status: "ready",
    })
    const repeated = resolveInsightsSelectionRequest({
      appliedRequestId: null,
      itemIds: ["filtered-id"],
      reloadedRequestId: request.requestId,
      request,
      status: "ready",
    })
    // Then: one deterministic reload is requested without a reload loop.
    expect(first).toEqual({ kind: "reload" })
    expect(repeated).toEqual({ kind: "wait" })
  })

  it("selects the exact requested item only after it is available", () => {
    // Given: the unfiltered list now contains the requested template.
    // When: the manager resolves the pending request.
    const resolution = resolveInsightsSelectionRequest({
      appliedRequestId: null,
      itemIds: [request.id],
      reloadedRequestId: request.requestId,
      request,
      status: "ready",
    })
    // Then: the exact ID and request ID are returned for one-shot application.
    expect(resolution).toEqual({ kind: "select", id: request.id, requestId: request.requestId })
  })

  it("ignores loading, missing, and already-applied requests", () => {
    // Given: incomplete and consumed manager states.
    const cases = [
      { appliedRequestId: null, request: null, status: "ready" },
      { appliedRequestId: null, request, status: "loading" },
      { appliedRequestId: request.requestId, request, status: "ready" },
    ] as const
    // When: each state resolves against a list containing the target.
    const resolutions = cases.map((entry) =>
      resolveInsightsSelectionRequest({
        ...entry,
        itemIds: [request.id],
        reloadedRequestId: null,
      }),
    )
    // Then: no selection or reload is emitted.
    expect(resolutions).toEqual([{ kind: "wait" }, { kind: "wait" }, { kind: "wait" }])
  })

  it("focuses and scrolls a selected manager element without clicking it", () => {
    // Given: a focusable manager target with observable methods.
    const events: string[] = []
    const element = {
      focus: () => events.push("focus"),
      scrollIntoView: () => events.push("scroll"),
    }
    // When: selection focus is applied.
    focusInsightsElement(element)
    // Then: focus and scroll occur without any click surface.
    expect(events).toEqual(["focus", "scroll"])
    expect("click" in element).toBe(false)
  })

  it("wires concrete template, harness, and context requests to their manager focus targets", async () => {
    // Given: each manager that applies a concrete Insights selection request.
    const managers = [
      ["renderer/src/components/prompt-template-manager.tsx", "prompt-templates"],
      ["renderer/src/components/harness-template-manager.tsx", "harness-templates"],
      ["renderer/src/components/project-context-profile-manager.tsx", "project-context"],
    ] as const
    // When: their post-selection focus wiring is inspected.
    const sources = await Promise.all(
      managers.map(async ([path, target]) => ({ source: await readFile(path, "utf8"), target })),
    )
    // Then: every concrete selection focuses its manager target through the shared helper.
    expect(
      sources.every(({ source, target }) => source.includes(`focusInsightsTarget("${target}")`)),
    ).toBe(true)
  })

  it("fetches an exact prompt template by ID through the hook when lists omit it", async () => {
    // Given: Insights may request a template outside the filtered or 100-item list.
    const [hookSource, managerSource] = await Promise.all([
      readFile("renderer/src/hooks/use-prompt-templates.ts", "utf8"),
      readFile("renderer/src/components/prompt-template-manager.tsx", "utf8"),
    ])
    // When: exact-ID selection wiring is inspected.
    // Then: the hook owns the typed bridge fetch and the component delegates to it.
    expect(hookSource).toContain("window.prompter.promptTemplates.get(id)")
    expect(hookSource).toContain("loadTemplate")
    expect(managerSource).toContain("continuePromptTemplateSelection(selectionRequest")
    expect(managerSource).toContain("loadTemplate: promptTemplates.loadTemplate")
    expect(managerSource).not.toContain("window.prompter.promptTemplates.get")
  })

  it("exposes the Maintenance Insights target alongside its existing menu target", async () => {
    // Given: the production Maintenance card source.
    const source = await readFile(
      "renderer/src/components/maintenance/maintenance-workbench.tsx",
      "utf8",
    )
    // When: navigation target attributes are inspected.
    // Then: menu and Insights focus helpers address the same card.
    expect(source).toContain('data-menu-action-target="settings-maintenance"')
    expect(source).toContain('data-insights-target="settings-maintenance"')
  })
})
