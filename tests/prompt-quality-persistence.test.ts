import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"

import {
  PersistenceNotFoundError,
  PromptQualityReviewAssociationError,
  PromptQualityReviewScoreMismatchError,
} from "../electron/db/errors.js"
import {
  cleanupTestDatabases,
  createPromptVersion,
  createTestDatabase,
  promptQualityReviews,
  readJsonFields,
  readReviewForeignKeys,
  readReviewIndexes,
  reviewForVersion,
} from "./prompt-quality-persistence-test-helpers.js"

const reviewIdSchema = z.string().uuid()
afterEach(async () => {
  await cleanupTestDatabases()
})

async function withTestDatabase(
  run: (database: Awaited<ReturnType<typeof createTestDatabase>>) => void,
): Promise<void> {
  const database = await createTestDatabase()

  try {
    run(database)
  } finally {
    database.close()
  }
}

describe("Prompt quality review persistence", () => {
  it("creates a version-owned review table with a list index", () =>
    withTestDatabase((database) => {
      const foreignKeys = readReviewForeignKeys(database)
      const indexes = readReviewIndexes(database)

      expect(foreignKeys).toContainEqual(
        expect.objectContaining({
          from: "prompt_version_id",
          table: "prompt_versions",
          to: "id",
          on_delete: "CASCADE",
        }),
      )
      expect(indexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "prompt_quality_reviews_prompt_version_created_at_idx",
            unique: 0,
          }),
        ]),
      )
    }))

  it("creates, reads, lists, and returns the latest validated version review", () =>
    withTestDatabase((database) => {
      const version = createPromptVersion(database)
      const firstReview = reviewForVersion({
        promptVersionId: version.id,
        score: 76,
        createdAt: 1_000,
      })
      const secondReview = reviewForVersion({
        promptVersionId: version.id,
        score: 84,
        createdAt: 2_000,
      })

      const first = promptQualityReviews(database).createPromptQualityReview({
        promptVersionId: version.id,
        review: firstReview,
      })
      const second = promptQualityReviews(database).createPromptQualityReview({
        promptVersionId: version.id,
        review: secondReview,
      })
      const secondId = reviewIdSchema.parse(second.id)

      expect(first).toMatchObject({ ...firstReview, id: expect.any(String) })
      expect(second).toMatchObject({ ...secondReview, id: expect.any(String) })
      expect(
        promptQualityReviews(database).listPromptQualityReviewsForVersion({
          promptVersionId: version.id,
        }),
      ).toEqual([second, first])
      expect(
        promptQualityReviews(database).getLatestPromptQualityReview({
          promptVersionId: version.id,
        }),
      ).toEqual(second)
      expect(promptQualityReviews(database).getPromptQualityReview({ reviewId: secondId })).toEqual(
        second,
      )
      expect(readJsonFields(database, secondId)).toEqual({
        dimension_scores: JSON.stringify(second.dimensionScores),
        strengths: JSON.stringify(second.strengths),
        issues: JSON.stringify(second.issues),
        suggestions: JSON.stringify(second.suggestions),
        missing_sections: JSON.stringify(second.missingSections),
        warnings: JSON.stringify(second.warnings),
        recommended_clarifying_questions: JSON.stringify(second.recommendedClarifyingQuestions),
        snapshot: JSON.stringify(second.snapshot),
      })
    }))

  it("does not apply a review score when creating the review", () =>
    withTestDatabase((database) => {
      const version = createPromptVersion(database)
      const review = reviewForVersion({
        promptVersionId: version.id,
        score: 84,
        createdAt: 1_000,
      })

      promptQualityReviews(database).createPromptQualityReview({
        promptVersionId: version.id,
        review,
      })

      expect(database.services.getPromptVersion(version.id)?.qualityScore).toBeNull()
    }))

  it("rejects draft-source saves without persisting reviews", () =>
    withTestDatabase((database) => {
      const version = createPromptVersion(database)

      expect(() =>
        promptQualityReviews(database).createPromptQualityReview({
          promptVersionId: version.id,
          review: {
            ...reviewForVersion({ promptVersionId: version.id, score: 84, createdAt: 1_000 }),
            source: "draft",
            promptVersionId: null,
          },
        }),
      ).toThrow(PromptQualityReviewAssociationError)
      expect(
        promptQualityReviews(database).listPromptQualityReviewsForVersion({
          promptVersionId: version.id,
        }),
      ).toEqual([])
    }))

  it("rejects saves when the review belongs to another version", () =>
    withTestDatabase((database) => {
      const firstVersion = createPromptVersion(database)
      const secondVersion = createPromptVersion(database)
      const review = reviewForVersion({
        promptVersionId: firstVersion.id,
        score: 84,
        createdAt: 1_000,
      })

      expect(() =>
        promptQualityReviews(database).createPromptQualityReview({
          promptVersionId: secondVersion.id,
          review,
        }),
      ).toThrow(PromptQualityReviewAssociationError)
      expect(
        promptQualityReviews(database).listPromptQualityReviewsForVersion({
          promptVersionId: firstVersion.id,
        }),
      ).toEqual([])
      expect(
        promptQualityReviews(database).listPromptQualityReviewsForVersion({
          promptVersionId: secondVersion.id,
        }),
      ).toEqual([])
    }))

  it("treats corrupt persisted review JSON as unavailable", () =>
    withTestDatabase((database) => {
      const version = createPromptVersion(database)
      const created = promptQualityReviews(database).createPromptQualityReview({
        promptVersionId: version.id,
        review: reviewForVersion({ promptVersionId: version.id, score: 84, createdAt: 1_000 }),
      })
      const reviewId = reviewIdSchema.parse(created.id)

      database.sqlite
        .prepare("update prompt_quality_reviews set issues = ? where id = ?")
        .run("{", reviewId)

      expect(promptQualityReviews(database).getPromptQualityReview({ reviewId })).toBeNull()
      expect(
        promptQualityReviews(database).listPromptQualityReviewsForVersion({
          promptVersionId: version.id,
        }),
      ).toEqual([])
      expect(
        promptQualityReviews(database).getLatestPromptQualityReview({
          promptVersionId: version.id,
        }),
      ).toBeNull()
    }))

  it("rejects a requested score that differs from the saved review without changing the version", () =>
    withTestDatabase((database) => {
      const version = createPromptVersion(database)
      const review = promptQualityReviews(database).createPromptQualityReview({
        promptVersionId: version.id,
        review: reviewForVersion({ promptVersionId: version.id, score: 84, createdAt: 1_000 }),
      })
      const reviewId = reviewIdSchema.parse(review.id)

      expect(() =>
        promptQualityReviews(database).applyPromptQualityScoreToVersion({
          promptVersionId: version.id,
          reviewId,
          qualityScore: 83,
        }),
      ).toThrow(PromptQualityReviewScoreMismatchError)
      expect(database.services.getPromptVersion(version.id)?.qualityScore).toBeNull()
    }))

  it("applies a score only to the version that owns the review", () =>
    withTestDatabase((database) => {
      const firstVersion = createPromptVersion(database)
      const secondVersion = database.services.createPromptVersion({
        promptAssetId: firstVersion.promptAssetId,
        originalInput: "Second input",
        compiledPrompt: "# Objective\nSecond compiled prompt",
      })
      const review = promptQualityReviews(database).createPromptQualityReview({
        promptVersionId: firstVersion.id,
        review: reviewForVersion({
          promptVersionId: firstVersion.id,
          score: 84,
          createdAt: 1_000,
        }),
      })
      const reviewId = reviewIdSchema.parse(review.id)

      expect(
        promptQualityReviews(database).applyPromptQualityScoreToVersion({
          promptVersionId: firstVersion.id,
          reviewId,
          qualityScore: review.overallScore,
        }),
      ).toEqual({ promptVersionId: firstVersion.id, qualityScore: review.overallScore })
      expect(database.services.getPromptVersion(firstVersion.id)?.qualityScore).toBe(
        review.overallScore,
      )
      expect(database.services.getPromptVersion(secondVersion.id)?.qualityScore).toBeNull()

      expect(() =>
        promptQualityReviews(database).applyPromptQualityScoreToVersion({
          promptVersionId: secondVersion.id,
          reviewId,
          qualityScore: review.overallScore,
        }),
      ).toThrow(PersistenceNotFoundError)
      expect(database.services.getPromptVersion(firstVersion.id)?.qualityScore).toBe(
        review.overallScore,
      )
      expect(database.services.getPromptVersion(secondVersion.id)?.qualityScore).toBeNull()
    }))
})
