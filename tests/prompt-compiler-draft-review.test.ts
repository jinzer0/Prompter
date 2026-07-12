import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type { PromptQualityReviewResult, PromptQualityReviewSnapshot } from "../electron/ipc-types"
import { PromptCompilerDraftReview } from "../renderer/src/components/prompt-compiler-draft-review"
import type {
  CompiledPromptResult,
  PromptCompilerInput,
} from "../renderer/src/lib/prompt-compiler/types"
import {
  createDraftPromptQualitySnapshot,
  draftPromptQualityReviewStatus,
} from "../renderer/src/lib/prompt-quality-draft-review"

const compiled = {
  title: "Compiled",
  originalInput: "Original from compile result",
  compiledPrompt: "Compiled from generator",
  scenario: "feature",
  targetAgent: "codex",
  assumptions: [],
  acceptanceCriteria: [],
  validationCommands: [],
  qualityScore: 4,
} satisfies CompiledPromptResult

const draft = {
  originalInput: "  Keep original input exact.  ",
  scenario: "bugfix",
  targetAgent: "claude_code",
  harnessTemplateId: "11111111-1111-4111-8111-111111111111",
  projectContextProfileId: "22222222-2222-4222-8222-222222222222",
  includeProjectContextProfile: true,
  projectContext: "  Manual context stays exact.  ",
  constraints: "  Constraint text stays exact.  ",
  acceptanceCriteria: "  Acceptance text stays exact.  ",
  validationCommands: "  npm run typecheck  ",
} satisfies PromptCompilerInput

const resolvedContext = {
  profileId: "22222222-2222-4222-8222-222222222222",
  profileName: "Default context",
  context: "  Resolved profile context stays exact.  ",
  sectionNames: [],
  warnings: [],
}

function reviewableSnapshot(): PromptQualityReviewSnapshot {
  const snapshot = createDraftPromptQualitySnapshot({
    compiled,
    draft,
    editablePrompt: "  Editable compiled prompt stays exact.  ",
    projectContextPreview: resolvedContext,
  })

  if (snapshot === null) {
    throw new Error("Expected a reviewable draft snapshot.")
  }

  return snapshot
}

function snapshotInput(
  draftOverride: PromptCompilerInput,
  editablePrompt = "  Editable compiled prompt stays exact.  ",
): Parameters<typeof createDraftPromptQualitySnapshot>[0] {
  return { compiled, draft: draftOverride, editablePrompt, projectContextPreview: resolvedContext }
}

const review = {
  id: null,
  source: "draft",
  promptVersionId: null,
  reviewMode: "local",
  overallScore: 81,
  grade: "good",
  dimensionScores: {
    clarity: 80,
    context: 82,
    scope: 83,
    constraints: 84,
    acceptanceCriteria: 85,
    validation: 86,
    safety: 87,
    ambiguityRisk: 18,
  },
  strengths: ["The prompt is reviewable."],
  issues: [],
  suggestions: [],
  missingSections: [],
  warnings: [],
  recommendedClarifyingQuestions: [],
  scoreExplanation: "The prompt is ready for local draft review.",
  snapshot: reviewableSnapshot(),
  createdAt: 1,
  improvedPromptDraft: null,
} satisfies PromptQualityReviewResult

describe("prompt compiler draft review", () => {
  it("builds an exact local draft review snapshot from editable compiler fields", () => {
    const snapshot = createDraftPromptQualitySnapshot({
      compiled,
      draft,
      editablePrompt: "  Editable compiled prompt stays exact.  ",
      projectContextPreview: resolvedContext,
    })

    expect(snapshot).toEqual({
      compiledPrompt: "  Editable compiled prompt stays exact.  ",
      originalInput: "  Keep original input exact.  ",
      scenario: "bugfix",
      targetAgent: "claude_code",
      harnessTemplateId: "11111111-1111-4111-8111-111111111111",
      projectContextProfileId: "22222222-2222-4222-8222-222222222222",
      includeProjectContextProfile: true,
      projectContext:
        "  Resolved profile context stays exact.  \n\n  Manual context stays exact.  ",
      constraints: "  Constraint text stays exact.  ",
      acceptanceCriteria: "  Acceptance text stays exact.  ",
      validationCommands: "  npm run typecheck  ",
    })
  })

  it("does not expose draft review when compiled output is absent or blank", () => {
    expect(
      createDraftPromptQualitySnapshot({
        compiled: null,
        draft,
        editablePrompt: "Compiled text",
        projectContextPreview: resolvedContext,
      }),
    ).toBeNull()
    expect(
      createDraftPromptQualitySnapshot({
        compiled,
        draft,
        editablePrompt: " \t\n ",
        projectContextPreview: resolvedContext,
      }),
    ).toBeNull()
  })

  it("renders explicit local draft review controls enabled only for reviewable drafts", () => {
    const enabledMarkup = renderToStaticMarkup(
      createElement(PromptCompilerDraftReview, {
        compiled,
        draft,
        editablePrompt: "Compiled text",
        projectContextPreview: null,
        onUseImprovedPrompt: () => undefined,
      }),
    )
    const disabledMarkup = renderToStaticMarkup(
      createElement(PromptCompilerDraftReview, {
        compiled: null,
        draft,
        editablePrompt: "Compiled text",
        projectContextPreview: null,
        onUseImprovedPrompt: () => undefined,
      }),
    )

    expect(enabledMarkup).toContain("Review draft locally")
    expect(enabledMarkup).toContain("Optional LLM review")
    expect(enabledMarkup).toContain("Reviews instructions only")
    expect(enabledMarkup).toContain("Review instructions with LLM")
    expect(enabledMarkup).not.toContain('disabled="">Review draft locally')
    expect(disabledMarkup).toContain("Compile a non-blank prompt before reviewing draft quality.")
    expect(disabledMarkup).toContain("Compile a non-blank prompt before requesting LLM review.")
    expect(disabledMarkup).toContain('disabled="">Review draft locally')
    expect(disabledMarkup).toContain('disabled="">Review instructions with LLM')
  })

  it("marks a prior review stale for exact whitespace-only snapshot changes", () => {
    const currentSnapshot = createDraftPromptQualitySnapshot({
      compiled,
      draft,
      editablePrompt: "  Editable compiled prompt stays exact.   ",
      projectContextPreview: resolvedContext,
    })

    expect(draftPromptQualityReviewStatus(currentSnapshot, review)).toBe("stale_review")
  })

  it.each([
    {
      label: "editable compiled prompt",
      input: snapshotInput(draft, "  Editable compiled prompt stays exact.   "),
    },
    {
      label: "original input",
      input: snapshotInput({ ...draft, originalInput: `${draft.originalInput} ` }),
    },
    {
      label: "scenario",
      input: snapshotInput({ ...draft, scenario: "feature" }),
    },
    {
      label: "target agent",
      input: snapshotInput({ ...draft, targetAgent: "codex" }),
    },
    {
      label: "harness template",
      input: snapshotInput({ ...draft, harnessTemplateId: null }),
    },
    {
      label: "project context profile",
      input: snapshotInput({ ...draft, projectContextProfileId: null }),
    },
    {
      label: "include project context profile flag",
      input: snapshotInput({ ...draft, includeProjectContextProfile: false }),
    },
    {
      label: "manual context whitespace",
      input: snapshotInput({ ...draft, projectContext: `${draft.projectContext} ` }),
    },
    {
      label: "constraints whitespace",
      input: snapshotInput({ ...draft, constraints: `${draft.constraints} ` }),
    },
    {
      label: "acceptance criteria whitespace",
      input: snapshotInput({ ...draft, acceptanceCriteria: `${draft.acceptanceCriteria} ` }),
    },
    {
      label: "validation commands whitespace",
      input: snapshotInput({ ...draft, validationCommands: `${draft.validationCommands} ` }),
    },
  ] satisfies readonly {
    readonly label: string
    readonly input: Parameters<typeof createDraftPromptQualitySnapshot>[0]
  }[])("marks the prior review stale after $label changes", ({ input }) => {
    expect(draftPromptQualityReviewStatus(createDraftPromptQualitySnapshot(input), review)).toBe(
      "stale_review",
    )
  })
})
