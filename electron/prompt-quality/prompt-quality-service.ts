import { PersistenceNotFoundError } from "../db/errors.js"
import type { PromptQualityReviewRepository } from "../db/repositories/prompt-quality-reviews.js"
import type {
  ApplyPromptQualityScoreToVersionInput,
  ApplyPromptQualityScoreToVersionResult,
  GetLatestPromptQualityReviewInput,
  GetPromptQualityReviewInput,
  ListPromptQualityReviewsForVersionInput,
  PromptAsset,
  PromptQualityReviewResult,
  PromptVersion,
  SavePromptQualityReviewInput,
} from "../ipc-types.js"
import { reviewLocalPromptQuality } from "./local-reviewer.js"

export type PromptQualityServiceConfig = {
  readonly getPromptAsset: (id: string) => PromptAsset | null
  readonly getPromptVersion: (id: string) => PromptVersion | null
  readonly getOpenAIKeyForMainProcessOnly: () => Promise<string | null>
  readonly reviews: PromptQualityReviewRepository
}

export type PromptQualityLLMReviewResult = {
  readonly ok: false
  readonly code: "missing_openai_key" | "llm_review_unavailable"
  readonly message: string
}

export type PromptQualityService = {
  readonly reviewPromptQualityDraft: (
    snapshot: PromptQualityReviewResult["snapshot"],
  ) => PromptQualityReviewResult
  readonly reviewPromptQualityWithLLM: () => Promise<PromptQualityLLMReviewResult>
  readonly reviewPromptQualityVersion: (promptVersionId: string) => PromptQualityReviewResult
  readonly savePromptQualityReview: (
    input: SavePromptQualityReviewInput,
  ) => PromptQualityReviewResult
  readonly listPromptQualityReviewsForVersion: (
    input: ListPromptQualityReviewsForVersionInput,
  ) => readonly PromptQualityReviewResult[]
  readonly getLatestPromptQualityReview: (
    input: GetLatestPromptQualityReviewInput,
  ) => PromptQualityReviewResult | null
  readonly getPromptQualityReview: (
    input: GetPromptQualityReviewInput,
  ) => PromptQualityReviewResult | null
  readonly applyPromptQualityScoreToVersion: (
    input: ApplyPromptQualityScoreToVersionInput,
  ) => ApplyPromptQualityScoreToVersionResult
}

export function createPromptQualityService(
  config: PromptQualityServiceConfig,
): PromptQualityService {
  return {
    reviewPromptQualityDraft(snapshot) {
      return reviewLocalPromptQuality({ snapshot, createdAt: Date.now() })
    },
    async reviewPromptQualityWithLLM() {
      try {
        const apiKey = await config.getOpenAIKeyForMainProcessOnly()

        return apiKey === null
          ? {
              ok: false,
              code: "missing_openai_key",
              message:
                "Add an OpenAI API key in Settings before using LLM prompt review. Local review remains available.",
            }
          : {
              ok: false,
              code: "llm_review_unavailable",
              message: "LLM prompt review is not available yet. Use local review instead.",
            }
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error
        }

        return {
          ok: false,
          code: "llm_review_unavailable",
          message: "LLM prompt review is not available yet. Use local review instead.",
        }
      }
    },
    reviewPromptQualityVersion(promptVersionId) {
      const version = config.getPromptVersion(promptVersionId)
      if (version === null) {
        throw new PersistenceNotFoundError("prompt version", promptVersionId)
      }

      const promptAsset = config.getPromptAsset(version.promptAssetId)
      if (promptAsset === null) {
        throw new PersistenceNotFoundError("prompt asset", version.promptAssetId)
      }

      const versionContext = [
        ["Assumptions", version.assumptions],
        ["Questions", version.questions],
        ["Answers", version.answers],
      ].flatMap(([label, value]) => (value === null ? [] : [`## ${label}\n${value}`]))

      return reviewLocalPromptQuality({
        snapshot: {
          compiledPrompt: version.compiledPrompt,
          originalInput: version.originalInput,
          scenario: promptAsset.scenario,
          targetAgent: promptAsset.targetAgent,
          harnessTemplateId: null,
          projectContextProfileId: null,
          includeProjectContextProfile: false,
          projectContext: null,
          constraints: versionContext.length === 0 ? null : versionContext.join("\n\n"),
          acceptanceCriteria: version.acceptanceCriteria,
          validationCommands: version.validationCommands,
        },
        createdAt: Date.now(),
        source: "prompt_version",
        promptVersionId: version.id,
      })
    },
    savePromptQualityReview(input) {
      return config.reviews.createPromptQualityReview(input)
    },
    listPromptQualityReviewsForVersion(input) {
      return config.reviews.listPromptQualityReviewsForVersion(input)
    },
    getLatestPromptQualityReview(input) {
      return config.reviews.getLatestPromptQualityReview(input)
    },
    getPromptQualityReview(input) {
      return config.reviews.getPromptQualityReview(input)
    },
    applyPromptQualityScoreToVersion(input) {
      return config.reviews.applyPromptQualityScoreToVersion(input)
    },
  }
}
