import type { PromptCompilerInput } from "./types"

export const HARNESS_WARNING_UNKNOWN_PLACEHOLDER = "Unknown harness placeholder" as const
export const HARNESS_WARNING_REQUIRED_FIELD_EMPTY = "Harness required field is empty" as const
export const HARNESS_WARNING_MISSING_TEMPLATE =
  "Selected harness template is unavailable; using the default compiler flow." as const

export const SUPPORTED_HARNESS_PLACEHOLDERS = [
  "title",
  "originalInput",
  "scenario",
  "targetAgent",
  "projectContext",
  "techStack",
  "constraints",
  "acceptanceCriteria",
  "validationCommands",
  "additionalNotes",
] as const

type HarnessPlaceholder = (typeof SUPPORTED_HARNESS_PLACEHOLDERS)[number]

type RenderHarnessTemplateInput = {
  readonly templateBody: string
  readonly requiredFields?: string | null
  readonly values: PromptCompilerInput
}

type RenderHarnessTemplateResult = {
  readonly content: string
  readonly warnings: readonly string[]
}

function isSupportedPlaceholder(value: string): value is HarnessPlaceholder {
  switch (value) {
    case "title":
    case "originalInput":
    case "scenario":
    case "targetAgent":
    case "projectContext":
    case "techStack":
    case "constraints":
    case "acceptanceCriteria":
    case "validationCommands":
    case "additionalNotes":
      return true
    default:
      return false
  }
}

function valueForPlaceholder(field: HarnessPlaceholder, values: PromptCompilerInput): string {
  switch (field) {
    case "title":
      return values.title ?? ""
    case "originalInput":
      return values.originalInput
    case "scenario":
      return values.scenario
    case "targetAgent":
      return values.targetAgent
    case "projectContext":
      return values.projectContext ?? ""
    case "techStack":
      return values.techStack ?? ""
    case "constraints":
      return values.constraints ?? ""
    case "acceptanceCriteria":
      return values.acceptanceCriteria ?? ""
    case "validationCommands":
      return values.validationCommands ?? ""
    case "additionalNotes":
      return values.additionalNotes ?? ""
  }
}

function requiredPlaceholderSet(
  requiredFields: string | null | undefined,
): ReadonlySet<HarnessPlaceholder> {
  if (requiredFields === undefined || requiredFields === null) {
    return new Set()
  }

  try {
    const parsed: unknown = JSON.parse(requiredFields)

    if (!Array.isArray(parsed)) {
      return new Set()
    }

    const required = new Set<HarnessPlaceholder>()

    for (const field of parsed) {
      if (typeof field === "string" && isSupportedPlaceholder(field)) {
        required.add(field)
      }
    }

    return required
  } catch (error) {
    if (error instanceof SyntaxError) {
      return new Set()
    }

    throw error
  }
}

export function renderHarnessTemplate(
  input: RenderHarnessTemplateInput,
): RenderHarnessTemplateResult {
  const warnings: string[] = []
  const requiredFields = requiredPlaceholderSet(input.requiredFields)
  const content = input.templateBody.replace(/\{\{[^{}]*\}\}/g, (placeholder) => {
    const field = placeholder.slice(2, -2)

    if (!isSupportedPlaceholder(field)) {
      warnings.push(`${HARNESS_WARNING_UNKNOWN_PLACEHOLDER}: ${placeholder}`)
      return placeholder
    }

    const value = valueForPlaceholder(field, input.values)

    if (requiredFields.has(field) && value.trim().length === 0) {
      warnings.push(`${HARNESS_WARNING_REQUIRED_FIELD_EMPTY}: ${field}`)
    }

    return value
  })

  return { content, warnings }
}
