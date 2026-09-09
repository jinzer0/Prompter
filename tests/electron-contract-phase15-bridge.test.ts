import { describe, expect, it } from "vitest"

import { createElectronBridge } from "../electron/bridge"
import { PERSISTENCE_CHANNELS } from "../electron/ipc-contract"
import {
  createDerivedPromptAssetInput,
  createPromptTemplateFromVersionInput,
  createPromptTemplateInput,
  createPromptWithInitialVersionInput,
  promptAssetVersionResponse,
  promptLineageResponse,
  promptTemplateResponse,
} from "./electron-contract-fixtures"
import { validPromptAssetId } from "./electron-contract-helpers"

describe("Electron shell contract", () => {
  it("routes every Phase 15 method through exact parsed bridge channels", async () => {
    // Given: a fake main-process invoke that returns valid contract responses.
    const calls: { readonly channel: string; readonly payload: unknown }[] = []
    const bridge = createElectronBridge(async (channel, payload) => {
      calls.push({ channel, payload })

      if (
        channel === PERSISTENCE_CHANNELS.createPromptWithInitialVersion ||
        channel === PERSISTENCE_CHANNELS.duplicateAsset ||
        channel === PERSISTENCE_CHANNELS.createDerivedAsset
      ) {
        return promptAssetVersionResponse
      }
      if (channel === PERSISTENCE_CHANNELS.getLineage) {
        return promptLineageResponse
      }
      if (channel === PERSISTENCE_CHANNELS.listPromptTemplates) {
        return { templates: [promptTemplateResponse], total: 1 }
      }
      if (channel === PERSISTENCE_CHANNELS.deletePromptTemplate) {
        return { id: promptTemplateResponse.id, deleted: true }
      }
      if (channel.startsWith("prompter:prompt-templates:")) {
        return promptTemplateResponse
      }

      throw new Error(`Unexpected channel ${channel}`)
    })

    // When: every approved renderer method crosses the bridge.
    await bridge.prompts.createWithInitialVersion(createPromptWithInitialVersionInput)
    await bridge.prompts.duplicateAsset({ sourcePromptAssetId: validPromptAssetId })
    await bridge.prompts.createDerivedAsset(createDerivedPromptAssetInput)
    await bridge.prompts.getLineage(validPromptAssetId)
    await bridge.promptTemplates.create(createPromptTemplateInput)
    await bridge.promptTemplates.list({})
    await bridge.promptTemplates.get(promptTemplateResponse.id)
    await bridge.promptTemplates.update(promptTemplateResponse.id, { name: "Updated Template" })
    await bridge.promptTemplates.duplicate(promptTemplateResponse.id)
    await bridge.promptTemplates.delete(promptTemplateResponse.id)
    await bridge.promptTemplates.createFromVersion(createPromptTemplateFromVersionInput)

    // Then: channel names and normalized payloads exactly match the Phase 15 contract.
    expect(calls).toEqual([
      {
        channel: "prompter:prompt-assets:create-with-initial-version",
        payload: createPromptWithInitialVersionInput,
      },
      {
        channel: "prompter:prompt-assets:duplicate",
        payload: { sourcePromptAssetId: validPromptAssetId, copyTags: true },
      },
      {
        channel: "prompter:prompt-assets:create-derived",
        payload: createDerivedPromptAssetInput,
      },
      {
        channel: "prompter:prompt-assets:get-lineage",
        payload: { promptAssetId: validPromptAssetId },
      },
      { channel: "prompter:prompt-templates:create", payload: createPromptTemplateInput },
      { channel: "prompter:prompt-templates:list", payload: { limit: 100 } },
      {
        channel: "prompter:prompt-templates:get",
        payload: { id: promptTemplateResponse.id },
      },
      {
        channel: "prompter:prompt-templates:update",
        payload: { id: promptTemplateResponse.id, input: { name: "Updated Template" } },
      },
      {
        channel: "prompter:prompt-templates:duplicate",
        payload: { id: promptTemplateResponse.id },
      },
      {
        channel: "prompter:prompt-templates:delete",
        payload: { id: promptTemplateResponse.id },
      },
      {
        channel: "prompter:prompt-templates:create-from-version",
        payload: createPromptTemplateFromVersionInput,
      },
    ])
    expect(calls[4]?.payload).not.toHaveProperty("sourcePromptAssetId")
    expect(calls[4]?.payload).not.toHaveProperty("sourcePromptVersionId")
    expect(calls[10]?.payload).not.toHaveProperty("scenario")
    expect(calls[10]?.payload).not.toHaveProperty("targetAgent")
  })

  it("rejects forbidden Phase 15 bridge payloads before invoking main", async () => {
    // Given: a bridge whose invoke records any trust-boundary escape.
    let invokeCount = 0
    const bridge = createElectronBridge(async () => {
      invokeCount += 1
      return promptTemplateResponse
    })

    // When: renderer payloads include invalid IDs or main-owned source fields.
    const attempts = [
      Reflect.apply(bridge.prompts.getLineage, undefined, ["not-a-uuid"]),
      Reflect.apply(bridge.promptTemplates.create, undefined, [
        { ...createPromptTemplateInput, sourcePromptAssetId: validPromptAssetId },
      ]),
      Reflect.apply(bridge.promptTemplates.createFromVersion, undefined, [
        { ...createPromptTemplateFromVersionInput, scenario: "bugfix" },
      ]),
      Reflect.apply(bridge.promptTemplates.createFromVersion, undefined, [
        { ...createPromptTemplateFromVersionInput, targetAgent: "cursor" },
      ]),
    ]

    // Then: Zod rejects every payload before ipcRenderer.invoke can run.
    for (const attempt of attempts) {
      await expect(attempt).rejects.toThrow()
    }
    expect(invokeCount).toBe(0)
  })
})
