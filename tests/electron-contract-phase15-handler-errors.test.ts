import { describe, expect, it } from "vitest"

import { createElectronBridge } from "../electron/bridge"
import { PERSISTENCE_CHANNELS } from "../electron/ipc-contract"
import { createPersistenceIpcHandlers } from "../electron/ipc-handlers"
import {
  createDerivedPromptAssetInput,
  createPromptTemplateFromVersionInput,
  createPromptTemplateInput,
  createPromptWithInitialVersionInput,
  promptAssetResponse,
  promptAssetVersionResponse,
  promptLineageChild,
  promptLineageResponse,
  promptTemplateResponse,
  promptVersionResponse,
  validPromptVersionId,
} from "./electron-contract-fixtures"
import { validProjectId, validPromptAssetId } from "./electron-contract-helpers"
import { createFailingServices } from "./electron-contract-service-fixture"

describe("Electron shell contract", () => {
  it("rejects every malformed Phase 15 handler payload before service calls", () => {
    // Given: Phase 15 services that count any call made after payload parsing.
    let serviceCallCount = 0
    const serviceCalled = () => {
      serviceCallCount += 1
      return promptTemplateResponse
    }
    const handlers = createPersistenceIpcHandlers({
      ...createFailingServices(() => undefined),
      createPromptWithInitialVersion: () => {
        serviceCallCount += 1
        return promptAssetVersionResponse
      },
      duplicatePromptAsset: () => {
        serviceCallCount += 1
        return promptAssetVersionResponse
      },
      createDerivedPromptAsset: () => {
        serviceCallCount += 1
        return promptAssetVersionResponse
      },
      getLineage: () => {
        serviceCallCount += 1
        return promptLineageResponse
      },
      createPromptTemplate: serviceCalled,
      listPromptTemplates: () => {
        serviceCallCount += 1
        return { templates: [promptTemplateResponse], total: 1 }
      },
      getPromptTemplate: serviceCalled,
      updatePromptTemplate: serviceCalled,
      duplicatePromptTemplate: serviceCalled,
      deletePromptTemplate: () => {
        serviceCallCount += 1
        return { id: promptTemplateResponse.id, deleted: true as const }
      },
      createPromptTemplateFromVersion: serviceCalled,
    })

    // When: each handler receives an invalid or forbidden renderer payload.
    const attempts = [
      () =>
        handlers.createPromptWithInitialVersion({
          ...createPromptWithInitialVersionInput,
          parentPromptId: validPromptAssetId,
        }),
      () => handlers.duplicateAsset({ sourcePromptAssetId: "not-a-uuid" }),
      () =>
        handlers.createDerivedAsset({
          ...createDerivedPromptAssetInput,
          projectId: validProjectId,
        }),
      () => handlers.getLineage({ promptAssetId: "not-a-uuid" }),
      () =>
        handlers.createPromptTemplate({
          ...createPromptTemplateInput,
          sourcePromptAssetId: validPromptAssetId,
        }),
      () => handlers.listPromptTemplates({ limit: 0 }),
      () => handlers.getPromptTemplate({ id: "not-a-uuid" }),
      () =>
        handlers.updatePromptTemplate({
          id: promptTemplateResponse.id,
          input: { sourcePromptVersionId: validPromptVersionId },
        }),
      () => handlers.duplicatePromptTemplate({ id: "not-a-uuid" }),
      () => handlers.deletePromptTemplate({ id: "not-a-uuid" }),
      () =>
        handlers.createPromptTemplateFromVersion({
          ...createPromptTemplateFromVersionInput,
          targetAgent: "cursor",
        }),
    ]

    // Then: all payloads fail before a persistence service can run.
    for (const attempt of attempts) {
      expect(attempt).toThrow()
    }
    expect(serviceCallCount).toBe(0)
  })

  it("rejects malformed responses from every Phase 15 service", () => {
    // Given: services whose return types are structurally valid but violate runtime constraints.
    const malformedAssetVersion = {
      asset: { ...promptAssetResponse, createdAt: -1 },
      version: promptVersionResponse,
    }
    const malformedTemplate = { ...promptTemplateResponse, createdAt: -1 }
    const handlers = createPersistenceIpcHandlers({
      ...createFailingServices(() => undefined),
      createPromptWithInitialVersion: () => malformedAssetVersion,
      duplicatePromptAsset: () => malformedAssetVersion,
      createDerivedPromptAsset: () => malformedAssetVersion,
      getLineage: () => ({
        parent: null,
        children: [{ ...promptLineageChild, versionNumber: 0 }],
      }),
      createPromptTemplate: () => malformedTemplate,
      listPromptTemplates: () => ({ templates: [malformedTemplate], total: -1 }),
      getPromptTemplate: () => malformedTemplate,
      updatePromptTemplate: () => malformedTemplate,
      duplicatePromptTemplate: () => malformedTemplate,
      deletePromptTemplate: () => ({ id: "not-a-uuid", deleted: true as const }),
      createPromptTemplateFromVersion: () => malformedTemplate,
    })

    // When: each handler parses its service response before returning to Electron.
    const attempts = [
      () => handlers.createPromptWithInitialVersion(createPromptWithInitialVersionInput),
      () => handlers.duplicateAsset({ sourcePromptAssetId: validPromptAssetId }),
      () => handlers.createDerivedAsset(createDerivedPromptAssetInput),
      () => handlers.getLineage({ promptAssetId: validPromptAssetId }),
      () => handlers.createPromptTemplate(createPromptTemplateInput),
      () => handlers.listPromptTemplates({}),
      () => handlers.getPromptTemplate({ id: promptTemplateResponse.id }),
      () =>
        handlers.updatePromptTemplate({
          id: promptTemplateResponse.id,
          input: { name: "Updated Template" },
        }),
      () => handlers.duplicatePromptTemplate({ id: promptTemplateResponse.id }),
      () => handlers.deletePromptTemplate({ id: promptTemplateResponse.id }),
      () => handlers.createPromptTemplateFromVersion(createPromptTemplateFromVersionInput),
    ]

    // Then: malformed persistence data never crosses the main-process boundary.
    for (const attempt of attempts) {
      expect(attempt).toThrow()
    }
  })

  it("rejects malformed responses from every Phase 15 bridge invocation", async () => {
    // Given: a fake invoke returning malformed data for each Phase 15 response family.
    const bridge = createElectronBridge(async (channel) => {
      if (
        channel === PERSISTENCE_CHANNELS.createPromptWithInitialVersion ||
        channel === PERSISTENCE_CHANNELS.duplicateAsset ||
        channel === PERSISTENCE_CHANNELS.createDerivedAsset
      ) {
        return { ...promptAssetVersionResponse, extra: true }
      }
      if (channel === PERSISTENCE_CHANNELS.getLineage) {
        return {
          parent: null,
          children: [{ ...promptLineageChild, versionNumber: 0 }],
        }
      }
      if (channel === PERSISTENCE_CHANNELS.listPromptTemplates) {
        return { templates: [promptTemplateResponse], total: -1 }
      }
      if (channel === PERSISTENCE_CHANNELS.deletePromptTemplate) {
        return { id: "not-a-uuid", deleted: true }
      }
      return { ...promptTemplateResponse, variables: ["objective"] }
    })

    // When: all approved renderer methods receive malformed main-process responses.
    const attempts = [
      bridge.prompts.createWithInitialVersion(createPromptWithInitialVersionInput),
      bridge.prompts.duplicateAsset({ sourcePromptAssetId: validPromptAssetId }),
      bridge.prompts.createDerivedAsset(createDerivedPromptAssetInput),
      bridge.prompts.getLineage(validPromptAssetId),
      bridge.promptTemplates.create(createPromptTemplateInput),
      bridge.promptTemplates.list({}),
      bridge.promptTemplates.get(promptTemplateResponse.id),
      bridge.promptTemplates.update(promptTemplateResponse.id, { name: "Updated Template" }),
      bridge.promptTemplates.duplicate(promptTemplateResponse.id),
      bridge.promptTemplates.delete(promptTemplateResponse.id),
      bridge.promptTemplates.createFromVersion(createPromptTemplateFromVersionInput),
    ]

    // Then: bridge response parsing rejects every malformed value.
    for (const attempt of attempts) {
      await expect(attempt).rejects.toThrow()
    }
  })
})
