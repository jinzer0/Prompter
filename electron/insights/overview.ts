import type Database from "better-sqlite3"
import { z } from "zod"

import {
  dashboardSummarySchema,
  projectHealthInsightsSchema,
  SCENARIOS,
  scenarioDistributionInsightsSchema,
  TARGET_AGENTS,
  targetAgentDistributionInsightsSchema,
} from "../ipc-contract.js"
import type {
  DashboardSummary,
  ProjectHealthInsights,
  ScenarioDistributionInsights,
  TargetAgentDistributionInsights,
} from "../ipc-types.js"
import { type InsightScope, percentage, scopedDataCte } from "./query-helpers.js"
import { VERSION_HEAVY_PROMPT_THRESHOLD } from "./thresholds.js"

const summaryRowSchema = z.object({
  projectCount: z.number().int(),
  promptAssetCount: z.number().int(),
  promptVersionCount: z.number().int(),
  tagCount: z.number().int(),
  promptTemplateCount: z.number().int(),
  harnessTemplateCount: z.number().int(),
  projectContextProfileCount: z.number().int(),
  averageQualityScore: z.number().nullable(),
  unevaluatedCurrentPromptCount: z.number().int(),
  lastUpdatedAt: z.number().nullable(),
})
const projectRowSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  promptAssetCount: z.number().int(),
  promptVersionCount: z.number().int(),
  averageQualityScore: z.number().nullable(),
  unevaluatedCurrentPromptCount: z.number().int(),
  tagCount: z.number().int(),
  contextProfileCount: z.number().int(),
  lastUpdatedAt: z.number().nullable(),
  versionHeavyPromptCount: z.number().int(),
  emptyPromptCount: z.number().int(),
})
const scenarioRowSchema = z.object({
  scenario: z.enum(SCENARIOS),
  count: z.number().int(),
  averageQualityScore: z.number().nullable(),
  unevaluatedCurrentPromptCount: z.number().int(),
  recentPromptCount: z.number().int(),
})
const agentRowSchema = z.object({
  targetAgent: z.enum(TARGET_AGENTS),
  count: z.number().int(),
  averageQualityScore: z.number().nullable(),
  mostCommonScenario: z.enum(SCENARIOS).nullable(),
  unevaluatedCurrentPromptCount: z.number().int(),
})

export function getDashboardSummary(
  sqlite: Database.Database,
  scope: InsightScope,
): DashboardSummary {
  const row = summaryRowSchema.parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT
      (SELECT COUNT(*) FROM scoped_projects) AS projectCount,
      (SELECT COUNT(*) FROM scoped_assets) AS promptAssetCount,
      (SELECT COUNT(*) FROM prompt_versions versions INNER JOIN scoped_assets assets ON assets.id = versions.prompt_asset_id) AS promptVersionCount,
      (SELECT COUNT(*) FROM tags WHERE (? IS NULL OR EXISTS (
        SELECT 1 FROM prompt_tags links INNER JOIN scoped_assets assets ON assets.id = links.prompt_asset_id
        WHERE links.tag_id = tags.id
      ))) AS tagCount,
      (SELECT COUNT(*) FROM prompt_templates templates WHERE (? IS NULL OR templates.source_prompt_asset_id IN (SELECT id FROM scoped_assets))) AS promptTemplateCount,
      (SELECT COUNT(*) FROM harness_templates) AS harnessTemplateCount,
      (SELECT COUNT(*) FROM project_context_profiles profiles INNER JOIN scoped_projects projects ON projects.id = profiles.project_id) AS projectContextProfileCount,
      (SELECT AVG(qualityScore) FROM current_versions) AS averageQualityScore,
      (SELECT COUNT(*) FROM current_versions WHERE qualityScore IS NULL) AS unevaluatedCurrentPromptCount,
      (SELECT MAX(timestamp) FROM (
        SELECT projects.updated_at AS timestamp FROM scoped_projects projects
        UNION ALL SELECT assets.updated_at FROM scoped_assets assets
        UNION ALL SELECT versions.created_at FROM prompt_versions versions INNER JOIN scoped_assets assets ON assets.id = versions.prompt_asset_id
        UNION ALL SELECT profiles.updated_at FROM project_context_profiles profiles INNER JOIN scoped_projects projects ON projects.id = profiles.project_id
        UNION ALL SELECT templates.updated_at FROM prompt_templates templates WHERE (? IS NULL OR templates.source_prompt_asset_id IN (SELECT id FROM scoped_assets))
        UNION ALL SELECT templates.updated_at FROM harness_templates templates
      )) AS lastUpdatedAt
  `)
      .get(
        scope.projectId,
        scope.projectId,
        scope.projectId,
        scope.projectId,
        scope.projectId,
        scope.projectId,
        scope.projectId,
      ),
  )
  return dashboardSummarySchema.parse({ ...row, maintenanceIssueCount: null })
}

export function getProjectHealth(
  sqlite: Database.Database,
  scope: InsightScope,
): ProjectHealthInsights {
  const rows = z.array(projectRowSchema).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT projects.id AS projectId, projects.name AS projectName,
      (SELECT COUNT(*) FROM scoped_assets WHERE project_id = projects.id) AS promptAssetCount,
      (SELECT COUNT(*) FROM prompt_versions versions INNER JOIN scoped_assets assets ON assets.id = versions.prompt_asset_id WHERE assets.project_id = projects.id) AS promptVersionCount,
      (SELECT AVG(qualityScore) FROM current_versions WHERE projectId = projects.id) AS averageQualityScore,
      (SELECT COUNT(*) FROM current_versions WHERE projectId = projects.id AND qualityScore IS NULL) AS unevaluatedCurrentPromptCount,
      (SELECT COUNT(DISTINCT links.tag_id) FROM prompt_tags links INNER JOIN scoped_assets assets ON assets.id = links.prompt_asset_id WHERE assets.project_id = projects.id) AS tagCount,
      (SELECT COUNT(*) FROM project_context_profiles profiles WHERE profiles.project_id = projects.id) AS contextProfileCount,
      (SELECT MAX(timestamp) FROM (
        SELECT projects.updated_at AS timestamp
        UNION ALL SELECT assets.updated_at FROM scoped_assets assets WHERE assets.project_id = projects.id
        UNION ALL SELECT profiles.updated_at FROM project_context_profiles profiles WHERE profiles.project_id = projects.id
        UNION ALL SELECT versions.created_at FROM prompt_versions versions INNER JOIN scoped_assets assets ON assets.id = versions.prompt_asset_id WHERE assets.project_id = projects.id
      )) AS lastUpdatedAt,
       (SELECT COUNT(*) FROM (SELECT versions.prompt_asset_id FROM prompt_versions versions INNER JOIN scoped_assets assets ON assets.id = versions.prompt_asset_id WHERE assets.project_id = projects.id GROUP BY versions.prompt_asset_id HAVING COUNT(*) >= ?)) AS versionHeavyPromptCount,
      (SELECT COUNT(*) FROM scoped_assets assets WHERE assets.project_id = projects.id AND NOT EXISTS (SELECT 1 FROM prompt_versions versions WHERE versions.prompt_asset_id = assets.id)) AS emptyPromptCount
    FROM scoped_projects projects
    ORDER BY lastUpdatedAt DESC, promptAssetCount DESC, averageQualityScore ASC,
      unevaluatedCurrentPromptCount DESC, projectName ASC
  `)
      .all(
        scope.projectId,
        scope.projectId,
        scope.projectId,
        scope.projectId,
        VERSION_HEAVY_PROMPT_THRESHOLD,
      ),
  )
  return projectHealthInsightsSchema.parse({ projects: rows })
}

export function getScenarioDistribution(
  sqlite: Database.Database,
  scope: InsightScope,
): ScenarioDistributionInsights {
  const rows = z.array(scenarioRowSchema).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT assets.scenario, COUNT(*) AS count, AVG(current.qualityScore) AS averageQualityScore,
      SUM(CASE WHEN current.currentVersionId IS NOT NULL AND current.qualityScore IS NULL THEN 1 ELSE 0 END) AS unevaluatedCurrentPromptCount,
      SUM(CASE WHEN (? IS NULL OR assets.updated_at >= ?) THEN 1 ELSE 0 END) AS recentPromptCount
    FROM scoped_assets assets LEFT JOIN current_versions current ON current.promptAssetId = assets.id
    GROUP BY assets.scenario
  `)
      .all(
        scope.projectId,
        scope.projectId,
        scope.projectId,
        scope.projectId,
        scope.dateStart,
        scope.dateStart,
      ),
  )
  const byScenario = new Map(rows.map((row) => [row.scenario, row]))
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  return scenarioDistributionInsightsSchema.parse({
    items: SCENARIOS.map((scenario) => {
      const row = byScenario.get(scenario)
      return {
        scenario,
        count: row?.count ?? 0,
        percentage: percentage(row?.count ?? 0, total),
        averageQualityScore: row?.averageQualityScore ?? null,
        unevaluatedCurrentPromptCount: row?.unevaluatedCurrentPromptCount ?? 0,
        recentPromptCount: row?.recentPromptCount ?? 0,
      }
    }),
  })
}

export function getTargetAgentDistribution(
  sqlite: Database.Database,
  scope: InsightScope,
): TargetAgentDistributionInsights {
  const rows = z.array(agentRowSchema).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT assets.target_agent AS targetAgent, COUNT(*) AS count, AVG(current.qualityScore) AS averageQualityScore,
      (SELECT scenarios.scenario FROM (SELECT scenario, COUNT(*) AS count FROM scoped_assets grouped WHERE grouped.target_agent = assets.target_agent GROUP BY scenario ORDER BY count DESC, scenario ASC LIMIT 1) scenarios) AS mostCommonScenario,
      SUM(CASE WHEN current.currentVersionId IS NOT NULL AND current.qualityScore IS NULL THEN 1 ELSE 0 END) AS unevaluatedCurrentPromptCount
    FROM scoped_assets assets LEFT JOIN current_versions current ON current.promptAssetId = assets.id
    GROUP BY assets.target_agent
  `)
      .all(scope.projectId, scope.projectId, scope.projectId, scope.projectId),
  )
  const byAgent = new Map(rows.map((row) => [row.targetAgent, row]))
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  return targetAgentDistributionInsightsSchema.parse({
    items: TARGET_AGENTS.map((targetAgent) => {
      const row = byAgent.get(targetAgent)
      return {
        targetAgent,
        count: row?.count ?? 0,
        percentage: percentage(row?.count ?? 0, total),
        averageQualityScore: row?.averageQualityScore ?? null,
        mostCommonScenario: row?.mostCommonScenario ?? null,
        unevaluatedCurrentPromptCount: row?.unevaluatedCurrentPromptCount ?? 0,
      }
    }),
  })
}
