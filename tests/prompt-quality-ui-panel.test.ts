import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type {
  ApplyPromptQualityScoreToVersionResult,
  PromptAsset,
  PromptQualityReviewResult,
  PromptVersion,
} from "../electron/ipc-types"
import {
  buildSavedPromptVersionQualitySnapshot,
  PromptQualityReviewPanel,
  promptQualityTopBlockers,
} from "../renderer/src/components/quality/prompt-quality-review-panel"
import { promptQualityActionState } from "../renderer/src/hooks/prompt-quality-state"

const promptVersionId = "22222222-2222-4222-8222-222222222222"
const reviewId = "33333333-3333-4333-8333-333333333333"

const selectedAsset = {
  id: "11111111-1111-4111-8111-111111111111",
  projectId: "44444444-4444-4444-8444-444444444444",
  title: "Quality reviewer",
  scenario: "feature",
  targetAgent: "codex",
  currentVersionId: promptVersionId,
  parentPromptId: null,
  parentPromptVersionId: null,
  derivationType: null,
  createdAt: 1,
  updatedAt: 2,
} satisfies PromptAsset

const selectedVersion = {
  id: promptVersionId,
  promptAssetId: selectedAsset.id,
  versionNumber: 2,
  originalInput: "Add saved prompt version quality review.",
  compiledPrompt: "# Objective\n\nAdd a saved-version-only review panel.",
  assumptions: '["Use existing wrappers"]',
  questions: '[{"question":"Where?","answer":"Version detail"}]',
  answers: '["Use local review"]',
  acceptanceCriteria: "Shows grade\nShows blockers",
  validationCommands: "npx vitest run tests/prompt-quality-ui-panel.test.ts",
  qualityScore: 80,
  createdAt: 3,
} satisfies PromptVersion

const snapshot = buildSavedPromptVersionQualitySnapshot({
  selectedAsset,
  selectedVersion,
})

const savedReview = {
  id: reviewId,
  source: "prompt_version",
  promptVersionId,
  reviewMode: "local",
  overallScore: 82,
  grade: "good",
  dimensionScores: {
    clarity: 86,
    context: 78,
    scope: 84,
    constraints: 81,
    acceptanceCriteria: 72,
    validation: 65,
    safety: 90,
    ambiguityRisk: 82,
  },
  strengths: ["The objective is explicit."],
  issues: [
    {
      id: "missing-validation-detail",
      severity: "high",
      title: "Validation is too thin",
      description: "The prompt needs concrete validation evidence.",
      evidence: "npx vitest run",
    },
  ],
  suggestions: [
    {
      id: "add-edge-case",
      priority: "high",
      title: "Add edge case acceptance criteria",
      description: "Name the failure case that must be tested.",
    },
  ],
  missingSections: ["Final Response Format"],
  warnings: ["Clarify score provenance before export."],
  recommendedClarifyingQuestions: ["Should saved review scores appear in exports?"],
  scoreExplanation: "The saved version is usable but needs validation depth.",
  snapshot,
  createdAt: 1_700_000_000_000,
  improvedPromptDraft: null,
} satisfies PromptQualityReviewResult

const appliedScore = {
  promptVersionId,
  qualityScore: savedReview.overallScore,
} satisfies ApplyPromptQualityScoreToVersionResult

function noop(): void {}

describe("saved prompt version quality panel", () => {
  it("builds the same saved-version snapshot shape as the main-process service", () => {
    expect(snapshot).toEqual({
      compiledPrompt: selectedVersion.compiledPrompt,
      originalInput: selectedVersion.originalInput,
      scenario: selectedAsset.scenario,
      targetAgent: selectedAsset.targetAgent,
      harnessTemplateId: null,
      projectContextProfileId: null,
      includeProjectContextProfile: false,
      projectContext: null,
      constraints:
        '## Assumptions\n["Use existing wrappers"]\n\n## Questions\n[{"question":"Where?","answer":"Version detail"}]\n\n## Answers\n["Use local review"]',
      acceptanceCriteria: selectedVersion.acceptanceCriteria,
      validationCommands: selectedVersion.validationCommands,
    })
  })

  it("surfaces blockers from issues, missing sections, warnings, and suggestions", () => {
    expect(promptQualityTopBlockers(savedReview)).toEqual([
      "Validation is too thin",
      "Missing section: Final Response Format",
      "Warning: Clarify score provenance before export.",
      "Suggestion: Add edge case acceptance criteria",
    ])
  })

  it("renders unreviewed saved versions with explicit local, save, and apply buttons", () => {
    const actionState = promptQualityActionState({
      currentSnapshot: snapshot,
      operation: "idle",
      promptVersionId,
      review: null,
    })

    const markup = renderToStaticMarkup(
      createElement(PromptQualityReviewPanel, {
        actionState,
        appliedScore: null,
        error: null,
        llmResult: null,
        operation: "idle",
        review: null,
        versionQualityScore: null,
        onApplyScore: noop,
        onClearError: noop,
        onRunLLMReview: noop,
        onReviewVersionLocally: noop,
        onSaveReview: noop,
      }),
    )

    expect(markup).toContain("Prompt quality review")
    expect(markup).toContain("Unreviewed")
    expect(markup).toContain("Review saved version locally")
    expect(markup).toContain("Save review")
    expect(markup).toContain("Apply review score")
    expect(markup).toContain("Optional LLM review")
    expect(markup).toContain("Reviews instructions only")
    expect(markup).toContain("may send prompt text to OpenAI")
    expect(markup).toContain("Applied quality review score: Not applied")
  })

  it("renders a saved latest review without conflating review score and applied score", () => {
    const actionState = promptQualityActionState({
      currentSnapshot: snapshot,
      operation: "idle",
      promptVersionId,
      review: savedReview,
    })

    const markup = renderToStaticMarkup(
      createElement(PromptQualityReviewPanel, {
        actionState,
        appliedScore,
        error: null,
        llmResult: null,
        operation: "idle",
        review: savedReview,
        versionQualityScore: selectedVersion.qualityScore,
        onApplyScore: noop,
        onClearError: noop,
        onRunLLMReview: noop,
        onReviewVersionLocally: noop,
        onSaveReview: noop,
      }),
    )

    expect(markup).toContain("Saved review")
    expect(markup).toContain("Local review")
    expect(markup).toContain("Review result score: 82")
    expect(markup).toContain("Applied quality review score: 82")
    expect(markup).toContain("Previous applied score on saved version: 80")
    expect(markup).toContain("Good")
    expect(markup).toContain("High ambiguity risk")
    expect(markup).toContain("Validation is too thin")
    expect(markup).toContain("Missing section: Final Response Format")
    expect(markup).toContain("Review details")
  })

  it("does not infer that an unsaved matching review score has been applied", () => {
    const unsavedReview = {
      ...savedReview,
      id: null,
      overallScore: selectedVersion.qualityScore,
    } satisfies PromptQualityReviewResult
    const actionState = promptQualityActionState({
      currentSnapshot: snapshot,
      operation: "idle",
      promptVersionId,
      review: unsavedReview,
    })

    const markup = renderToStaticMarkup(
      createElement(PromptQualityReviewPanel, {
        actionState,
        appliedScore: null,
        error: null,
        llmResult: null,
        operation: "idle",
        review: unsavedReview,
        versionQualityScore: selectedVersion.qualityScore,
        onApplyScore: noop,
        onClearError: noop,
        onRunLLMReview: noop,
        onReviewVersionLocally: noop,
        onSaveReview: noop,
      }),
    )

    expect(markup).toContain("Applied quality review score: Not applied")
    expect(markup).toContain("Previous applied score on saved version: 80")
  })
})
