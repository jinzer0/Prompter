import type {
  PromptAsset,
  PromptQualityReviewMode,
  PromptQualityReviewResult,
  PromptQualityReviewSnapshot,
  PromptVersion,
} from "../../../../electron/ipc-types"
import {
  ambiguityRiskDisplay,
  promptQualityDimensionLabels,
} from "../../../../electron/prompt-quality-contract"

export type SavedPromptVersionQualitySnapshotInput = {
  readonly selectedAsset: PromptAsset
  readonly selectedVersion: PromptVersion
}

export type PromptQualityBlocker = {
  readonly key: string
  readonly label: string
}

export type PromptQualityDimensionRow = {
  readonly key: string
  readonly label: string
  readonly score: number
}

const modeLabels = {
  local: "Local review",
  llm: "LLM review",
} as const satisfies Record<PromptQualityReviewMode, string>

const gradeLabels = {
  excellent: "Excellent",
  good: "Good",
  needs_work: "Needs work",
  weak: "Weak",
} as const satisfies Record<PromptQualityReviewResult["grade"], string>

const issueSeverityRank = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
} as const satisfies Record<PromptQualityReviewResult["issues"][number]["severity"], number>

const dimensionKeys = [
  "clarity",
  "context",
  "scope",
  "constraints",
  "acceptanceCriteria",
  "validation",
  "safety",
] as const satisfies readonly (keyof typeof promptQualityDimensionLabels)[]

function savedVersionContext(version: PromptVersion): string | null {
  const entries = [
    ["Assumptions", version.assumptions],
    ["Questions", version.questions],
    ["Answers", version.answers],
  ] as const
  const sections = entries.flatMap(([label, value]) =>
    value === null ? [] : [`## ${label}\n${value}`],
  )

  return sections.length === 0 ? null : sections.join("\n\n")
}

export function buildSavedPromptVersionQualitySnapshot({
  selectedAsset,
  selectedVersion,
}: SavedPromptVersionQualitySnapshotInput): PromptQualityReviewSnapshot {
  return {
    compiledPrompt: selectedVersion.compiledPrompt,
    originalInput: selectedVersion.originalInput,
    scenario: selectedAsset.scenario,
    targetAgent: selectedAsset.targetAgent,
    harnessTemplateId: null,
    projectContextProfileId: null,
    includeProjectContextProfile: false,
    projectContext: null,
    constraints: savedVersionContext(selectedVersion),
    acceptanceCriteria: selectedVersion.acceptanceCriteria,
    validationCommands: selectedVersion.validationCommands,
  }
}

export function promptQualityModeLabel(mode: PromptQualityReviewMode): string {
  return modeLabels[mode]
}

export function promptQualityGradeLabel(grade: PromptQualityReviewResult["grade"]): string {
  return gradeLabels[grade]
}

export function promptQualityRiskLabel(review: PromptQualityReviewResult): string {
  return ambiguityRiskDisplay(review.dimensionScores.ambiguityRisk).label
}

export function promptQualityDimensionRows(
  review: PromptQualityReviewResult,
): readonly PromptQualityDimensionRow[] {
  return dimensionKeys.map((key) => ({
    key,
    label: promptQualityDimensionLabels[key],
    score: review.dimensionScores[key],
  }))
}

export function promptQualityTopBlockers(review: PromptQualityReviewResult): readonly string[] {
  const issueBlockers = [...review.issues]
    .sort((left, right) => issueSeverityRank[left.severity] - issueSeverityRank[right.severity])
    .map((issue) => issue.title)
  const missingSectionBlockers = review.missingSections.map(
    (section) => `Missing section: ${section}`,
  )
  const warningBlockers = review.warnings.map((warning) => `Warning: ${warning}`)
  const suggestionBlockers = review.suggestions.map(
    (suggestion) => `Suggestion: ${suggestion.title}`,
  )

  return [
    ...issueBlockers,
    ...missingSectionBlockers,
    ...warningBlockers,
    ...suggestionBlockers,
  ].slice(0, 4)
}
