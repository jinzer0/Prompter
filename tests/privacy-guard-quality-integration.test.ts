import { describe, expect, it, vi } from "vitest"

import type { PrivacySettings, PromptQualityReviewResult } from "../electron/ipc-types.js"
import { createPrivacyConfirmationSessionStore } from "../electron/privacy/privacy-confirmation-session-store.js"
import {
  createPrivacyGuardService,
  PrivacyConfirmationRequiredError,
} from "../electron/privacy/privacy-guard-service.js"
import { scanSensitiveText } from "../electron/privacy/scan-sensitive-text.js"
import { createPromptQualityService } from "../electron/prompt-quality/prompt-quality-service.js"

const privacySettings = {
  warnBeforeLLM: false,
  warnBeforeExport: false,
  warnBeforeBackup: true,
  enableLibraryScan: true,
} as const satisfies PrivacySettings

const qualitySnapshot = {
  compiledPrompt: "Compiled review target",
  originalInput: "Original review target",
  scenario: "feature",
  targetAgent: "codex",
  harnessTemplateId: null,
  projectContextProfileId: null,
  includeProjectContextProfile: false,
  projectContext: "Review context",
  constraints: "Review constraints",
  acceptanceCriteria: "Review acceptance criteria",
  validationCommands: "npm run test",
} as const satisfies PromptQualityReviewResult["snapshot"]

function requiredConfirmation(
  action: () => Promise<unknown>,
): Promise<PrivacyConfirmationRequiredError> {
  return action().then(
    () => {
      throw new Error("Expected privacy confirmation to be required")
    },
    (error: unknown) => {
      if (error instanceof PrivacyConfirmationRequiredError) {
        return error
      }

      throw error
    },
  )
}

describe("privacy-guarded quality review", () => {
  it("gates the exact review snapshot before key lookup and retains the unavailable result after confirmation", async () => {
    // Given: a high-risk review snapshot and a missing OpenAI key.
    const sessions = createPrivacyConfirmationSessionStore({
      createId: () => "00000000-0000-4000-8000-000000000516",
    })
    const scannedPayloads: string[] = []
    const guard = createPrivacyGuardService({
      getPrivacySettings: () => privacySettings,
      sessions,
      scan: (input) => {
        scannedPayloads.push(input.payload)
        return scanSensitiveText({
          source: "draft",
          text: "Bearer test-token-for-quality-guard-only",
        })
      },
    })
    const keyLookup = vi.fn<() => Promise<string | null>>().mockResolvedValue(null)
    const unavailable = () => {
      throw new Error("Unexpected review repository call")
    }
    const service = createPromptQualityService({
      getPromptAsset: unavailable,
      getPromptVersion: unavailable,
      getOpenAIKeyForMainProcessOnly: keyLookup,
      privacyGuard: guard,
      reviews: {
        createPromptQualityReview: unavailable,
        listPromptQualityReviewsForVersion: unavailable,
        getLatestPromptQualityReview: unavailable,
        getPromptQualityReview: unavailable,
        applyPromptQualityScoreToVersion: unavailable,
      },
    })

    // When: the snapshot review resumes with its one-use confirmation.
    const confirmation = await requiredConfirmation(() =>
      service.reviewPromptQualityWithLLM({ snapshot: qualitySnapshot }),
    )
    const result = await service.reviewPromptQualityWithLLM({
      snapshot: qualitySnapshot,
      privacyConfirmationSessionId: confirmation.privacyConfirmationSessionId,
    })

    // Then: the key is not read before authorization and the current unavailable result remains.
    expect(keyLookup).toHaveBeenCalledTimes(1)
    expect(result.code).toBe("missing_openai_key")
    expect(scannedPayloads).toEqual([
      JSON.stringify(qualitySnapshot),
      JSON.stringify(qualitySnapshot),
    ])
  })
})
