import { and, desc, eq } from "drizzle-orm"

import {
  applyPromptQualityScoreToVersionResultSchema,
  promptQualityReviewResultSchema,
} from "../../ipc-contract.js"
import type {
  ApplyPromptQualityScoreToVersionInput,
  ApplyPromptQualityScoreToVersionResult,
  GetLatestPromptQualityReviewInput,
  GetPromptQualityReviewInput,
  ListPromptQualityReviewsForVersionInput,
  PromptQualityReviewResult,
  SavePromptQualityReviewInput,
} from "../../ipc-types.js"
import {
  PromptQualityReviewAssociationError,
  PromptQualityReviewScoreMismatchError,
} from "../errors.js"
import * as schema from "../schema.js"
import { type AppDatabase, createId, requireRow } from "./common.js"

type PromptQualityReviewRow = typeof schema.promptQualityReviews.$inferSelect
type SavedPromptQualityReview = PromptQualityReviewResult & {
  readonly promptVersionId: string
  readonly source: "prompt_version"
}

export type PromptQualityReviewRepository = {
  readonly createPromptQualityReview: (
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

function parseJson(text: string): unknown | null {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function parseReview(row: PromptQualityReviewRow): PromptQualityReviewResult | null {
  const parsed = promptQualityReviewResultSchema.safeParse({
    id: row.id,
    source: row.source,
    promptVersionId: row.promptVersionId,
    reviewMode: row.reviewMode,
    overallScore: row.overallScore,
    grade: row.grade,
    dimensionScores: parseJson(row.dimensionScores),
    strengths: parseJson(row.strengths),
    issues: parseJson(row.issues),
    suggestions: parseJson(row.suggestions),
    missingSections: parseJson(row.missingSections),
    warnings: parseJson(row.warnings),
    recommendedClarifyingQuestions: parseJson(row.recommendedClarifyingQuestions),
    scoreExplanation: row.scoreExplanation,
    snapshot: parseJson(row.snapshot),
    createdAt: row.createdAt,
    improvedPromptDraft: row.improvedPromptDraft,
  })

  return parsed.success ? parsed.data : null
}

function validSavedReview(input: SavePromptQualityReviewInput): SavedPromptQualityReview {
  const review = promptQualityReviewResultSchema.parse(input.review)

  if (review.source !== "prompt_version") {
    throw new PromptQualityReviewAssociationError(input.promptVersionId)
  }
  const promptVersionId = review.promptVersionId
  if (promptVersionId === null || promptVersionId !== input.promptVersionId) {
    throw new PromptQualityReviewAssociationError(input.promptVersionId)
  }

  return { ...review, source: "prompt_version", promptVersionId }
}

function reviewValues(review: SavedPromptQualityReview, id: string) {
  return {
    id,
    promptVersionId: review.promptVersionId,
    source: review.source,
    reviewMode: review.reviewMode,
    overallScore: review.overallScore,
    grade: review.grade,
    dimensionScores: JSON.stringify(review.dimensionScores),
    strengths: JSON.stringify(review.strengths),
    issues: JSON.stringify(review.issues),
    suggestions: JSON.stringify(review.suggestions),
    missingSections: JSON.stringify(review.missingSections),
    warnings: JSON.stringify(review.warnings),
    recommendedClarifyingQuestions: JSON.stringify(review.recommendedClarifyingQuestions),
    scoreExplanation: review.scoreExplanation,
    snapshot: JSON.stringify(review.snapshot),
    improvedPromptDraft: review.improvedPromptDraft,
    createdAt: review.createdAt,
  }
}

function reviewRowsForVersion(
  db: AppDatabase,
  promptVersionId: string,
): readonly PromptQualityReviewRow[] {
  return db
    .select()
    .from(schema.promptQualityReviews)
    .where(eq(schema.promptQualityReviews.promptVersionId, promptVersionId))
    .orderBy(desc(schema.promptQualityReviews.createdAt), desc(schema.promptQualityReviews.id))
    .all()
}

function parsedReviews(
  rows: readonly PromptQualityReviewRow[],
): readonly PromptQualityReviewResult[] {
  return rows.flatMap((row) => {
    const review = parseReview(row)
    return review === null ? [] : [review]
  })
}

export function createPromptQualityReviewRepository(
  db: AppDatabase,
): PromptQualityReviewRepository {
  return {
    createPromptQualityReview(input) {
      const review = validSavedReview(input)

      requireRow(
        db
          .select({ id: schema.promptVersions.id })
          .from(schema.promptVersions)
          .where(eq(schema.promptVersions.id, input.promptVersionId))
          .get(),
        "prompt version",
        input.promptVersionId,
      )
      const saved = requireRow(
        db
          .insert(schema.promptQualityReviews)
          .values(reviewValues(review, createId()))
          .returning()
          .get(),
        "prompt quality review",
        input.promptVersionId,
      )

      return requireRow(parseReview(saved) ?? undefined, "prompt quality review", saved.id)
    },
    listPromptQualityReviewsForVersion(input) {
      const reviews = parsedReviews(reviewRowsForVersion(db, input.promptVersionId))
      const offset = input.offset ?? 0
      const limit = input.limit ?? 50

      return reviews.slice(offset, offset + limit)
    },
    getLatestPromptQualityReview(input) {
      return parsedReviews(reviewRowsForVersion(db, input.promptVersionId))[0] ?? null
    },
    getPromptQualityReview(input) {
      const row =
        db
          .select()
          .from(schema.promptQualityReviews)
          .where(eq(schema.promptQualityReviews.id, input.reviewId))
          .get() ?? null

      return row === null ? null : parseReview(row)
    },
    applyPromptQualityScoreToVersion(input) {
      return db.transaction((tx) => {
        const saved = requireRow(
          tx
            .select()
            .from(schema.promptQualityReviews)
            .where(
              and(
                eq(schema.promptQualityReviews.id, input.reviewId),
                eq(schema.promptQualityReviews.promptVersionId, input.promptVersionId),
              ),
            )
            .get(),
          "prompt quality review",
          input.reviewId,
        )
        const review = requireRow(
          parseReview(saved) ?? undefined,
          "prompt quality review",
          input.reviewId,
        )
        if (
          review.source !== "prompt_version" ||
          review.promptVersionId !== input.promptVersionId
        ) {
          throw new PromptQualityReviewAssociationError(input.promptVersionId)
        }
        if (input.qualityScore !== review.overallScore) {
          throw new PromptQualityReviewScoreMismatchError({
            reviewId: input.reviewId,
            promptVersionId: input.promptVersionId,
            expectedScore: review.overallScore,
            requestedScore: input.qualityScore,
          })
        }
        const updated = requireRow(
          tx
            .update(schema.promptVersions)
            .set({ qualityScore: review.overallScore })
            .where(eq(schema.promptVersions.id, input.promptVersionId))
            .returning()
            .get(),
          "prompt version",
          input.promptVersionId,
        )

        return applyPromptQualityScoreToVersionResultSchema.parse({
          promptVersionId: updated.id,
          qualityScore: updated.qualityScore,
        })
      })
    },
  }
}
