import type Database from "better-sqlite3"
import { z } from "zod"

import type { MaintenanceScanInput } from "../ipc-types.js"

const promptAssetRowsSchema = z.array(
  z.object({
    id: z.string(),
    projectId: z.string().nullable(),
    title: z.string(),
    scenario: z.string(),
    targetAgent: z.string(),
    currentVersionId: z.string().nullable(),
  }),
)
const promptVersionRowsSchema = z.array(
  z.object({
    id: z.string(),
    promptAssetId: z.string(),
    versionNumber: z.number().int(),
    originalInput: z.string(),
    compiledPrompt: z.string(),
    qualityScore: z.number().int().nullable(),
  }),
)
const tagRowsSchema = z.array(
  z.object({ id: z.string(), name: z.string(), promptCount: z.number().int().nonnegative() }),
)
const promptTemplateRowsSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    scenario: z.string(),
    targetAgent: z.string(),
    templateBody: z.string(),
  }),
)
const harnessTemplateRowsSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    scenario: z.string(),
    targetAgent: z.string(),
    templateBody: z.string(),
    requiredFields: z.string().nullable(),
    clarificationPolicy: z.string().nullable(),
  }),
)
const qualityReviewRowsSchema = z.array(
  z.object({
    id: z.string(),
    promptVersionId: z.string(),
    overallScore: z.number().int(),
    createdAt: z.number().int(),
  }),
)
const searchIndexRowsSchema = z.array(
  z.object({
    promptAssetId: z.string(),
    title: z.string(),
    originalInput: z.string(),
    compiledPrompt: z.string(),
  }),
)
const tablePresenceSchema = z.object({ present: z.number() }).nullish()

export type MaintenanceScanSnapshot = {
  readonly assets: z.infer<typeof promptAssetRowsSchema>
  readonly versions: z.infer<typeof promptVersionRowsSchema>
  readonly tags: z.infer<typeof tagRowsSchema>
  readonly promptTemplates: z.infer<typeof promptTemplateRowsSchema>
  readonly harnessTemplates: z.infer<typeof harnessTemplateRowsSchema>
  readonly qualityReviews: z.infer<typeof qualityReviewRowsSchema>
  readonly searchIndex:
    | { readonly status: "available"; readonly rows: z.infer<typeof searchIndexRowsSchema> }
    | { readonly status: "unavailable" }
}

function readSearchIndex(
  sqlite: Database.Database,
  projectId: string | undefined,
): MaintenanceScanSnapshot["searchIndex"] {
  const table = tablePresenceSchema.parse(
    sqlite
      .prepare(
        "SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'prompt_search_fts'",
      )
      .get(),
  )
  if (table === null || table === undefined) {
    return { status: "unavailable" }
  }

  try {
    const query =
      projectId === undefined
        ? `SELECT prompt_asset_id AS promptAssetId, title,
            original_input AS originalInput, compiled_prompt AS compiledPrompt
           FROM prompt_search_fts ORDER BY prompt_asset_id`
        : `SELECT prompt_search_fts.prompt_asset_id AS promptAssetId,
            prompt_search_fts.title, prompt_search_fts.original_input AS originalInput,
            prompt_search_fts.compiled_prompt AS compiledPrompt
           FROM prompt_search_fts
           INNER JOIN prompt_assets ON prompt_assets.id = prompt_search_fts.prompt_asset_id
           WHERE prompt_assets.project_id = ? ORDER BY prompt_search_fts.prompt_asset_id`
    const rows =
      projectId === undefined ? sqlite.prepare(query).all() : sqlite.prepare(query).all(projectId)
    return { status: "available", rows: searchIndexRowsSchema.parse(rows) }
  } catch (error) {
    if (error instanceof Error) {
      return { status: "unavailable" }
    }
    throw error
  }
}

export function readMaintenanceScanSnapshot(
  sqlite: Database.Database,
  input: MaintenanceScanInput,
): MaintenanceScanSnapshot {
  const assets = promptAssetRowsSchema.parse(
    input.projectId === undefined
      ? sqlite
          .prepare(
            `SELECT id, project_id AS projectId, title, scenario,
              target_agent AS targetAgent, current_version_id AS currentVersionId
             FROM prompt_assets ORDER BY id`,
          )
          .all()
      : sqlite
          .prepare(
            `SELECT id, project_id AS projectId, title, scenario,
              target_agent AS targetAgent, current_version_id AS currentVersionId
             FROM prompt_assets WHERE project_id = ? ORDER BY id`,
          )
          .all(input.projectId),
  )
  const versions = promptVersionRowsSchema.parse(
    input.projectId === undefined
      ? sqlite
          .prepare(
            `SELECT id, prompt_asset_id AS promptAssetId, version_number AS versionNumber,
              original_input AS originalInput, compiled_prompt AS compiledPrompt,
              quality_score AS qualityScore FROM prompt_versions ORDER BY id`,
          )
          .all()
      : sqlite
          .prepare(
            `SELECT DISTINCT prompt_versions.id,
              prompt_versions.prompt_asset_id AS promptAssetId,
              prompt_versions.version_number AS versionNumber,
              prompt_versions.original_input AS originalInput,
              prompt_versions.compiled_prompt AS compiledPrompt,
              prompt_versions.quality_score AS qualityScore
             FROM prompt_versions
             LEFT JOIN prompt_assets ON prompt_assets.id = prompt_versions.prompt_asset_id
             WHERE prompt_assets.project_id = ? OR prompt_versions.id IN (
               SELECT current_version_id FROM prompt_assets
               WHERE project_id = ? AND current_version_id IS NOT NULL
             ) ORDER BY prompt_versions.id`,
          )
          .all(input.projectId, input.projectId),
  )
  const tags = tagRowsSchema.parse(
    sqlite
      .prepare(
        `SELECT tags.id, tags.name, COUNT(prompt_tags.prompt_asset_id) AS promptCount
         FROM tags LEFT JOIN prompt_tags ON prompt_tags.tag_id = tags.id
         GROUP BY tags.id, tags.name ORDER BY tags.id`,
      )
      .all(),
  )
  const promptTemplates = promptTemplateRowsSchema.parse(
    sqlite
      .prepare(
        `SELECT id, name, scenario, target_agent AS targetAgent, template_body AS templateBody
         FROM prompt_templates ORDER BY id`,
      )
      .all(),
  )
  const harnessTemplates = harnessTemplateRowsSchema.parse(
    sqlite
      .prepare(
        `SELECT id, name, scenario, target_agent AS targetAgent, template_body AS templateBody,
          required_fields AS requiredFields, clarification_policy AS clarificationPolicy
         FROM harness_templates ORDER BY id`,
      )
      .all(),
  )
  const qualityReviews = qualityReviewRowsSchema.parse(
    input.projectId === undefined
      ? sqlite
          .prepare(
            `SELECT id, prompt_version_id AS promptVersionId,
              overall_score AS overallScore, created_at AS createdAt
             FROM prompt_quality_reviews ORDER BY id`,
          )
          .all()
      : sqlite
          .prepare(
            `SELECT prompt_quality_reviews.id,
              prompt_quality_reviews.prompt_version_id AS promptVersionId,
              prompt_quality_reviews.overall_score AS overallScore,
              prompt_quality_reviews.created_at AS createdAt
             FROM prompt_quality_reviews
             INNER JOIN prompt_versions
               ON prompt_versions.id = prompt_quality_reviews.prompt_version_id
             INNER JOIN prompt_assets ON prompt_assets.id = prompt_versions.prompt_asset_id
             WHERE prompt_assets.project_id = ? ORDER BY prompt_quality_reviews.id`,
          )
          .all(input.projectId),
  )

  return {
    assets,
    versions,
    tags,
    promptTemplates,
    harnessTemplates,
    qualityReviews,
    searchIndex: readSearchIndex(sqlite, input.projectId),
  }
}
