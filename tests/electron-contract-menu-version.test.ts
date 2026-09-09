import { describe, expect, it } from "vitest"

import { createElectronBridge, PING_RESPONSE } from "../electron/bridge"
import { PERSISTENCE_CHANNELS } from "../electron/ipc-contract"
import { createPersistenceIpcHandlers } from "../electron/ipc-handlers"
import type { MenuAction } from "../electron/ipc-types"
import {
  comparePromptVersionId,
  compareVersionResponse,
  promptAssetResponse,
  promptVersionResponse,
  validPromptVersionId,
} from "./electron-contract-fixtures"
import { validProjectId, validPromptAssetId } from "./electron-contract-helpers"
import { createFailingServices } from "./electron-contract-service-fixture"

describe("Electron shell contract", () => {
  it("exposes a typed menu action subscription without raw ipcRenderer", () => {
    const subscriptions: ((action: MenuAction) => void)[] = []
    const bridge = createElectronBridge(
      async () => PING_RESPONSE,
      (callback) => {
        subscriptions.push(callback)
        return () => {
          subscriptions.splice(subscriptions.indexOf(callback), 1)
        }
      },
    )

    const receivedActions: string[] = []
    const unsubscribe = bridge.menu.onAction((action) => receivedActions.push(action))

    subscriptions[0]?.("exportFullBackup")
    unsubscribe()
    subscriptions[0]?.("importBackup")

    expect(receivedActions).toEqual(["exportFullBackup"])
  })

  it("routes Phase 6 prompt version methods through typed bridge channels", async () => {
    const calls: { readonly channel: string; readonly payload: unknown }[] = []
    const bridge = createElectronBridge(async (channel, payload) => {
      calls.push({ channel, payload })

      if (channel === PERSISTENCE_CHANNELS.createNextPromptVersion) {
        return { asset: promptAssetResponse, version: promptVersionResponse }
      }
      if (channel === PERSISTENCE_CHANNELS.getCurrentPromptVersion) {
        return promptVersionResponse
      }
      if (channel === PERSISTENCE_CHANNELS.comparePromptVersions) {
        return { baseVersion: promptVersionResponse, compareVersion: compareVersionResponse }
      }

      throw new Error(`Unexpected channel ${channel}`)
    })

    await expect(
      bridge.prompts.createNextVersion({
        promptAssetId: validPromptAssetId,
        originalInput: "Original request",
        compiledPrompt: "Compiled prompt",
      }),
    ).resolves.toEqual({ asset: promptAssetResponse, version: promptVersionResponse })
    await expect(bridge.prompts.getCurrentVersion(validPromptAssetId)).resolves.toEqual(
      promptVersionResponse,
    )
    await expect(
      bridge.prompts.compareVersions(validPromptVersionId, comparePromptVersionId),
    ).resolves.toEqual({
      baseVersion: promptVersionResponse,
      compareVersion: compareVersionResponse,
    })
    expect(calls).toEqual([
      {
        channel: PERSISTENCE_CHANNELS.createNextPromptVersion,
        payload: {
          promptAssetId: validPromptAssetId,
          originalInput: "Original request",
          compiledPrompt: "Compiled prompt",
          makeCurrent: true,
        },
      },
      {
        channel: PERSISTENCE_CHANNELS.getCurrentPromptVersion,
        payload: { id: validPromptAssetId },
      },
      {
        channel: PERSISTENCE_CHANNELS.comparePromptVersions,
        payload: { baseVersionId: validPromptVersionId, compareVersionId: comparePromptVersionId },
      },
    ])
  })

  it("rejects malformed IPC payloads before repository calls", () => {
    let called = false
    const handlers = createPersistenceIpcHandlers(
      createFailingServices(() => {
        called = true
      }),
    )

    expect(() => handlers.createProject({ name: "" })).toThrow()
    expect(() =>
      handlers.createPromptAsset({
        title: "Bad",
        scenario: "unknown",
        targetAgent: "codex",
      }),
    ).toThrow(/scenario/)
    expect(() =>
      handlers.createPromptVersion({
        promptAssetId: validPromptAssetId,
        originalInput: "",
        compiledPrompt: "Compiled prompt",
      }),
    ).toThrow(/originalInput/)
    expect(() =>
      handlers.createPromptVersion({
        promptAssetId: validPromptAssetId,
        originalInput: "Original input",
        compiledPrompt: "   ",
      }),
    ).toThrow(/compiledPrompt/)
    expect(() =>
      handlers.createNextPromptVersion({
        promptAssetId: validPromptAssetId,
        originalInput: "",
        compiledPrompt: "Compiled prompt",
      }),
    ).toThrow(/originalInput/)
    expect(() =>
      handlers.comparePromptVersions({
        baseVersionId: validPromptVersionId,
        compareVersionId: "",
      }),
    ).toThrow(/compareVersionId/)
    expect(() => handlers.duplicateHarnessTemplate({ id: "not-a-uuid" })).toThrow(/id/)
    expect(() =>
      handlers.createProjectContextProfile({ projectId: validProjectId, name: "" }),
    ).toThrow(/name/)
    expect(() => handlers.listProjectContextProfiles({ projectId: "not-a-uuid" })).toThrow(
      /projectId/,
    )
    expect(() =>
      handlers.buildProjectContextForCompiler({
        projectId: validProjectId,
        profileId: "not-a-uuid",
      }),
    ).toThrow(/profileId/)
    expect(called).toBe(false)
  })
})
