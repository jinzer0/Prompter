import { describe, expect, it } from "vitest"

import { createElectronBridge } from "../electron/bridge"
import { PERSISTENCE_CHANNELS } from "../electron/ipc-contract"
import { createPersistenceIpcHandlers } from "../electron/ipc-handlers"
import {
  draftPromptQualityReviewResponse,
  promptQualityReviewResponse,
  promptQualitySnapshot,
  unavailableLLMReviewResponse,
  validPromptVersionId,
} from "./electron-contract-fixtures"
import { createFailingServices } from "./electron-contract-service-fixture"

describe("Electron shell contract", () => {
  it("routes prompt-quality bridge methods through exact parsed IPC channels", async () => {
    const calls: { readonly channel: string; readonly payload: unknown }[] = []
    const bridge = createElectronBridge(async (channel, payload) => {
      calls.push({ channel, payload })

      if (channel === PERSISTENCE_CHANNELS.reviewPromptQualityDraft) {
        return draftPromptQualityReviewResponse
      }
      if (channel === PERSISTENCE_CHANNELS.reviewPromptQualityWithLLM) {
        return unavailableLLMReviewResponse
      }
      if (
        channel === PERSISTENCE_CHANNELS.reviewPromptQualityVersion ||
        channel === PERSISTENCE_CHANNELS.savePromptQualityReview ||
        channel === PERSISTENCE_CHANNELS.getLatestPromptQualityReview ||
        channel === PERSISTENCE_CHANNELS.getPromptQualityReview
      ) {
        return promptQualityReviewResponse
      }
      if (channel === PERSISTENCE_CHANNELS.listPromptQualityReviewsForVersion) {
        return [promptQualityReviewResponse]
      }
      if (channel === PERSISTENCE_CHANNELS.applyPromptQualityScoreToVersion) {
        return { promptVersionId: validPromptVersionId, qualityScore: 82 }
      }

      throw new Error(`Unexpected channel ${channel}`)
    })
    const draftInput = { ...promptQualitySnapshot, reviewMode: "local" } as const
    const versionInput = { promptVersionId: validPromptVersionId, reviewMode: "local" } as const

    await expect(bridge.promptQuality.reviewDraft(draftInput)).resolves.toEqual(
      draftPromptQualityReviewResponse,
    )
    await expect(bridge.promptQuality.reviewWithLLM(promptQualitySnapshot)).resolves.toEqual(
      unavailableLLMReviewResponse,
    )
    await expect(bridge.promptQuality.reviewVersion(versionInput)).resolves.toEqual(
      promptQualityReviewResponse,
    )
    await expect(
      bridge.promptQuality.saveReview({
        promptVersionId: validPromptVersionId,
        review: promptQualityReviewResponse,
      }),
    ).resolves.toEqual(promptQualityReviewResponse)
    await expect(
      bridge.promptQuality.listReviewsForVersion({ promptVersionId: validPromptVersionId }),
    ).resolves.toEqual([promptQualityReviewResponse])
    await expect(
      bridge.promptQuality.getLatestReview({ promptVersionId: validPromptVersionId }),
    ).resolves.toEqual(promptQualityReviewResponse)
    await expect(
      bridge.promptQuality.getReview({ reviewId: promptQualityReviewResponse.id }),
    ).resolves.toEqual(promptQualityReviewResponse)
    await expect(
      bridge.promptQuality.applyScoreToVersion({
        promptVersionId: validPromptVersionId,
        reviewId: promptQualityReviewResponse.id,
        qualityScore: 82,
      }),
    ).resolves.toEqual({ promptVersionId: validPromptVersionId, qualityScore: 82 })

    expect(calls).toEqual([
      { channel: "prompter:prompt-quality:review-draft", payload: draftInput },
      { channel: "prompter:prompt-quality:review-llm", payload: promptQualitySnapshot },
      { channel: "prompter:prompt-quality:review-version", payload: versionInput },
      {
        channel: "prompter:prompt-quality:save-review",
        payload: { promptVersionId: validPromptVersionId, review: promptQualityReviewResponse },
      },
      {
        channel: "prompter:prompt-quality:list-for-version",
        payload: { promptVersionId: validPromptVersionId, limit: 50, offset: 0 },
      },
      {
        channel: "prompter:prompt-quality:get-latest",
        payload: { promptVersionId: validPromptVersionId },
      },
      {
        channel: "prompter:prompt-quality:get",
        payload: { reviewId: promptQualityReviewResponse.id },
      },
      {
        channel: "prompter:prompt-quality:apply-score-to-version",
        payload: {
          promptVersionId: validPromptVersionId,
          reviewId: promptQualityReviewResponse.id,
          qualityScore: 82,
        },
      },
    ])
  })

  it("rejects malformed prompt-quality payloads before service calls", () => {
    let called = false
    const handlers = createPersistenceIpcHandlers(
      createFailingServices(() => {
        called = true
      }),
    )

    expect(() =>
      handlers.reviewPromptQualityVersion({
        promptVersionId: "not-a-uuid",
        reviewMode: "local",
      }),
    ).toThrow(/promptVersionId/)
    expect(() =>
      handlers.reviewPromptQualityDraft({
        ...promptQualitySnapshot,
        compiledPrompt: "   ",
        reviewMode: "local",
      }),
    ).toThrow(/compiledPrompt/)
    expect(() =>
      handlers.reviewPromptQualityVersion({
        promptVersionId: validPromptVersionId,
        reviewMode: "automatic",
      }),
    ).toThrow(/reviewMode/)
    expect(() =>
      handlers.reviewPromptQualityDraft({
        ...promptQualitySnapshot,
        scenario: "run",
        reviewMode: "local",
      }),
    ).toThrow(/scenario/)
    expect(() =>
      handlers.savePromptQualityReview({
        promptVersionId: validPromptVersionId,
        review: { ...promptQualityReviewResponse, grade: "excellent_plus" },
      }),
    ).toThrow(/grade/)
    expect(() =>
      handlers.applyPromptQualityScoreToVersion({
        promptVersionId: validPromptVersionId,
        reviewId: promptQualityReviewResponse.id,
        qualityScore: 101,
      }),
    ).toThrow(/qualityScore/)
    expect(called).toBe(false)
  })

  it("rejects malformed prompt-quality service and bridge responses", async () => {
    const handlers = createPersistenceIpcHandlers({
      ...createFailingServices(() => undefined),
      reviewPromptQualityDraft: () => ({ ...draftPromptQualityReviewResponse, overallScore: 101 }),
    })
    const bridge = createElectronBridge(async () => ({
      ...draftPromptQualityReviewResponse,
      overallScore: 101,
    }))
    const draftInput = { ...promptQualitySnapshot, reviewMode: "local" } as const

    expect(() => handlers.reviewPromptQualityDraft(draftInput)).toThrow(/overallScore/)
    await expect(bridge.promptQuality.reviewDraft(draftInput)).rejects.toThrow(/overallScore/)
  })
})
