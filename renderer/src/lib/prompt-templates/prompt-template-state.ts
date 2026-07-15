import type { PromptTemplate } from "../../../../electron/ipc-types"
import type {
  CompiledPromptResult,
  PromptCompilerInput,
  PromptTemplateProvenance,
} from "../prompt-compiler/types"
import {
  extractVariables,
  renderTemplate,
  type TemplateRenderResult,
  type TemplateValues,
} from "./prompt-template-utils"

export type PromptTemplateDraftState = {
  readonly appliedProvenance: PromptTemplateProvenance | null
  readonly isApplyConfirmationPending: boolean
  readonly pendingTemplate: PromptTemplate | null
  readonly preview: TemplateRenderResult | null
  readonly variableNames: readonly string[]
  readonly variableValues: TemplateValues
}

export type PromptTemplateDraftEvent =
  | { readonly kind: "template_selected"; readonly template: PromptTemplate | null }
  | { readonly kind: "variable_changed"; readonly name: string; readonly value: string }
  | { readonly kind: "preview_requested" }
  | { readonly kind: "apply_requested" }
  | { readonly kind: "apply_cancelled" }
  | { readonly kind: "application_committed"; readonly provenance: PromptTemplateProvenance }
  | { readonly kind: "provenance_cleared" }
  | { readonly kind: "draft_reset" }

export type PromptTemplateApplication = {
  readonly provenance: PromptTemplateProvenance
  readonly rendered: string
  readonly warnings: readonly string[]
}

type ApplyPromptTemplateInput = {
  readonly application: PromptTemplateApplication
  readonly currentRevision: number
  readonly draft: PromptCompilerInput
}

export type AppliedPromptTemplateOutput = {
  readonly compiled: CompiledPromptResult
  readonly editablePrompt: string
  readonly outputRevision: number
  readonly provenance: PromptTemplateProvenance
}

export const initialPromptTemplateDraftState: PromptTemplateDraftState = {
  appliedProvenance: null,
  isApplyConfirmationPending: false,
  pendingTemplate: null,
  preview: null,
  variableNames: [],
  variableValues: {},
}

function assertNever(event: never): never {
  throw new Error(`Unexpected prompt template draft event: ${JSON.stringify(event)}`)
}

function selectedTemplateState(
  state: PromptTemplateDraftState,
  template: PromptTemplate | null,
): PromptTemplateDraftState {
  if (template === null) {
    return {
      ...state,
      isApplyConfirmationPending: false,
      pendingTemplate: null,
      preview: null,
      variableNames: [],
      variableValues: {},
    }
  }

  const snapshot = { ...template }
  return {
    ...state,
    isApplyConfirmationPending: false,
    pendingTemplate: snapshot,
    preview: null,
    variableNames: extractVariables(snapshot.templateBody),
    variableValues: {},
  }
}

export function reducePromptTemplateDraftState(
  state: PromptTemplateDraftState,
  event: PromptTemplateDraftEvent,
): PromptTemplateDraftState {
  switch (event.kind) {
    case "template_selected":
      return selectedTemplateState(state, event.template)
    case "variable_changed":
      return {
        ...state,
        preview: null,
        variableValues: { ...state.variableValues, [event.name]: event.value },
      }
    case "preview_requested":
      return state.pendingTemplate === null
        ? state
        : {
            ...state,
            preview: renderTemplate(state.pendingTemplate.templateBody, state.variableValues),
          }
    case "apply_requested":
      return state.pendingTemplate === null ? state : { ...state, isApplyConfirmationPending: true }
    case "apply_cancelled":
      return { ...state, isApplyConfirmationPending: false }
    case "application_committed":
      return {
        ...state,
        appliedProvenance: event.provenance,
        isApplyConfirmationPending: false,
      }
    case "provenance_cleared":
      return { ...state, appliedProvenance: null }
    case "draft_reset":
      return initialPromptTemplateDraftState
    default:
      return assertNever(event)
  }
}

export function createPromptTemplateApplication(
  state: PromptTemplateDraftState,
): PromptTemplateApplication | null {
  if (!state.isApplyConfirmationPending || state.pendingTemplate === null) {
    return null
  }

  const result = renderTemplate(state.pendingTemplate.templateBody, state.variableValues)
  return {
    provenance: {
      templateId: state.pendingTemplate.id,
      templateName: state.pendingTemplate.name,
      sourcePromptAssetId: state.pendingTemplate.sourcePromptAssetId,
      sourcePromptVersionId: state.pendingTemplate.sourcePromptVersionId,
    },
    rendered: result.rendered,
    warnings: result.warnings,
  }
}

export function applyPromptTemplateToCompilerOutput({
  application,
  currentRevision,
  draft,
}: ApplyPromptTemplateInput): AppliedPromptTemplateOutput {
  return {
    compiled: {
      title: draft.title ?? "",
      originalInput: draft.originalInput,
      compiledPrompt: application.rendered,
      scenario: draft.scenario,
      targetAgent: draft.targetAgent,
      assumptions: [],
      acceptanceCriteria: [],
      validationCommands: [],
      ...(application.warnings.length === 0 ? {} : { warnings: application.warnings }),
    },
    editablePrompt: application.rendered,
    outputRevision: currentRevision + 1,
    provenance: application.provenance,
  }
}
