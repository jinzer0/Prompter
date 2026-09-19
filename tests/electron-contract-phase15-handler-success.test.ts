import { describe, expect, it } from "vitest"

import { createPersistenceIpcHandlers } from "../electron/ipc-handlers"
import type {
  CreateDerivedPromptAssetInput,
  CreatePromptTemplateFromVersionInput,
  CreatePromptTemplateInput,
  CreatePromptWithInitialVersionInput,
  DuplicatePromptAssetInput,
  ListPromptTemplatesInput,
  UpdatePromptTemplateInput,
} from "../electron/ipc-types"
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
import { createFailingServices } from "./electron-contract-service-fixture"

describe("Electron shell contract", () => {
  it("parses every Phase 15 handler payload and service response", () => {
    // Given: contract-shaped services that capture normalized handler arguments.
    const calls: { readonly method: string; readonly payload: unknown }[] = []
    const handlers = createPersistenceIpcHandlers({
      ...createFailingServices(() => undefined),
      createPromptWithInitialVersion: (input: CreatePromptWithInitialVersionInput) => {
        calls.push({ method: "createPromptWithInitialVersion", payload: input })
        return promptAssetVersionResponse
      },
      duplicatePromptAsset: (input: DuplicatePromptAssetInput) => {
        calls.push({ method: "duplicatePromptAsset", payload: input })
        return promptAssetVersionResponse
      },
      createDerivedPromptAsset: (input: CreateDerivedPromptAssetInput) => {
        calls.push({ method: "createDerivedPromptAsset", payload: input })
        return promptAssetVersionResponse
      },
      getLineage: (promptAssetId: string) => {
        calls.push({ method: "getLineage", payload: promptAssetId })
        return promptLineageResponse
      },
      createPromptTemplate: (input: CreatePromptTemplateInput) => {
        calls.push({ method: "createPromptTemplate", payload: input })
        return promptTemplateResponse
      },
      listPromptTemplates: (input?: ListPromptTemplatesInput) => {
        calls.push({ method: "listPromptTemplates", payload: input })
        return { templates: [promptTemplateResponse], total: 1 }
      },
      getPromptTemplate: (id: string) => {
        calls.push({ method: "getPromptTemplate", payload: id })
        return promptTemplateResponse
      },
      updatePromptTemplate: (id: string, input: UpdatePromptTemplateInput) => {
        calls.push({ method: "updatePromptTemplate", payload: { id, input } })
        return promptTemplateResponse
      },
      duplicatePromptTemplate: (id: string) => {
        calls.push({ method: "duplicatePromptTemplate", payload: id })
        return promptTemplateResponse
      },
      deletePromptTemplate: (id: string) => {
        calls.push({ method: "deletePromptTemplate", payload: id })
        return { id, deleted: true as const }
      },
      createPromptTemplateFromVersion: (input: CreatePromptTemplateFromVersionInput) => {
        calls.push({ method: "createPromptTemplateFromVersion", payload: input })
        return promptTemplateResponse
      },
    })

    // When: each main-process handler receives an untrusted IPC payload.
    expect(handlers.createPromptWithInitialVersion(createPromptWithInitialVersionInput)).toEqual(
      promptAssetVersionResponse,
    )
    expect(handlers.duplicateAsset({ sourcePromptAssetId: validPromptAssetId })).toEqual(
      promptAssetVersionResponse,
    )
    expect(handlers.createDerivedAsset(createDerivedPromptAssetInput)).toEqual(
      promptAssetVersionResponse,
    )
    expect(handlers.getLineage({ promptAssetId: validPromptAssetId })).toEqual(
      promptLineageResponse,
    )
    expect(handlers.createPromptTemplate(createPromptTemplateInput)).toEqual(promptTemplateResponse)
    expect(handlers.listPromptTemplates({})).toEqual({
      templates: [promptTemplateResponse],
      total: 1,
    })
    expect(handlers.getPromptTemplate({ id: promptTemplateResponse.id })).toEqual(
      promptTemplateResponse,
    )
    expect(
      handlers.updatePromptTemplate({
        id: promptTemplateResponse.id,
        input: { name: "Updated Template" },
      }),
    ).toEqual(promptTemplateResponse)
    expect(handlers.duplicatePromptTemplate({ id: promptTemplateResponse.id })).toEqual(
      promptTemplateResponse,
    )
    expect(handlers.deletePromptTemplate({ id: promptTemplateResponse.id })).toEqual({
      id: promptTemplateResponse.id,
      deleted: true,
    })
    expect(handlers.createPromptTemplateFromVersion(createPromptTemplateFromVersionInput)).toEqual(
      promptTemplateResponse,
    )

    // Then: defaults are applied once and service arguments contain only approved fields.
    expect(calls).toEqual([
      { method: "createPromptWithInitialVersion", payload: createPromptWithInitialVersionInput },
      {
        method: "duplicatePromptAsset",
        payload: { sourcePromptAssetId: validPromptAssetId, copyTags: true },
      },
      { method: "createDerivedPromptAsset", payload: createDerivedPromptAssetInput },
      { method: "getLineage", payload: validPromptAssetId },
      { method: "createPromptTemplate", payload: createPromptTemplateInput },
      { method: "listPromptTemplates", payload: { limit: 100 } },
      { method: "getPromptTemplate", payload: promptTemplateResponse.id },
      {
        method: "updatePromptTemplate",
        payload: { id: promptTemplateResponse.id, input: { name: "Updated Template" } },
      },
      { method: "duplicatePromptTemplate", payload: promptTemplateResponse.id },
      { method: "deletePromptTemplate", payload: promptTemplateResponse.id },
      {
        method: "createPromptTemplateFromVersion",
        payload: createPromptTemplateFromVersionInput,
      },
    ])
  })
})
