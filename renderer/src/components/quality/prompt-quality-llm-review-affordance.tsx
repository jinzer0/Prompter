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
      className="min-w-0 space-y-2 border-t border-border-subtle pt-4 [overflow-wrap:anywhere]"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h4
            id="prompt-quality-llm-review-heading"
            className="text-[14px] font-medium text-muted-strong"
          >
            Optional LLM review
          </h4>
          <p className="text-[14px] leading-6 text-muted-strong">
            Reviews instructions only. Clicking may send prompt text to OpenAI; local review stays
            primary and remains available.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="min-w-0 whitespace-normal text-[14px]"
          disabled={isDisabled}
          onClick={() => void onRunLLMReview()}
        >
          {isReviewing ? "Requesting LLM review..." : "Review instructions with LLM"}
        </Button>
      </div>
      {isDisabled && disabledReason !== null && !isReviewing && (
        <p className="min-w-0 text-[14px] text-muted">{disabledReason}</p>
      )}
      {llmResult !== null && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-[14px] text-muted-strong">
          <Badge variant="neutral">{llmResultLabel(llmResult)}</Badge>
          <p className="min-w-0">{llmResult.message}</p>
        </div>
      )}
    </section>
  )
}
