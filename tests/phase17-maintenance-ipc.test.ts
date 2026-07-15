import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"

import { PERSISTENCE_CHANNELS } from "../electron/ipc-contract"
import { createPersistenceIpcHandlers } from "../electron/ipc-handlers"
import { createFailingServices } from "./electron-contract-service-fixture"

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

describe("Phase 17 maintenance IPC wiring", () => {
  it("rejects malformed scan, prepare, and cancel payloads before service calls", () => {
    // Given: handlers backed by services that record every attempted call.
    let serviceCallCount = 0
    const handlers = createPersistenceIpcHandlers(
      createFailingServices(() => {
        serviceCallCount += 1
      }),
    )
    expect(typeof handlers.scanMaintenanceLibrary).toBe("function")
    expect(typeof handlers.prepareMaintenanceAction).toBe("function")
    expect(typeof handlers.cancelMaintenanceActionSession).toBe("function")

    // When: malformed payloads cross each synchronous Maintenance handler boundary.
    const scan = () => handlers.scanMaintenanceLibrary({ ...scanInput, force: true })
    const prepare = () =>
      handlers.prepareMaintenanceAction({
        actionType: "delete_unused_tags",
        tagIds: [],
      })
    const cancel = () => handlers.cancelMaintenanceActionSession({ actionSessionId: "not-a-uuid" })

    // Then: schema parsing rejects every payload without entering a service.
    expect(scan).toThrow()
    expect(prepare).toThrow()
    expect(cancel).toThrow()
    expect(serviceCallCount).toBe(0)
  })

  it("rejects forged execute rows and action types before async service calls", async () => {
    // Given: an execute handler backed by a service-call ledger.
    let serviceCallCount = 0
    const handlers = createPersistenceIpcHandlers(
      createFailingServices(() => {
        serviceCallCount += 1
      }),
    )
    expect(typeof handlers.executeMaintenanceAction).toBe("function")

    // When: renderer-authored rows and an unapproved action type are submitted.
    const forgedRows = handlers.executeMaintenanceAction({
      actionSessionId,
      actionType: "merge_duplicate_tags",
      rows: [{ fromTagId: "44444444-4444-4444-8444-444444444444" }],
    })
    const forgedAction = handlers.executeMaintenanceAction({
      actionSessionId,
      actionType: "drop_database",
    })

    // Then: both promises reject before the asynchronous service seam is reached.
    await expect(forgedRows).rejects.toThrow()
    await expect(forgedAction).rejects.toThrow()
    expect(serviceCallCount).toBe(0)
  })

  it("registers all Maintenance channels while retaining direct search rebuild", async () => {
    // Given: the main-process handler registry source and contract-owned channel names.
    const source = await readFile("electron/ipc-handlers.ts", "utf8")
    const registeredChannels = [
      PERSISTENCE_CHANNELS.scanMaintenanceLibrary,
      PERSISTENCE_CHANNELS.prepareMaintenanceAction,
      PERSISTENCE_CHANNELS.executeMaintenanceAction,
      PERSISTENCE_CHANNELS.cancelMaintenanceActionSession,
      PERSISTENCE_CHANNELS.rebuildSearchIndex,
    ]

    // When: each channel is mapped back to its registry key.
    const channelKeys = registeredChannels.map(
      (channel) =>
        Object.entries(PERSISTENCE_CHANNELS).find(([, candidate]) => candidate === channel)?.[0],
    )

    // Then: ipcMain.handle registrations exist for Maintenance and legacy search rebuild.
    expect(channelKeys).not.toContain(undefined)
    for (const channelKey of channelKeys) {
      expect(source).toContain(`ipcMain.handle(PERSISTENCE_CHANNELS.${channelKey}`)
    }
  })
})
