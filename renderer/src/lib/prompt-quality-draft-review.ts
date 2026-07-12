import type {
  ProjectContextCompilerBuildResult,
  PromptQualityReviewResult,
  PromptQualityReviewSnapshot,
} from "../../../electron/ipc-types"
import {
  createPromptQualitySnapshot,
  promptQualitySnapshotIsCurrent,
} from "../hooks/prompt-quality-state"
import type { CompiledPromptResult, PromptCompilerInput } from "./prompt-compiler/types"

export type DraftPromptQualityReviewStatus =
  | "unreviewed"
  | "source_unavailable"
  | "stale_review"
  | "current_review"

type DraftPromptQualitySnapshotInput = {
  readonly compiled: CompiledPromptResult | null
  readonly draft: PromptCompilerInput
  readonly editablePrompt: string
  readonly projectContextPreview: ProjectContextCompilerBuildResult | null
}

function nullableDraftText(value: string | undefined): string | null {
  return value ?? null
}

function projectContextSnapshotText({
  draft,
  projectContextPreview,
}: Pick<DraftPromptQualitySnapshotInput, "draft" | "projectContextPreview">): string | null {
  const manualContext = nullableDraftText(draft.projectContext)
  const resolvedContext =
    draft.includeProjectContextProfile === true ? (projectContextPreview?.context ?? null) : null

  if (resolvedContext === null) {
    return manualContext
  }

  if (manualContext === null || manualContext.length === 0) {
    return resolvedContext
  }

  return `${resolvedContext}\n\n${manualContext}`
}

export function createDraftPromptQualitySnapshot({
  compiled,
  draft,
  editablePrompt,
  projectContextPreview,
}: DraftPromptQualitySnapshotInput): PromptQualityReviewSnapshot | null {
  if (compiled === null || editablePrompt.trim().length === 0) {
    return null
  }

  return createPromptQualitySnapshot({
    compiledPrompt: editablePrompt,
    originalInput: draft.originalInput,
    scenario: draft.scenario,
    targetAgent: draft.targetAgent,
    harnessTemplateId: draft.harnessTemplateId ?? null,
    projectContextProfileId: draft.projectContextProfileId ?? null,
    includeProjectContextProfile: draft.includeProjectContextProfile === true,
    projectContext: projectContextSnapshotText({ draft, projectContextPreview }),
    constraints: nullableDraftText(draft.constraints),
    acceptanceCriteria: nullableDraftText(draft.acceptanceCriteria),
    validationCommands: nullableDraftText(draft.validationCommands),
  })
}

export function draftPromptQualityReviewStatus(
  currentSnapshot: PromptQualityReviewSnapshot | null,
  review: PromptQualityReviewResult | null,
): DraftPromptQualityReviewStatus {
  if (review === null) {
    return "unreviewed"
  }

  if (currentSnapshot === null) {
    return "source_unavailable"
  }

  return promptQualitySnapshotIsCurrent(currentSnapshot, review.snapshot)
    ? "current_review"
    : "stale_review"
}
