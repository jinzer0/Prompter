import { afterEach, describe, expect, it, vi } from "vitest"

import type { PromptTemplate } from "../electron/ipc-types"
import {
  createOutputRevisionGate,
  resolveRevisionedResponse,
} from "../renderer/src/lib/prompt-compiler/output-revision"
import type {
  CompiledPromptResult,
  PromptCompilerInput,
} from "../renderer/src/lib/prompt-compiler/types"
import {
  applyPromptTemplateToCompilerOutput,
  createPromptTemplateApplication,
  initialPromptTemplateDraftState,
  reducePromptTemplateDraftState,
} from "../renderer/src/lib/prompt-templates/prompt-template-state"

const template = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Feature template",
  description: null,
  sourcePromptAssetId: "22222222-2222-4222-8222-222222222222",
  sourcePromptVersionId: "33333333-3333-4333-8333-333333333333",
  scenario: "feature",
  targetAgent: "codex",
  templateBody: "Build {{feature}} with {{tool}}.",
  createdAt: 1,
  updatedAt: 2,
} satisfies PromptTemplate

const draft = {
  title: "Rendered feature",
  originalInput: "Keep this original request unchanged.",
  scenario: "feature",
  targetAgent: "codex",
} satisfies PromptCompilerInput

const compiled = {
  title: "Rendered feature",
  originalInput: draft.originalInput,
  compiledPrompt: "Old compiled output",
  scenario: "feature",
  targetAgent: "codex",
  assumptions: ["Old assumption"],
  acceptanceCriteria: ["Old criterion"],
  validationCommands: ["old command"],
  suggestedTags: ["old-tag"],
  qualityScore: 4,
} satisfies CompiledPromptResult

function bridgeSpies() {
  return {
    analyze: vi.fn(),
    compile: vi.fn(),
    createPrompt: vi.fn(),
    createVersion: vi.fn(),
    reviewDraft: vi.fn(),
    reviewWithLLM: vi.fn(),
    templateCreate: vi.fn(),
    templateCreateFromVersion: vi.fn(),
    templateDelete: vi.fn(),
    templateDuplicate: vi.fn(),
    templateGet: vi.fn(),
    templateList: vi.fn(),
    templateUpdate: vi.fn(),
    updateAsset: vi.fn(),
  }
}

function installBridge(spies: ReturnType<typeof bridgeSpies>): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      prompter: {
        promptCompiler: { analyze: spies.analyze, compile: spies.compile },
        promptQuality: {
          reviewDraft: spies.reviewDraft,
          reviewWithLLM: spies.reviewWithLLM,
        },
        promptTemplates: {
          create: spies.templateCreate,
          createFromVersion: spies.templateCreateFromVersion,
          delete: spies.templateDelete,
          duplicate: spies.templateDuplicate,
          get: spies.templateGet,
          list: spies.templateList,
          update: spies.templateUpdate,
        },
        prompts: {
          createVersion: spies.createVersion,
          updateAsset: spies.updateAsset,
        },
      },
    },
  })
}

function selectedTemplateState() {
  return reducePromptTemplateDraftState(initialPromptTemplateDraftState, {
    kind: "template_selected",
    template,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(globalThis, "window")
})

describe("prompt template renderer state", () => {
  it("keeps selection and variable preview local without mutating output or calling bridges", () => {
    // Given
    const spies = bridgeSpies()
    installBridge(spies)
    const outputBefore = { compiled, editablePrompt: compiled.compiledPrompt, revision: 7 }

    // When
    const selected = selectedTemplateState()
    const previewed = reducePromptTemplateDraftState(
      reducePromptTemplateDraftState(selected, {
        kind: "variable_changed",
        name: "feature",
        value: "$literal\\path{value}",
      }),
      { kind: "preview_requested" },
    )

    // Then
    expect(outputBefore).toEqual({ compiled, editablePrompt: "Old compiled output", revision: 7 })
    expect(previewed.preview?.rendered).toBe("Build $literal\\path{value} with {{tool}}.")
    expect(previewed.preview?.warnings).toEqual(["Missing value for {{tool}}"])
    for (const spy of Object.values(spies)) {
      expect(spy).not.toHaveBeenCalled()
    }
  })

  it("keeps output and revision unchanged when template apply is cancelled", () => {
    // Given
    const requested = reducePromptTemplateDraftState(selectedTemplateState(), {
      kind: "apply_requested",
    })

    // When
    const cancelled = reducePromptTemplateDraftState(requested, { kind: "apply_cancelled" })

    // Then
    expect(createPromptTemplateApplication(cancelled)).toBeNull()
    expect(compiled.compiledPrompt).toBe("Old compiled output")
  })

  it("clears provenance without changing the applied output revision", () => {
    // Given
    const appliedState = reducePromptTemplateDraftState(selectedTemplateState(), {
      kind: "application_committed",
      provenance: {
        templateId: template.id,
        templateName: template.name,
        sourcePromptAssetId: template.sourcePromptAssetId,
        sourcePromptVersionId: template.sourcePromptVersionId,
      },
    })
    const outputBefore = { editablePrompt: "Rendered output", revision: 8 }

    // When
    const cleared = reducePromptTemplateDraftState(appliedState, {
      kind: "provenance_cleared",
    })

    // Then
    expect(cleared.appliedProvenance).toBeNull()
    expect(outputBefore).toEqual({ editablePrompt: "Rendered output", revision: 8 })
  })

  it("resets applied provenance and pending template state when compiler draft state is replaced", () => {
    // Given
    let state = reducePromptTemplateDraftState(selectedTemplateState(), {
      kind: "variable_changed",
      name: "feature",
      value: "lineage",
    })
    state = reducePromptTemplateDraftState(state, { kind: "apply_requested" })
    state = reducePromptTemplateDraftState(state, {
      kind: "application_committed",
      provenance: {
        templateId: template.id,
        templateName: template.name,
        sourcePromptAssetId: template.sourcePromptAssetId,
        sourcePromptVersionId: template.sourcePromptVersionId,
      },
    })

    // When
    const reset = reducePromptTemplateDraftState(state, { kind: "draft_reset" })

    // Then
    expect(reset).toEqual(initialPromptTemplateDraftState)
    expect(createPromptTemplateApplication(reset)).toBeNull()
  })

  it("applies rendered output explicitly, advances revision, and clears old compiler metadata", () => {
    // Given
    let state = selectedTemplateState()
    state = reducePromptTemplateDraftState(state, {
      kind: "variable_changed",
      name: "feature",
      value: "safe replacement",
    })
    state = reducePromptTemplateDraftState(state, {
      kind: "variable_changed",
      name: "tool",
      value: "Vitest",
    })
    state = reducePromptTemplateDraftState(state, { kind: "apply_requested" })
    const application = createPromptTemplateApplication(state)

    if (application === null) {
      throw new Error("Expected a confirmed template application.")
    }

    // When
    const applied = applyPromptTemplateToCompilerOutput({
      application,
      currentRevision: 7,
      draft,
    })

    // Then
    expect(applied.editablePrompt).toBe("Build safe replacement with Vitest.")
    expect(applied.outputRevision).toBe(8)
    expect(applied.compiled).toEqual({
      title: draft.title,
      originalInput: draft.originalInput,
      compiledPrompt: "Build safe replacement with Vitest.",
      scenario: draft.scenario,
      targetAgent: draft.targetAgent,
      assumptions: [],
      acceptanceCriteria: [],
      validationCommands: [],
    })
    expect(applied.provenance).toEqual({
      templateId: template.id,
      templateName: template.name,
      sourcePromptAssetId: template.sourcePromptAssetId,
      sourcePromptVersionId: template.sourcePromptVersionId,
    })
  })

  it("keeps applied output stable after the selected template changes or disappears", () => {
    // Given
    const requested = reducePromptTemplateDraftState(selectedTemplateState(), {
      kind: "apply_requested",
    })
    const application = createPromptTemplateApplication(requested)

    if (application === null) {
      throw new Error("Expected a confirmed template application.")
    }

    const applied = applyPromptTemplateToCompilerOutput({
      application,
      currentRevision: 0,
      draft,
    })

    // When
    const updatedSelection = reducePromptTemplateDraftState(requested, {
      kind: "template_selected",
      template: { ...template, templateBody: "Updated {{feature}}" },
    })
    const deletedSelection = reducePromptTemplateDraftState(updatedSelection, {
      kind: "template_selected",
      template: null,
    })

    // Then
    expect(deletedSelection.pendingTemplate).toBeNull()
    expect(applied.editablePrompt).toBe("Build {{feature}} with {{tool}}.")
  })

  it.each([
    "analyze",
    "compile",
    "review",
  ] as const)("discards a late %s response after a newer output revision", async (operation) => {
    // Given
    const gate = createOutputRevisionGate()
    let resolveResponse = (_value: string): void => undefined
    const response = new Promise<string>((resolve) => {
      resolveResponse = resolve
    })
    const requestedRevision = gate.current()
    const accepted = resolveRevisionedResponse(response, requestedRevision, gate)

    // When
    gate.advance()
    resolveResponse(`${operation} response`)

    // Then
    await expect(accepted).resolves.toBeNull()
  })
})
