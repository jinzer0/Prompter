import { afterEach, describe, expect, it } from "vitest"

import { createPromptQualityService } from "../electron/prompt-quality/prompt-quality-service.js"
import {
  cleanupTestDatabases,
  createTestDatabase,
  promptQualityReviews,
  type TestDatabase,
} from "./prompt-quality-persistence-test-helpers.js"

const draftSnapshot = {
  compiledPrompt: "# Objective\nReview the quality boundary.",
  originalInput: "Review this prompt without sending it automatically.",
  scenario: "feature",
  targetAgent: "codex",
  harnessTemplateId: null,
  projectContextProfileId: null,
  includeProjectContextProfile: false,
  projectContext: null,
  constraints: null,
  acceptanceCriteria: null,
  validationCommands: null,
} as const

afterEach(async () => {
  await cleanupTestDatabases()
})

function createService(
  database: TestDatabase,
  getOpenAIKeyForMainProcessOnly: () => Promise<string | null>,
) {
  return createPromptQualityService({
    getPromptAsset: (id) => database.services.getPromptAsset(id),
    getPromptVersion: (id) => database.services.getPromptVersion(id),
    getOpenAIKeyForMainProcessOnly,
    reviews: promptQualityReviews(database),
  })
}

describe("LLM prompt quality review boundary", () => {
  it("returns a recoverable missing-key result only after an explicit LLM review request", async () => {
    // Given: a main-process service with no configured OpenAI key.
    const database = await createTestDatabase()

    try {
      // When: the explicit LLM review boundary is requested.
      const result = await database.services.reviewPromptQualityWithLLM()

      // Then: the caller receives a safe recoverable response that preserves local review.
      expect(result).toEqual({
        ok: false,
        code: "missing_openai_key",
        message:
          "Add an OpenAI API key in Settings before using LLM prompt review. Local review remains available.",
      })
    } finally {
      database.close()
    }
  })

  it("keeps local draft review independent from the OpenAI key store", async () => {
    // Given: a key store whose reads are observable.
    const database = await createTestDatabase()
    let keyReads = 0

    try {
      const service = createService(database, async () => {
        keyReads += 1
        return null
      })

      // When: the local draft review path is used.
      const result = service.reviewPromptQualityDraft(draftSnapshot)

      // Then: it returns the local result without reading a key or attempting an LLM request.
      expect(result.reviewMode).toBe("local")
      expect(keyReads).toBe(0)
    } finally {
      database.close()
    }
  })

  it("keeps configured raw API keys out of the unavailable-review response", async () => {
    // Given: a key store that yields a raw key while the LLM reviewer is only a skeleton.
    const database = await createTestDatabase()
    const rawAPIKey = "sk-proj-prompt-quality-secret-value"

    try {
      const service = createService(database, async () => rawAPIKey)

      // When: the explicit LLM review boundary is requested.
      const result = await service.reviewPromptQualityWithLLM()

      // Then: the placeholder remains recoverable and never exposes the raw key.
      expect(result).toEqual({
        ok: false,
        code: "llm_review_unavailable",
        message: "LLM prompt review is not available yet. Use local review instead.",
      })
      expect(JSON.stringify(result)).not.toContain(rawAPIKey)
    } finally {
      database.close()
    }
  })

  it("sanitizes unavailable key-store errors", async () => {
    // Given: a key store failure whose message contains sensitive content.
    const database = await createTestDatabase()
    const secretStoreDetail = "secret key-store error detail"

    try {
      const service = createService(database, async () => {
        throw new Error(secretStoreDetail)
      })

      // When: the explicit LLM review boundary reads the unavailable key store.
      const result = await service.reviewPromptQualityWithLLM()

      // Then: the recoverable result excludes the key-store error detail.
      expect(result).toEqual({
        ok: false,
        code: "llm_review_unavailable",
        message: "LLM prompt review is not available yet. Use local review instead.",
      })
      expect(JSON.stringify(result)).not.toContain(secretStoreDetail)
    } finally {
      database.close()
    }
  })
})
