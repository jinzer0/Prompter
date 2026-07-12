import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { z } from "zod"

import { openPrompterDatabase } from "../electron/db/connection.js"
import { createPromptQualityReviewRepository } from "../electron/db/repositories/prompt-quality-reviews.js"
import type { PromptQualityReviewResult, PromptVersion } from "../electron/ipc-types.js"

type ReviewFixture = {
  readonly createdAt: number
  readonly promptVersionId: string
  readonly score: number
}

export type TestDatabase = ReturnType<typeof openPrompterDatabase>

const tempDirectories: string[] = []
const jsonFieldsSchema = z.object({
  dimension_scores: z.string(),
  strengths: z.string(),
  issues: z.string(),
  suggestions: z.string(),
  missing_sections: z.string(),
  warnings: z.string(),
  recommended_clarifying_questions: z.string(),
  snapshot: z.string(),
})
const sqliteForeignKeySchema = z.object({
  from: z.string(),
  table: z.string(),
  to: z.string(),
  on_delete: z.string(),
})
const sqliteIndexSchema = z.object({ name: z.string(), unique: z.number() })

export async function createTestDatabase(): Promise<TestDatabase> {
  const directory = await mkdtemp(join(tmpdir(), "prompter-quality-db-"))
  tempDirectories.push(directory)

  return openPrompterDatabase({
    databasePath: join(directory, "prompter.sqlite"),
    migrationsFolder: join(process.cwd(), "drizzle"),
  })
}

export async function cleanupTestDatabases(): Promise<void> {
  await Promise.all(
    tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  )
}

export function createPromptVersion(database: TestDatabase): PromptVersion {
  const asset = database.services.createPromptAsset({
    title: "Quality review prompt",
    scenario: "feature",
    targetAgent: "codex",
  })

  return database.services.createPromptVersion({
    promptAssetId: asset.id,
    originalInput: "Build the requested feature.",
    compiledPrompt: "# Objective\nBuild the requested feature.",
  })
}

export function promptQualityReviews(database: TestDatabase) {
  return createPromptQualityReviewRepository(database.db)
}

export function reviewForVersion(input: ReviewFixture): PromptQualityReviewResult {
  return {
    id: null,
    source: "prompt_version",
    promptVersionId: input.promptVersionId,
    reviewMode: "local",
    overallScore: input.score,
    grade: "good",
    dimensionScores: {
      clarity: input.score,
      context: input.score,
      scope: input.score,
      constraints: input.score,
      acceptanceCriteria: input.score,
      validation: input.score,
      safety: input.score,
      ambiguityRisk: input.score,
    },
    strengths: ["The prompt has a clear objective."],
    issues: [
      {
        id: "acceptance-details",
        severity: "medium",
        title: "Acceptance details can be clearer",
        description: "The acceptance criteria need more measurable outcomes.",
        evidence: "# Acceptance Criteria",
      },
    ],
    suggestions: [
      {
        id: "add-check",
        priority: "medium",
        title: "Add a validation command",
        description: "State the exact test command to run.",
      },
    ],
    missingSections: [],
    warnings: [],
    recommendedClarifyingQuestions: ["Which acceptance criterion is most important?"],
    scoreExplanation: "The prompt is clear but needs more measurable acceptance criteria.",
    snapshot: {
      compiledPrompt: "# Objective\nBuild the requested feature.",
      originalInput: "Build the requested feature.",
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
    createdAt: input.createdAt,
    improvedPromptDraft: null,
  }
}

export function readJsonFields(database: TestDatabase, reviewId: string) {
  return jsonFieldsSchema.parse(
    database.sqlite
      .prepare(
        `select dimension_scores, strengths, issues, suggestions, missing_sections, warnings,
          recommended_clarifying_questions, snapshot
          from prompt_quality_reviews
          where id = ?`,
      )
      .get(reviewId),
  )
}

export function readReviewForeignKeys(database: TestDatabase) {
  return z
    .array(sqliteForeignKeySchema)
    .parse(
      database.sqlite
        .prepare("select * from pragma_foreign_key_list('prompt_quality_reviews')")
        .all(),
    )
}

export function readReviewIndexes(database: TestDatabase) {
  return z
    .array(sqliteIndexSchema)
    .parse(
      database.sqlite.prepare("select * from pragma_index_list('prompt_quality_reviews')").all(),
    )
}
