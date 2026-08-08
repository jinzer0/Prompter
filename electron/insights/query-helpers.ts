import type Database from "better-sqlite3"
import { z } from "zod"

import type { InsightsFilterInput } from "../ipc-types.js"
import { insightsDateRangeStart } from "./date-range.js"

export type InsightScope = {
  readonly dateStart: number | null
  readonly now: number
  readonly projectId: string | null
}

export const scopedDataCte = `
  WITH scoped_projects AS (
    SELECT * FROM projects WHERE (? IS NULL OR id = ?)
  ), scoped_assets AS (
    SELECT * FROM prompt_assets WHERE (? IS NULL OR project_id = ?)
  ), current_versions AS (
    SELECT assets.id AS promptAssetId, assets.project_id AS projectId, assets.title,
      assets.scenario, assets.target_agent AS targetAgent, assets.updated_at AS updatedAt,
      versions.id AS currentVersionId, versions.quality_score AS qualityScore,
      versions.created_at AS currentVersionCreatedAt
    FROM scoped_assets AS assets
    INNER JOIN prompt_versions AS versions
      ON versions.id = assets.current_version_id AND versions.prompt_asset_id = assets.id
  )
`

const countRowSchema = z.object({ count: z.number().int().nonnegative() })

export function count(
  sqlite: Database.Database,
  statement: string,
  parameters: readonly unknown[],
): number {
  return countRowSchema.parse(sqlite.prepare(statement).get(...parameters)).count
}

export function createInsightScope(input: InsightsFilterInput, now: number): InsightScope {
  return {
    dateStart: insightsDateRangeStart(input.dateRange, now),
    now,
    projectId: input.projectId,
  }
}

export function dateParameters(scope: InsightScope): readonly (number | null)[] {
  return [scope.dateStart, scope.dateStart]
}

export function scopeParameters(scope: InsightScope): readonly (string | null)[] {
  return [scope.projectId, scope.projectId, scope.projectId, scope.projectId]
}

export function percentage(countValue: number, total: number): number {
  return total === 0 ? 0 : (countValue * 100) / total
}

export function isBlank(value: string | null): boolean {
  return value === null || value.trim().length === 0
}
