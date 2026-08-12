import { describe, expect, it } from "vitest"

import { createPrivacyGuardService } from "../electron/privacy/privacy-guard-service.js"
import { privacySettingsSchema } from "../electron/privacy/privacy-schemas.js"
import { createPromptCompilerService } from "../electron/prompt-compiler/prompt-compiler-service.js"
import { createPromptQualityService } from "../electron/prompt-quality/prompt-quality-service.js"

type Deferred<TValue> = {
  readonly promise: Promise<TValue>
  readonly resolve: (value: TValue) => void
}

function createDeferred<TValue>(): Deferred<TValue> {
  let resolvePromise: ((value: TValue) => void) | null = null
  const promise = new Promise<TValue>((resolve) => {
    resolvePromise = resolve
  })
  return {
    promise,
    resolve(value) {
      if (resolvePromise === null) throw new TypeError("Expected deferred resolver")
      resolvePromise(value)
    },
  }
}

function createRevisionGuard() {
  let locked = false
  let revision = 0

  return {
    lockThenUnlock() {
      locked = true
      revision += 1
      locked = false
      revision += 1
    },
    guard: {
      capture: () => {
        if (locked) throw new Error("Prompter is locked")
        return { revision }
      },
      check: (epoch: { readonly revision: number }) => {
        if (locked || revision !== epoch.revision) throw new Error("Prompter is locked")
      },
    },
  }
}

describe("Phase 20 lock LLM side-effect boundaries", () => {
  it("does not send a compiler request after locking while the API key is pending", async () => {
    const key = createDeferred<string | null>()
    const appLock = createRevisionGuard()
    let requests = 0
    const service = createPromptCompilerService({
      getDefaults: () => ({
        defaultModel: "gpt-4.1-mini",
        defaultTargetAgent: "codex",
        defaultProjectId: null,
        defaultScenario: "feature",
        appTheme: "system",
        compilerDefaultLanguage: "ko",
      }),
      getOpenAIKeyForMainProcessOnly: () => key.promise,
      createClient: () => ({
        createStructuredResponse: async () => {
          requests += 1
          return "{}"
        },
      }),
      privacyGuard: createPrivacyGuardService({
        getPrivacySettings: () => privacySettingsSchema.parse({}),
      }),
      appLockGuard: appLock.guard,
    })

    const compiling = service.analyze({
      originalInput: "Do not expose sensitive prompt content.",
      scenario: "feature",
      targetAgent: "codex",
    })
    appLock.lockThenUnlock()
    key.resolve("sk-test")

    await expect(compiling).rejects.toThrow("Prompter is locked")
    expect(requests).toBe(0)
  })

  it("does not return an LLM review result after locking while the API key is pending", async () => {
    const key = createDeferred<string | null>()
    const appLock = createRevisionGuard()
    const service = createPromptQualityService({
      getPromptAsset: () => null,
      getPromptVersion: () => null,
      getOpenAIKeyForMainProcessOnly: () => key.promise,
      privacyGuard: createPrivacyGuardService({
        getPrivacySettings: () => privacySettingsSchema.parse({}),
      }),
      reviews: {
        createPromptQualityReview: () => {
          throw new Error("Not used")
        },
        listPromptQualityReviewsForVersion: () => [],
        getLatestPromptQualityReview: () => null,
        getPromptQualityReview: () => null,
        applyPromptQualityScoreToVersion: () => {
          throw new Error("Not used")
        },
      },
      appLockGuard: appLock.guard,
    })

    const reviewing = service.reviewPromptQualityWithLLM({
      snapshot: {
        compiledPrompt: "# Objective\nReview the prompt.",
        originalInput: "Review the prompt.",
        scenario: "feature",
        targetAgent: "codex",
        harnessTemplateId: null,
        projectContextProfileId: null,
        includeProjectContextProfile: false,
        projectContext: null,
        constraints: null,
        acceptanceCriteria: null,
        validationCommands: null,
      },
    })
    appLock.lockThenUnlock()
    key.resolve(null)

    await expect(reviewing).rejects.toThrow("Prompter is locked")
  })
})
