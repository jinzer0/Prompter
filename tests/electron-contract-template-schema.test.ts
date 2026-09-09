import { describe, expect, it } from "vitest"

import * as ipcContract from "../electron/ipc-contract"
import { validHarnessTemplateId, validPromptVersionId } from "./electron-contract-fixtures"
import { validPromptAssetId } from "./electron-contract-helpers"
import { registeredSchema } from "./electron-contract-schema-helper"

describe("Electron shell contract", () => {
  it("defines exact source-less and source-version prompt template contracts", () => {
    // Given: approved source-less create and source-version create payloads.
    const templateSchema = registeredSchema(ipcContract, "promptTemplateSchema")
    const createSchema = registeredSchema(ipcContract, "createPromptTemplateInputSchema")
    const createFromVersionSchema = registeredSchema(
      ipcContract,
      "createPromptTemplateFromVersionInputSchema",
    )
    const template = {
      id: validHarnessTemplateId,
      name: "Feature Template",
      description: null,
      sourcePromptAssetId: validPromptAssetId,
      sourcePromptVersionId: validPromptVersionId,
      scenario: "feature",
      targetAgent: "codex",
      templateBody: "  # Objective\n{{objective}}  ",
      createdAt: 1,
      updatedAt: 2,
    } as const
    const createInput = {
      name: "Feature Template",
      description: null,
      scenario: "feature",
      targetAgent: "codex",
      templateBody: template.templateBody,
    } as const
    const fromVersionInput = {
      sourcePromptAssetId: validPromptAssetId,
      sourcePromptVersionId: validPromptVersionId,
      name: "Feature Template",
      description: "Created from a saved prompt version.",
      templateBody: template.templateBody,
    } as const

    // When: approved template records and create payloads are parsed.
    const parsedTemplate = templateSchema.parse(template)

    // Then: the exact ten-field record is preserved and source ownership stays main-process-only.
    expect(parsedTemplate).toEqual(template)
    expect(createSchema.parse(createInput)).toEqual(createInput)
    expect(createFromVersionSchema.parse(fromVersionInput)).toEqual(fromVersionInput)
    expect(() =>
      createSchema.parse({ ...createInput, sourcePromptAssetId: validPromptAssetId }),
    ).toThrow()
    expect(() =>
      createSchema.parse({ ...createInput, sourcePromptVersionId: validPromptVersionId }),
    ).toThrow()
    expect(() =>
      createFromVersionSchema.parse({ ...fromVersionInput, scenario: "bugfix" }),
    ).toThrow()
    expect(() =>
      createFromVersionSchema.parse({ ...fromVersionInput, targetAgent: "cursor" }),
    ).toThrow()
    expect(() => templateSchema.parse({ ...template, variables: ["objective"] })).toThrow()
    expect(() => createSchema.parse({ ...createInput, name: "   " })).toThrow(/name/)
    expect(() => createSchema.parse({ ...createInput, templateBody: "   " })).toThrow(
      /templateBody/,
    )
  })

  it("parses prompt template list, mutation, and delete request-response shapes", () => {
    // Given: all approved prompt template registry schemas.
    const listInputSchema = registeredSchema(ipcContract, "listPromptTemplatesInputSchema")
    const updateInputSchema = registeredSchema(ipcContract, "updatePromptTemplateInputSchema")
    const listResponseSchema = registeredSchema(ipcContract.responseSchemas, "listPromptTemplates")
    const deleteResponseSchema = registeredSchema(
      ipcContract.responseSchemas,
      "deletePromptTemplate",
    )
    const template = {
      id: validHarnessTemplateId,
      name: "Feature Template",
      description: null,
      sourcePromptAssetId: null,
      sourcePromptVersionId: null,
      scenario: "feature",
      targetAgent: "codex",
      templateBody: "{{objective}}",
      createdAt: 1,
      updatedAt: 2,
    } as const

    // When: list filters, update fields, and result envelopes are parsed.
    const listInput = listInputSchema.parse({
      query: "  feature  ",
      scenario: "feature",
      targetAgent: "codex",
      limit: 25,
    })

    // Then: list totals, immutable source IDs, and explicit deletion are enforced.
    expect(listInput).toEqual({
      query: "feature",
      scenario: "feature",
      targetAgent: "codex",
      limit: 25,
    })
    expect(listInputSchema.parse({})).toEqual({ limit: 100 })
    expect(updateInputSchema.parse({ description: null })).toEqual({ description: null })
    expect(listResponseSchema.parse({ templates: [template], total: 1 })).toEqual({
      templates: [template],
      total: 1,
    })
    expect(deleteResponseSchema.parse({ id: validHarnessTemplateId, deleted: true })).toEqual({
      id: validHarnessTemplateId,
      deleted: true,
    })
    expect(() => updateInputSchema.parse({ sourcePromptAssetId: validPromptAssetId })).toThrow()
    expect(() => updateInputSchema.parse({})).toThrow()
    expect(() => deleteResponseSchema.parse({ id: validHarnessTemplateId })).toThrow(/deleted/)
  })
})
