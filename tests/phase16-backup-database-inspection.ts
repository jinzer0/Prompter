import { z } from "zod"

import type { SeededBackupFixture, TestDatabase } from "./phase16-backup-import-test-helpers"

const rawReviewTextSchema = z.object({
  id: z.string(),
  dimensionScores: z.string(),
  strengths: z.string(),
  issues: z.string(),
  suggestions: z.string(),
  missingSections: z.string(),
  warnings: z.string(),
  recommendedClarifyingQuestions: z.string(),
  snapshot: z.string(),
})
const rawBackupRowsSchema = z.object({
  project: z.object({ id: z.string(), name: z.string() }),
  promptAsset: z.object({ id: z.string(), currentVersionId: z.string() }),
  promptVersion: z.object({ id: z.string(), promptAssetId: z.string() }),
  tag: z.object({ id: z.string(), name: z.string() }),
  promptTag: z.object({ promptAssetId: z.string(), tagId: z.string() }),
  projectContextProfile: z.object({ id: z.string(), projectId: z.string() }),
  promptTemplate: z.object({ id: z.string(), sourcePromptVersionId: z.string() }),
  harnessTemplate: z.object({ id: z.string(), name: z.string() }),
  review: rawReviewTextSchema,
})
const ftsRowSchema = z.object({
  promptAssetId: z.string(),
  title: z.string(),
  originalInput: z.string(),
  compiledPrompt: z.string(),
})

export function readRawBackupRows(database: TestDatabase, fixture: SeededBackupFixture) {
  return rawBackupRowsSchema.parse({
    project: database.sqlite
      .prepare("SELECT id, name FROM projects WHERE id = ?")
      .get(fixture.projectId),
    promptAsset: database.sqlite
      .prepare("SELECT id, current_version_id AS currentVersionId FROM prompt_assets WHERE id = ?")
      .get(fixture.promptAssetId),
    promptVersion: database.sqlite
      .prepare("SELECT id, prompt_asset_id AS promptAssetId FROM prompt_versions WHERE id = ?")
      .get(fixture.promptVersionId),
    tag: database.sqlite.prepare("SELECT id, name FROM tags WHERE id = ?").get(fixture.tagId),
    promptTag: database.sqlite
      .prepare(
        "SELECT prompt_asset_id AS promptAssetId, tag_id AS tagId FROM prompt_tags WHERE prompt_asset_id = ? AND tag_id = ?",
      )
      .get(fixture.promptAssetId, fixture.tagId),
    projectContextProfile: database.sqlite
      .prepare("SELECT id, project_id AS projectId FROM project_context_profiles WHERE id = ?")
      .get(fixture.projectContextProfileId),
    promptTemplate: database.sqlite
      .prepare(
        "SELECT id, source_prompt_version_id AS sourcePromptVersionId FROM prompt_templates WHERE id = ?",
      )
      .get(fixture.promptTemplateId),
    harnessTemplate: database.sqlite
      .prepare("SELECT id, name FROM harness_templates WHERE id = ?")
      .get(fixture.harnessTemplateId),
    review: database.sqlite
      .prepare(
        "SELECT id, dimension_scores AS dimensionScores, strengths, issues, suggestions, missing_sections AS missingSections, warnings, recommended_clarifying_questions AS recommendedClarifyingQuestions, snapshot FROM prompt_quality_reviews WHERE id = ?",
      )
      .get(fixture.promptQualityReviewId),
  })
}

export function readBackupFtsRows(database: TestDatabase, promptAssetId: string) {
  return z
    .array(ftsRowSchema)
    .parse(
      database.sqlite
        .prepare(
          "SELECT prompt_asset_id AS promptAssetId, title, original_input AS originalInput, compiled_prompt AS compiledPrompt FROM prompt_search_fts WHERE prompt_asset_id = ?",
        )
        .all(promptAssetId),
    )
}
