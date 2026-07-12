import type {
  ApplyPromptQualityScoreToVersionResult,
  PromptQualityLLMReviewResult,
  PromptQualityReviewResult,
  PromptQualityReviewSnapshot,
} from "../../../electron/ipc-types"

export type PromptQualityOperation =
  | "idle"
  | "loading_latest_review"
  | "reviewing_local"
  | "reviewing_llm"
  | "saving_review"
  | "applying_score"

export type PromptQualityState = {
  readonly operation: PromptQualityOperation
  readonly review: PromptQualityReviewResult | null
  readonly latestReview: PromptQualityReviewResult | null
  readonly llmResult: PromptQualityLLMReviewResult | null
  readonly appliedScore: ApplyPromptQualityScoreToVersionResult | null
  readonly error: string | null
}

export type PromptQualityStateEvent =
  | {
      readonly kind: "operation_started"
      readonly operation: Exclude<PromptQualityOperation, "idle">
    }
  | { readonly kind: "latest_review_received"; readonly review: PromptQualityReviewResult | null }
  | { readonly kind: "review_received"; readonly review: PromptQualityReviewResult }
  | { readonly kind: "review_saved"; readonly review: PromptQualityReviewResult }
  | { readonly kind: "llm_review_received"; readonly result: PromptQualityLLMReviewResult }
  | { readonly kind: "score_applied"; readonly score: ApplyPromptQualityScoreToVersionResult }
  | { readonly kind: "operation_failed"; readonly message: string }
  | { readonly kind: "error_cleared" }
  | { readonly kind: "review_cleared" }

export type PromptQualityReviewSafetyStatus =
  | "invalid_source"
  | "unreviewed"
  | "unsaved_version"
  | "mismatched_review"
  | "stale_review"
  | "current_review"

export type PromptQualityActionDecision = {
  readonly isEnabled: boolean
  readonly disabledReason: string | null
}

export type PromptQualityActionState = {
  readonly reviewSafetyStatus: PromptQualityReviewSafetyStatus
  readonly loadLatestReview: PromptQualityActionDecision
  readonly reviewDraftLocally: PromptQualityActionDecision
  readonly reviewVersionLocally: PromptQualityActionDecision
  readonly runLLMReview: PromptQualityActionDecision
  readonly saveReview: PromptQualityActionDecision
  readonly applyScore: PromptQualityActionDecision
  readonly useImprovedPromptAsCurrent: PromptQualityActionDecision
}

type PromptQualityActionContext = {
  readonly currentSnapshot: PromptQualityReviewSnapshot | null
  readonly operation: PromptQualityOperation
  readonly promptVersionId: string | null
  readonly review: PromptQualityReviewResult | null
}

const promptQualitySnapshotFields = [
  "compiledPrompt",
  "originalInput",
  "scenario",
  "targetAgent",
  "harnessTemplateId",
  "projectContextProfileId",
  "includeProjectContextProfile",
  "projectContext",
  "constraints",
  "acceptanceCriteria",
  "validationCommands",
] as const satisfies readonly (keyof PromptQualityReviewSnapshot)[]

export const initialPromptQualityState: PromptQualityState = {
  operation: "idle",
  review: null,
  latestReview: null,
  llmResult: null,
  appliedScore: null,
  error: null,
}

function assertNever(value: never): never {
  throw new Error(`Unexpected prompt quality state event: ${JSON.stringify(value)}`)
}

function completedState(state: PromptQualityState): PromptQualityState {
  return { ...state, operation: "idle", error: null }
}

export function reducePromptQualityState(
  state: PromptQualityState,
  event: PromptQualityStateEvent,
): PromptQualityState {
  switch (event.kind) {
    case "operation_started":
      return { ...state, operation: event.operation, error: null }
    case "latest_review_received":
      return completedState({ ...state, latestReview: event.review, review: event.review })
    case "review_received":
      return completedState({ ...state, review: event.review })
    case "review_saved":
      return completedState({ ...state, latestReview: event.review, review: event.review })
    case "llm_review_received":
      return completedState({ ...state, llmResult: event.result })
    case "score_applied":
      return completedState({ ...state, appliedScore: event.score })
    case "operation_failed":
      return { ...state, operation: "idle", error: event.message }
    case "error_cleared":
      return { ...state, error: null }
    case "review_cleared":
      return { ...state, review: null, latestReview: null, llmResult: null, appliedScore: null }
    default:
      return assertNever(event)
  }
}

export function createPromptQualitySnapshot({
  compiledPrompt,
  originalInput,
  scenario,
  targetAgent,
  harnessTemplateId,
  projectContextProfileId,
  includeProjectContextProfile,
  projectContext,
  constraints,
  acceptanceCriteria,
  validationCommands,
}: PromptQualityReviewSnapshot): PromptQualityReviewSnapshot {
  return {
    compiledPrompt,
    originalInput,
    scenario,
    targetAgent,
    harnessTemplateId,
    projectContextProfileId,
    includeProjectContextProfile,
    projectContext,
    constraints,
    acceptanceCriteria,
    validationCommands,
  }
}

export function promptQualitySnapshotIsCurrent(
  currentSnapshot: PromptQualityReviewSnapshot,
  reviewedSnapshot: PromptQualityReviewSnapshot,
): boolean {
  return promptQualitySnapshotFields.every(
    (field) => currentSnapshot[field] === reviewedSnapshot[field],
  )
}

export function promptQualitySourceIsValid(snapshot: PromptQualityReviewSnapshot | null): boolean {
  return snapshot !== null && snapshot.compiledPrompt.trim().length > 0
}

function reviewSafetyStatus({
  currentSnapshot,
  promptVersionId,
  review,
}: Omit<PromptQualityActionContext, "operation">): PromptQualityReviewSafetyStatus {
  if (currentSnapshot === null || currentSnapshot.compiledPrompt.trim().length === 0) {
    return "invalid_source"
  }

  if (review === null) {
    return "unreviewed"
  }

  if (promptVersionId === null) {
    return "unsaved_version"
  }

  if (review.source !== "prompt_version" || review.promptVersionId !== promptVersionId) {
    return "mismatched_review"
  }

  return promptQualitySnapshotIsCurrent(currentSnapshot, review.snapshot)
    ? "current_review"
    : "stale_review"
}

function disabled(reason: string): PromptQualityActionDecision {
  return { isEnabled: false, disabledReason: reason }
}

const enabledAction: PromptQualityActionDecision = { isEnabled: true, disabledReason: null }

function safetyDisabledReason(status: PromptQualityReviewSafetyStatus): string {
  switch (status) {
    case "invalid_source":
      return "A non-blank compiled prompt is required."
    case "unreviewed":
      return "Run a review before this action."
    case "unsaved_version":
      return "Save the prompt version before this action."
    case "mismatched_review":
      return "The review does not belong to the selected prompt version."
    case "stale_review":
      return "Run a new review after prompt inputs change."
    case "current_review":
      return "This action is unavailable."
    default:
      return assertNever(status)
  }
}

function actionAvailable(
  isBusy: boolean,
  isAvailable: boolean,
  unavailableReason: string,
): PromptQualityActionDecision {
  if (isBusy) {
    return disabled("Wait for the current prompt quality action to finish.")
  }

  return isAvailable ? enabledAction : disabled(unavailableReason)
}

export function promptQualityActionState({
  currentSnapshot,
  operation,
  promptVersionId,
  review,
}: PromptQualityActionContext): PromptQualityActionState {
  const isBusy = operation !== "idle"
  const safetyStatus = reviewSafetyStatus({ currentSnapshot, promptVersionId, review })
  const currentReview = safetyStatus === "current_review" ? review : null
  const canSaveReview = currentReview !== null && currentReview.id === null
  const canApplyScore = currentReview !== null && currentReview.id !== null
  const canUseImprovedPromptAsCurrent =
    currentReview !== null &&
    currentReview.id !== null &&
    currentReview.improvedPromptDraft !== null &&
    currentReview.improvedPromptDraft.trim().length > 0
  const safetyReason = safetyDisabledReason(safetyStatus)

  return {
    reviewSafetyStatus: safetyStatus,
    loadLatestReview: actionAvailable(
      isBusy,
      promptVersionId !== null,
      "Save the prompt version before loading its reviews.",
    ),
    reviewDraftLocally: actionAvailable(
      isBusy,
      promptQualitySourceIsValid(currentSnapshot),
      "A non-blank compiled prompt is required.",
    ),
    reviewVersionLocally: actionAvailable(
      isBusy,
      promptVersionId !== null,
      "Save the prompt version before reviewing it.",
    ),
    runLLMReview: actionAvailable(isBusy, true, ""),
    saveReview: actionAvailable(isBusy, canSaveReview, safetyReason),
    applyScore: actionAvailable(isBusy, canApplyScore, safetyReason),
    useImprovedPromptAsCurrent: actionAvailable(
      isBusy,
      canUseImprovedPromptAsCurrent,
      safetyReason,
    ),
  }
}
