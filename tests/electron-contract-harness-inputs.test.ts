import { describe, expect, it } from "vitest"

import * as ipcContract from "../electron/ipc-contract"
import {
  createHarnessTemplateInputSchema,
  harnessTemplateSchema,
  PERSISTENCE_CHANNELS,
} from "../electron/ipc-contract"
import {
  harnessTemplateResponse,
  validHarnessTemplateId,
  validPromptVersionId,
} from "./electron-contract-fixtures"
import { validProjectId, validPromptAssetId } from "./electron-contract-helpers"
import { registeredSchema } from "./electron-contract-schema-helper"

describe("Electron shell contract", () => {
  it("validates harness template contract inputs without mutating template whitespace", () => {
    const templateBody = "  \nKeep the exact template body.\n  "

    expect(
      createHarnessTemplateInputSchema.parse({
        name: "Whitespace Harness",
        scenario: "feature",
        targetAgent: "generic_agent",
        templateBody,
        requiredFields: ["title", "originalInput"],
        clarificationPolicy: { mode: "ask_when_missing" },
      }),
    ).toEqual({
      name: "Whitespace Harness",
      scenario: "feature",
      targetAgent: "generic_agent",
      templateBody,
      requiredFields: JSON.stringify(["title", "originalInput"]),
      clarificationPolicy: JSON.stringify({ mode: "ask_when_missing" }),
    })
    expect(
      createHarnessTemplateInputSchema.parse({
        name: "JSON Harness",
        scenario: "feature",
        targetAgent: "generic_agent",
        templateBody,
        requiredFields: '["title"]',
        clarificationPolicy: '{"mode":"ask_when_missing"}',
      }),
    ).toMatchObject({
      templateBody,
      requiredFields: JSON.stringify(["title"]),
      clarificationPolicy: JSON.stringify({ mode: "ask_when_missing" }),
    })
    expect(
      harnessTemplateSchema.parse({ ...harnessTemplateResponse, templateBody }).templateBody,
    ).toBe(templateBody)
    expect(() =>
      createHarnessTemplateInputSchema.parse({
        name: "Blank Harness",
        scenario: "feature",
        targetAgent: "generic_agent",
        templateBody: "  \n\t  ",
      }),
    ).toThrow(/templateBody/)
    expect(() =>
      createHarnessTemplateInputSchema.parse({
        name: "Bad Fields Harness",
        scenario: "feature",
        targetAgent: "generic_agent",
        templateBody,
        requiredFields: { title: true },
      }),
    ).toThrow(/requiredFields/)
    expect(() =>
      createHarnessTemplateInputSchema.parse({
        name: "Bad Policy Harness",
        scenario: "feature",
        targetAgent: "generic_agent",
        templateBody,
        clarificationPolicy: ["ask"],
      }),
    ).toThrow(/clarificationPolicy/)
  })

  it("registers only the approved Phase 15 derivation and template channels", () => {
    // Given: the Phase 15 persistence channel registry.
    const approvedChannels = {
      createPromptWithInitialVersion: "prompter:prompt-assets:create-with-initial-version",
      duplicateAsset: "prompter:prompt-assets:duplicate",
      createDerivedAsset: "prompter:prompt-assets:create-derived",
      getLineage: "prompter:prompt-assets:get-lineage",
      createPromptTemplate: "prompter:prompt-templates:create",
      listPromptTemplates: "prompter:prompt-templates:list",
      getPromptTemplate: "prompter:prompt-templates:get",
      updatePromptTemplate: "prompter:prompt-templates:update",
      duplicatePromptTemplate: "prompter:prompt-templates:duplicate",
      deletePromptTemplate: "prompter:prompt-templates:delete",
      createPromptTemplateFromVersion: "prompter:prompt-templates:create-from-version",
    } as const

    // When: the approved channel names are read from the registry.
    const registeredChannels = Object.fromEntries(
      Object.keys(approvedChannels).map((name) => [name, Reflect.get(PERSISTENCE_CHANNELS, name)]),
    )

    // Then: every approved channel is exact and forbidden alternatives remain absent.
    expect(registeredChannels).toEqual(approvedChannels)
    expect(PERSISTENCE_CHANNELS).not.toHaveProperty("listChildren")
    expect(PERSISTENCE_CHANNELS).not.toHaveProperty("previewPromptTemplate")
    expect(PERSISTENCE_CHANNELS).not.toHaveProperty("extractPromptTemplateVariables")
  })

  it("parses atomic prompt creation with trimmed optional tags", () => {
    // Given: a complete normal-save payload with version metadata and optional tags.
    const input = {
      projectId: validProjectId,
      title: "Atomic Prompt",
      scenario: "feature",
      targetAgent: "codex",
      originalInput: "Create an atomic save path.",
      compiledPrompt: "# Objective\nCreate an atomic save path.",
      assumptions: null,
      questions: null,
      answers: null,
      acceptanceCriteria: "Asset and version commit together.",
      validationCommands: "npm test",
      qualityScore: 85,
      tagIds: [validHarnessTemplateId],
      tagNames: ["  atomic  ", "phase15"],
    } as const
    const schema = registeredSchema(ipcContract, "createPromptWithInitialVersionInputSchema")

    // When: the payload crosses the IPC schema boundary.
    const parsed = schema.parse(input)

    // Then: all approved fields remain and tag names are normalized.
    expect(parsed).toEqual({ ...input, tagNames: ["atomic", "phase15"] })
    expect(() => schema.parse({ ...input, tagNames: ["   "] })).toThrow(/tagNames/)
  })

  it("rejects renderer-controlled lineage and source fields on general prompt mutations", () => {
    // Given: general prompt create and update inputs plus prohibited provenance fields.
    const createSchema = registeredSchema(ipcContract, "createPromptAssetInputSchema")
    const updateSchema = registeredSchema(ipcContract, "updatePromptAssetInputSchema")
    const createInput = {
      projectId: validProjectId,
      title: "General Prompt",
      scenario: "feature",
      targetAgent: "codex",
    } as const

    // When: renderer-controlled lineage/source fields are supplied.
    const createResults = [
      createSchema.safeParse({ ...createInput, parentPromptId: validPromptAssetId }),
      createSchema.safeParse({ ...createInput, parentPromptVersionId: validPromptVersionId }),
      createSchema.safeParse({ ...createInput, derivationType: "derived" }),
      createSchema.safeParse({ ...createInput, sourcePromptAssetId: validPromptAssetId }),
    ]
    const updateResults = [
      updateSchema.safeParse({ parentPromptId: validPromptAssetId }),
      updateSchema.safeParse({ parentPromptVersionId: validPromptVersionId }),
      updateSchema.safeParse({ derivationType: "duplicate" }),
      updateSchema.safeParse({ sourcePromptVersionId: validPromptVersionId }),
    ]

    // Then: every provenance mutation is rejected instead of stripped.
    expect([...createResults, ...updateResults].every((result) => !result.success)).toBe(true)
  })
})
