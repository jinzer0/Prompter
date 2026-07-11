import { scenarioLabel, targetAgentLabel } from "../prompter-options"
import { bulletList, nonEmptyLines, paragraph, titleFromInput } from "./formatters"
import {
  HARNESS_WARNING_MISSING_TEMPLATE,
  renderHarnessTemplate,
} from "./harness-template-renderer"
import {
  agentInstructions,
  baseWorkingInstructions,
  defaultConstraints,
  defaultOutOfScope,
  defaultValidation,
  scenarioAcceptanceCriteria,
  scenarioTaskLines,
} from "./templates"
import type { CompiledPromptResult, LoadedHarnessTemplate, PromptCompilerInput } from "./types"

const PROJECT_CONTEXT_PROFILE_UNAVAILABLE_WARNING =
  "Selected project context profile is unavailable; profile context was excluded."

function qualityScore(input: PromptCompilerInput): number {
  const optionalFields = [
    input.projectContext,
    input.techStack,
    input.constraints,
    input.acceptanceCriteria,
    input.validationCommands,
    input.additionalNotes,
  ]
  const filledCount = optionalFields.filter((value) => (value ?? "").trim().length > 0).length
  return Math.min(5, Math.max(1, 2 + filledCount))
}

function projectContextProfileWarnings(input: PromptCompilerInput): readonly string[] {
  if (input.includeProjectContextProfile !== true) {
    return []
  }

  const buildResult = input.projectContextProfileBuildResult

  if (buildResult === undefined || buildResult === null) {
    return [PROJECT_CONTEXT_PROFILE_UNAVAILABLE_WARNING]
  }

  if (buildResult.context === null) {
    return buildResult.warnings.length === 0
      ? [PROJECT_CONTEXT_PROFILE_UNAVAILABLE_WARNING]
      : buildResult.warnings
  }

  return buildResult.warnings
}

function projectContextProfileContext(input: PromptCompilerInput): string | null {
  if (input.includeProjectContextProfile !== true) {
    return null
  }

  return input.projectContextProfileBuildResult?.context ?? null
}

function defaultContextSection(input: PromptCompilerInput): string {
  const profileContext = projectContextProfileContext(input)
  const manualContext = [input.projectContext, input.techStack, input.additionalNotes]
    .filter(Boolean)
    .join("\n")

  if (profileContext === null) {
    return paragraph(manualContext, "No additional context provided.")
  }

  if (manualContext.trim().length === 0) {
    return profileContext
  }

  return [profileContext, "", paragraph(manualContext, "")].join("\n")
}

export function compileStaticPrompt(
  input: PromptCompilerInput,
  selectedHarness?: LoadedHarnessTemplate | null,
): CompiledPromptResult {
  const originalInput = input.originalInput
  const title = titleFromInput(input.title, originalInput)
  const constraints = nonEmptyLines(input.constraints)
  const acceptanceCriteria = nonEmptyLines(input.acceptanceCriteria)
  const validationCommands = nonEmptyLines(input.validationCommands)
  const effectiveConstraints = constraints.length === 0 ? defaultConstraints : constraints
  const effectiveAcceptanceCriteria =
    acceptanceCriteria.length === 0
      ? scenarioAcceptanceCriteria[input.scenario]
      : acceptanceCriteria
  const effectiveValidationCommands =
    validationCommands.length === 0 ? defaultValidation : validationCommands
  const assumptions = [
    "The prompt is generated from a static local template without LLM analysis.",
    "The receiving agent can inspect the target repository before editing.",
  ]

  const profileWarnings = projectContextProfileWarnings(input)
  const baseResult = {
    title,
    originalInput,
    scenario: input.scenario,
    targetAgent: input.targetAgent,
    assumptions,
    acceptanceCriteria: effectiveAcceptanceCriteria,
    validationCommands: effectiveValidationCommands,
    qualityScore: qualityScore(input),
  }

  if (selectedHarness !== undefined && selectedHarness !== null) {
    const rendered = renderHarnessTemplate({
      templateBody: selectedHarness.templateBody,
      requiredFields: selectedHarness.requiredFields,
      values: input,
    })

    return {
      ...baseResult,
      compiledPrompt: rendered.content,
      warnings: rendered.warnings,
    }
  }

  const compiledPrompt = [
    "# Objective",
    originalInput,
    "",
    "# Context",
    defaultContextSection(input),
    "",
    "# Task",
    bulletList(scenarioTaskLines[input.scenario]),
    "",
    "# Scope",
    "## In scope",
    bulletList([
      `Scenario: ${scenarioLabel(input.scenario)}`,
      `Target agent: ${targetAgentLabel(input.targetAgent)}`,
    ]),
    "",
    "## Out of scope",
    bulletList(defaultOutOfScope),
    "",
    "# Constraints",
    bulletList(effectiveConstraints),
    "",
    "# Acceptance Criteria",
    bulletList(effectiveAcceptanceCriteria),
    "",
    "# Validation",
    bulletList(effectiveValidationCommands),
    "",
    "# Working Instructions",
    bulletList([...baseWorkingInstructions, ...agentInstructions[input.targetAgent]]),
    "",
    "# Final Response Format",
    "1. Summary of changes",
    "2. Files changed",
    "3. How to test",
    "4. Assumptions",
    "5. Follow-up work, if any",
  ].join("\n")

  if (input.harnessTemplateId !== undefined && input.harnessTemplateId !== null) {
    return {
      compiledPrompt,
      ...baseResult,
      warnings: [HARNESS_WARNING_MISSING_TEMPLATE, ...profileWarnings],
    }
  }

  if (profileWarnings.length > 0) {
    return {
      compiledPrompt,
      ...baseResult,
      warnings: profileWarnings,
    }
  }

  return {
    compiledPrompt,
    ...baseResult,
  }
}
