import { scenarioLabel, targetAgentLabel } from "../prompter-options"
import { bulletList, nonEmptyLines, paragraph, titleFromInput } from "./formatters"
import {
  agentInstructions,
  baseWorkingInstructions,
  defaultConstraints,
  defaultOutOfScope,
  defaultValidation,
  scenarioAcceptanceCriteria,
  scenarioTaskLines,
} from "./templates"
import type { CompiledPromptResult, PromptCompilerInput } from "./types"

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

export function compileStaticPrompt(input: PromptCompilerInput): CompiledPromptResult {
  const originalInput = input.originalInput.trim()
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

  const compiledPrompt = [
    "# Objective",
    originalInput,
    "",
    "# Context",
    paragraph(
      [input.projectContext, input.techStack, input.additionalNotes].filter(Boolean).join("\n"),
      "No additional context provided.",
    ),
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

  return {
    title,
    originalInput,
    compiledPrompt,
    scenario: input.scenario,
    targetAgent: input.targetAgent,
    assumptions,
    acceptanceCriteria: effectiveAcceptanceCriteria,
    validationCommands: effectiveValidationCommands,
    qualityScore: qualityScore(input),
  }
}
