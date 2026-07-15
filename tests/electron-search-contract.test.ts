import { describe, expect, it } from "vitest"

import { createElectronBridge } from "../electron/bridge"
import { createPersistenceIpcHandlers } from "../electron/ipc-handlers"
import { validPromptAssetId } from "./electron-contract-helpers"
import { createFailingServices } from "./electron-contract-service-fixture"

const validPromptVersionId = "22222222-2222-4222-8222-222222222222"
const validTagId = "44444444-4444-4444-8444-444444444444"
const searchResultResponse = {
  items: [
    {
      promptAssetId: validPromptAssetId,
      currentVersionId: validPromptVersionId,
      title: "Searchable Prompt",
      scenario: "feature",
      targetAgent: "codex",
      projectId: null,
      projectName: null,
      versionNumber: 1,
      compiledPromptPreview: "Compiled prompt preview",
      originalInputPreview: "Original input preview",
      matchedTextPreview: "Matched text preview",
      qualityScore: null,
      tags: [{ id: validTagId, name: "phase-7", createdAt: 1 }],
      createdAt: 1,
      updatedAt: 2,
    },
  ],
  total: 1,
} as const
const tagResponse = { id: validTagId, name: "phase-7", createdAt: 1 } as const
const tagCountResponse = { ...tagResponse, promptCount: 1 } as const
const tagLinkResponse = { promptAssetId: validPromptAssetId, tagId: validTagId } as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function requireGroup(root: object, key: string): Record<string, unknown> {
  const value = Reflect.get(root, key)

  if (!isRecord(value)) {
    throw new TypeError(`Phase 7 bridge group ${key} is missing`)
  }

  return value
}

function callGroupMethod(
  group: Record<string, unknown>,
  methodName: string,
  ...args: readonly unknown[]
): Promise<unknown> {
  const method = group[methodName]

  if (typeof method !== "function") {
    throw new TypeError(`Phase 7 bridge method ${methodName} is missing`)
  }

  return Promise.resolve(Reflect.apply(method, group, args))
}

function callHandler(root: object, key: string, payload: unknown): unknown {
  const handler = Reflect.get(root, key)

  if (typeof handler !== "function") {
    throw new TypeError(`Phase 7 handler ${key} is missing`)
  }

  return Reflect.apply(handler, root, [payload])
}

describe("Electron Phase 7 search contract", () => {
  it("routes search and expanded tag methods through typed bridge channels", async () => {
    const calls: { readonly channel: string; readonly payload: unknown }[] = []
    const bridge = createElectronBridge(async (channel, payload) => {
      calls.push({ channel, payload })

      if (channel === "prompter:search:prompts") {
        return searchResultResponse
      }
      if (channel === "prompter:search:rebuild-index") {
        return { rebuilt: true }
      }
      if (channel === "prompter:tags:list-for-prompt") {
        return [tagResponse]
      }
      if (channel === "prompter:tags:list-with-counts") {
        return [tagCountResponse]
      }
      if (channel === "prompter:tags:create-and-attach") {
        return tagLinkResponse
      }

      throw new Error(`Unexpected channel ${channel}`)
    })

    expect(Object.keys(bridge)).toContain("search")
    const search = requireGroup(bridge, "search")
    const tags = requireGroup(bridge, "tags")

    expect(Object.keys(search)).toEqual(["searchPrompts", "rebuildIndex"])
    expect(Object.keys(tags)).toEqual([
      "create",
      "list",
      "update",
      "delete",
      "attachToPrompt",
      "detachFromPrompt",
      "listForPrompt",
      "listWithCounts",
      "createAndAttachToPrompt",
    ])
    await expect(
      callGroupMethod(search, "searchPrompts", {
        limit: 25,
        offset: 0,
        projectId: null,
        query: 'React "결제"',
        scenarios: ["feature"],
        sortBy: "relevance",
        sortDirection: "desc",
        tagIds: [validTagId],
        targetAgents: ["codex"],
      }),
    ).resolves.toEqual(searchResultResponse)
    await expect(callGroupMethod(search, "rebuildIndex")).resolves.toEqual({ rebuilt: true })
    await expect(callGroupMethod(tags, "listForPrompt", validPromptAssetId)).resolves.toEqual([
      tagResponse,
    ])
    await expect(callGroupMethod(tags, "listWithCounts")).resolves.toEqual([tagCountResponse])
    await expect(
      callGroupMethod(tags, "createAndAttachToPrompt", {
        promptAssetId: validPromptAssetId,
        tagName: "phase-7",
      }),
    ).resolves.toEqual(tagLinkResponse)
    expect(calls).toEqual([
      {
        channel: "prompter:search:prompts",
        payload: {
          limit: 25,
          offset: 0,
          projectId: null,
          query: 'React "결제"',
          scenarios: ["feature"],
          sortBy: "relevance",
          sortDirection: "desc",
          tagIds: [validTagId],
          targetAgents: ["codex"],
        },
      },
      { channel: "prompter:search:rebuild-index", payload: undefined },
      { channel: "prompter:tags:list-for-prompt", payload: { id: validPromptAssetId } },
      { channel: "prompter:tags:list-with-counts", payload: undefined },
      {
        channel: "prompter:tags:create-and-attach",
        payload: { promptAssetId: validPromptAssetId, tagName: "phase-7" },
      },
    ])
  })

  it("rejects malformed search and tag payloads before repository calls", () => {
    let called = false
    const handlers = createPersistenceIpcHandlers(
      createFailingServices(() => {
        called = true
      }),
    )

    expect(Object.keys(handlers)).toEqual(
      expect.arrayContaining([
        "searchPrompts",
        "rebuildSearchIndex",
        "listTagsForPrompt",
        "listTagsWithCounts",
        "createAndAttachTagToPrompt",
      ]),
    )
    expect(() => callHandler(handlers, "searchPrompts", { limit: 101, query: "React" })).toThrow(
      /limit/,
    )
    expect(() =>
      callHandler(handlers, "searchPrompts", { query: "React", scenarios: ["unknown"] }),
    ).toThrow(/scenarios/)
    expect(() => callHandler(handlers, "listTagsForPrompt", { id: "not-a-uuid" })).toThrow(/id/)
    expect(() =>
      callHandler(handlers, "createAndAttachTagToPrompt", {
        promptAssetId: validPromptAssetId,
        tagName: "   ",
      }),
    ).toThrow(/tagName/)
    expect(called).toBe(false)
  })
})
