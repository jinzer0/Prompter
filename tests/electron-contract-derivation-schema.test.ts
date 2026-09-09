import { describe, expect, it } from "vitest"

import * as ipcContract from "../electron/ipc-contract"
import {
  comparePromptVersionId,
  promptAssetResponse,
  promptVersionResponse,
  validHarnessTemplateId,
  validPromptVersionId,
} from "./electron-contract-fixtures"
import { validProjectId, validPromptAssetId } from "./electron-contract-helpers"
import { registeredSchema } from "./electron-contract-schema-helper"

describe("Electron shell contract", () => {
  it("parses same-project duplicate and derived commands with exact result envelopes", () => {
    // Given: dedicated same-project derivation payloads and a valid asset/version result.
    const duplicateSchema = registeredSchema(ipcContract, "duplicatePromptAssetInputSchema")
    const derivedSchema = registeredSchema(ipcContract, "createDerivedPromptAssetInputSchema")
    const duplicateResultSchema = registeredSchema(ipcContract.responseSchemas, "duplicateAsset")
    const derivedResultSchema = registeredSchema(ipcContract.responseSchemas, "createDerivedAsset")
    const duplicateInput = {
      sourcePromptAssetId: validPromptAssetId,
      sourcePromptVersionId: validPromptVersionId,
    }
    const derivedInput = {
      sourcePromptAssetId: validPromptAssetId,
      sourcePromptVersionId: validPromptVersionId,
      title: "Derived Prompt",
      originalInput: "Derive this prompt.",
      compiledPrompt: "# Objective\nDerive this prompt.",
      assumptions: null,
      questions: null,
      answers: null,
      acceptanceCriteria: null,
      validationCommands: null,
      qualityScore: null,
      tagIds: [validHarnessTemplateId],
      tagNames: ["derived"],
    } as const
    const result = { asset: promptAssetResponse, version: promptVersionResponse }

    // When: the dedicated inputs and response envelopes are parsed.
    const parsedDuplicate = duplicateSchema.parse(duplicateInput)
    const parsedDerived = derivedSchema.parse(derivedInput)

    // Then: defaults and exact same-project contracts are enforced.
    expect(parsedDuplicate).toEqual({ ...duplicateInput, copyTags: true })
    expect(parsedDerived).toEqual(derivedInput)
    expect(duplicateResultSchema.parse(result)).toEqual(result)
    expect(derivedResultSchema.parse(result)).toEqual(result)
    expect(() =>
      duplicateSchema.parse({ ...duplicateInput, targetProjectId: validProjectId }),
    ).toThrow()
    expect(() => duplicateSchema.parse({ ...duplicateInput, projectId: validProjectId })).toThrow()
    expect(() =>
      derivedSchema.parse({ ...derivedInput, targetProjectId: validProjectId }),
    ).toThrow()
    expect(() => derivedSchema.parse({ ...derivedInput, projectId: validProjectId })).toThrow()
    expect(() => duplicateResultSchema.parse({ ...result, extra: true })).toThrow()
  })

  it("parses prompt lineage as one nullable-parent and children response", () => {
    // Given: exact parent and child summaries plus the deleted-parent state.
    const lineageSchema = registeredSchema(ipcContract, "promptLineageSchema")
    const parent = {
      promptAssetId: validPromptAssetId,
      promptVersionId: validPromptVersionId,
      title: "Source Prompt",
      versionNumber: 1,
      derivationType: "duplicate",
    } as const
    const child = {
      promptAssetId: comparePromptVersionId,
      promptVersionId: validHarnessTemplateId,
      title: "Derived Child",
      versionNumber: 2,
      derivationType: "derived",
    } as const

    // When: the aggregate lineage response is parsed.
    const lineage = lineageSchema.parse({ parent, children: [child] })

    // Then: only complete summaries are accepted, including a nullable parent.
    expect(lineage).toEqual({ parent, children: [child] })
    expect(lineageSchema.parse({ parent: null, children: [] })).toEqual({
      parent: null,
      children: [],
    })
    expect(() =>
      lineageSchema.parse({
        parent: { ...parent, projectId: validProjectId },
        children: [child],
      }),
    ).toThrow()
    expect(() =>
      lineageSchema.parse({
        parent,
        children: [
          {
            promptAssetId: child.promptAssetId,
            promptVersionId: child.promptVersionId,
            title: child.title,
            derivationType: child.derivationType,
          },
        ],
      }),
    ).toThrow(/versionNumber/)
    expect(() =>
      lineageSchema.parse({
        parent,
        children: [{ ...child, derivationType: "templated_from" }],
      }),
    ).toThrow(/derivationType/)
  })
})
