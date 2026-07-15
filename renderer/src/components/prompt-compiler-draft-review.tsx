import type { ProjectContextCompilerBuildResult } from "../../../electron/ipc-types"
import { usePromptQuality } from "../hooks/use-prompt-quality"
import type { CompiledPromptResult, PromptCompilerInput } from "../lib/prompt-compiler/types"
import {
  createDraftPromptQualitySnapshot,
  type DraftPromptQualityReviewStatus,
  draftPromptQualityReviewStatus,
} from "../lib/prompt-quality-draft-review"
import { PromptQualityLLMReviewAffordance } from "./quality/prompt-quality-llm-review-affordance"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"

type PromptCompilerDraftReviewProps = {
  readonly compiled: CompiledPromptResult | null
  readonly draft: PromptCompilerInput
  readonly editablePrompt: string
  readonly outputRevision: number
  readonly projectContextPreview: ProjectContextCompilerBuildResult | null
  readonly onUseImprovedPrompt: (prompt: string) => void
}

type ReviewStatusCopy = {
  readonly label: string
  readonly message: string
}

const reviewStatusCopy = {
  unreviewed: {
    label: "Not reviewed",
    message: "Run a local draft review when the compiled prompt is ready.",
  },
  source_unavailable: {
    label: "Draft changed",
    message: "Recompile a non-blank prompt before using this review.",
  },
  stale_review: {
    label: "Stale review",
    message: "Run a new review after prompt inputs change.",
  },
  current_review: {
    label: "Current review",
    message: "This review matches the current compiled draft snapshot.",
  },
} as const satisfies Record<DraftPromptQualityReviewStatus, ReviewStatusCopy>

function scoreRows(review: NonNullable<ReturnType<typeof usePromptQuality>["review"]>) {
  return [
    ["clarity", review.dimensionScores.clarity],
    ["context", review.dimensionScores.context],
    ["scope", review.dimensionScores.scope],
    ["constraints", review.dimensionScores.constraints],
    ["acceptance", review.dimensionScores.acceptanceCriteria],
    ["validation", review.dimensionScores.validation],
    ["safety", review.dimensionScores.safety],
    ["ambiguity_risk", review.dimensionScores.ambiguityRisk],
  ] as const
}

export function PromptCompilerDraftReview({
  compiled,
  draft,
  editablePrompt,
  outputRevision,
  projectContextPreview,
  onUseImprovedPrompt,
}: PromptCompilerDraftReviewProps) {
  const currentSnapshot = createDraftPromptQualitySnapshot({
    compiled,
    draft,
    editablePrompt,
    projectContextPreview,
  })
  const quality = usePromptQuality({
    currentSnapshot,
    promptVersionId: null,
    sourceRevision: outputRevision,
  })
  const reviewStatus = draftPromptQualityReviewStatus(currentSnapshot, quality.review)
  const statusCopy = reviewStatusCopy[reviewStatus]
  const draftReviewReason =
    compiled === null || editablePrompt.trim().length === 0
      ? "Compile a non-blank prompt before reviewing draft quality."
      : quality.actionState.reviewDraftLocally.disabledReason
  const canReviewDraft =
    quality.actionState.reviewDraftLocally.isEnabled && currentSnapshot !== null
  const improvedPrompt = quality.review?.improvedPromptDraft ?? null

  function useImprovedPrompt(): void {
    if (quality.actionState.useImprovedPromptAsCurrent.isEnabled && improvedPrompt !== null) {
      onUseImprovedPrompt(improvedPrompt)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Draft quality review</CardTitle>
            <CardDescription>
              Review the editable compiled prompt locally. Draft reviews stay unsaved.
            </CardDescription>
          </div>
          <Badge variant={reviewStatus === "current_review" ? "accent" : "neutral"}>
            {statusCopy.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-[12px] leading-5 text-muted-strong">{statusCopy.message}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!canReviewDraft}
            onClick={() => void quality.reviewDraftLocally()}
          >
            {quality.operation === "reviewing_local" ? "Reviewing..." : "Review draft locally"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!quality.actionState.saveReview.isEnabled}
            onClick={() => void quality.saveReview()}
          >
            Save review
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!quality.actionState.applyScore.isEnabled}
            onClick={() => void quality.applyScore()}
          >
            Apply score
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!quality.actionState.useImprovedPromptAsCurrent.isEnabled}
            onClick={useImprovedPrompt}
          >
            Use improved prompt
          </Button>
        </div>
        <PromptQualityLLMReviewAffordance
          actionState={quality.actionState.runLLMReview}
          llmResult={quality.llmResult}
          operation={quality.operation}
          sourceUnavailableReason={
            currentSnapshot === null
              ? "Compile a non-blank prompt before requesting LLM review."
              : null
          }
          onRunLLMReview={quality.runLLMReview}
        />
        {!canReviewDraft && draftReviewReason !== null && (
          <p className="text-[12px] text-muted">{draftReviewReason}</p>
        )}
        {quality.error !== null && <p className="text-[12px] text-muted-strong">{quality.error}</p>}
        {quality.review !== null && (
          <div className="space-y-3 border-t border-border-subtle pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">Score {quality.review.overallScore}/100</Badge>
              <Badge variant="neutral">Grade {quality.review.grade}</Badge>
              <Badge variant="neutral">Mode {quality.review.reviewMode}</Badge>
            </div>
            <p className="text-[12px] leading-5 text-muted-strong">
              {quality.review.scoreExplanation}
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {scoreRows(quality.review).map(([label, score]) => (
                <p
                  key={label}
                  className="flex items-center justify-between gap-3 rounded-control border border-border-subtle bg-panel-muted px-3 py-2 font-mono text-[11px] text-muted-strong"
                >
                  <span>{label}</span>
                  <span>{score}</span>
                </p>
              ))}
            </div>
            {quality.review.issues.length > 0 && (
              <div className="space-y-2">
                <p className="font-mono text-[11px] text-muted">issues</p>
                {quality.review.issues.map((issue) => (
                  <p key={issue.id} className="text-[12px] leading-5 text-muted-strong">
                    {issue.title}: {issue.description}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
