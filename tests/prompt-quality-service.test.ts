import { randomUUID } from "node:crypto"

import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"

import { PersistenceNotFoundError } from "../electron/db/errors.js"
import {
  cleanupTestDatabases,
  createTestDatabase,
  type TestDatabase,
} from "./prompt-quality-persistence-test-helpers.js"

const draftSnapshot = {
  compiledPrompt: `# Objective
Ship the quality review service.

# Context
The review stays in the main process.

# Task
Review the supplied prompt instructions.

# Scope
Do not save or execute the prompt.

# Constraints
Never read repository paths.

# Acceptance Criteria
The local review returns an unsaved result.

# Validation
npx vitest run tests/prompt-quality.test.ts

# Working Instructions
Do not log the prompt body.

# Final Response Format
Return the review result.`,
  originalInput: "Review the draft prompt without saving it.",
  scenario: "feature",
  targetAgent: "codex",
  harnessTemplateId: null,
  projectContextProfileId: null,
  includeProjectContextProfile: false,
  projectContext: null,
  constraints: "Do not persist draft reviews.",
  acceptanceCriteria: "The result is unsaved.",
  validationCommands: "npx vitest run tests/prompt-quality.test.ts",
} as const

afterEach(async () => {
  await cleanupTestDatabases()
})

describe("Prompt quality review service", () => {
  it("returns a draft review without writing a review row", async () => {
    // Given: a database and a local-only draft snapshot.
    const database = await createTestDatabase()

    try {
      // When: the main-process service reviews the draft.
      const review = database.services.reviewPromptQualityDraft(draftSnapshot)

      // Then: the result is unsaved and the review table remains empty.
      expect(review).toMatchObject({
        id: null,
        source: "draft",
        promptVersionId: null,
        reviewMode: "local",
      })
      expect(review.snapshot).toEqual(draftSnapshot)
      expect(review.createdAt).toEqual(expect.any(Number))
      expect(reviewCount(database)).toBe(0)
    } finally {
      database.close()
    }
  })

  it("loads a saved version into a local review snapshot without saving the review", async () => {
    // Given: a saved prompt version with every version-specific review field.
    const database = await createTestDatabase()

    try {
      const version = createVersionForReview(database)

      // When: the service reviews that saved version.
      const review = database.services.reviewPromptQualityVersion(version.id)

      // Then: the exact persisted prompt data is represented in an unsaved local review.
      expect(review).toMatchObject({
        id: null,
        source: "prompt_version",
        promptVersionId: version.id,
        reviewMode: "local",
      })
      expect(review.snapshot).toEqual({
        compiledPrompt: version.compiledPrompt,
        originalInput: version.originalInput,
        scenario: "feature",
        targetAgent: "codex",
        harnessTemplateId: null,
        projectContextProfileId: null,
        includeProjectContextProfile: false,
        projectContext: null,
        constraints:
          "## Assumptions\nKeep the review local.\n\n## Questions\nWhich test covers the service?\n\n## Answers\nThe focused Vitest suite.",
        acceptanceCriteria: "The explicit save action persists one review.",
        validationCommands: "npx vitest run tests/prompt-quality.test.ts",
      })
      expect(reviewCount(database)).toBe(0)
    } finally {
      database.close()
    }
  })

  it("persists and applies a version score only through explicit saved-review actions", async () => {
    // Given: an unsaved review for a persisted prompt version.
    const database = await createTestDatabase()

    try {
      const version = createVersionForReview(database)
      const reviewed = database.services.reviewPromptQualityVersion(version.id)

      // When: score application is attempted before saving, then the review is explicitly saved.
      expect(() =>
        database.services.applyPromptQualityScoreToVersion({
          promptVersionId: version.id,
          reviewId: randomUUID(),
          qualityScore: reviewed.overallScore,
        }),
      ).toThrow(PersistenceNotFoundError)
      expect(database.services.getPromptVersion(version.id)?.qualityScore).toBeNull()

      const saved = database.services.savePromptQualityReview({
        promptVersionId: version.id,
        review: reviewed,
      })
      const savedReviewId = z.string().uuid().parse(saved.id)

      // Then: persistence and score mutation occur only through their explicit service methods.
      expect(savedReviewId).toEqual(expect.any(String))
      expect(reviewCount(database)).toBe(1)
      expect(
        database.services.listPromptQualityReviewsForVersion({ promptVersionId: version.id }),
      ).toEqual([saved])
      expect(
        database.services.getLatestPromptQualityReview({ promptVersionId: version.id }),
      ).toEqual(saved)
      expect(database.services.getPromptQualityReview({ reviewId: savedReviewId })).toEqual(saved)
      expect(
        database.services.applyPromptQualityScoreToVersion({
          promptVersionId: version.id,
          reviewId: savedReviewId,
          qualityScore: saved.overallScore,
        }),
      ).toEqual({ promptVersionId: version.id, qualityScore: saved.overallScore })
      expect(database.services.getPromptVersion(version.id)?.qualityScore).toBe(saved.overallScore)
    } finally {
      database.close()
    }
  })

  it("reports a missing version without disclosing prompt body text", async () => {
    // Given: a saved prompt body and an unrelated missing version identifier.
    const database = await createTestDatabase()

    try {
      const secretPromptBody = "private prompt body must never appear in errors"
      createVersionForReview(database, secretPromptBody)
      const missingVersionId = randomUUID()

      // When: the service is asked to review the missing version.

      // Then: the recoverable not-found error identifies only the missing version.
      expect(() => database.services.reviewPromptQualityVersion(missingVersionId)).toThrow(
        PersistenceNotFoundError,
      )
      expect(() => database.services.reviewPromptQualityVersion(missingVersionId)).not.toThrow(
        secretPromptBody,
      )
    } finally {
      database.close()
    }
  })
})

function createVersionForReview(
  database: TestDatabase,
  compiledPrompt: string = draftSnapshot.compiledPrompt,
) {
  const asset = database.services.createPromptAsset({
    title: "Saved quality review prompt",
    scenario: "feature",
    targetAgent: "codex",
  })

  return database.services.createPromptVersion({
    promptAssetId: asset.id,
    originalInput: "Review the saved prompt version.",
    compiledPrompt,
    assumptions: "Keep the review local.",
    questions: "Which test covers the service?",
    answers: "The focused Vitest suite.",
    acceptanceCriteria: "The explicit save action persists one review.",
    validationCommands: "npx vitest run tests/prompt-quality.test.ts",
  })
}

function reviewCount(database: TestDatabase): number {
  const count = database.sqlite
    .prepare("select count(*) as count from prompt_quality_reviews")
    .pluck()
    .get()

  return z.number().parse(count)
}
