import type {
  ApplyPromptQualityScoreToVersionResult,
  PromptQualityLLMReviewResult,
  PromptQualityReviewResult,
} from "../../../../electron/ipc-types"
import type {
  PromptQualityActionState,
  PromptQualityOperation,
} from "../../hooks/prompt-quality-state"
import { formatTimestamp } from "../../lib/format-timestamp"
import { Badge, type BadgeProps } from "../ui/badge"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { PromptQualityLLMReviewAffordance } from "./prompt-quality-llm-review-affordance"
import {
  buildSavedPromptVersionQualitySnapshot,
  promptQualityDimensionRows,
  promptQualityGradeLabel,
  promptQualityModeLabel,
  promptQualityRiskLabel,
  promptQualityTopBlockers,
} from "./prompt-quality-review-model"

export { buildSavedPromptVersionQualitySnapshot, promptQualityTopBlockers }

type PromptQualityReviewPanelProps = {
  readonly actionState: PromptQualityActionState
  readonly appliedScore: ApplyPromptQualityScoreToVersionResult | null
  readonly error: string | null
  readonly llmResult: PromptQualityLLMReviewResult | null
  readonly operation: PromptQualityOperation
  readonly review: PromptQualityReviewResult | null
  readonly versionQualityScore: number | null
  readonly onApplyScore: () => void | Promise<void>
  readonly onClearError: () => void
  readonly onRunLLMReview: () => void | Promise<void>
  readonly onReviewVersionLocally: () => void | Promise<void>
  readonly onSaveReview: () => void | Promise<void>
}

function gradeBadgeVariant(review: PromptQualityReviewResult): BadgeProps["variant"] {
  return review.grade === "excellent" || review.grade === "good" ? "success" : "neutral"
}

function reviewStateLabel(review: PromptQualityReviewResult | null): string {
  if (review === null) {
    return "Unreviewed"
  }

  return review.id === null ? "Unsaved local review" : "Saved review"
}

function AppliedScoreState({
  appliedScore,
  review,
  versionQualityScore,
}: {
  readonly appliedScore: ApplyPromptQualityScoreToVersionResult | null
  readonly review: PromptQualityReviewResult | null
  readonly versionQualityScore: number | null
}) {
  const appliedQualityScore =
    appliedScore?.qualityScore ??
    (review !== null && review.id !== null && versionQualityScore === review.overallScore
      ? versionQualityScore
      : null)

  return (
    <div className="grid gap-1 text-[12px] text-muted-strong">
      <p>Review result score: {review === null ? "No review" : String(review.overallScore)}</p>
      <p>
        Applied quality review score:{" "}
        {appliedQualityScore === null ? "Not applied" : String(appliedQualityScore)}
      </p>
      {versionQualityScore !== null && versionQualityScore !== appliedQualityScore && (
        <p>Previous applied score on saved version: {versionQualityScore}</p>
      )}
    </div>
  )
}

function ReviewDetails({ review }: { readonly review: PromptQualityReviewResult }) {
  return (
    <details className="rounded-card border border-border-subtle bg-panel-muted p-3 text-[12px] leading-5 text-muted-strong">
      <summary className="cursor-pointer font-mono text-[11px] text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45">
        Review details
      </summary>
      <div className="mt-3 grid gap-3">
        <p>{review.scoreExplanation}</p>
        <section className="space-y-1">
          <h4 className="font-mono text-[11px] text-muted">dimension_scores</h4>
          <dl className="grid grid-cols-2 gap-2">
            {promptQualityDimensionRows(review).map((row) => (
              <div
                key={row.key}
                className="flex justify-between gap-2 border-b border-border-subtle pb-1"
              >
                <dt>{row.label}</dt>
                <dd className="font-mono text-muted-strong">{row.score}</dd>
              </div>
            ))}
          </dl>
        </section>
        {review.strengths.length > 0 && (
          <section className="space-y-1">
            <h4 className="font-mono text-[11px] text-muted">strengths</h4>
            <ul className="list-disc space-y-1 pl-4">
              {review.strengths.map((strength) => (
                <li key={strength}>{strength}</li>
              ))}
            </ul>
          </section>
        )}
        {review.recommendedClarifyingQuestions.length > 0 && (
          <section className="space-y-1">
            <h4 className="font-mono text-[11px] text-muted">recommended_questions</h4>
            <ul className="list-disc space-y-1 pl-4">
              {review.recommendedClarifyingQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </details>
  )
}

export function PromptQualityReviewPanel({
  actionState,
  appliedScore,
  error,
  llmResult,
  operation,
  review,
  versionQualityScore,
  onApplyScore,
  onClearError,
  onRunLLMReview,
  onReviewVersionLocally,
  onSaveReview,
}: PromptQualityReviewPanelProps) {
  const blockers = review === null ? [] : promptQualityTopBlockers(review)
  const isBusy = operation !== "idle"

  return (
    <Card aria-busy={isBusy} aria-labelledby="prompt-quality-review-heading">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id="prompt-quality-review-heading">Prompt quality review</CardTitle>
          <Badge variant={review === null ? "neutral" : gradeBadgeVariant(review)}>
            {review === null ? "Unreviewed" : promptQualityGradeLabel(review.grade)}
          </Badge>
        </div>
        <CardDescription>
          Local checks for the selected saved version. Scores apply only when explicitly saved and
          applied.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">{reviewStateLabel(review)}</Badge>
          {review !== null && (
            <Badge variant="accent">{promptQualityModeLabel(review.reviewMode)}</Badge>
          )}
          {review !== null && <Badge variant="neutral">{formatTimestamp(review.createdAt)}</Badge>}
          {review !== null && <Badge variant="neutral">{promptQualityRiskLabel(review)}</Badge>}
        </div>

        <AppliedScoreState
          appliedScore={appliedScore}
          review={review}
          versionQualityScore={versionQualityScore}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            aria-label="Review saved version locally"
            type="button"
            variant="secondary"
            disabled={!actionState.reviewVersionLocally.isEnabled}
            onClick={onReviewVersionLocally}
          >
            Review saved version locally
          </Button>
          <Button
            aria-label="Save prompt quality review"
            type="button"
            variant="secondary"
            disabled={!actionState.saveReview.isEnabled}
            onClick={onSaveReview}
          >
            Save review
          </Button>
          <Button
            aria-label="Apply prompt quality review score"
            type="button"
            variant="ghost"
            disabled={!actionState.applyScore.isEnabled}
            onClick={onApplyScore}
          >
            Apply review score
          </Button>
        </div>

        <PromptQualityLLMReviewAffordance
          actionState={actionState.runLLMReview}
          llmResult={llmResult}
          operation={operation}
          sourceUnavailableReason={null}
          onRunLLMReview={onRunLLMReview}
        />

        {isBusy && <p className="text-[12px] text-muted-strong">Working on prompt quality...</p>}
        {error !== null && (
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-strong">
            <p>{error}</p>
            <Button type="button" size="sm" variant="ghost" onClick={onClearError}>
              Dismiss
            </Button>
          </div>
        )}

        <section className="space-y-2" aria-labelledby="prompt-quality-blockers-heading">
          <h4 id="prompt-quality-blockers-heading" className="font-mono text-[11px] text-muted">
            top_blockers
          </h4>
          {blockers.length === 0 ? (
            <p className="rounded-card border border-border-subtle bg-panel-muted p-3 text-[12px] text-muted-strong">
              {review === null ? "Run a local review to surface blockers." : "No blockers found."}
            </p>
          ) : (
            <ul className="space-y-1 rounded-card border border-border-subtle bg-panel-muted p-3 text-[12px] leading-5 text-muted-strong">
              {blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          )}
        </section>

        {review !== null && <ReviewDetails review={review} />}
      </CardContent>
    </Card>
  )
}
