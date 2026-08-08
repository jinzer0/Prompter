import type Database from "better-sqlite3"
import { z } from "zod"

import {
  qualityInsightsSchema,
  SCENARIOS,
  TARGET_AGENTS,
  versionActivityInsightsSchema,
} from "../ipc-contract.js"
import type { QualityInsights, VersionActivityInsights } from "../ipc-types.js"
import { qualityBucketForScore } from "./quality-buckets.js"
import { type InsightScope, percentage, scopedDataCte } from "./query-helpers.js"
import { isCurrentVersionStale } from "./thresholds.js"

const scoreRowSchema = z.object({ qualityScore: z.number().nullable() })
const promptRowSchema = z.object({
  promptAssetId: z.string(),
  currentVersionId: z.string(),
  title: z.string(),
  projectId: z.string().nullable(),
  qualityScore: z.number().nullable(),
  updatedAt: z.number().nullable(),
})
const averageRowSchema = z.object({ averageQualityScore: z.number().nullable() })
const scenarioAverageRowSchema = z.object({
  scenario: z.enum(SCENARIOS),
  averageQualityScore: z.number().nullable(),
})
const agentAverageRowSchema = z.object({
  targetAgent: z.enum(TARGET_AGENTS),
  averageQualityScore: z.number().nullable(),
})
const versionRowSchema = z.object({ createdAt: z.number() })
const versionedPromptRowSchema = z.object({
  promptAssetId: z.string(),
  currentVersionId: z.string(),
  title: z.string(),
  projectId: z.string().nullable(),
  versionCount: z.number().int(),
  currentVersionCreatedAt: z.number(),
})
const averageVersionRowSchema = z.object({ averageVersionsPerPrompt: z.number() })

function currentPromptRows(
  sqlite: Database.Database,
  scope: InsightScope,
  orderBy: string,
  nullQuality: boolean,
) {
  return z.array(promptRowSchema).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT promptAssetId, currentVersionId, title, projectId, qualityScore, updatedAt
    FROM current_versions WHERE qualityScore ${nullQuality ? "IS NULL" : "IS NOT NULL"}
    ORDER BY ${orderBy} LIMIT 10
  `)
      .all(scope.projectId, scope.projectId, scope.projectId, scope.projectId),
  )
}

export function getQualityInsights(
  sqlite: Database.Database,
  scope: InsightScope,
): QualityInsights {
  const scores = z.array(scoreRowSchema).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT qualityScore FROM current_versions
  `)
      .all(scope.projectId, scope.projectId, scope.projectId, scope.projectId),
  )
  const average = averageRowSchema.parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT AVG(qualityScore) AS averageQualityScore FROM current_versions
  `)
      .get(scope.projectId, scope.projectId, scope.projectId, scope.projectId),
  )
  const scenarioAverages = z.array(scenarioAverageRowSchema).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT scenario, AVG(qualityScore) AS averageQualityScore FROM current_versions GROUP BY scenario
  `)
      .all(scope.projectId, scope.projectId, scope.projectId, scope.projectId),
  )
  const targetAverages = z.array(agentAverageRowSchema).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT targetAgent, AVG(qualityScore) AS averageQualityScore FROM current_versions GROUP BY targetAgent
  `)
      .all(scope.projectId, scope.projectId, scope.projectId, scope.projectId),
  )
  const scenarioByName = new Map(
    scenarioAverages.map((row) => [row.scenario, row.averageQualityScore]),
  )
  const targetByName = new Map(
    targetAverages.map((row) => [row.targetAgent, row.averageQualityScore]),
  )
  const bucketCounts = new Map<string, number>()
  for (const score of scores) {
    const bucket = qualityBucketForScore(score.qualityScore)
    bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1)
  }
  return qualityInsightsSchema.parse({
    averageQualityScore: average.averageQualityScore,
    scoreDistribution: ["excellent", "good", "usable", "needs_work", "weak", "no_score"].map(
      (bucket) => ({
        bucket,
        count: bucketCounts.get(bucket) ?? 0,
        percentage: percentage(bucketCounts.get(bucket) ?? 0, scores.length),
      }),
    ),
    lowestQualityCurrentPrompts: currentPromptRows(
      sqlite,
      scope,
      "qualityScore ASC, updatedAt DESC, title ASC",
      false,
    ),
    highestQualityPrompts: currentPromptRows(
      sqlite,
      scope,
      "qualityScore DESC, updatedAt DESC, title ASC",
      false,
    ),
    unevaluatedCurrentPrompts: currentPromptRows(sqlite, scope, "updatedAt DESC, title ASC", true),
    scenarioAverageScores: SCENARIOS.map((scenario) => ({
      scenario,
      averageQualityScore: scenarioByName.get(scenario) ?? null,
    })),
    targetAgentAverageScores: TARGET_AGENTS.map((targetAgent) => ({
      targetAgent,
      averageQualityScore: targetByName.get(targetAgent) ?? null,
    })),
  })
}

export function getVersionActivity(
  sqlite: Database.Database,
  scope: InsightScope,
): VersionActivityInsights {
  const versions = z.array(versionRowSchema).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT versions.created_at AS createdAt FROM prompt_versions versions
    INNER JOIN scoped_assets assets ON assets.id = versions.prompt_asset_id
  `)
      .all(scope.projectId, scope.projectId, scope.projectId, scope.projectId),
  )
  const selectedVersions = versions.filter(
    (version) => scope.dateStart === null || version.createdAt >= scope.dateStart,
  )
  const versionedPrompts = z.array(versionedPromptRowSchema).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT current.promptAssetId, current.currentVersionId, current.title, current.projectId,
      COUNT(versions.id) AS versionCount, current.currentVersionCreatedAt
    FROM current_versions current INNER JOIN prompt_versions versions ON versions.prompt_asset_id = current.promptAssetId
    GROUP BY current.promptAssetId, current.currentVersionId, current.title, current.projectId, current.currentVersionCreatedAt
  `)
      .all(scope.projectId, scope.projectId, scope.projectId, scope.projectId),
  )
  const average = averageVersionRowSchema.parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT COALESCE((SELECT CAST(COUNT(*) AS REAL) FROM prompt_versions versions INNER JOIN scoped_assets assets ON assets.id = versions.prompt_asset_id) / NULLIF((SELECT COUNT(*) FROM scoped_assets), 0), 0) AS averageVersionsPerPrompt
  `)
      .get(scope.projectId, scope.projectId, scope.projectId, scope.projectId),
  )
  const activityByTimestamp = new Map<number, number>()
  for (const version of selectedVersions) {
    activityByTimestamp.set(
      version.createdAt,
      (activityByTimestamp.get(version.createdAt) ?? 0) + 1,
    )
  }
  return versionActivityInsightsSchema.parse({
    recentVersionCounts: {
      last7Days: selectedVersions.filter(
        (version) => version.createdAt >= scope.now - 7 * 24 * 60 * 60 * 1000,
      ).length,
      last30Days: selectedVersions.filter(
        (version) => version.createdAt >= scope.now - 30 * 24 * 60 * 60 * 1000,
      ).length,
      all: selectedVersions.length,
    },
    averageVersionsPerPrompt: average.averageVersionsPerPrompt,
    mostVersionedPrompts: [...versionedPrompts]
      .sort(
        (first, second) =>
          second.versionCount - first.versionCount ||
          second.currentVersionCreatedAt - first.currentVersionCreatedAt ||
          first.title.localeCompare(second.title) ||
          first.promptAssetId.localeCompare(second.promptAssetId),
      )
      .slice(0, 10),
    staleCurrentPrompts: versionedPrompts
      .filter((prompt) => isCurrentVersionStale(prompt.currentVersionCreatedAt, scope.now))
      .sort(
        (first, second) =>
          first.currentVersionCreatedAt - second.currentVersionCreatedAt ||
          first.title.localeCompare(second.title) ||
          first.promptAssetId.localeCompare(second.promptAssetId),
      )
      .slice(0, 10),
    activity: [...activityByTimestamp.entries()]
      .sort(([first], [second]) => first - second)
      .map(([timestamp, versionCount]) => ({ timestamp, versionCount })),
  })
}
