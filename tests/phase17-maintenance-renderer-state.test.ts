import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import type {
  MaintenanceActionPreview,
  MaintenanceActionResult,
  MaintenanceScanResult,
  PreparedMaintenanceAction,
  PrepareMaintenanceActionInput,
} from "../electron/ipc-types"
import {
  buildMaintenanceScanInput,
  createInitialMaintenanceState,
  maintenanceReducer,
} from "../renderer/src/hooks/use-maintenance"

const projectId = "11111111-1111-4111-8111-111111111111"
const actionSessionId = "22222222-2222-4222-8222-222222222222"
const tagId = "33333333-3333-4333-8333-333333333333"
const duplicateTagId = "44444444-4444-4444-8444-444444444444"

const actionInput = {
  actionType: "merge_duplicate_tags",
  canonicalTagId: tagId,
  duplicateTagIds: [duplicateTagId],
} satisfies PrepareMaintenanceActionInput

const actionPreview = {
  actionType: "merge_duplicate_tags",
  title: "Merge duplicate tags",
  description: "Merge selected duplicate tags into the selected canonical tag.",
  severity: "high",
  affectedEntityType: "tag",
  affectedEntityIds: [tagId, duplicateTagId],
  destructive: true,
  relationshipChanging: true,
  estimatedChangeCount: 1,
  backupRecommendation: "Export a backup first.",
} satisfies MaintenanceActionPreview

const preparedAction = {
  actionSessionId,
  actionType: "merge_duplicate_tags",
  preview: actionPreview,
  affectedDisplayNames: ["Canonical", "Duplicate"],
  warnings: ["Prompt links will move."],
  requiresConfirmation: true,
  expiresAt: 2_000,
} satisfies PreparedMaintenanceAction

const scanResult = {
  summary: {
    totalFindings: 1,
    severityCounts: { low: 0, medium: 1, high: 0 },
    categoryCounts: { duplicate_tags: 1 },
    truncated: false,
  },
  findings: [
    {
      id: "55555555-5555-4555-8555-555555555555",
      severity: "medium",
      category: "duplicate_tags",
      title: "Duplicate tags",
      description: "Two tags normalize to the same name.",
      affectedEntityType: "tag",
      affectedEntityIds: [tagId, duplicateTagId],
      suggestedActionType: "merge_duplicate_tags",
      safeAutoFixAvailable: false,
    },
  ],
  recommendedActions: [actionPreview],
} satisfies MaintenanceScanResult

function executeResult(
  status: MaintenanceActionResult["status"],
  message: string,
): MaintenanceActionResult {
  return {
    actionSessionId,
    actionType: "merge_duplicate_tags",
    status,
    changedCount: status === "succeeded" ? 1 : 0,
    skippedCount: 0,
    message,
    warnings: [],
  }
}

function stateWithPreparedAction() {
  return maintenanceReducer(
    maintenanceReducer(createInitialMaintenanceState(), {
      type: "action_selected",
      input: actionInput,
    }),
    { type: "prepare_succeeded", preparedAction },
  )
}

describe("phase17 maintenance renderer state", () => {
  it("defaults to a whole-library scan with every finding class explicit", () => {
    const state = createInitialMaintenanceState()

    const input = buildMaintenanceScanInput(state, projectId)

    expect(input).toEqual({
      includePromptDuplicates: true,
      includeTagDuplicates: true,
      includeUnusedTags: true,
      includeCurrentVersionIssues: true,
      includeEmptyAssets: true,
      includeSearchIndexHealth: true,
      includePromptTemplateIssues: true,
      includeHarnessTemplateIssues: true,
      includeQualityFindings: true,
    })
  })

  it("stores a successful scan summary, findings, and recommended actions", () => {
    const scanning = maintenanceReducer(createInitialMaintenanceState(), {
      type: "scan_started",
    })

    const ready = maintenanceReducer(scanning, { type: "scan_succeeded", scanResult })

    expect(ready.scanPhase).toBe("ready")
    expect(ready.scanResult).toEqual(scanResult)
    expect(ready.scanStale).toBe(false)
    expect(ready.error).toBeNull()
  })

  it("adds the selected project only when current-project filtering is enabled", () => {
    const filtered = maintenanceReducer(createInitialMaintenanceState(), {
      type: "current_project_filter_changed",
      enabled: true,
    })

    expect(buildMaintenanceScanInput(filtered, projectId)).toEqual({
      ...filtered.scanOptions,
      projectId,
    })
    expect(buildMaintenanceScanInput(filtered, null)).toEqual(filtered.scanOptions)
  })

  it("stores selected action input and the main-prepared preview", () => {
    const prepared = stateWithPreparedAction()

    expect(prepared.selectedActionInput).toEqual(actionInput)
    expect(prepared.preparedAction).toEqual(preparedAction)
    expect(prepared.actionPhase).toBe("prepared")
  })

  it("marks scan data stale and exposes the result summary after success", () => {
    const executing = maintenanceReducer(stateWithPreparedAction(), {
      type: "execute_started",
    })
    const result = executeResult("succeeded", "Merged one duplicate tag.")

    const completed = maintenanceReducer(executing, { type: "execute_finished", result })

    expect(completed.scanStale).toBe(true)
    expect(completed.resultSummary).toEqual(result)
    expect(completed.preparedAction).toBeNull()
    expect(completed.actionPhase).toBe("completed")
  })

  it("preserves the prepared preview after confirmation cancellation for retry", () => {
    const result = executeResult("confirmation_cancelled", "Confirmation dismissed.")

    const retryable = maintenanceReducer(stateWithPreparedAction(), {
      type: "execute_finished",
      result,
    })

    expect(retryable.preparedAction).toEqual(preparedAction)
    expect(retryable.selectedActionInput).toEqual(actionInput)
    expect(retryable.actionPhase).toBe("prepared")
    expect(retryable.resultSummary).toEqual(result)
  })

  it("requires explicit cancellation before replacing a prepared action", () => {
    const replacement = { actionType: "rebuild_search_index" } as const

    const unchanged = maintenanceReducer(stateWithPreparedAction(), {
      type: "action_selected",
      input: replacement,
    })

    expect(unchanged.preparedAction).toEqual(preparedAction)
    expect(unchanged.selectedActionInput).toEqual(actionInput)
  })

  it.each([
    ["failed", "Action session expired.", false],
    ["stale", "Selected rows changed after the scan.", true],
  ] as const)("keeps a %s execute result recoverable", (status, message, scanStale) => {
    const result = executeResult(status, message)

    const failed = maintenanceReducer(stateWithPreparedAction(), {
      type: "execute_finished",
      result,
    })

    expect(failed.actionPhase).toBe("error")
    expect(failed.preparedAction).toBeNull()
    expect(failed.resultSummary).toEqual(result)
    expect(failed.error).toEqual({ operation: "execute", message })
    expect(failed.scanStale).toBe(scanStale)
  })

  it("clears the prepared session after explicit cancellation", () => {
    const cancelling = maintenanceReducer(stateWithPreparedAction(), {
      type: "cancel_started",
    })

    const cancelled = maintenanceReducer(cancelling, { type: "cancel_succeeded" })

    expect(cancelled.actionPhase).toBe("cancelled")
    expect(cancelled.preparedAction).toBeNull()
    expect(cancelled.selectedActionInput).toBeNull()
  })

  it("keeps compiler draft state isolated from every maintenance transition", () => {
    const hookSource = readFileSync("renderer/src/hooks/use-maintenance.ts", "utf8")
    const compilerDraft = {
      originalInput: "Keep this draft unchanged.",
      compiledPrompt: "Existing compiler output",
      revision: 7,
    }
    const before = { ...compilerDraft }

    let state = maintenanceReducer(createInitialMaintenanceState(), { type: "scan_started" })
    state = maintenanceReducer(state, { type: "scan_succeeded", scanResult })
    state = maintenanceReducer(state, { type: "action_selected", input: actionInput })
    state = maintenanceReducer(state, { type: "prepare_succeeded", preparedAction })
    state = maintenanceReducer(state, { type: "cancel_succeeded" })

    expect(state.actionPhase).toBe("cancelled")
    expect(compilerDraft).toEqual(before)
    expect(hookSource).not.toMatch(/promptCompiler|setDraft|setCompiled|setReview/)
  })
})
