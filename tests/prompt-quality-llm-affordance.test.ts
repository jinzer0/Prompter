import { Children, createElement, isValidElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type { PromptQualityReviewSnapshot } from "../electron/ipc-types"
import { PromptQualityLLMReviewAffordance } from "../renderer/src/components/quality/prompt-quality-llm-review-affordance"
import { PromptQualityReviewPanel } from "../renderer/src/components/quality/prompt-quality-review-panel"
import { promptQualityActionState } from "../renderer/src/hooks/prompt-quality-state"

const promptVersionId = "22222222-2222-4222-8222-222222222222"

const snapshot = {
  compiledPrompt: "# Objective\n\nAdd an optional LLM affordance.",
  originalInput: "Add optional prompt review UI.",
  scenario: "feature",
  targetAgent: "codex",
  harnessTemplateId: null,
  projectContextProfileId: null,
  includeProjectContextProfile: false,
  projectContext: null,
  constraints: "No prompt execution.",
  acceptanceCriteria: "LLM review is explicit only.",
  validationCommands: "npx vitest run tests/prompt-quality-llm-affordance.test.ts",
} satisfies PromptQualityReviewSnapshot

type ClickableElementProps = {
  readonly children?: ReactNode
  readonly disabled?: boolean
  readonly onClick?: () => void | Promise<void>
}

function noop(): void {}

function textFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node)
  }

  if (!isValidElement<{ readonly children?: ReactNode }>(node)) {
    return Children.toArray(node)
      .map((child) => textFromNode(child))
      .join("")
  }

  return textFromNode(node.props.children)
}

function clickableByText(node: ReactNode, text: string): (() => void | Promise<void>) | null {
  if (!isValidElement<ClickableElementProps>(node)) {
    return null
  }

  if (node.props.onClick !== undefined && node.props.disabled !== true) {
    const label = textFromNode(node.props.children)
    if (label.includes(text)) {
      return node.props.onClick
    }
  }

  for (const child of Children.toArray(node.props.children)) {
    const click = clickableByText(child, text)
    if (click !== null) {
      return click
    }
  }

  return null
}

describe("prompt quality LLM affordance", () => {
  it("keeps local review primary and calls LLM review only from the explicit LLM button", async () => {
    const actionState = promptQualityActionState({
      currentSnapshot: snapshot,
      operation: "idle",
      promptVersionId,
      review: null,
    })
    let localReviewCount = 0
    let llmReviewCount = 0
    const panel = PromptQualityReviewPanel({
      actionState,
      appliedScore: null,
      error: null,
      llmResult: null,
      operation: "idle",
      review: null,
      versionQualityScore: null,
      onApplyScore: noop,
      onClearError: noop,
      onRunLLMReview: () => {
        llmReviewCount += 1
      },
      onReviewVersionLocally: () => {
        localReviewCount += 1
      },
      onSaveReview: noop,
    })

    renderToStaticMarkup(panel)
    expect(localReviewCount).toBe(0)
    expect(llmReviewCount).toBe(0)

    const localClick = clickableByText(panel, "Review saved version locally")
    await localClick?.()
    expect(localReviewCount).toBe(1)
    expect(llmReviewCount).toBe(0)

    const llmAffordance = PromptQualityLLMReviewAffordance({
      actionState: actionState.runLLMReview,
      llmResult: null,
      operation: "idle",
      sourceUnavailableReason: null,
      onRunLLMReview: () => {
        llmReviewCount += 1
      },
    })
    const llmClick = clickableByText(llmAffordance, "Review instructions with LLM")
    await llmClick?.()
    expect(localReviewCount).toBe(1)
    expect(llmReviewCount).toBe(1)
  })

  it("renders recoverable missing-key and unavailable states without prompt text", () => {
    const actionState = promptQualityActionState({
      currentSnapshot: snapshot,
      operation: "idle",
      promptVersionId,
      review: null,
    })
    const missingKeyMarkup = renderToStaticMarkup(
      createElement(PromptQualityLLMReviewAffordance, {
        actionState: actionState.runLLMReview,
        llmResult: {
          ok: false,
          code: "missing_openai_key",
          message:
            "Add an OpenAI API key in Settings before using LLM prompt review. Local review remains available.",
        },
        operation: "idle",
        sourceUnavailableReason: null,
        onRunLLMReview: noop,
      }),
    )
    const unavailableMarkup = renderToStaticMarkup(
      createElement(PromptQualityLLMReviewAffordance, {
        actionState: actionState.runLLMReview,
        llmResult: {
          ok: false,
          code: "llm_review_unavailable",
          message: "LLM prompt review is not available yet. Use local review instead.",
        },
        operation: "idle",
        sourceUnavailableReason: null,
        onRunLLMReview: noop,
      }),
    )

    expect(missingKeyMarkup).toContain("OpenAI key required")
    expect(missingKeyMarkup).toContain("Local review remains available")
    expect(missingKeyMarkup).not.toContain(snapshot.compiledPrompt)
    expect(unavailableMarkup).toContain("LLM review unavailable")
    expect(unavailableMarkup).toContain("Use local review instead")
  })
})
