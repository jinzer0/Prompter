import type { PromptQualityLLMReviewResult } from "../../../../electron/ipc-types"
import type {
  PromptQualityActionDecision,
  PromptQualityOperation,
} from "../../hooks/prompt-quality-state"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"

type PromptQualityLLMReviewAffordanceProps = {
  readonly actionState: PromptQualityActionDecision
  readonly llmResult: PromptQualityLLMReviewResult | null
  readonly operation: PromptQualityOperation
  readonly sourceUnavailableReason: string | null
  readonly onRunLLMReview: () => void | Promise<void>
}

function assertNever(value: never): never {
  throw new Error(`Unexpected LLM review result code: ${value}`)
}

function llmResultLabel(result: PromptQualityLLMReviewResult): string {
  switch (result.code) {
    case "missing_openai_key":
      return "OpenAI key required"
    case "llm_review_unavailable":
      return "LLM review unavailable"
    default:
      return assertNever(result.code)
  }
}

export function PromptQualityLLMReviewAffordance({
  actionState,
  llmResult,
  operation,
  sourceUnavailableReason,
  onRunLLMReview,
}: PromptQualityLLMReviewAffordanceProps) {
  const isReviewing = operation === "reviewing_llm"
  const disabledReason = sourceUnavailableReason ?? actionState.disabledReason
  const isDisabled = sourceUnavailableReason !== null || !actionState.isEnabled

  return (
    <section
      aria-labelledby="prompt-quality-llm-review-heading"
      className="space-y-2 rounded-card border border-border-subtle bg-panel-muted p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h4 id="prompt-quality-llm-review-heading" className="font-mono text-[11px] text-muted">
            Optional LLM review
          </h4>
          <p className="text-[12px] leading-5 text-muted-strong">
            Reviews instructions only. Clicking may send prompt text to OpenAI; local review stays
            primary and remains available.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isDisabled}
          onClick={() => void onRunLLMReview()}
        >
          {isReviewing ? "Requesting LLM review..." : "Review instructions with LLM"}
        </Button>
      </div>
      {isDisabled && disabledReason !== null && !isReviewing && (
        <p className="text-[12px] text-muted">{disabledReason}</p>
      )}
      {llmResult !== null && (
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-strong">
          <Badge variant="neutral">{llmResultLabel(llmResult)}</Badge>
          <p>{llmResult.message}</p>
        </div>
      )}
    </section>
  )
}
