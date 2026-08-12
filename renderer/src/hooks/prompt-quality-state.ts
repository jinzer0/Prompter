import type {
  ApplyPromptQualityScoreToVersionResult,
  PromptQualityLLMReviewResult,
  PromptQualityReviewResult,
} from "../../../electron/ipc-types"

export type {
  PromptQualityActionDecision,
  PromptQualityActionState,
  PromptQualityReviewSafetyStatus,
} from "./prompt-quality-actions"
export {
  createPromptQualitySnapshot,
  promptQualityActionState,
  promptQualitySnapshotIsCurrent,
  promptQualitySourceIsValid,
} from "./prompt-quality-actions"

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
  | { readonly kind: "operation_finished" }
  | { readonly kind: "latest_review_received"; readonly review: PromptQualityReviewResult | null }
  | { readonly kind: "review_received"; readonly review: PromptQualityReviewResult }
  | { readonly kind: "review_saved"; readonly review: PromptQualityReviewResult }
  | { readonly kind: "llm_review_received"; readonly result: PromptQualityLLMReviewResult }
  | { readonly kind: "score_applied"; readonly score: ApplyPromptQualityScoreToVersionResult }
  | { readonly kind: "operation_failed"; readonly message: string }
  | { readonly kind: "error_cleared" }
  | { readonly kind: "review_cleared" }

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
    case "operation_finished":
      return completedState(state)
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
