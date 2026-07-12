import type { PromptQualityReviewResult } from "../ipc-types.js"
import { promptQualityGradeForScore } from "../prompt-quality-contract.js"
import {
  analyzeCompiledPromptSections,
  type RequiredSection,
  requiredSectionDetails,
  type SectionAnalysis,
  sectionHasContent,
  sectionIsMeaningful,
  sectionText,
} from "./section-analysis.js"

type Issue = PromptQualityReviewResult["issues"][number]
type Suggestion = PromptQualityReviewResult["suggestions"][number]

type LocalPromptQualityReviewInput = {
  readonly snapshot: PromptQualityReviewResult["snapshot"]
  readonly createdAt: number
  readonly source?: PromptQualityReviewResult["source"]
  readonly promptVersionId?: string | null
}

const broadLanguage =
  /알아서|전부|모두|완벽하게|everything|anything|whatever(?: is needed)?|perfect(?:ly)?|as appropriate|figure it out|handle it all|do it all/iu
const vagueAcceptanceLanguage =
  /알아서|전부|모두|완벽하게|appropriate|high quality|everything|anything|perfect(?:ly)?|as appropriate|figure it out/iu
const measurableCriterion =
  /\b(?:must|must not|returns?|includes?|passes?|does not|within|at least|exactly|no regression)\b|\d|해야|반환|포함|통과|이내/iu
const validationCommand =
  /\b(?:npx|npm|pnpm|bun|yarn|vitest|jest|pytest|cargo|go test|make|gradle|mvn|biome|tsc|typecheck|lint)\b/iu
const boundaryLanguage =
  /\b(?:do not|must not|never|without|avoid|preserve|out of scope|forbidden|prohibit)\b|금지|하지 마|제외/iu

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)))
}

function sectionSlug(heading: RequiredSection): string {
  return heading.slice(2).toLowerCase().replaceAll(" ", "-")
}

function evidenceSnippet(text: string, pattern?: RegExp): string {
  const line = text
    .split(/\r?\n/)
    .find((candidate) =>
      pattern === undefined ? candidate.trim().length > 0 : pattern.test(candidate),
    )

  return (line ?? text).trim().slice(0, 240)
}

function missingIssue(section: SectionAnalysis): Issue {
  const detail = requiredSectionDetails[section.heading]
  const empty = section.text !== null

  return {
    id: `${empty ? "empty" : "missing"}-${sectionSlug(section.heading)}`,
    severity:
      section.heading === "# Objective" ||
      section.heading === "# Acceptance Criteria" ||
      section.heading === "# Validation"
        ? "high"
        : "medium",
    title: empty ? `${detail.title} is empty` : `${detail.title} is missing`,
    description: empty
      ? `Replace boilerplate in ${section.heading} with actionable guidance.`
      : `Add the required ${section.heading} heading and actionable guidance.`,
    evidence: section.text === null ? `Expected heading: ${section.heading}` : section.heading,
  }
}

function missingSuggestion(section: SectionAnalysis): Suggestion {
  const detail = requiredSectionDetails[section.heading]

  return {
    id: `add-${sectionSlug(section.heading)}`,
    priority:
      section.heading === "# Objective" ||
      section.heading === "# Acceptance Criteria" ||
      section.heading === "# Validation"
        ? "high"
        : "medium",
    title: `Add ${detail.title}`,
    description: detail.question,
  }
}

export function reviewLocalPromptQuality(
  input: LocalPromptQualityReviewInput,
): PromptQualityReviewResult {
  const prompt = input.snapshot.compiledPrompt
  const sections = analyzeCompiledPromptSections(prompt)
  const issues: PromptQualityReviewResult["issues"] = []
  const suggestions: PromptQualityReviewResult["suggestions"] = []
  const missingSections: string[] = []
  const recommendedClarifyingQuestions: string[] = []

  for (const section of sections) {
    if (!section.hasMeaningfulContent) {
      missingSections.push(section.heading)
      issues.push(missingIssue(section))
      suggestions.push(missingSuggestion(section))
      recommendedClarifyingQuestions.push(requiredSectionDetails[section.heading].question)
    }
  }

  const acceptanceText = sectionText(sections, "# Acceptance Criteria")
  const validationText = sectionText(sections, "# Validation")
  const boundaryText = [
    sectionText(sections, "# Scope"),
    sectionText(sections, "# Constraints"),
    sectionText(sections, "# Working Instructions"),
  ].join("\n")
  const hasVagueAcceptance =
    sectionHasContent(sections, "# Acceptance Criteria") &&
    vagueAcceptanceLanguage.test(acceptanceText)
  const hasBroadInstructions = broadLanguage.test(prompt)
  const hasConcreteValidation = validationCommand.test(validationText)
  const hasBoundaries = boundaryLanguage.test(boundaryText)

  if (hasVagueAcceptance) {
    issues.push({
      id: "vague-acceptance-criteria",
      severity: "high",
      title: "Acceptance criteria are vague",
      description: "Replace subjective language with observable, testable completion criteria.",
      evidence: evidenceSnippet(acceptanceText, vagueAcceptanceLanguage),
    })
    suggestions.push({
      id: "make-acceptance-measurable",
      priority: "high",
      title: "Make acceptance criteria measurable",
      description:
        "State the expected result, boundary, or focused test for each completion criterion.",
    })
  }

  if (sectionHasContent(sections, "# Validation") && !hasConcreteValidation) {
    issues.push({
      id: "vague-validation",
      severity: "medium",
      title: "Validation lacks a focused command",
      description:
        "Name a concrete command, test file, typecheck, lint, build, or equivalent validation step.",
      evidence: evidenceSnippet(validationText),
    })
    suggestions.push({
      id: "add-validation-command",
      priority: "medium",
      title: "Add a focused validation command",
      description: "Specify the command or check that demonstrates the requested behavior.",
    })
  }

  if (hasBroadInstructions) {
    issues.push({
      id: "broad-instructions",
      severity: "medium",
      title: "Instructions are overly broad",
      description:
        "Replace open-ended language with explicit decisions, boundaries, and deliverables.",
      evidence: evidenceSnippet(prompt, broadLanguage),
    })
    suggestions.push({
      id: "narrow-instructions",
      priority: "medium",
      title: "Narrow broad instructions",
      description:
        "Name the intended outcome and what the receiving agent must not decide independently.",
    })
  }

  const clarity = clampScore(
    (sectionIsMeaningful(sections, "# Objective") ? 50 : 0) +
      (sectionIsMeaningful(sections, "# Task") ? 25 : 0) +
      (measurableCriterion.test(acceptanceText) ? 25 : 0) -
      (hasBroadInstructions ? 15 : 0),
  )
  const context = clampScore(
    (sectionIsMeaningful(sections, "# Context") ? 80 : 0) +
      (input.snapshot.projectContext?.trim().length ? 20 : 0),
  )
  const scope = clampScore(
    (sectionIsMeaningful(sections, "# Scope") ? 45 : 0) + (hasBoundaries ? 55 : 0),
  )
  const constraints = clampScore(
    (sectionIsMeaningful(sections, "# Constraints") ? 45 : 0) + (hasBoundaries ? 55 : 0),
  )
  const acceptanceCriteria = clampScore(
    (sectionIsMeaningful(sections, "# Acceptance Criteria") ? 45 : 0) +
      (measurableCriterion.test(acceptanceText) ? 55 : 0) -
      (hasVagueAcceptance ? 35 : 0),
  )
  const validation = clampScore(
    (sectionIsMeaningful(sections, "# Validation") ? 45 : 0) + (hasConcreteValidation ? 55 : 0),
  )
  const safety = clampScore(
    (sectionIsMeaningful(sections, "# Working Instructions") ? 20 : 0) + (hasBoundaries ? 80 : 0),
  )
  const overallScore = clampScore(
    (clarity + context + scope + constraints + acceptanceCriteria + validation + safety) / 7,
  )
  const ambiguityRisk = clampScore(
    5 +
      missingSections.length * 8 +
      (hasVagueAcceptance ? 20 : 0) +
      (hasBroadInstructions ? 20 : 0) +
      (hasConcreteValidation ? 0 : 16) +
      (hasBoundaries ? 0 : 15),
  )
  const strengths = [
    missingSections.length === 0 ? "All required compiled-prompt sections contain guidance." : null,
    hasConcreteValidation ? "Validation names a concrete command or check." : null,
    hasBoundaries ? "Scope, constraints, or working instructions define safety boundaries." : null,
  ].filter((strength): strength is string => strength !== null)
  const warnings = [
    hasBroadInstructions
      ? "Broad language can force the receiving agent to guess important decisions."
      : null,
    hasVagueAcceptance ? "Vague acceptance criteria make completion difficult to verify." : null,
  ].filter((warning): warning is string => warning !== null)
  const scoreExplanation =
    missingSections.length === 0
      ? `The prompt includes all required sections. Its ${overallScore}/100 score reflects explicit guidance, validation, and boundaries.`
      : `The prompt is missing or has boilerplate in ${missingSections.length} required section${missingSections.length === 1 ? "" : "s"}, which lowers the score to ${overallScore}/100.`

  return {
    id: null,
    source: input.source ?? "draft",
    promptVersionId: input.promptVersionId ?? null,
    reviewMode: "local",
    overallScore,
    grade: promptQualityGradeForScore(overallScore),
    dimensionScores: {
      clarity,
      context,
      scope,
      constraints,
      acceptanceCriteria,
      validation,
      safety,
      ambiguityRisk,
    },
    strengths,
    issues,
    suggestions,
    missingSections,
    warnings,
    recommendedClarifyingQuestions,
    scoreExplanation,
    snapshot: input.snapshot,
    createdAt: input.createdAt,
    improvedPromptDraft: null,
  }
}
