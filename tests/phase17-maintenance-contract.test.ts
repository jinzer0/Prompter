import { describe, expect, it } from "vitest"

import { createElectronBridge } from "../electron/bridge"
import type { MaintenanceBridge } from "../electron/bridge-types"
import {
  cancelMaintenanceActionSessionInputSchema,
  executeMaintenanceActionInputSchema,
  maintenanceActionPreviewSchema,
  maintenanceActionResultSchema,
  maintenanceFindingSchema,
  maintenanceScanInputSchema,
  maintenanceScanResultSchema,
  PERSISTENCE_CHANNELS,
  payloadSchemas,
  preparedMaintenanceActionSchema,
  prepareMaintenanceActionInputSchema,
  responseSchemas,
} from "../electron/ipc-contract"
import type { PrepareMaintenanceActionInput } from "../electron/ipc-types"

const projectId = "11111111-1111-4111-8111-111111111111"
const findingId = "22222222-2222-4222-8222-222222222222"
const canonicalTagId = "33333333-3333-4333-8333-333333333333"
const duplicateTagId = "44444444-4444-4444-8444-444444444444"
const actionSessionId = "55555555-5555-4555-8555-555555555555"

const scanInput = {
  includePromptDuplicates: true,
  includeTagDuplicates: true,
  includeUnusedTags: true,
  includeCurrentVersionIssues: true,
  includeEmptyAssets: true,
  includeSearchIndexHealth: true,
  includePromptTemplateIssues: true,
  includeHarnessTemplateIssues: true,
  includeQualityFindings: true,
} as const
const finding = {
  id: findingId,
  severity: "medium",
  category: "duplicate_tags",
  title: "Duplicate tags",
  description: "Two tags normalize to the same name.",
  affectedEntityType: "tag",
  affectedEntityIds: [canonicalTagId, duplicateTagId],
  suggestedActionType: "merge_duplicate_tags",
  safeAutoFixAvailable: true,
} as const
const actionPreview = {
  actionType: "merge_duplicate_tags",
  title: "Merge duplicate tags",
  description: "Move prompt links to the canonical tag and remove duplicates.",
  severity: "high",
  affectedEntityType: "tag",
  affectedEntityIds: [canonicalTagId, duplicateTagId],
  destructive: true,
  relationshipChanging: true,
  estimatedChangeCount: 2,
  backupRecommendation: "Export a backup before merging tags.",
} as const
const prepareInput: PrepareMaintenanceActionInput = {
  actionType: "merge_duplicate_tags",
  canonicalTagId,
  duplicateTagIds: [duplicateTagId],
}
const preparedAction = {
  actionSessionId,
  actionType: "merge_duplicate_tags",
  preview: actionPreview,
  affectedDisplayNames: ["Feature", "feature"],
  warnings: [],
  requiresConfirmation: true,
  expiresAt: 2_000,
} as const
const executeInput = { actionSessionId, actionType: "merge_duplicate_tags" } as const
const actionResult = {
  actionSessionId,
  actionType: "merge_duplicate_tags",
  status: "succeeded",
  changedCount: 2,
  skippedCount: 0,
  message: "Duplicate tags merged.",
  warnings: [],
} as const

// allow: SIZE_OK - exhaustive Maintenance boundary matrix keeps schemas and bridge wiring aligned.
describe("Phase 17 maintenance contracts", () => {
  it("parses every valid scan, finding, action, session, and result contract", () => {
    // Given: representative values crossing each Maintenance IPC trust boundary.
    const scanResult = {
      summary: {
        totalFindings: 1,
        severityCounts: { low: 0, medium: 1, high: 0 },
        categoryCounts: { duplicate_tags: 1 },
        truncated: false,
      },
      findings: [finding],
      recommendedActions: [actionPreview],
    }

    // When: the central Zod schemas parse each value.
    // Then: all eight required contracts and the enclosing scan result preserve valid data.
    expect(maintenanceScanInputSchema.parse(scanInput)).toEqual(scanInput)
    expect(maintenanceFindingSchema.parse(finding)).toEqual(finding)
    expect(maintenanceActionPreviewSchema.parse(actionPreview)).toEqual(actionPreview)
    expect(prepareMaintenanceActionInputSchema.parse(prepareInput)).toEqual(prepareInput)
    expect(preparedMaintenanceActionSchema.parse(preparedAction)).toEqual(preparedAction)
    expect(executeMaintenanceActionInputSchema.parse(executeInput)).toEqual(executeInput)
    expect(cancelMaintenanceActionSessionInputSchema.parse({ actionSessionId })).toEqual({
      actionSessionId,
    })
    expect(maintenanceActionResultSchema.parse(actionResult)).toEqual(actionResult)
    expect(maintenanceScanResultSchema.parse(scanResult)).toEqual(scanResult)
  })

  it("accepts an optional current-project scan filter while defaulting to whole-library scope", () => {
    // Given: the same explicit scan flags with and without a project filter.
    const currentProjectScan = { ...scanInput, projectId }

    // When: both scan scopes are parsed.
    const wholeLibrary = maintenanceScanInputSchema.parse(scanInput)
    const currentProject = maintenanceScanInputSchema.parse(currentProjectScan)

    // Then: omission means whole-library scope and a UUID project filter is retained.
    expect(wholeLibrary).not.toHaveProperty("projectId")
    expect(currentProject.projectId).toBe(projectId)
  })

  it("rejects an invalid Maintenance severity", () => {
    // Given: a finding with a severity outside the approved enum.
    const invalidFinding = { ...finding, severity: "critical" }

    // When: the finding crosses the schema boundary.
    const parsed = maintenanceFindingSchema.safeParse(invalidFinding)

    // Then: strict severity parsing rejects it.
    expect(parsed.success).toBe(false)
  })

  it("rejects an invalid Maintenance category", () => {
    // Given: a finding with an arbitrary category.
    const invalidFinding = { ...finding, category: "database_cleanup" }

    // When: the finding crosses the schema boundary.
    const parsed = maintenanceFindingSchema.safeParse(invalidFinding)

    // Then: strict category parsing rejects it.
    expect(parsed.success).toBe(false)
  })

  it("rejects invalid action types in findings, previews, and prepare inputs", () => {
    // Given: every pre-execution contract carrying an arbitrary action type.
    const invalidValues = [
      maintenanceFindingSchema.safeParse({ ...finding, suggestedActionType: "drop_database" }),
      maintenanceActionPreviewSchema.safeParse({ ...actionPreview, actionType: "drop_database" }),
      prepareMaintenanceActionInputSchema.safeParse({ actionType: "drop_database" }),
    ]

    // When: each value is parsed by its central schema.
    // Then: no arbitrary action string is accepted.
    expect(invalidValues.every(({ success }) => !success)).toBe(true)
  })

  it("rejects empty selected id arrays for every entity-targeted action", () => {
    // Given: each targeted action with no selected ids.
    const invalidInputs = [
      { actionType: "merge_duplicate_tags", canonicalTagId, duplicateTagIds: [] },
      { actionType: "delete_unused_tags", tagIds: [] },
      { actionType: "repair_current_versions", promptAssetIds: [] },
      { actionType: "delete_empty_prompt_assets", promptAssetIds: [] },
    ]

    // When: the discriminated prepare schema parses each request.
    // Then: every empty selection is rejected.
    expect(
      invalidInputs.every((input) => !prepareMaintenanceActionInputSchema.safeParse(input).success),
    ).toBe(true)
  })

  it("rejects non-UUID ids across scan, finding, action, and session contracts", () => {
    // Given: malformed ids at every Maintenance boundary.
    const invalidValues = [
      maintenanceScanInputSchema.safeParse({ ...scanInput, projectId: "not-a-uuid" }),
      maintenanceFindingSchema.safeParse({ ...finding, affectedEntityIds: ["not-a-uuid"] }),
      maintenanceActionPreviewSchema.safeParse({
        ...actionPreview,
        affectedEntityIds: ["not-a-uuid"],
      }),
      prepareMaintenanceActionInputSchema.safeParse({
        ...prepareInput,
        duplicateTagIds: ["not-a-uuid"],
      }),
      preparedMaintenanceActionSchema.safeParse({
        ...preparedAction,
        actionSessionId: "not-a-uuid",
      }),
      executeMaintenanceActionInputSchema.safeParse({ ...executeInput, actionSessionId: "bad" }),
      cancelMaintenanceActionSessionInputSchema.safeParse({ actionSessionId: "bad" }),
      maintenanceActionResultSchema.safeParse({ ...actionResult, actionSessionId: "bad" }),
    ]

    // When: each malformed value is parsed.
    // Then: every non-UUID id is rejected.
    expect(invalidValues.every(({ success }) => !success)).toBe(true)
  })

  it("rejects a duplicate tag merge containing its canonical tag id", () => {
    // Given: a merge request that selects the canonical tag as its own duplicate.
    const invalidInput = { ...prepareInput, duplicateTagIds: [canonicalTagId, duplicateTagId] }

    // When: the prepare schema parses the merge request.
    const parsed = prepareMaintenanceActionInputSchema.safeParse(invalidInput)

    // Then: the contradictory merge selection is rejected.
    expect(parsed.success).toBe(false)
  })

  it("rejects raw mutation rows in execute payloads", () => {
    // Given: a renderer-authored mutation plan attached to an otherwise valid execute request.
    const invalidInput = {
      ...executeInput,
      rows: [{ fromTagId: duplicateTagId, toTagId: canonicalTagId }],
    }

    // When: the execute schema parses the forged request.
    const parsed = executeMaintenanceActionInputSchema.safeParse(invalidInput)

    // Then: strict parsing prevents renderer-authored row mutations.
    expect(parsed.success).toBe(false)
  })

  it("rejects unknown destructive or authorization fields", () => {
    // Given: forged fields attempting to direct or authorize destructive behavior.
    const invalidInputs = [
      { ...executeInput, force: true },
      { ...executeInput, confirmed: true },
      { ...executeInput, deleteIds: [duplicateTagId] },
    ]

    // When: the strict execute schema parses each forged request.
    // Then: none of the unknown destructive fields crosses the boundary.
    expect(
      invalidInputs.every((input) => !executeMaintenanceActionInputSchema.safeParse(input).success),
    ).toBe(true)
  })

  it("rejects an unknown execute action type", () => {
    // Given: a valid action-session id paired with an arbitrary action string.
    const invalidInput = { ...executeInput, actionType: "drop_database" }

    // When: the execute schema parses the request.
    const parsed = executeMaintenanceActionInputSchema.safeParse(invalidInput)

    // Then: execution remains limited to the approved action union.
    expect(parsed.success).toBe(false)
  })

  it("requires backup recommendation text for destructive or relationship-changing previews", () => {
    // Given: a destructive preview with no backup recommendation.
    const invalidPreview = { ...actionPreview, backupRecommendation: null }

    // When: the preview schema parses the unsafe confirmation data.
    const parsed = maintenanceActionPreviewSchema.safeParse(invalidPreview)

    // Then: the preview is rejected before it can reach renderer confirmation UI.
    expect(parsed.success).toBe(false)
  })

  it("allows only the four approved renderer Maintenance methods", () => {
    // Given: a method map required to cover every key of the exported Maintenance bridge type.
    const maintenanceMethods: Record<keyof MaintenanceBridge, true> = {
      scanLibrary: true,
      prepareAction: true,
      executeAction: true,
      cancelActionSession: true,
    }

    // When: the renderer-facing method names are enumerated.
    const methodNames = Object.keys(maintenanceMethods)

    // Then: only session-oriented methods exist, with no direct mutation APIs.
    expect(methodNames).toEqual([
      "scanLibrary",
      "prepareAction",
      "executeAction",
      "cancelActionSession",
    ])
    expect(methodNames).not.toEqual(
      expect.arrayContaining(["mergeTags", "deleteTags", "repairVersions", "rebuildIndex"]),
    )
  })

  it("registers exact Maintenance channels with their central payload and response schemas", () => {
    // Given: the four approved Maintenance operations and their Todo 2 schemas.
    const expectedChannels = {
      scanMaintenanceLibrary: "prompter:maintenance:scan-library",
      prepareMaintenanceAction: "prompter:maintenance:prepare-action",
      executeMaintenanceAction: "prompter:maintenance:execute-action",
      cancelMaintenanceActionSession: "prompter:maintenance:cancel-action-session",
    } as const

    // When: the central channel and schema registries are inspected.
    // Then: each operation is registered exactly once with no raw mutation channels.
    expect(PERSISTENCE_CHANNELS).toMatchObject(expectedChannels)
    expect(payloadSchemas.scanMaintenanceLibrary).toBe(maintenanceScanInputSchema)
    expect(payloadSchemas.prepareMaintenanceAction).toBe(prepareMaintenanceActionInputSchema)
    expect(payloadSchemas.executeMaintenanceAction).toBe(executeMaintenanceActionInputSchema)
    expect(payloadSchemas.cancelMaintenanceActionSession).toBe(
      cancelMaintenanceActionSessionInputSchema,
    )
    expect(responseSchemas.scanMaintenanceLibrary).toBe(maintenanceScanResultSchema)
    expect(responseSchemas.prepareMaintenanceAction).toBe(preparedMaintenanceActionSchema)
    expect(responseSchemas.executeMaintenanceAction).toBe(maintenanceActionResultSchema)
    expect(Object.values(PERSISTENCE_CHANNELS)).not.toEqual(
      expect.arrayContaining([
        "prompter:maintenance:merge-tags",
        "prompter:maintenance:delete-tags",
        "prompter:maintenance:repair-versions",
        "prompter:maintenance:rebuild-index",
      ]),
    )
  })

  it("routes the four Maintenance methods through validated request wrappers", async () => {
    // Given: valid responses from a fake main process and a call ledger.
    const scanResult = {
      summary: {
        totalFindings: 1,
        severityCounts: { low: 0, medium: 1, high: 0 },
        categoryCounts: { duplicate_tags: 1 },
        truncated: false,
      },
      findings: [finding],
      recommendedActions: [actionPreview],
    } as const
    const calls: { readonly channel: string; readonly payload: unknown }[] = []
    const bridge = createElectronBridge(async (channel, payload) => {
      calls.push({ channel, payload })

      if (channel === PERSISTENCE_CHANNELS.scanMaintenanceLibrary) return scanResult
      if (channel === PERSISTENCE_CHANNELS.prepareMaintenanceAction) return preparedAction
      if (channel === PERSISTENCE_CHANNELS.executeMaintenanceAction) return actionResult
      if (channel === PERSISTENCE_CHANNELS.cancelMaintenanceActionSession) return undefined
      if (channel === PERSISTENCE_CHANNELS.rebuildSearchIndex) return { rebuilt: true }

      throw new Error(`Unexpected channel ${channel}`)
    })

    // When: each Maintenance operation and the legacy search rebuild method are invoked.
    await expect(bridge.maintenance.scanLibrary(scanInput)).resolves.toEqual(scanResult)
    await expect(bridge.maintenance.prepareAction(prepareInput)).resolves.toEqual(preparedAction)
    await expect(bridge.maintenance.executeAction(executeInput)).resolves.toEqual(actionResult)
    await expect(
      bridge.maintenance.cancelActionSession({ actionSessionId }),
    ).resolves.toBeUndefined()
    await expect(bridge.search.rebuildIndex()).resolves.toEqual({ rebuilt: true })

    // Then: exact session-oriented channels receive only schema-approved payloads.
    expect(Object.keys(bridge.maintenance)).toEqual([
      "scanLibrary",
      "prepareAction",
      "executeAction",
      "cancelActionSession",
    ])
    expect(calls).toEqual([
      { channel: "prompter:maintenance:scan-library", payload: scanInput },
      { channel: "prompter:maintenance:prepare-action", payload: prepareInput },
      { channel: "prompter:maintenance:execute-action", payload: executeInput },
      {
        channel: "prompter:maintenance:cancel-action-session",
        payload: { actionSessionId },
      },
      { channel: "prompter:search:rebuild-index", payload: undefined },
    ])
  })

  it("rejects malformed Maintenance payloads and responses at the bridge boundary", async () => {
    // Given: one bridge that records invokes and one returning a malformed scan response.
    let invokeCount = 0
    const payloadBridge = createElectronBridge(async () => {
      invokeCount += 1
      return undefined
    })
    const responseBridge = createElectronBridge(async () => ({
      summary: { totalFindings: -1 },
      findings: [],
      recommendedActions: [],
    }))

    // When: forged input and malformed output cross opposite sides of the bridge.
    const forgedPayload = Reflect.apply(payloadBridge.maintenance.executeAction, undefined, [
      { ...executeInput, rows: [{ fromTagId: duplicateTagId, toTagId: canonicalTagId }] },
    ])
    const malformedResponse = responseBridge.maintenance.scanLibrary(scanInput)

    // Then: input fails before invoke and output fails before renderer consumption.
    await expect(forgedPayload).rejects.toThrow()
    expect(invokeCount).toBe(0)
    await expect(malformedResponse).rejects.toThrow()
  })
})
