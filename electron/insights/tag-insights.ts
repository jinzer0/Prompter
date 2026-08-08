import type Database from "better-sqlite3"
import { z } from "zod"

import { tagInsightsSchema } from "../ipc-contract.js"
import type { TagInsights } from "../ipc-types.js"
import { findDuplicateTagGroups } from "../maintenance/duplicate-detection.js"
import { type InsightScope, scopedDataCte } from "./query-helpers.js"

const tagRowSchema = z.object({
  tagId: z.string(),
  name: z.string(),
  promptCount: z.number().int(),
})
const projectRowSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  tagCount: z.number().int(),
  taggedPromptCount: z.number().int(),
})
const scenarioRowSchema = z.object({
  scenario: z.string(),
  tagId: z.string(),
  tagName: z.string(),
  promptCount: z.number().int(),
})
const tagIdentityRowSchema = z.object({ id: z.string(), name: z.string() })

export function getTagInsights(sqlite: Database.Database, scope: InsightScope): TagInsights {
  const parameters = [scope.projectId, scope.projectId, scope.projectId, scope.projectId]
  const mostUsedTags = z.array(tagRowSchema).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT tags.id AS tagId, tags.name, COUNT(DISTINCT links.prompt_asset_id) AS promptCount
    FROM tags INNER JOIN prompt_tags links ON links.tag_id = tags.id
    INNER JOIN scoped_assets assets ON assets.id = links.prompt_asset_id
    GROUP BY tags.id, tags.name ORDER BY promptCount DESC, tags.name ASC, tags.id ASC
  `)
      .all(...parameters),
  )
  const unusedTagCount = z.object({ count: z.number().int() }).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT COUNT(*) AS count FROM tags WHERE NOT EXISTS (
      SELECT 1 FROM prompt_tags links INNER JOIN scoped_assets assets ON assets.id = links.prompt_asset_id
      WHERE links.tag_id = tags.id
    )
  `)
      .get(...parameters),
  ).count
  const projectTagDistribution = z.array(projectRowSchema).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT projects.id AS projectId, projects.name AS projectName,
      COUNT(DISTINCT links.tag_id) AS tagCount, COUNT(DISTINCT links.prompt_asset_id) AS taggedPromptCount
    FROM scoped_projects projects LEFT JOIN scoped_assets assets ON assets.project_id = projects.id
    LEFT JOIN prompt_tags links ON links.prompt_asset_id = assets.id
    GROUP BY projects.id, projects.name ORDER BY projects.name ASC, projects.id ASC
  `)
      .all(...parameters),
  )
  const scenarioTagFrequency = z.array(scenarioRowSchema).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT assets.scenario, tags.id AS tagId, tags.name AS tagName, COUNT(*) AS promptCount
    FROM scoped_assets assets INNER JOIN prompt_tags links ON links.prompt_asset_id = assets.id
    INNER JOIN tags ON tags.id = links.tag_id
    GROUP BY assets.scenario, tags.id, tags.name
    ORDER BY assets.scenario ASC, promptCount DESC, tags.name ASC, tags.id ASC
  `)
      .all(...parameters),
  )
  const lowQualityTagConcentration = z.array(tagRowSchema).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT tags.id AS tagId, tags.name, COUNT(*) AS promptCount
    FROM current_versions current INNER JOIN prompt_tags links ON links.prompt_asset_id = current.promptAssetId
    INNER JOIN tags ON tags.id = links.tag_id WHERE current.qualityScore < 60
    GROUP BY tags.id, tags.name ORDER BY promptCount DESC, tags.name ASC, tags.id ASC
  `)
      .all(...parameters),
  )
  const globalTags = z
    .array(tagIdentityRowSchema)
    .parse(sqlite.prepare("SELECT id, name FROM tags").all())
  const duplicateTagCandidateCount = findDuplicateTagGroups(globalTags).length
  return tagInsightsSchema.parse({
    mostUsedTags,
    unusedTagCount,
    projectTagDistribution,
    scenarioTagFrequency,
    lowQualityTagConcentration,
    duplicateTagCandidateCount,
  })
}
