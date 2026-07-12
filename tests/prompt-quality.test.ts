import { describe, expect, it } from "vitest"

import "./prompt-quality-reviewer.test"
import "./prompt-quality-service.test"

import {
  applyPromptQualityScoreToVersionInputSchema,
  getLatestPromptQualityReviewInputSchema,
  getPromptQualityReviewInputSchema,
  listPromptQualityReviewsForVersionInputSchema,
  PERSISTENCE_CHANNELS,
  promptCompilerCompileOutputSchema,
  promptQualityDimensionScoresSchema,
  promptQualityGradeSchema,
  promptQualityIssueSchema,
  promptQualityReviewModeSchema,
  promptQualityReviewResultSchema,
  promptQualityReviewSnapshotSchema,
  promptQualitySuggestionSchema,
  promptVersionSchema,
  responseSchemas,
  reviewPromptQualityDraftInputSchema,
  reviewPromptQualityVersionInputSchema,
  savePromptQualityReviewInputSchema,
} from "../electron/ipc-contract"
import type { PromptQualityGrade } from "../electron/ipc-types"
import {
  ambiguityRiskDisplay,
  ambiguityRiskThresholds,
  promptQualityDimensionLabels,
  promptQualityGradeForScore,
  promptQualityGradeThresholds,
} from "../electron/prompt-quality-contract"

const promptVersionId = "22222222-2222-4222-8222-222222222222"
const reviewId = "33333333-3333-4333-8333-333333333333"
const reviewSnapshot = {
  compiledPrompt: "# Objective\n\nDefine the expected change.",
  originalInput: "Improve the prompt instructions.",
  scenario: "feature",
  targetAgent: "codex",
  harnessTemplateId: null,
  projectContextProfileId: null,
  includeProjectContextProfile: false,
  projectContext: null,
  constraints: "Preserve the existing public contract.",
  acceptanceCriteria: "The new behavior is covered by tests.",
  validationCommands: "npm test",
} as const
const reviewResult = {
  id: reviewId,
  source: "prompt_version",
  promptVersionId,
  reviewMode: "local",
  overallScore: 82,
  grade: "good",
  dimensionScores: {
    clarity: 88,
    context: 78,
    scope: 84,
    constraints: 81,
    acceptanceCriteria: 85,
    validation: 76,
    safety: 90,
    ambiguityRisk: 20,
  },
  strengths: ["The objective is explicit."],
  issues: [
    {
      id: "validation-detail",
      severity: "medium",
      title: "Validation needs more detail",
      description: "The validation command does not name a focused test.",
      evidence: "npm test",
    },
  ],
  suggestions: [
    {
      id: "add-focused-test",
      priority: "medium",
      title: "Add a focused validation command",
      description: "Name the relevant test file in the validation instructions.",
    },
  ],
  missingSections: [],
  warnings: [],
  recommendedClarifyingQuestions: [],
  scoreExplanation: "The prompt is clear but needs more focused validation guidance.",
  snapshot: reviewSnapshot,
  createdAt: 1,
  improvedPromptDraft: null,
} as const
const qualityGradeBoundaries = [
  { score: 95, grade: "excellent" },
  { score: 90, grade: "excellent" },
  { score: 89, grade: "good" },
  { score: 80, grade: "good" },
  { score: 75, grade: "good" },
  { score: 74, grade: "needs_work" },
  { score: 65, grade: "needs_work" },
  { score: 60, grade: "needs_work" },
  { score: 59, grade: "weak" },
  { score: 50, grade: "weak" },
  { score: 40, grade: "weak" },
  { score: 39, grade: "weak" },
  { score: 20, grade: "weak" },
] as const satisfies readonly { readonly score: number; readonly grade: PromptQualityGrade }[]

describe("Prompt quality review contracts", () => {
  it("maps every planned review-grade threshold", () => {
    // Given: review scores at every grade threshold and near-boundary value.
    for (const { score, grade } of qualityGradeBoundaries) {
      // When: the renderer-safe score utility derives the review grade.
      const actualGrade = promptQualityGradeForScore(score)

      // Then: the grade follows the 90/75/60/0 lower-bound threshold policy.
      expect(actualGrade).toBe(grade)
    }

    expect(promptQualityGradeThresholds).toEqual({
      excellent: 90,
      good: 75,
      needs_work: 60,
      weak: 0,
    })
  })

  it("keeps ambiguity risk separate from positive quality dimensions", () => {
    // Given: a high ambiguity-risk score and the renderer-facing labels.
    const display = ambiguityRiskDisplay(80)

    // When: the renderer formats the risk score.

    // Then: a higher score is explicitly high risk, not higher quality.
    expect(display).toEqual({ level: "high", label: "High ambiguity risk" })
    expect(ambiguityRiskThresholds).toEqual({ medium: 40, high: 75 })
    expect(promptQualityDimensionLabels).not.toHaveProperty("ambiguityRisk")
  })

  it("keeps compiler, persisted, and review score field names distinct", () => {
    // Given: score values from the three distinct prompt-quality contexts.

    // When: each IPC schema exposes its score field.

    // Then: compiler and persisted scores remain qualityScore while review uses overallScore.
    expect(promptCompilerCompileOutputSchema.shape).toHaveProperty("qualityScore")
    expect(promptVersionSchema.shape).toHaveProperty("qualityScore")
    expect(promptQualityReviewResultSchema.shape).toHaveProperty("overallScore")
    expect(promptQualityReviewResultSchema.shape).not.toHaveProperty("qualityScore")
  })

  it("defines narrow future prompt-quality channel names", () => {
    expect(PERSISTENCE_CHANNELS).toMatchObject({
      reviewPromptQualityDraft: "prompter:prompt-quality:review-draft",
      reviewPromptQualityVersion: "prompter:prompt-quality:review-version",
      savePromptQualityReview: "prompter:prompt-quality:save-review",
      listPromptQualityReviewsForVersion: "prompter:prompt-quality:list-for-version",
      getLatestPromptQualityReview: "prompter:prompt-quality:get-latest",
      getPromptQualityReview: "prompter:prompt-quality:get",
      applyPromptQualityScoreToVersion: "prompter:prompt-quality:apply-score-to-version",
    })
  })

  it("parses a saved prompt-version review result and every future response shape", () => {
    expect(promptQualityReviewResultSchema.parse(reviewResult)).toEqual(reviewResult)
    expect(responseSchemas.reviewPromptQualityDraft.parse({ ...reviewResult, id: null })).toEqual({
      ...reviewResult,
      id: null,
    })
    expect(responseSchemas.reviewPromptQualityVersion.parse(reviewResult)).toEqual(reviewResult)
    expect(responseSchemas.savePromptQualityReview.parse(reviewResult)).toEqual(reviewResult)
    expect(responseSchemas.listPromptQualityReviewsForVersion.parse([reviewResult])).toEqual([
      reviewResult,
    ])
    expect(responseSchemas.getLatestPromptQualityReview.parse(reviewResult)).toEqual(reviewResult)
    expect(responseSchemas.getPromptQualityReview.parse(reviewResult)).toEqual(reviewResult)
    expect(
      responseSchemas.applyPromptQualityScoreToVersion.parse({
        promptVersionId,
        qualityScore: 82,
      }),
    ).toEqual({ promptVersionId, qualityScore: 82 })
  })

  it("rejects invalid score, grade, severity, review mode, and malformed snapshot values", () => {
    expect(() =>
      promptQualityDimensionScoresSchema.parse({ ...reviewResult.dimensionScores, clarity: -1 }),
    ).toThrow()
    expect(() =>
      promptQualityDimensionScoresSchema.parse({ ...reviewResult.dimensionScores, safety: 101 }),
    ).toThrow()
    expect(() =>
      promptQualityDimensionScoresSchema.parse({ ...reviewResult.dimensionScores, scope: 80.5 }),
    ).toThrow()
    expect(() => promptQualityGradeSchema.parse("excellent_plus")).toThrow()
    expect(() =>
      promptQualityIssueSchema.parse({ ...reviewResult.issues[0], severity: "urgent" }),
    ).toThrow()
    expect(() =>
      promptQualitySuggestionSchema.parse({ ...reviewResult.suggestions[0], priority: "urgent" }),
    ).toThrow()
    expect(() => promptQualityReviewModeSchema.parse("automatic")).toThrow()
    expect(() =>
      promptQualityReviewSnapshotSchema.parse({ ...reviewSnapshot, scenario: "run" }),
    ).toThrow()
  })

  it("rejects blank compiled prompts and invalid prompt-version identifiers at the payload boundary", () => {
    expect(() =>
      reviewPromptQualityDraftInputSchema.parse({
        ...reviewSnapshot,
        compiledPrompt: "   ",
        reviewMode: "local",
      }),
    ).toThrow(/compiledPrompt/)
    expect(() =>
      reviewPromptQualityVersionInputSchema.parse({ promptVersionId: "", reviewMode: "local" }),
    ).toThrow(/promptVersionId/)
    expect(() =>
      savePromptQualityReviewInputSchema.parse({ promptVersionId: "", review: reviewResult }),
    ).toThrow(/promptVersionId/)
    expect(() =>
      listPromptQualityReviewsForVersionInputSchema.parse({ promptVersionId: "" }),
    ).toThrow(/promptVersionId/)
    expect(() => getLatestPromptQualityReviewInputSchema.parse({ promptVersionId: "" })).toThrow(
      /promptVersionId/,
    )
    expect(() => getPromptQualityReviewInputSchema.parse({ reviewId: "" })).toThrow(/reviewId/)
    expect(() =>
      applyPromptQualityScoreToVersionInputSchema.parse({
        promptVersionId,
        reviewId,
        qualityScore: 101,
      }),
    ).toThrow(/qualityScore/)
  })

  it("parses valid draft, version, save, list, latest, get, and explicit-score inputs", () => {
    expect(
      reviewPromptQualityDraftInputSchema.parse({ ...reviewSnapshot, reviewMode: "local" }),
    ).toMatchObject({ compiledPrompt: reviewSnapshot.compiledPrompt, reviewMode: "local" })
    expect(
      reviewPromptQualityVersionInputSchema.parse({ promptVersionId, reviewMode: "llm" }),
    ).toEqual({ promptVersionId, reviewMode: "llm" })
    expect(
      savePromptQualityReviewInputSchema.parse({ promptVersionId, review: reviewResult }),
    ).toEqual({
      promptVersionId,
      review: reviewResult,
    })
    expect(listPromptQualityReviewsForVersionInputSchema.parse({ promptVersionId })).toEqual({
      promptVersionId,
      limit: 50,
      offset: 0,
    })
    expect(getLatestPromptQualityReviewInputSchema.parse({ promptVersionId })).toEqual({
      promptVersionId,
    })
    expect(getPromptQualityReviewInputSchema.parse({ reviewId })).toEqual({ reviewId })
    expect(
      applyPromptQualityScoreToVersionInputSchema.parse({
        promptVersionId,
        reviewId,
        qualityScore: 82,
      }),
    ).toEqual({ promptVersionId, reviewId, qualityScore: 82 })
  })
})
