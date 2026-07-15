import { useCallback, useMemo, useReducer, useRef } from "react"

import type { PromptQualityReviewSnapshot } from "../../../electron/ipc-types"
import { resolveCurrentRevisionResponse } from "../lib/prompt-compiler/output-revision"
import {
  initialPromptQualityState,
  promptQualityActionState,
  reducePromptQualityState,
} from "./prompt-quality-state"

export type UsePromptQualityConfig = {
  readonly currentSnapshot: PromptQualityReviewSnapshot | null
  readonly promptVersionId: string | null
  readonly sourceRevision?: number
}

export function usePromptQuality({
  currentSnapshot,
  promptVersionId,
  sourceRevision,
}: UsePromptQualityConfig) {
  const [state, dispatch] = useReducer(reducePromptQualityState, initialPromptQualityState)
  const sourceRevisionRef = useRef(sourceRevision)
  sourceRevisionRef.current = sourceRevision
  const actionState = useMemo(
    () =>
      promptQualityActionState({
        currentSnapshot,
        operation: state.operation,
        promptVersionId,
        review: state.review,
      }),
    [currentSnapshot, promptVersionId, state.operation, state.review],
  )

  const loadLatestReview = useCallback(async (): Promise<void> => {
    if (!actionState.loadLatestReview.isEnabled || promptVersionId === null) {
      dispatch({
        kind: "operation_failed",
        message: actionState.loadLatestReview.disabledReason ?? "Latest review is unavailable.",
      })
      return
    }

    dispatch({ kind: "operation_started", operation: "loading_latest_review" })

    try {
      const review = await window.prompter.promptQuality.getLatestReview({ promptVersionId })
      dispatch({ kind: "latest_review_received", review })
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      dispatch({ kind: "operation_failed", message: "Latest review could not be loaded." })
    }
  }, [actionState.loadLatestReview, promptVersionId])

  const reviewDraftLocally = useCallback(async (): Promise<void> => {
    if (!actionState.reviewDraftLocally.isEnabled || currentSnapshot === null) {
      dispatch({
        kind: "operation_failed",
        message: actionState.reviewDraftLocally.disabledReason ?? "Local review is unavailable.",
      })
      return
    }

    const requestedRevision = sourceRevision
    dispatch({ kind: "operation_started", operation: "reviewing_local" })

    try {
      const review = await resolveCurrentRevisionResponse(
        window.prompter.promptQuality.reviewDraft({
          ...currentSnapshot,
          reviewMode: "local",
        }),
        requestedRevision,
        () => sourceRevisionRef.current,
      )
      if (review === null) {
        dispatch({ kind: "operation_failed", message: "Draft changed; late review discarded." })
        return
      }
      dispatch({ kind: "review_received", review })
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      dispatch({
        kind: "operation_failed",
        message:
          sourceRevisionRef.current === requestedRevision
            ? "Local review could not be completed."
            : "Draft changed; late review discarded.",
      })
    }
  }, [actionState.reviewDraftLocally, currentSnapshot, sourceRevision])

  const reviewVersionLocally = useCallback(async (): Promise<void> => {
    if (!actionState.reviewVersionLocally.isEnabled || promptVersionId === null) {
      dispatch({
        kind: "operation_failed",
        message:
          actionState.reviewVersionLocally.disabledReason ?? "Version review is unavailable.",
      })
      return
    }

    dispatch({ kind: "operation_started", operation: "reviewing_local" })

    try {
      const review = await window.prompter.promptQuality.reviewVersion({
        promptVersionId,
        reviewMode: "local",
      })
      dispatch({ kind: "review_received", review })
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      dispatch({ kind: "operation_failed", message: "Version review could not be completed." })
    }
  }, [actionState.reviewVersionLocally, promptVersionId])

  const runLLMReview = useCallback(async (): Promise<void> => {
    if (!actionState.runLLMReview.isEnabled) {
      dispatch({
        kind: "operation_failed",
        message: actionState.runLLMReview.disabledReason ?? "LLM review is unavailable.",
      })
      return
    }

    const requestedRevision = sourceRevision
    dispatch({ kind: "operation_started", operation: "reviewing_llm" })

    try {
      const result = await resolveCurrentRevisionResponse(
        window.prompter.promptQuality.reviewWithLLM(),
        requestedRevision,
        () => sourceRevisionRef.current,
      )
      if (result === null) {
        dispatch({ kind: "operation_failed", message: "Draft changed; late review discarded." })
        return
      }
      dispatch({ kind: "llm_review_received", result })
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      dispatch({
        kind: "operation_failed",
        message:
          sourceRevisionRef.current === requestedRevision
            ? "LLM review could not be completed."
            : "Draft changed; late review discarded.",
      })
    }
  }, [actionState.runLLMReview, sourceRevision])

  const saveReview = useCallback(async (): Promise<void> => {
    const review = state.review

    if (!actionState.saveReview.isEnabled || promptVersionId === null || review === null) {
      dispatch({
        kind: "operation_failed",
        message: actionState.saveReview.disabledReason ?? "Saving this review is unavailable.",
      })
      return
    }

    dispatch({ kind: "operation_started", operation: "saving_review" })

    try {
      const savedReview = await window.prompter.promptQuality.saveReview({
        promptVersionId,
        review,
      })
      dispatch({ kind: "review_saved", review: savedReview })
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      dispatch({ kind: "operation_failed", message: "Review could not be saved." })
    }
  }, [actionState.saveReview, promptVersionId, state.review])

  const applyScore = useCallback(async (): Promise<void> => {
    const review = state.review

    if (
      !actionState.applyScore.isEnabled ||
      promptVersionId === null ||
      review === null ||
      review.id === null
    ) {
      dispatch({
        kind: "operation_failed",
        message: actionState.applyScore.disabledReason ?? "Applying this score is unavailable.",
      })
      return
    }

    dispatch({ kind: "operation_started", operation: "applying_score" })

    try {
      const score = await window.prompter.promptQuality.applyScoreToVersion({
        promptVersionId,
        reviewId: review.id,
        qualityScore: review.overallScore,
      })
      dispatch({ kind: "score_applied", score })
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      dispatch({ kind: "operation_failed", message: "Review score could not be applied." })
    }
  }, [actionState.applyScore, promptVersionId, state.review])

  const clearError = useCallback((): void => {
    dispatch({ kind: "error_cleared" })
  }, [])

  const clearReview = useCallback((): void => {
    dispatch({ kind: "review_cleared" })
  }, [])

  return {
    ...state,
    actionState,
    clearError,
    clearReview,
    loadLatestReview,
    reviewDraftLocally,
    reviewVersionLocally,
    runLLMReview,
    saveReview,
    applyScore,
  }
}
