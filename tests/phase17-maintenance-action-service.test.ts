import { afterEach, describe, expect, it, vi } from "vitest"

import { createMaintenanceActionService } from "../electron/maintenance/maintenance-action-service"
import { createMaintenanceActionSessionStore } from "../electron/maintenance/maintenance-action-session-store"
import { createSearchTestDatabase, removeSearchTestDatabases } from "./electron-search-test-helpers"
import { snapshotTables } from "./phase17-maintenance-action-test-helpers"

const actionSessionId = "00000000-0000-4000-8000-000000000091"
const forgedSessionId = "00000000-0000-4000-8000-000000000092"
const actionTables = [
  "prompt_assets",
  "prompt_versions",
  "tags",
  "prompt_tags",
  "prompt_search_fts",
] as const

afterEach(async () => {
  await removeSearchTestDatabases()
})

describe("Phase 17 maintenance action service", () => {
  it("prepares current duplicate-tag rows and executes the trusted merge after main confirmation", async () => {
    // Given: current database rows that normalize to one duplicate-tag group.
    const database = await createSearchTestDatabase()
    try {
      const prompt = database.services.createPromptWithInitialVersion({
        projectId: null,
        title: "Trusted merge",
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "input",
        compiledPrompt: "output",
      })
      const canonical = database.services.createTag({ name: "build tools" })
      const duplicate = database.services.createTag({ name: "Build-Tools" })
      database.services.attachTagToPrompt(prompt.asset.id, duplicate.id)
      const confirmAction = vi.fn(async () => "confirmed" as const)
      const service = createMaintenanceActionService({
        sqlite: database.sqlite,
        sessions: createMaintenanceActionSessionStore({ createId: () => actionSessionId }),
        confirmAction,
      })

      // When: main prepares from ids only and executes its stored plan.
      const prepared = service.prepareAction({
        actionType: "merge_duplicate_tags",
        canonicalTagId: canonical.id,
        duplicateTagIds: [duplicate.id],
      })
      const result = await service.executeAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })

      // Then: the preview reflects current rows and mutation follows native confirmation.
      expect(prepared).toMatchObject({
        actionSessionId,
        actionType: "merge_duplicate_tags",
        affectedDisplayNames: ["build tools", "Build-Tools"],
        requiresConfirmation: true,
      })
      expect(result).toMatchObject({ status: "succeeded", changedCount: 1, skippedCount: 0 })
      expect(confirmAction).toHaveBeenCalledOnce()
      expect(database.services.listTagsForPrompt(prompt.asset.id).map(({ id }) => id)).toEqual([
        canonical.id,
      ])
    } finally {
      database.close()
    }
  })

  it("preserves a confirmed-action session when native confirmation is canceled", async () => {
    // Given: a prepared duplicate merge and a native gate that cancels once, then confirms.
    const database = await createSearchTestDatabase()
    try {
      const canonical = database.services.createTag({ name: "build tools" })
      const duplicate = database.services.createTag({ name: "Build_Tools" })
      const decisions = ["cancelled", "confirmed"] as const
      let decisionIndex = 0
      const service = createMaintenanceActionService({
        sqlite: database.sqlite,
        sessions: createMaintenanceActionSessionStore({ createId: () => actionSessionId }),
        confirmAction: async () => decisions[decisionIndex++] ?? "confirmed",
      })
      const prepared = service.prepareAction({
        actionType: "merge_duplicate_tags",
        canonicalTagId: canonical.id,
        duplicateTagIds: [duplicate.id],
      })
      const before = snapshotTables(database, actionTables)

      // When: the first execute is dismissed and the same session is retried.
      const canceled = await service.executeAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })
      const afterCancel = snapshotTables(database, actionTables)
      const retried = await service.executeAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })

      // Then: cancellation performs no write and retry consumes the session only after success.
      expect(canceled.status).toBe("confirmation_cancelled")
      expect(afterCancel).toEqual(before)
      expect(retried.status).toBe("succeeded")
    } finally {
      database.close()
    }
  })

  it("returns stale and consumes the session when prepared rows change", async () => {
    // Given: a trusted duplicate plan whose duplicate name changes before execution.
    const database = await createSearchTestDatabase()
    try {
      const canonical = database.services.createTag({ name: "build tools" })
      const duplicate = database.services.createTag({ name: "Build-Tools" })
      const service = createMaintenanceActionService({
        sqlite: database.sqlite,
        sessions: createMaintenanceActionSessionStore({ createId: () => actionSessionId }),
        confirmAction: async () => "confirmed",
      })
      const prepared = service.prepareAction({
        actionType: "merge_duplicate_tags",
        canonicalTagId: canonical.id,
        duplicateTagIds: [duplicate.id],
      })
      database.services.updateTag(duplicate.id, { name: "unrelated" })
      const before = snapshotTables(database, actionTables)

      // When: execution revalidates and the consumed session is replayed.
      const stale = await service.executeAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })
      const replay = await service.executeAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })

      // Then: stale execution rolls back and replay is unavailable.
      expect(stale.status).toBe("stale")
      expect(snapshotTables(database, actionTables)).toEqual(before)
      expect(replay).toMatchObject({ status: "failed", changedCount: 0 })
    } finally {
      database.close()
    }
  })

  it("rejects forged and expired sessions without invoking confirmation", async () => {
    // Given: a deterministic clock and one expiring prepared action.
    const database = await createSearchTestDatabase()
    try {
      const clock = { now: 1_000 }
      const confirmAction = vi.fn(async () => "confirmed" as const)
      const service = createMaintenanceActionService({
        sqlite: database.sqlite,
        sessions: createMaintenanceActionSessionStore({
          now: () => clock.now,
          createId: () => actionSessionId,
          ttlMs: 10,
        }),
        confirmAction,
      })
      const tag = database.services.createTag({ name: "unused" })
      const prepared = service.prepareAction({ actionType: "delete_unused_tags", tagIds: [tag.id] })

      // When: execution uses an unknown id, then the real id after expiry.
      const forged = await service.executeAction({
        actionSessionId: forgedSessionId,
        actionType: "delete_unused_tags",
      })
      clock.now = prepared.expiresAt
      const expired = await service.executeAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })

      // Then: both failures are sanitized before confirmation or mutation.
      expect(forged).toMatchObject({ status: "failed", changedCount: 0, warnings: [] })
      expect(expired).toMatchObject({ status: "failed", changedCount: 0, warnings: [] })
      expect(confirmAction).not.toHaveBeenCalled()
      expect(database.services.listTags().map(({ id }) => id)).toContain(tag.id)
    } finally {
      database.close()
    }
  })

  it("rolls back forced database failure, sanitizes output, and rejects replay", async () => {
    // Given: a prepared merge whose final tag deletion is forced to fail.
    const database = await createSearchTestDatabase()
    try {
      const prompt = database.services.createPromptWithInitialVersion({
        projectId: null,
        title: "Service rollback",
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "input",
        compiledPrompt: "output",
      })
      const canonical = database.services.createTag({ name: "build tools" })
      const duplicate = database.services.createTag({ name: "Build-Tools" })
      database.services.attachTagToPrompt(prompt.asset.id, duplicate.id)
      const service = createMaintenanceActionService({
        sqlite: database.sqlite,
        sessions: createMaintenanceActionSessionStore({ createId: () => actionSessionId }),
        confirmAction: async () => "confirmed",
      })
      const prepared = service.prepareAction({
        actionType: "merge_duplicate_tags",
        canonicalTagId: canonical.id,
        duplicateTagIds: [duplicate.id],
      })
      database.sqlite.exec(
        `CREATE TRIGGER service_merge_failure BEFORE DELETE ON tags
         WHEN OLD.id = '${duplicate.id}' BEGIN SELECT RAISE(ABORT, 'secret SQL failure'); END`,
      )
      const before = snapshotTables(database, actionTables)

      // When: execution fails after an in-transaction canonical link insert.
      const failed = await service.executeAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })
      const replay = await service.executeAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })

      // Then: all rows roll back, output hides internals, and failure is terminal.
      expect(failed.status).toBe("failed")
      expect(snapshotTables(database, actionTables)).toEqual(before)
      const serializedFailure = JSON.stringify(failed)
      expect(serializedFailure).not.toMatch(/secret|SQL|\.sqlite/i)
      expect(serializedFailure).not.toContain(duplicate.id)
      expect(replay.status).toBe("failed")
    } finally {
      database.close()
    }
  })

  it("manually cancels a prepared session without mutating data", async () => {
    // Given: a prepared unused-tag deletion.
    const database = await createSearchTestDatabase()
    try {
      const tag = database.services.createTag({ name: "manual cancel" })
      const service = createMaintenanceActionService({
        sqlite: database.sqlite,
        sessions: createMaintenanceActionSessionStore({ createId: () => actionSessionId }),
        confirmAction: async () => "confirmed",
      })
      const prepared = service.prepareAction({ actionType: "delete_unused_tags", tagIds: [tag.id] })

      // When: main explicitly cancels and then receives an execute request.
      service.cancelActionSession({ actionSessionId: prepared.actionSessionId })
      const result = await service.executeAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })

      // Then: the session is unavailable and no tag is deleted.
      expect(result.status).toBe("failed")
      expect(database.services.listTags().map(({ id }) => id)).toContain(tag.id)
    } finally {
      database.close()
    }
  })
})
