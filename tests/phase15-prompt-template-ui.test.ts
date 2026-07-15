import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type { PromptTemplate } from "../electron/ipc-types"
import { promptTemplateManagerFiltersFromState } from "../renderer/src/components/prompt-template-manager"
import { PromptTemplateSelector } from "../renderer/src/components/prompt-template-selector"
import {
  normalizePromptTemplateForm,
  normalizePromptTemplateFromVersionForm,
} from "../renderer/src/lib/prompt-template-form"

const template = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Feature prompt template",
  description: "Reusable feature skeleton",
  sourcePromptAssetId: null,
  sourcePromptVersionId: null,
  scenario: "feature",
  targetAgent: "codex",
  templateBody: "Build {{feature}} safely.",
  createdAt: 1,
  updatedAt: 2,
} satisfies PromptTemplate

describe("phase15 prompt template UI contracts", () => {
  it("preserves visible manager filters when a refresh signal reloads templates", () => {
    const filters = promptTemplateManagerFiltersFromState("  bug  ", "bugfix", "cursor")

    expect(filters).toEqual({
      query: "  bug  ",
      scenario: "bugfix",
      targetAgent: "cursor",
    })
  })

  it("creates source-less prompt templates without source ids", () => {
    const result = normalizePromptTemplateForm({
      name: "  Source-less template  ",
      description: " optional description ",
      scenario: "bugfix",
      targetAgent: "cursor",
      templateBody: "Fix {{bug}} without changing behavior.",
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.bridgeInput).toEqual({
      name: "Source-less template",
      description: "optional description",
      scenario: "bugfix",
      targetAgent: "cursor",
      templateBody: "Fix {{bug}} without changing behavior.",
    })
    expect("sourcePromptAssetId" in result.value.bridgeInput).toBe(false)
    expect("sourcePromptVersionId" in result.value.bridgeInput).toBe(false)
  })

  it("creates prompt templates from versions with edited body and immutable source ids only", () => {
    const result = normalizePromptTemplateFromVersionForm(
      {
        name: "Version template",
        description: "",
        templateBody: "Edited {{body}} from compiled prompt.",
      },
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.bridgeInput).toEqual({
      sourcePromptAssetId: "22222222-2222-4222-8222-222222222222",
      sourcePromptVersionId: "33333333-3333-4333-8333-333333333333",
      name: "Version template",
      description: null,
      templateBody: "Edited {{body}} from compiled prompt.",
    })
    expect("scenario" in result.value.bridgeInput).toBe(false)
    expect("targetAgent" in result.value.bridgeInput).toBe(false)
  })

  it("renders selector preview, variables, apply confirmation, and accessible controls", () => {
    const markup = renderToStaticMarkup(
      createElement(PromptTemplateSelector, {
        isConfirmationPending: true,
        pendingTemplate: template,
        preview: { rendered: "Build search safely.", warnings: [] },
        templates: [template],
        variableNames: ["feature"],
        variableValues: { feature: "search" },
        onCancelApply: () => undefined,
        onConfirmApply: () => undefined,
        onPreview: () => undefined,
        onRequestApply: () => undefined,
        onSelectTemplate: () => undefined,
        onVariableChange: () => undefined,
      }),
    )

    expect(markup).toContain("Prompt Template Apply")
    expect(markup).toContain("Template variable feature")
    expect(markup).toContain("Build search safely.")
    expect(markup).toContain("Confirm Apply Prompt Template")
    expect(markup).toContain("Original request stays unchanged")
  })
})
