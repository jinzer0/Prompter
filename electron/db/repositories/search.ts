import type Database from "better-sqlite3"
import { z } from "zod"
import { promptAssetSchema, promptVersionSchema, tagSchema } from "../../ipc-contract.js"
import type {
  PromptAsset,
  PromptSearchFilter,
  PromptSearchResult,
  PromptSearchTag,
  PromptVersion,
} from "../../ipc-types.js"

const searchRowSchema = z.object({ promptAssetId: z.string().uuid() })
const searchRowsSchema = z.array(searchRowSchema)
const projectNameRowSchema = z.object({ name: z.string().nullable() }).nullish()
const promptSearchTagsSchema = z.array(tagSchema)
const tokenRegex = /[\p{L}\p{N}_]+/gu

type SearchRow = z.infer<typeof searchRowSchema>

export type SearchRepository = {
  readonly rebuildSearchIndex: () => void
  readonly upsertPromptInSearchIndex: (asset: PromptAsset, version: PromptVersion) => void
  readonly deletePromptFromSearchIndex: (promptAssetId: string) => void
  readonly searchPrompts: (filter: PromptSearchFilter) => readonly PromptSearchResult[]
}

function ftsQuery(query: string): string | null {
  const trimmed = query.trim()

  if (trimmed.length === 0) {
    return ""
  }

  const tokens = trimmed.match(tokenRegex) ?? []

  if (tokens.length === 0) {
    return null
  }

  return tokens.map((token) => `"${token}"`).join(" ")
}

function tagIdsFromFilter(filter: PromptSearchFilter): readonly string[] {
  return filter.tagIds ?? []
}

function scenariosFromFilter(filter: PromptSearchFilter): readonly string[] {
  return filter.scenarios ?? (filter.scenario === undefined ? [] : [filter.scenario])
}

function targetAgentsFromFilter(filter: PromptSearchFilter): readonly string[] {
  return filter.targetAgents ?? (filter.targetAgent === undefined ? [] : [filter.targetAgent])
}

function addInFilter(
  clauses: string[],
  parameters: (number | string | null)[],
  column: string,
  values: readonly string[],
): void {
  if (values.length === 0) {
    return
  }

  clauses.push(`${column} IN (${values.map(() => "?").join(", ")})`)
  parameters.push(...values)
}

function findPromptTags(
  sqlite: Database.Database,
  promptAssetId: string,
): readonly PromptSearchTag[] {
  return promptSearchTagsSchema.parse(
    sqlite
      .prepare(
        `
          SELECT tags.id, tags.name, tags.created_at AS createdAt
          FROM tags
          INNER JOIN prompt_tags ON prompt_tags.tag_id = tags.id
          WHERE prompt_tags.prompt_asset_id = ?
          ORDER BY tags.created_at DESC
        `,
      )
      .all(promptAssetId),
  )
}

function findPromptResult(sqlite: Database.Database, row: SearchRow): PromptSearchResult {
  const promptAsset = promptAssetSchema.parse(
    sqlite
      .prepare(
        `
          SELECT
            id,
            project_id AS projectId,
            title,
            scenario,
            target_agent AS targetAgent,
            current_version_id AS currentVersionId,
            parent_prompt_id AS parentPromptId,
            parent_prompt_version_id AS parentPromptVersionId,
            derivation_type AS derivationType,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM prompt_assets
          WHERE id = ?
        `,
      )
      .get(row.promptAssetId),
  )
  const currentVersion = promptVersionSchema.parse(
    sqlite
      .prepare(
        `
          SELECT
            id,
            prompt_asset_id AS promptAssetId,
            version_number AS versionNumber,
            original_input AS originalInput,
            compiled_prompt AS compiledPrompt,
            assumptions,
            questions,
            answers,
            acceptance_criteria AS acceptanceCriteria,
            validation_commands AS validationCommands,
            quality_score AS qualityScore,
            created_at AS createdAt
          FROM prompt_versions
          WHERE id = ? AND prompt_asset_id = ?
        `,
      )
      .get(promptAsset.currentVersionId, row.promptAssetId),
  )
  const projectName = projectNameRowSchema.parse(
    sqlite
      .prepare(
        `
          SELECT projects.name
          FROM projects
          WHERE projects.id = ?
        `,
      )
      .get(promptAsset.projectId),
  )

  return {
    promptAsset,
    currentVersion,
    tags: findPromptTags(sqlite, row.promptAssetId),
    preview: currentVersion.compiledPrompt.slice(0, 240),
    projectName: projectName?.name ?? null,
  }
}

export function rebuildSearchIndexAtomically(sqlite: Database.Database): void {
  sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM prompt_search_fts").run()
    sqlite
      .prepare(
        `
          INSERT INTO prompt_search_fts (
            prompt_asset_id,
            title,
            original_input,
            compiled_prompt
          )
          SELECT
            prompt_assets.id,
            prompt_assets.title,
            prompt_versions.original_input,
            prompt_versions.compiled_prompt
          FROM prompt_assets
          INNER JOIN prompt_versions
            ON prompt_versions.id = prompt_assets.current_version_id
            AND prompt_versions.prompt_asset_id = prompt_assets.id
        `,
      )
      .run()
  })()
}

export function createSearchRepository(sqlite: Database.Database): SearchRepository {
  return {
    rebuildSearchIndex() {
      rebuildSearchIndexAtomically(sqlite)
    },
    upsertPromptInSearchIndex(asset, version) {
      sqlite.prepare("DELETE FROM prompt_search_fts WHERE prompt_asset_id = ?").run(asset.id)
      sqlite
        .prepare(
          `
            INSERT INTO prompt_search_fts (
              prompt_asset_id,
              title,
              original_input,
              compiled_prompt
            ) VALUES (?, ?, ?, ?)
          `,
        )
        .run(asset.id, asset.title, version.originalInput, version.compiledPrompt)
    },
    deletePromptFromSearchIndex(promptAssetId) {
      sqlite.prepare("DELETE FROM prompt_search_fts WHERE prompt_asset_id = ?").run(promptAssetId)
    },
    searchPrompts(filter) {
      const query = ftsQuery(filter.query)

      if (query === null) {
        return []
      }

      const clauses = ["prompt_assets.current_version_id IS NOT NULL"]
      const parameters: (number | string | null)[] = []
      const joinSearch = query.length > 0

      if (joinSearch) {
        clauses.push("prompt_search_fts MATCH ?")
        parameters.push(query)
      }
      if (filter.projectId !== undefined) {
        clauses.push(
          filter.projectId === null
            ? "prompt_assets.project_id IS NULL"
            : "prompt_assets.project_id = ?",
        )
        if (filter.projectId !== null) {
          parameters.push(filter.projectId)
        }
      }

      addInFilter(clauses, parameters, "prompt_assets.scenario", scenariosFromFilter(filter))
      addInFilter(clauses, parameters, "prompt_assets.target_agent", targetAgentsFromFilter(filter))

      for (const tagId of tagIdsFromFilter(filter)) {
        clauses.push(`
          EXISTS (
            SELECT 1
            FROM prompt_tags
            WHERE prompt_tags.prompt_asset_id = prompt_assets.id
              AND prompt_tags.tag_id = ?
          )
        `)
        parameters.push(tagId)
      }

      const rows = searchRowsSchema.parse(
        sqlite
          .prepare(
            `
              SELECT prompt_assets.id AS promptAssetId
              FROM prompt_assets
              INNER JOIN prompt_versions
                ON prompt_versions.id = prompt_assets.current_version_id
                AND prompt_versions.prompt_asset_id = prompt_assets.id
              ${
                joinSearch
                  ? "INNER JOIN prompt_search_fts ON prompt_search_fts.prompt_asset_id = prompt_assets.id"
                  : ""
              }
              WHERE ${clauses.join(" AND ")}
              ORDER BY prompt_assets.updated_at DESC
              LIMIT ? OFFSET ?
            `,
          )
          .all(...parameters, filter.limit ?? 50, filter.offset ?? 0),
      )

      return rows.map((resultRow) => findPromptResult(sqlite, resultRow))
    },
  }
}
