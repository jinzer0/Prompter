import { afterEach, describe, expect, it } from "vitest"

import { createSearchTestDatabase, removeSearchTestDatabases } from "./electron-search-test-helpers"
import { snapshotTables } from "./phase17-maintenance-action-test-helpers"
import { createMaintenanceIntegrationHandlers } from "./phase17-maintenance-integration-helpers"

const forgedSessionId = "00000000-0000-4000-8000-000000000099"
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

describe("Phase 17 maintenance IPC session regressions", () => {
  it("preserves confirmation cancellation, then consumes the successful session", async () => {
    // Given: an unused tag and a confirmation seam that cancels once, then confirms.
    const database = await createSearchTestDatabase()
    try {
      const tag = database.services.createTag({ name: "confirmation retry" })
      const decisions = ["cancelled", "confirmed"] as const
      let decisionIndex = 0
      const handlers = createMaintenanceIntegrationHandlers(
        database,
        async () => decisions[decisionIndex++] ?? "confirmed",
      )
      const prepared = handlers.prepareMaintenanceAction({
        actionType: "delete_unused_tags",
        tagIds: [tag.id],
      })

      // When: execution is dismissed, retried, and replayed after success.
      const cancelled = await handlers.executeMaintenanceAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })
      const tagAfterCancel = database.services.listTags().find(({ id }) => id === tag.id)
      const succeeded = await handlers.executeMaintenanceAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })
      const replayed = await handlers.executeMaintenanceAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })

      // Then: cancellation is non-terminal, while success prevents replay.
      expect(cancelled.status).toBe("confirmation_cancelled")
      expect(tagAfterCancel?.id).toBe(tag.id)
      expect(succeeded.status).toBe("succeeded")
      expect(replayed).toMatchObject({ status: "failed", changedCount: 0, warnings: [] })
    } finally {
      database.close()
    }
  })

  it("rejects forged and explicitly canceled sessions without mutation", async () => {
    // Given: one unused tag and a prepared deletion session.
    const database = await createSearchTestDatabase()
    try {
      const tag = database.services.createTag({ name: "explicit cancel" })
      const handlers = createMaintenanceIntegrationHandlers(database, async () => "confirmed")
      const prepared = handlers.prepareMaintenanceAction({
        actionType: "delete_unused_tags",
        tagIds: [tag.id],
      })

      // When: an unknown session executes and the real session is explicitly canceled.
      const forged = await handlers.executeMaintenanceAction({
        actionSessionId: forgedSessionId,
        actionType: "delete_unused_tags",
      })
      handlers.cancelMaintenanceActionSession({ actionSessionId: prepared.actionSessionId })
      const cancelled = await handlers.executeMaintenanceAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })

      // Then: both failures are sanitized and the selected tag remains.
      expect(forged).toMatchObject({ status: "failed", changedCount: 0, warnings: [] })
      expect(cancelled).toMatchObject({ status: "failed", changedCount: 0, warnings: [] })
      expect(JSON.stringify([forged, cancelled])).not.toContain(tag.id)
      expect(database.services.listTags().map(({ id }) => id)).toContain(tag.id)
    } finally {
      database.close()
    }
  })

  it("rolls back a stale prepared merge and rejects replay", async () => {
    // Given: a prepared duplicate merge whose selected row changes before execution.
    const database = await createSearchTestDatabase()
    try {
      const canonical = database.services.createTag({ name: "build tools" })
      const duplicate = database.services.createTag({ name: "Build-Tools" })
      const handlers = createMaintenanceIntegrationHandlers(database, async () => "confirmed")
      const prepared = handlers.prepareMaintenanceAction({
        actionType: "merge_duplicate_tags",
        canonicalTagId: canonical.id,
        duplicateTagIds: [duplicate.id],
      })
      database.services.updateTag(duplicate.id, { name: "changed after prepare" })
      const before = snapshotTables(database, actionTables)

      // When: the stale session executes and is replayed.
      const stale = await handlers.executeMaintenanceAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })
      const replayed = await handlers.executeMaintenanceAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })

      // Then: exact row revalidation rolls back all writes and consumes the session.
      expect(stale.status).toBe("stale")
      expect(snapshotTables(database, actionTables)).toEqual(before)
      expect(replayed.status).toBe("failed")
    } finally {
      database.close()
    }
  })

  it("rolls back forced transaction failure and sanitizes the terminal result", async () => {
    // Given: a prepared merge whose final tag delete is rejected by SQLite.
    const database = await createSearchTestDatabase()
    try {
      const prompt = database.services.createPromptWithInitialVersion({
        projectId: null,
        title: "IPC rollback target",
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "rollback input",
        compiledPrompt: "rollback output",
      })
      const canonical = database.services.createTag({ name: "build tools" })
      const duplicate = database.services.createTag({ name: "Build-Tools" })
      database.services.attachTagToPrompt(prompt.asset.id, duplicate.id)
      const handlers = createMaintenanceIntegrationHandlers(database, async () => "confirmed")
      const prepared = handlers.prepareMaintenanceAction({
        actionType: "merge_duplicate_tags",
        canonicalTagId: canonical.id,
        duplicateTagIds: [duplicate.id],
      })
      database.sqlite.exec(
        `CREATE TRIGGER integration_merge_failure BEFORE DELETE ON tags
         WHEN OLD.id = '${duplicate.id}' BEGIN SELECT RAISE(ABORT, 'private SQL detail'); END`,
      )
      const before = snapshotTables(database, actionTables)

      // When: execution fails after inserting the canonical relationship.
      const failed = await handlers.executeMaintenanceAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })
      const replayed = await handlers.executeMaintenanceAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })

      // Then: the transaction is restored and no database detail escapes.
      expect(failed.status).toBe("failed")
      expect(snapshotTables(database, actionTables)).toEqual(before)
      expect(JSON.stringify(failed)).not.toMatch(/private|SQL|\.sqlite/i)
      expect(JSON.stringify(failed)).not.toContain(duplicate.id)
      expect(replayed.status).toBe("failed")
    } finally {
      database.close()
    }
  })
})
