import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type {
  MaintenanceActionPreview,
  MaintenanceActionResult,
  MaintenanceScanResult,
  PreparedMaintenanceAction,
  PrepareMaintenanceActionInput,
} from "../electron/ipc-types"
import { canExecuteMaintenanceAction } from "../renderer/src/components/maintenance/maintenance-actions"
import { prepareInputFromAction } from "../renderer/src/components/maintenance/maintenance-labels"
import type { MaintenanceController } from "../renderer/src/components/maintenance/maintenance-workbench"
import { MaintenanceWorkbenchView } from "../renderer/src/components/maintenance/maintenance-workbench"
import { createInitialMaintenanceState } from "../renderer/src/hooks/use-maintenance"

const canonicalTagId = "11111111-1111-4111-8111-111111111111"
const duplicateTagId = "22222222-2222-4222-8222-222222222222"
const promptAssetId = "33333333-3333-4333-8333-333333333333"
const sessionId = "44444444-4444-4444-8444-444444444444"

const duplicateTagAction = {
  actionType: "merge_duplicate_tags",
  title: "Merge duplicate tags",
  description: "Merge duplicate tag links into a selected canonical tag.",
  severity: "high",
  affectedEntityType: "tag",
  affectedEntityIds: [canonicalTagId, duplicateTagId],
  destructive: true,
  relationshipChanging: true,
  estimatedChangeCount: 1,
  backupRecommendation: "Export a backup before merging tags.",
} satisfies MaintenanceActionPreview

const rebuildAction = {
  actionType: "rebuild_search_index",
  title: "Rebuild search index",
  description: "Atomically rebuild search rows from current versions.",
  severity: "high",
  affectedEntityType: "prompt_asset",
  affectedEntityIds: [promptAssetId],
  destructive: false,
  relationshipChanging: false,
  estimatedChangeCount: 1,
  backupRecommendation: null,
} satisfies MaintenanceActionPreview

const scanResult = {
  summary: {
    totalFindings: 3,
    severityCounts: { low: 0, medium: 1, high: 2 },
    categoryCounts: {
      duplicate_prompts: 1,
      duplicate_tags: 1,
      search_index_health: 1,
    },
    truncated: false,
  },
  findings: [
    {
      id: "55555555-5555-4555-8555-555555555555",
      severity: "medium",
      category: "duplicate_prompts",
      title: "Potential duplicate prompts",
      description: "Matched on normalized title.",
      affectedEntityType: "prompt_asset",
      affectedEntityIds: [promptAssetId],
      safeAutoFixAvailable: false,
    },
    {
      id: "66666666-6666-4666-8666-666666666666",
      severity: "high",
      category: "duplicate_tags",
      title: "Duplicate tags",
      description: "Tags normalize to bug fix.",
      affectedEntityType: "tag",
      affectedEntityIds: [canonicalTagId, duplicateTagId],
      suggestedActionType: "merge_duplicate_tags",
      safeAutoFixAvailable: false,
    },
  ],
  recommendedActions: [duplicateTagAction, rebuildAction],
} satisfies MaintenanceScanResult

const preparedAction = {
  actionSessionId: sessionId,
  actionType: "merge_duplicate_tags",
  preview: duplicateTagAction,
  affectedDisplayNames: ["bug fix", "Bug Fix"],
  warnings: ["Prompt-tag links will move to the canonical tag."],
  requiresConfirmation: true,
  expiresAt: 2_000,
} satisfies PreparedMaintenanceAction

const resultSummary = {
  actionSessionId: sessionId,
  actionType: "merge_duplicate_tags",
  status: "succeeded",
  changedCount: 1,
  skippedCount: 0,
  message: "Merged one duplicate tag.",
  warnings: ["Scan data is stale after this action."],
} satisfies MaintenanceActionResult

const selectedActionInput = {
  actionType: "merge_duplicate_tags",
  canonicalTagId,
  duplicateTagIds: [duplicateTagId],
} satisfies PrepareMaintenanceActionInput

function controller(overrides: Partial<MaintenanceController> = {}): MaintenanceController {
  const state = createInitialMaintenanceState()

  return {
    actionPhase: "idle",
    cancelActionSession: async () => undefined,
    canFilterCurrentProject: true,
    canRescan: false,
    currentProjectOnly: false,
    error: null,
    executeAction: async () => undefined,
    findings: [],
    isWorking: false,
    prepareAction: async () => undefined,
    preparedAction: null,
    preparedActionPreview: null,
    recommendedActions: [],
    rescan: async () => undefined,
    resultSummary: null,
    scanLibrary: async () => undefined,
    scanOptions: state.scanOptions,
    scanPhase: "idle",
    scanStale: false,
    scanSummary: null,
    selectedActionInput: null,
    setCurrentProjectFilter: () => undefined,
    setScanOptions: () => undefined,
    setSelectedActionInput: () => undefined,
    ...overrides,
  }
}

function markup(maintenance: MaintenanceController): string {
  return renderToStaticMarkup(
    createElement(MaintenanceWorkbenchView, {
      maintenance,
      selectedProjectName: "Phase 17 Project",
    }),
  )
}

describe("phase17 maintenance settings UI", () => {
  it("renders whole-library scan defaults and every explicit scan class", () => {
    const rendered = markup(controller())

    expect(rendered).toContain("Whole-library scan is the default")
    expect(rendered).toContain("Current project only")
    expect(rendered).toContain("Duplicate prompts")
    expect(rendered).toContain("Duplicate tags")
    expect(rendered).toContain("Unused tags")
    expect(rendered).toContain("Current-version repairs")
    expect(rendered).toContain("Empty prompt assets")
    expect(rendered).toContain("Search index health")
    expect(rendered).toContain("Prompt template issues")
    expect(rendered).toContain("Harness template issues")
    expect(rendered).toContain("Quality review findings")
  })

  it("renders scan summary, findings, finding-only duplicate prompts, and action previews", () => {
    const rendered = markup(
      controller({
        findings: scanResult.findings,
        recommendedActions: scanResult.recommendedActions,
        scanSummary: scanResult.summary,
      }),
    )

    expect(rendered).toContain("Total findings")
    expect(rendered).toContain("Potential duplicate prompts")
    expect(rendered).toContain("Compare/open candidate only")
    expect(rendered).toContain("Merge duplicate tags")
    expect(rendered).toContain("Rebuild search index")
    expect(rendered).toContain("Backup recommended: Export a backup before merging tags.")
  })

  it("maps duplicate tag canonical selection to the approved prepare payload", () => {
    const input = prepareInputFromAction(duplicateTagAction, duplicateTagId)

    expect(input).toEqual({
      actionType: "merge_duplicate_tags",
      canonicalTagId: duplicateTagId,
      duplicateTagIds: [canonicalTagId],
    })
  })

  it("renders prepared confirmation details, result summary, and stale rescan messaging", () => {
    const rendered = markup(
      controller({
        actionPhase: "prepared",
        canRescan: true,
        preparedAction,
        resultSummary,
        scanStale: true,
        selectedActionInput,
      }),
    )

    expect(rendered).toContain("Scan data is stale after the last action")
    expect(rendered).toContain("Backup recommended before execute")
    expect(rendered).toContain("Prompt-tag links will move")
    expect(rendered).toContain("Execute prepared action")
    expect(rendered).toContain("Result: succeeded")
    expect(rendered).toContain("Merged one duplicate tag")
  })

  it("prevents destructive execution without a prepared session preview", () => {
    expect(
      canExecuteMaintenanceAction({
        actionPhase: "idle",
        isWorking: false,
        preparedAction: null,
      }),
    ).toBe(false)

    const rendered = markup(controller({ selectedActionInput }))

    expect(rendered).toContain("Prepare selected action")
    expect(rendered).not.toContain("Execute prepared action")
  })
})
