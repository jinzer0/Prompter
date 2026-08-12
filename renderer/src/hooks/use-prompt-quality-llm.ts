import type { Dispatch, MutableRefObject } from "react"

import type {
  PromptQualityReviewSnapshot,
  ReviewPromptQualityWithLLMInput,
} from "../../../electron/ipc-types"
import { resolveCurrentRevisionResponse } from "../lib/prompt-compiler/output-revision"
import type { PromptQualityActionDecision, PromptQualityStateEvent } from "./prompt-quality-state"
import { usePrivacyWarning } from "./use-privacy-warning"

type UsePromptQualityLlmConfig = {
  readonly actionState: PromptQualityActionDecision
  readonly currentSnapshot: PromptQualityReviewSnapshot | null
  readonly dispatch: Dispatch<PromptQualityStateEvent>
  readonly sourceRevision: number | undefined
  readonly sourceRevisionRef: MutableRefObject<number | undefined>
}

export function confirmedPromptQualityRequest(
  snapshot: PromptQualityReviewSnapshot,
  privacyConfirmationSessionId: string,
): ReviewPromptQualityWithLLMInput {
  return { ...snapshot, privacyConfirmationSessionId }
}

export function usePromptQualityLlm({
  actionState,
  currentSnapshot,
  dispatch,
  sourceRevision,
  sourceRevisionRef,
}: UsePromptQualityLlmConfig) {
  const privacyWarning = usePrivacyWarning()

  async function performReview(
    request: ReviewPromptQualityWithLLMInput,
    requestedRevision: number | undefined,
    acceptsConfirmation: boolean,
  ): Promise<void> {
    if (sourceRevisionRef.current !== requestedRevision) {
      dispatch({ kind: "operation_failed", message: "Draft changed; LLM review was not sent." })
      return
    }
    dispatch({ kind: "operation_started", operation: "reviewing_llm" })

    try {
      const result = await resolveCurrentRevisionResponse(
        window.prompter.promptQuality.reviewWithLLM(request),
        requestedRevision,
        () => sourceRevisionRef.current,
      )
      if (result === null) {
        dispatch({ kind: "operation_failed", message: "Draft changed; late review discarded." })
        return
      }
      if ("status" in result && result.status === "confirmation_required") {
        if (!acceptsConfirmation) {
          dispatch({
            kind: "operation_failed",
            message: "Privacy confirmation could not authorize LLM review.",
          })
          return
        }
        privacyWarning.open({
          scanResult: result.scanResult,
          retry: () =>
            performReview(
              confirmedPromptQualityRequest(request, result.privacyConfirmationSessionId),
              requestedRevision,
              false,
            ),
        })
        dispatch({ kind: "operation_finished" })
        return
      }
      dispatch({ kind: "llm_review_received", result })
    } catch (error) {
      if (!(error instanceof Error)) throw error
      dispatch({
        kind: "operation_failed",
        message:
          sourceRevisionRef.current === requestedRevision
            ? "LLM review could not be completed."
            : "Draft changed; late review discarded.",
      })
    }
  }

  async function runLLMReview(): Promise<void> {
    if (!actionState.isEnabled || currentSnapshot === null) {
      dispatch({
        kind: "operation_failed",
        message: actionState.disabledReason ?? "LLM review is unavailable.",
      })
      return
    }
    const request = { ...currentSnapshot }
    await performReview(request, sourceRevision, true)
  }

  return { privacyWarning, runLLMReview }
}
