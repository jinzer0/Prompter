import type { promptQualityDimensionScoresSchema } from "./ipc-contract.js"
import type { PromptQualityGrade } from "./ipc-types.js"

export type PromptQualityPositiveDimension = Exclude<
  keyof (typeof promptQualityDimensionScoresSchema)["shape"],
  "ambiguityRisk"
>
export type AmbiguityRiskLevel = "low" | "medium" | "high"
export type AmbiguityRiskDisplay = {
  readonly level: AmbiguityRiskLevel
  readonly label: string
}

export const promptQualityGradeThresholds = {
  excellent: 90,
  good: 75,
  needs_work: 60,
  weak: 0,
} as const satisfies Record<PromptQualityGrade, number>

export const promptQualityDimensionLabels = {
  clarity: "Clarity",
  context: "Context",
  scope: "Scope",
  constraints: "Constraints",
  acceptanceCriteria: "Acceptance criteria",
  validation: "Validation",
  safety: "Safety",
} as const satisfies Record<PromptQualityPositiveDimension, string>

export const ambiguityRiskThresholds = {
  medium: 40,
  high: 75,
} as const satisfies Record<Exclude<AmbiguityRiskLevel, "low">, number>

const ambiguityRiskLabels = {
  low: "Low ambiguity risk",
  medium: "Medium ambiguity risk",
  high: "High ambiguity risk",
} as const satisfies Record<AmbiguityRiskLevel, string>

export function promptQualityGradeForScore(overallScore: number): PromptQualityGrade {
  if (overallScore >= promptQualityGradeThresholds.excellent) {
    return "excellent"
  }

  if (overallScore >= promptQualityGradeThresholds.good) {
    return "good"
  }

  if (overallScore >= promptQualityGradeThresholds.needs_work) {
    return "needs_work"
  }

  return "weak"
}

export function ambiguityRiskDisplay(ambiguityRisk: number): AmbiguityRiskDisplay {
  const level =
    ambiguityRisk >= ambiguityRiskThresholds.high
      ? "high"
      : ambiguityRisk >= ambiguityRiskThresholds.medium
        ? "medium"
        : "low"

  return { level, label: ambiguityRiskLabels[level] }
}
