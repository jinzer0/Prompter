import { createElement, type ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type { PromptQualityReviewResult, PromptQualityReviewSnapshot } from "../electron/ipc-types"
import {
  createPromptQualitySnapshot,
  initialPromptQualityState,
  promptQualityActionState,
  promptQualitySnapshotIsCurrent,
  reducePromptQualityState,
} from "../renderer/src/hooks/prompt-quality-state"
import { usePromptQuality } from "../renderer/src/hooks/use-prompt-quality"

const promptVersionId = "22222222-2222-4222-8222-222222222222"
const reviewId = "33333333-3333-4333-8333-333333333333"

const snapshot = {
  compiledPrompt: "# Objective\n\nImplement the requested change.",
  originalInput: "Add a prompt quality review hook.",
  scenario: "feature",
  targetAgent: "codex",
  harnessTemplateId: "11111111-1111-4111-8111-111111111111",
  projectContextProfileId: "44444444-4444-4444-8444-444444444444",
  includeProjectContextProfile: true,
  projectContext: "Keep manual and profile context exact.",
  constraints: "Do not access Electron internals.",
  acceptanceCriteria: "Every stale field disables unsafe actions.",
  validationCommands: "npx vitest run tests/prompt-quality-renderer.test.ts",
} satisfies PromptQualityReviewSnapshot

const unsavedVersionReview = {
  id: null,
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
  issues: [],
  suggestions: [],
  missingSections: [],
  warnings: [],
  recommendedClarifyingQuestions: [],
  scoreExplanation: "The prompt is clear.",
  snapshot,
  createdAt: 1,
  improvedPromptDraft: null,
} satisfies PromptQualityReviewResult

const snapshotChanges = [
  {
    label: "compiled prompt whitespace",
    change: (current: PromptQualityReviewSnapshot) => ({
      ...current,
      compiledPrompt: `${current.compiledPrompt} `,
    }),
  },
  {
    label: "original input whitespace",
    change: (current: PromptQualityReviewSnapshot) => ({
      ...current,
      originalInput: `${current.originalInput} `,
    }),
  },
  {
    label: "scenario",
    change: (current: PromptQualityReviewSnapshot) => ({ ...current, scenario: "bugfix" }),
  },
  {
    label: "target agent",
    change: (current: PromptQualityReviewSnapshot) => ({
      ...current,
      targetAgent: "claude_code",
    }),
  },
  {
    label: "harness template id",
    change: (current: PromptQualityReviewSnapshot) => ({
      ...current,
      harnessTemplateId: null,
    }),
  },
  {
    label: "project context profile id",
    change: (current: PromptQualityReviewSnapshot) => ({
      ...current,
      projectContextProfileId: null,
    }),
  },
  {
    label: "included project context profile flag",
    change: (current: PromptQualityReviewSnapshot) => ({
      ...current,
      includeProjectContextProfile: false,
    }),
  },
  {
    label: "manual or profile context text",
    change: (current: PromptQualityReviewSnapshot) => ({
      ...current,
      projectContext: `${current.projectContext} `,
    }),
  },
  {
    label: "constraints",
    change: (current: PromptQualityReviewSnapshot) => ({
      ...current,
      constraints: `${current.constraints} `,
    }),
  },
  {
    label: "acceptance criteria",
    change: (current: PromptQualityReviewSnapshot) => ({
      ...current,
      acceptanceCriteria: `${current.acceptanceCriteria} `,
    }),
  },
  {
    label: "validation commands",
    change: (current: PromptQualityReviewSnapshot) => ({
      ...current,
      validationCommands: `${current.validationCommands} `,
    }),
  },
] satisfies readonly {
  readonly label: string
  readonly change: (current: PromptQualityReviewSnapshot) => PromptQualityReviewSnapshot
}[]

function PromptQualityProbe(): ReactElement {
  const quality = usePromptQuality({ currentSnapshot: snapshot, promptVersionId })

  return createElement(
    "span",
    null,
    `${quality.operation}:${quality.actionState.reviewSafetyStatus}`,
  )
}

describe("prompt quality renderer state", () => {
  it("initializes without accessing the renderer bridge or starting a review", () => {
    expect(renderToStaticMarkup(createElement(PromptQualityProbe))).toBe(
      "<span>idle:unreviewed</span>",
    )
  })

  it("creates an exact review snapshot without normalizing prompt-bearing fields", () => {
    const result = createPromptQualitySnapshot({
      ...snapshot,
      compiledPrompt: "\n  Keep compiled whitespace.  \n",
      originalInput: "\n  Keep original whitespace.  \n",
      projectContext: "\n  Keep context whitespace.  \n",
    })

    expect(result).toEqual({
      ...snapshot,
      compiledPrompt: "\n  Keep compiled whitespace.  \n",
      originalInput: "\n  Keep original whitespace.  \n",
      projectContext: "\n  Keep context whitespace.  \n",
    })
  })

  it("keeps byte-for-byte identical review snapshots current", () => {
    expect(promptQualitySnapshotIsCurrent(snapshot, createPromptQualitySnapshot(snapshot))).toBe(
      true,
    )
  })

  it.each(snapshotChanges)("marks a review stale when $label changes", ({ change }) => {
    expect(promptQualitySnapshotIsCurrent(snapshot, change(snapshot))).toBe(false)
  })

  it("allows explicit save only for a fresh unsaved review of a saved prompt version", () => {
    const actions = promptQualityActionState({
      currentSnapshot: snapshot,
      operation: "idle",
      promptVersionId,
      review: unsavedVersionReview,
    })

    expect(actions.reviewSafetyStatus).toBe("current_review")
    expect(actions.saveReview.isEnabled).toBe(true)
    expect(actions.applyScore.isEnabled).toBe(false)
    expect(actions.useImprovedPromptAsCurrent.isEnabled).toBe(false)
  })

  it("enables score application and current improvement only after a fresh review is saved", () => {
    const actions = promptQualityActionState({
      currentSnapshot: snapshot,
      operation: "idle",
      promptVersionId,
      review: { ...unsavedVersionReview, id: reviewId, improvedPromptDraft: "Improved prompt" },
    })

    expect(actions.saveReview.isEnabled).toBe(false)
    expect(actions.applyScore.isEnabled).toBe(true)
    expect(actions.useImprovedPromptAsCurrent.isEnabled).toBe(true)
  })

  it("disables save, apply, and current improvement for invalid, unsaved, or stale sources", () => {
    const savedReview = { ...unsavedVersionReview, id: reviewId, improvedPromptDraft: "Improved" }
    const unsafeContexts = [
      {
        currentSnapshot: { ...snapshot, compiledPrompt: " \t" },
        promptVersionId,
        review: { ...savedReview, snapshot: { ...snapshot, compiledPrompt: " \t" } },
      },
      {
        currentSnapshot: snapshot,
        promptVersionId: null,
        review: savedReview,
      },
      {
        currentSnapshot: { ...snapshot, originalInput: `${snapshot.originalInput} ` },
        promptVersionId,
        review: savedReview,
      },
    ] as const

    for (const context of unsafeContexts) {
      const actions = promptQualityActionState({ ...context, operation: "idle" })

      expect(actions.saveReview.isEnabled).toBe(false)
      expect(actions.applyScore.isEnabled).toBe(false)
      expect(actions.useImprovedPromptAsCurrent.isEnabled).toBe(false)
    }
  })

  it("tracks explicit operation transitions and clears errors after success", () => {
    const loading = reducePromptQualityState(initialPromptQualityState, {
      kind: "operation_started",
      operation: "loading_latest_review",
    })
    const failed = reducePromptQualityState(loading, {
      kind: "operation_failed",
      message: "Latest review could not be loaded.",
    })
    const completed = reducePromptQualityState(failed, {
      kind: "review_received",
      review: unsavedVersionReview,
    })

    expect(loading.operation).toBe("loading_latest_review")
    expect(failed.error).toBe("Latest review could not be loaded.")
    expect(completed.operation).toBe("idle")
    expect(completed.error).toBeNull()
    expect(completed.review).toEqual(unsavedVersionReview)
  })
})
