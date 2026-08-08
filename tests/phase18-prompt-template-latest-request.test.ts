import { describe, expect, it, vi } from "vitest"

import type { PromptTemplate, PromptTemplateListResult } from "../electron/ipc-types"
import type { InsightsSelectionRequest } from "../renderer/src/hooks/use-insights-workspace-navigation"
import {
  createPromptTemplateLoader,
  type PromptTemplateLoadEvent,
  type PromptTemplateLoader,
  type PromptTemplateLoadResult,
} from "../renderer/src/hooks/use-prompt-templates"
import {
  continuePromptTemplateSelection,
  type PromptTemplateSelectionContinuation,
} from "../renderer/src/lib/prompt-template-selection-request"
import { createDeferred } from "./phase18-insights-renderer-fixtures"

const templateA = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Template A",
  description: null,
  sourcePromptAssetId: null,
  sourcePromptVersionId: null,
  scenario: "feature",
  targetAgent: "codex",
  templateBody: "A",
  createdAt: 1,
  updatedAt: 1,
} satisfies PromptTemplate

const templateB = {
  ...templateA,
  id: "10000000-0000-4000-8000-000000000101",
  name: "Template beyond first 100",
  templateBody: "B",
  updatedAt: 2,
} satisfies PromptTemplate

type ObservableState = {
  templates: readonly PromptTemplate[]
  selectedTemplateId: string | null
  status: "idle" | "loading" | "ready" | "error"
  error: string | null
  editorOpen: boolean
  focusCount: number
  appliedRequestId: number | null
}

function assertNever(value: never): never {
  throw new TypeError(`Unexpected prompt template event: ${JSON.stringify(value)}`)
}

function applyLoadEvent(state: ObservableState, event: PromptTemplateLoadEvent): void {
  switch (event.kind) {
    case "load_started":
      state.status = "loading"
      state.error = null
      return
    case "list_applied":
      state.templates = event.templates
      state.status = "ready"
      return
    case "exact_applied":
      state.templates = [
        event.template,
        ...state.templates.filter((template) => template.id !== event.template.id),
      ]
      state.selectedTemplateId = event.template.id
      state.status = "ready"
      return
    case "load_failed":
      state.error = event.message
      state.status = "error"
      return
    default:
      assertNever(event)
  }
}

function createHarness() {
  const exactRequests = new Map<string, ReturnType<typeof createDeferred<PromptTemplate>>>()
  const listRequest = createDeferred<PromptTemplateListResult>()
  const state: ObservableState = {
    templates: [],
    selectedTemplateId: null,
    status: "idle",
    error: "old error",
    editorOpen: false,
    focusCount: 0,
    appliedRequestId: null,
  }
  const get = vi.fn((id: string) => {
    const request = createDeferred<PromptTemplate>()
    exactRequests.set(id, request)
    return request.promise
  })
  const list = vi.fn(() => listRequest.promise)
  const loader = createPromptTemplateLoader({ get, list }, (event) => applyLoadEvent(state, event))

  return { exactRequests, get, list, listRequest, loader, state }
}

async function selectRequest(
  loader: PromptTemplateLoader,
  state: ObservableState,
  request: InsightsSelectionRequest,
  currentRequest: () => InsightsSelectionRequest | null,
): Promise<PromptTemplateLoadResult<PromptTemplate>> {
  return continuePromptTemplateSelection(request, {
    getCurrentRequest: currentRequest,
    loadTemplate: loader.loadTemplate,
    onApplied: (requestId) => {
      state.editorOpen = true
      state.focusCount += 1
      state.appliedRequestId = requestId
    },
  } satisfies PromptTemplateSelectionContinuation)
}

describe("Phase 18 prompt template latest request", () => {
  it("keeps exact request B authoritative when exact request A resolves last", async () => {
    // Given: exact request A is pending when a newer request B starts.
    const harness = createHarness()
    let currentRequest: InsightsSelectionRequest | null = { id: templateA.id, requestId: 1 }
    const pendingA = selectRequest(
      harness.loader,
      harness.state,
      currentRequest,
      () => currentRequest,
    )
    currentRequest = { id: templateB.id, requestId: 2 }
    const pendingB = selectRequest(
      harness.loader,
      harness.state,
      currentRequest,
      () => currentRequest,
    )

    // When: B applies first and A resolves after the full observable state is captured.
    harness.exactRequests.get(templateB.id)?.resolve(templateB)
    const resultB = await pendingB
    const appliedState = { ...harness.state, templates: [...harness.state.templates] }
    harness.exactRequests.get(templateA.id)?.resolve(templateA)
    const resultA = await pendingA

    // Then: A is stale and cannot change list, selection, status, error, editor, focus, or request.
    expect(resultB).toEqual({ kind: "applied", value: templateB })
    expect(resultA).toEqual({ kind: "stale" })
    expect(harness.state).toEqual(appliedState)
    expect(harness.state).toMatchObject({
      selectedTemplateId: templateB.id,
      status: "ready",
      error: null,
      editorOpen: true,
      focusCount: 1,
      appliedRequestId: 2,
    })
  })

  it("keeps a newer exact ID authoritative when an older filtered list resolves last", async () => {
    // Given: a filtered list is pending before an exact request for an ID beyond its first 100.
    const harness = createHarness()
    const staleList = harness.loader.loadTemplates({ query: "old filter" })
    const currentRequest: InsightsSelectionRequest = { id: templateB.id, requestId: 3 }
    const exact = selectRequest(harness.loader, harness.state, currentRequest, () => currentRequest)

    // When: the exact request applies before the older filtered list returns.
    harness.exactRequests.get(templateB.id)?.resolve(templateB)
    await exact
    const appliedState = { ...harness.state, templates: [...harness.state.templates] }
    harness.listRequest.resolve({ templates: [templateA], total: 1 })
    const listResult = await staleList

    // Then: exact bridge access remains independent and the stale list has no state effects.
    expect(listResult).toEqual({ kind: "stale" })
    expect(harness.get).toHaveBeenCalledWith(templateB.id)
    expect(harness.list).toHaveBeenCalledWith({ query: "old filter" })
    expect(harness.state).toEqual(appliedState)
    expect(harness.state.selectedTemplateId).toBe(templateB.id)
  })

  it("skips manager continuation when the current request changes during an applied load", async () => {
    // Given: request A is awaiting a loader that can report an applied result independently.
    const requestA = { id: templateA.id, requestId: 4 } satisfies InsightsSelectionRequest
    let currentRequest: InsightsSelectionRequest | null = requestA
    const deferred = createDeferred<PromptTemplateLoadResult<PromptTemplate>>()
    const onApplied = vi.fn()
    const pending = continuePromptTemplateSelection(requestA, {
      getCurrentRequest: () => currentRequest,
      loadTemplate: () => deferred.promise,
      onApplied,
    })

    // When: request B becomes current before the applied A result returns.
    currentRequest = { id: templateB.id, requestId: 5 }
    deferred.resolve({ kind: "applied", value: templateA })
    const result = await pending

    // Then: request identity gates editor/focus continuation even after a loader applies.
    expect(result).toEqual({ kind: "stale" })
    expect(onApplied).not.toHaveBeenCalled()
  })
})
