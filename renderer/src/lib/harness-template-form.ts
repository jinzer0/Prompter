import type { CreateHarnessTemplateInput } from "../../../electron/ipc-types"
import type { PromptScenario, TargetAgent } from "./prompter-options"

export type HarnessTemplateFormInput = {
  readonly name: string
  readonly scenario: PromptScenario
  readonly targetAgent: TargetAgent
  readonly templateBody: string
  readonly requiredFields: string
  readonly clarificationPolicy: string
}

export type NormalizedHarnessTemplateForm = {
  readonly name: string
  readonly scenario: PromptScenario
  readonly targetAgent: TargetAgent
  readonly templateBody: string
  readonly requiredFields: readonly string[] | null
  readonly clarificationPolicy: Record<string, unknown> | null
  readonly bridgeInput: CreateHarnessTemplateInput
}

export type HarnessTemplateFormField = keyof HarnessTemplateFormInput

export type HarnessTemplateFormResult =
  | { readonly ok: true; readonly value: NormalizedHarnessTemplateForm }
  | { readonly ok: false; readonly field: HarnessTemplateFormField; readonly message: string }

type HarnessTemplateFormError = Extract<HarnessTemplateFormResult, { ok: false }>

type JsonTextareaResult =
  | { readonly ok: true; readonly value: unknown; readonly isBlank: boolean }
  | { readonly ok: false; readonly field: HarnessTemplateFormField; readonly message: string }

function parseJsonTextarea(text: string, field: HarnessTemplateFormField): JsonTextareaResult {
  if (text.trim().length === 0) {
    return { ok: true, value: null, isBlank: true }
  }

  try {
    const value: unknown = JSON.parse(text)
    return { ok: true, value, isBlank: false }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { ok: false, field, message: "Enter valid JSON." }
    }

    throw error
  }
}

function parseRequiredFields(text: string): HarnessTemplateFormError | readonly string[] | null {
  const parsed = parseJsonTextarea(text, "requiredFields")

  if (!parsed.ok) {
    return parsed
  }

  if (parsed.isBlank) {
    return null
  }

  if (!Array.isArray(parsed.value)) {
    return { ok: false, field: "requiredFields", message: "Required fields must be a JSON array." }
  }

  const fields: string[] = []

  for (const entry of parsed.value) {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      return {
        ok: false,
        field: "requiredFields",
        message: "Required fields must contain only non-empty strings.",
      }
    }

    fields.push(entry.trim())
  }

  return fields
}

function parseClarificationPolicy(
  text: string,
): HarnessTemplateFormError | Record<string, unknown> | null {
  const parsed = parseJsonTextarea(text, "clarificationPolicy")

  if (!parsed.ok) {
    return parsed
  }

  if (parsed.isBlank) {
    return null
  }

  return isJsonObject(parsed.value)
    ? parsed.value
    : {
        ok: false,
        field: "clarificationPolicy",
        message: "Clarification policy must be a JSON object.",
      }
}

function isFormError(value: unknown): value is HarnessTemplateFormError {
  return typeof value === "object" && value !== null && "ok" in value && value.ok === false
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export function bridgeInputFromNormalizedHarnessTemplateForm(
  input: NormalizedHarnessTemplateForm,
): CreateHarnessTemplateInput {
  return input.bridgeInput
}

export function normalizeHarnessTemplateForm(
  input: HarnessTemplateFormInput,
): HarnessTemplateFormResult {
  const name = input.name.trim()

  if (name.length === 0) {
    return { ok: false, field: "name", message: "Harness template name is required." }
  }

  if (input.templateBody.trim().length === 0) {
    return { ok: false, field: "templateBody", message: "Template body is required." }
  }

  const requiredFields = parseRequiredFields(input.requiredFields)

  if (isFormError(requiredFields)) {
    return requiredFields
  }

  const clarificationPolicy = parseClarificationPolicy(input.clarificationPolicy)

  if (isFormError(clarificationPolicy)) {
    return clarificationPolicy
  }

  const bridgeInput: CreateHarnessTemplateInput = {
    name,
    scenario: input.scenario,
    targetAgent: input.targetAgent,
    templateBody: input.templateBody,
    requiredFields: requiredFields === null ? null : JSON.stringify(requiredFields),
    clarificationPolicy: clarificationPolicy === null ? null : JSON.stringify(clarificationPolicy),
  }

  return {
    ok: true,
    value: {
      ...bridgeInput,
      requiredFields,
      clarificationPolicy,
      bridgeInput,
    },
  }
}
