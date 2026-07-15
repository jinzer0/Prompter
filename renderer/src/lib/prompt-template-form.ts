import type {
  CreatePromptTemplateFromVersionInput,
  CreatePromptTemplateInput,
  PromptTemplate,
  UpdatePromptTemplateInput,
} from "../../../electron/ipc-types"
import type { PromptScenario, TargetAgent } from "./prompter-options"

export type PromptTemplateFormInput = {
  readonly name: string
  readonly description: string
  readonly scenario: PromptScenario
  readonly targetAgent: TargetAgent
  readonly templateBody: string
}

export type PromptTemplateFromVersionFormInput = {
  readonly name: string
  readonly description: string
  readonly templateBody: string
}

export type PromptTemplateFormField = keyof PromptTemplateFormInput
export type PromptTemplateFromVersionFormField = keyof PromptTemplateFromVersionFormInput

export type NormalizedPromptTemplateForm = {
  readonly name: string
  readonly description: string | null
  readonly scenario: PromptScenario
  readonly targetAgent: TargetAgent
  readonly templateBody: string
  readonly bridgeInput: CreatePromptTemplateInput
}

export type NormalizedPromptTemplateFromVersionForm = {
  readonly name: string
  readonly description: string | null
  readonly templateBody: string
  readonly sourcePromptAssetId: string
  readonly sourcePromptVersionId: string
  readonly bridgeInput: CreatePromptTemplateFromVersionInput
}

export type PromptTemplateFormResult =
  | { readonly ok: true; readonly value: NormalizedPromptTemplateForm }
  | { readonly ok: false; readonly field: PromptTemplateFormField; readonly message: string }

export type PromptTemplateFromVersionFormResult =
  | { readonly ok: true; readonly value: NormalizedPromptTemplateFromVersionForm }
  | {
      readonly ok: false
      readonly field: PromptTemplateFromVersionFormField
      readonly message: string
    }

export function promptTemplateFormFromTemplate(
  template: PromptTemplate | null,
): PromptTemplateFormInput {
  return {
    name: template?.name ?? "",
    description: template?.description ?? "",
    scenario: template?.scenario ?? "feature",
    targetAgent: template?.targetAgent ?? "generic_agent",
    templateBody: template?.templateBody ?? "",
  }
}

function normalizedDescription(description: string): string | null {
  const trimmed = description.trim()
  return trimmed.length === 0 ? null : trimmed
}

export function normalizePromptTemplateForm(
  input: PromptTemplateFormInput,
): PromptTemplateFormResult {
  const name = input.name.trim()

  if (name.length === 0) {
    return { ok: false, field: "name", message: "Prompt template name is required." }
  }

  if (input.templateBody.trim().length === 0) {
    return { ok: false, field: "templateBody", message: "Template body is required." }
  }

  const bridgeInput: CreatePromptTemplateInput = {
    name,
    description: normalizedDescription(input.description),
    scenario: input.scenario,
    targetAgent: input.targetAgent,
    templateBody: input.templateBody,
  }

  return {
    ok: true,
    value: {
      name: bridgeInput.name,
      description: bridgeInput.description ?? null,
      scenario: bridgeInput.scenario,
      targetAgent: bridgeInput.targetAgent,
      templateBody: bridgeInput.templateBody,
      bridgeInput,
    },
  }
}

export function updateInputFromPromptTemplateForm(
  input: NormalizedPromptTemplateForm,
): UpdatePromptTemplateInput {
  return input.bridgeInput
}

export function normalizePromptTemplateFromVersionForm(
  input: PromptTemplateFromVersionFormInput,
  sourcePromptAssetId: string,
  sourcePromptVersionId: string,
): PromptTemplateFromVersionFormResult {
  const name = input.name.trim()

  if (name.length === 0) {
    return { ok: false, field: "name", message: "Prompt template name is required." }
  }

  if (input.templateBody.trim().length === 0) {
    return { ok: false, field: "templateBody", message: "Template body is required." }
  }

  const bridgeInput: CreatePromptTemplateFromVersionInput = {
    sourcePromptAssetId,
    sourcePromptVersionId,
    name,
    description: normalizedDescription(input.description),
    templateBody: input.templateBody,
  }

  return {
    ok: true,
    value: {
      sourcePromptAssetId: bridgeInput.sourcePromptAssetId,
      sourcePromptVersionId: bridgeInput.sourcePromptVersionId,
      name: bridgeInput.name,
      description: bridgeInput.description ?? null,
      templateBody: bridgeInput.templateBody,
      bridgeInput,
    },
  }
}
