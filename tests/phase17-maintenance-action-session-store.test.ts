import { describe, expect, it } from "vitest"

import type { MaintenanceActionPreview } from "../electron/ipc-types.js"
import {
  createMaintenanceActionSessionStore,
  MAINTENANCE_ACTION_SESSION_TTL_MS,
  type MaintenanceActionSessionStore,
  MaintenanceActionSessionUnavailableError,
} from "../electron/maintenance/maintenance-action-session-store.js"

const actionSessionId = "00000000-0000-4000-8000-000000000081"
const promptAssetId = "00000000-0000-4000-8000-000000000082"
const versionId = "00000000-0000-4000-8000-000000000083"
const repairPreview = {
  actionType: "repair_current_versions",
  title: "Repair current versions",
  description: "Point selected assets to their highest owned version.",
  severity: "high",
  affectedEntityType: "prompt_asset",
  affectedEntityIds: [promptAssetId],
  destructive: false,
  relationshipChanging: true,
  estimatedChangeCount: 1,
  backupRecommendation: "Export a full backup before changing relationships.",
} satisfies MaintenanceActionPreview

function createStore(clock: { now: number }): MaintenanceActionSessionStore {
  return createMaintenanceActionSessionStore({
    now: () => clock.now,
    createId: () => actionSessionId,
  })
}

function createReadySession(store: MaintenanceActionSessionStore) {
  return store.createActionSession({
    executionPlan: {
      actionType: "repair_current_versions",
      repairs: [
        {
          promptAssetId,
          expectedCurrentVersionId: null,
          replacementVersionId: versionId,
          replacementVersionNumber: 1,
          expectedOwnedVersionCount: 1,
        },
      ],
    },
    preview: repairPreview,
    affectedDisplayNames: ["Repair target"],
    selectedEntityIds: [promptAssetId],
    expectedCounts: { selectedAssets: 1, ownedVersions: 2 },
    rowSnapshots: [
      {
        entityType: "prompt_asset",
        entityId: promptAssetId,
        fields: { currentVersionId: null, replacementVersionId: versionId },
      },
    ],
    warningLedger: ["The current-version pointer will change."],
    consequenceLedger: ["One prompt asset will point to its highest owned version."],
    destructive: false,
    relationshipChanging: true,
    backupRecommendation: "Export a full backup before changing relationships.",
  })
}

function captureUnavailableFailure(action: () => unknown) {
  try {
    action()
  } catch (error) {
    if (error instanceof MaintenanceActionSessionUnavailableError) {
      return error.failure
    }
    throw error
  }
  throw new Error("Expected the action session to be unavailable")
}

describe("Phase 17 maintenance action session store", () => {
  it("creates a server-owned ready session with a fifteen-minute default TTL", () => {
    // Given: a deterministic main-process clock and prepared server-side plan.
    const clock = { now: 10_000 }
    const store = createStore(clock)

    // When: main creates the action session.
    const session = createReadySession(store)

    // Then: every revalidation and confirmation field is retained with the default expiry.
    expect(session).toMatchObject({
      id: actionSessionId,
      actionType: "repair_current_versions",
      selectedEntityIds: [promptAssetId],
      expectedCounts: { selectedAssets: 1, ownedVersions: 2 },
      warningLedger: ["The current-version pointer will change."],
      consequenceLedger: ["One prompt asset will point to its highest owned version."],
      destructive: false,
      relationshipChanging: true,
      backupRecommendation: "Export a full backup before changing relationships.",
      createdAt: 10_000,
      expiresAt: 10_000 + MAINTENANCE_ACTION_SESSION_TTL_MS,
      status: "ready",
    })
    expect(session.rowSnapshots).toEqual([
      {
        entityType: "prompt_asset",
        entityId: promptAssetId,
        fields: { currentVersionId: null, replacementVersionId: versionId },
      },
    ])
  })

  it("detaches the trusted plan from mutable preparation collections", () => {
    // Given: mutable collections produced while main prepares an action.
    const store = createStore({ now: 10_000 })
    const selectedEntityIds = [promptAssetId]
    const expectedCounts = { selectedAssets: 1 }
    const snapshotFields: { currentVersionId: string | null } = { currentVersionId: null }
    const warningLedger = ["Original warning"]
    const consequenceLedger = ["Original consequence"]
    const session = store.createActionSession({
      executionPlan: {
        actionType: "repair_current_versions",
        repairs: [
          {
            promptAssetId,
            expectedCurrentVersionId: null,
            replacementVersionId: versionId,
            replacementVersionNumber: 1,
            expectedOwnedVersionCount: 1,
          },
        ],
      },
      preview: repairPreview,
      affectedDisplayNames: ["Repair target"],
      selectedEntityIds,
      expectedCounts,
      rowSnapshots: [
        { entityType: "prompt_asset", entityId: promptAssetId, fields: snapshotFields },
      ],
      warningLedger,
      consequenceLedger,
      destructive: false,
      relationshipChanging: true,
      backupRecommendation: "Export a backup.",
    })

    // When: the preparation workspace is changed after the session is created.
    selectedEntityIds.push(versionId)
    expectedCounts.selectedAssets = 99
    snapshotFields.currentVersionId = versionId
    warningLedger.push("Forged warning")
    consequenceLedger.push("Forged consequence")

    // Then: the stored authorization plan remains the exact main-owned snapshot.
    expect(session.selectedEntityIds).toEqual([promptAssetId])
    expect(session.expectedCounts).toEqual({ selectedAssets: 1 })
    expect(session.rowSnapshots[0]?.fields).toEqual({ currentVersionId: null })
    expect(session.warningLedger).toEqual(["Original warning"])
    expect(session.consequenceLedger).toEqual(["Original consequence"])
  })

  it("returns sanitized not-found failure data for a forged session id", () => {
    // Given: an empty in-memory store.
    const store = createStore({ now: 1_000 })

    // When: execution lookup uses an id that main never prepared.
    const failure = captureUnavailableFailure(() =>
      store.requireReadyActionSession("00000000-0000-4000-8000-000000000099"),
    )

    // Then: the failure is actionable without exposing identifiers or internal state.
    expect(failure).toEqual({
      code: "session_not_found",
      message: "Maintenance action session is unavailable.",
    })
    expect(JSON.stringify(failure)).not.toContain("00000000")
  })

  it("expires a ready session deterministically and rejects execution lookup", () => {
    // Given: a ready session at the start of its TTL.
    const clock = { now: 2_000 }
    const store = createStore(clock)
    const session = createReadySession(store)

    // When: the injected clock reaches the exact expiration boundary.
    clock.now = session.expiresAt
    const failure = captureUnavailableFailure(() => store.requireReadyActionSession(session.id))

    // Then: the session is terminal and the returned failure remains sanitized.
    expect(store.getActionSession(session.id)?.status).toBe("expired")
    expect(failure).toEqual({
      code: "session_expired",
      message: "Maintenance action session is unavailable.",
    })
  })

  it("preserves a ready session when native confirmation is dismissed", () => {
    // Given: a prepared relationship-changing action.
    const store = createStore({ now: 3_000 })
    const session = createReadySession(store)

    // When: the main-owned confirmation reports user cancellation.
    store.preserveActionSessionAfterConfirmationCancel(session.id)

    // Then: the exact prepared plan remains ready for another execute attempt.
    expect(store.requireReadyActionSession(session.id)).toBe(session)
  })

  it("invalidates a session after manual cancellation", () => {
    // Given: a ready action session.
    const store = createStore({ now: 4_000 })
    const session = createReadySession(store)

    // When: the explicit cancel-session action is invoked.
    store.cancelActionSession(session.id)

    // Then: it cannot execute and reports only its sanitized terminal reason.
    expect(store.getActionSession(session.id)?.status).toBe("cancelled")
    expect(captureUnavailableFailure(() => store.requireReadyActionSession(session.id))).toEqual({
      code: "session_cancelled",
      message: "Maintenance action session is unavailable.",
    })
  })

  it.each([
    ["success", "consumeActionSessionAfterSuccess"],
    ["failure", "consumeActionSessionAfterFailure"],
  ] as const)("consumes after %s and rejects replay", (_outcome, consumeMethod) => {
    // Given: a ready action session.
    const store = createStore({ now: 5_000 })
    const session = createReadySession(store)

    // When: execution reaches either terminal consumption path.
    store[consumeMethod](session.id)

    // Then: replay fails with no plan, snapshot, or internal error disclosure.
    expect(store.getActionSession(session.id)?.status).toBe("consumed")
    const failure = captureUnavailableFailure(() => store.requireReadyActionSession(session.id))
    expect(failure).toEqual({
      code: "session_consumed",
      message: "Maintenance action session is unavailable.",
    })
    expect(JSON.stringify(failure)).not.toContain(promptAssetId)
  })

  it("expires ready sessions in a store-wide maintenance pass", () => {
    // Given: a ready session and a clock advanced beyond its TTL.
    const clock = { now: 6_000 }
    const store = createStore(clock)
    const session = createReadySession(store)
    clock.now = session.expiresAt + 1

    // When: the store expiry pass runs.
    store.expireActionSessions()

    // Then: the session is marked expired without timers or persistence.
    expect(store.getActionSession(session.id)?.status).toBe("expired")
  })
})
