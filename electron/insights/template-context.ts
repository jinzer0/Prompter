import type Database from "better-sqlite3"
import { z } from "zod"

import { extractTemplateVariables } from "../../shared/prompt-template-variables.js"

import {
  projectContextInsightsSchema,
  SCENARIOS,
  TARGET_AGENTS,
  templateInsightsSchema,
} from "../ipc-contract.js"
import type { ProjectContextInsights, TemplateInsights } from "../ipc-types.js"
import { type InsightScope, isBlank, percentage, scopedDataCte } from "./query-helpers.js"

const distributionRowSchema = z.object({ key: z.string(), count: z.number().int() })
const templateRowSchema = z.object({
  promptTemplateId: z.string(),
  name: z.string(),
  scenario: z.enum(SCENARIOS),
  targetAgent: z.enum(TARGET_AGENTS),
  sourcePromptAssetId: z.string().nullable(),
  sourcePromptVersionId: z.string().nullable(),
  templateBody: z.string(),
  updatedAt: z.number(),
})
const harnessRowSchema = z.object({
  requiredFields: z.string().nullable(),
  clarificationPolicy: z.string().nullable(),
})
const contextRowSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  profileCount: z.number().int(),
})
const profileRowSchema = z.object({
  techStack: z.string().nullable(),
  validationCommands: z.string().nullable(),
  forbiddenActions: z.string().nullable(),
  repoPath: z.string().nullable(),
})

function templateScope(scope: InsightScope): string {
  return scope.projectId === null
    ? ""
    : "WHERE templates.source_prompt_asset_id IN (SELECT id FROM scoped_assets)"
}

function placeholderCount(body: string): number {
  return extractTemplateVariables(body).length
}

function safeJson(value: string | null, schema: z.ZodType): boolean {
  if (value === null) return true
  try {
    return schema.safeParse(JSON.parse(value)).success
  } catch {
    return false
  }
}

export function getTemplateInsights(
  sqlite: Database.Database,
  scope: InsightScope,
): TemplateInsights {
  const parameters = [scope.projectId, scope.projectId, scope.projectId, scope.projectId]
  const scopeClause = templateScope(scope)
  const templates = z.array(templateRowSchema).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT templates.id AS promptTemplateId, templates.name, templates.scenario, templates.target_agent AS targetAgent,
      templates.source_prompt_asset_id AS sourcePromptAssetId, templates.source_prompt_version_id AS sourcePromptVersionId,
      templates.template_body AS templateBody, templates.updated_at AS updatedAt
    FROM prompt_templates templates ${scopeClause}
  `)
      .all(...parameters),
  )
  const harnesses = z
    .array(harnessRowSchema)
    .parse(
      sqlite
        .prepare(
          "SELECT required_fields AS requiredFields, clarification_policy AS clarificationPolicy FROM harness_templates",
        )
        .all(),
    )
  const missingSourcePromptTemplateCount = z.object({ count: z.number().int() }).parse(
    sqlite
      .prepare(`${scopedDataCte}
      SELECT COUNT(*) AS count FROM prompt_templates templates
      LEFT JOIN prompt_assets sources ON sources.id = templates.source_prompt_asset_id
      ${scopeClause.length === 0 ? "WHERE" : "AND"} templates.source_prompt_asset_id IS NOT NULL AND sources.id IS NULL
    `)
      .get(...parameters),
  ).count
  const templateCount = templates.length
  const templateByScenario = new Map<string, number>()
  const templateByAgent = new Map<string, number>()
  for (const template of templates) {
    templateByScenario.set(template.scenario, (templateByScenario.get(template.scenario) ?? 0) + 1)
    templateByAgent.set(template.targetAgent, (templateByAgent.get(template.targetAgent) ?? 0) + 1)
  }
  const harnessByScenario = z
    .array(distributionRowSchema)
    .parse(
      sqlite
        .prepare(
          "SELECT scenario AS key, COUNT(*) AS count FROM harness_templates GROUP BY scenario",
        )
        .all(),
    )
  const harnessByAgent = z
    .array(distributionRowSchema)
    .parse(
      sqlite
        .prepare(
          "SELECT target_agent AS key, COUNT(*) AS count FROM harness_templates GROUP BY target_agent",
        )
        .all(),
    )
  const harnessScenarioCounts = new Map(harnessByScenario.map((row) => [row.key, row.count]))
  const harnessAgentCounts = new Map(harnessByAgent.map((row) => [row.key, row.count]))
  const requiredFieldsSchema = z.array(z.string().trim().min(1))
  const clarificationPolicySchema = z.record(z.string(), z.unknown())
  return templateInsightsSchema.parse({
    promptTemplateCount: templateCount,
    harnessTemplateCount: harnesses.length,
    promptTemplatesByScenario: SCENARIOS.map((scenario) => ({
      scenario,
      count: templateByScenario.get(scenario) ?? 0,
      percentage: percentage(templateByScenario.get(scenario) ?? 0, templateCount),
    })),
    promptTemplatesByTargetAgent: TARGET_AGENTS.map((targetAgent) => ({
      targetAgent,
      count: templateByAgent.get(targetAgent) ?? 0,
      percentage: percentage(templateByAgent.get(targetAgent) ?? 0, templateCount),
    })),
    sourcePromptTemplateCount: templates.filter((template) => template.sourcePromptAssetId !== null)
      .length,
    missingSourcePromptTemplateCount,
    placeholderHeavyPromptTemplates: templates
      .map((template) => ({
        ...template,
        placeholderCount: placeholderCount(template.templateBody),
      }))
      .sort(
        (first, second) =>
          second.placeholderCount - first.placeholderCount ||
          second.updatedAt - first.updatedAt ||
          first.name.localeCompare(second.name),
      )
      .slice(0, 10)
      .map(({ templateBody, ...template }) => template),
    recentPromptTemplates: templates
      .filter((template) => scope.dateStart === null || template.updatedAt >= scope.dateStart)
      .sort(
        (first, second) =>
          second.updatedAt - first.updatedAt || first.name.localeCompare(second.name),
      )
      .slice(0, 10)
      .map(({ templateBody, ...template }) => ({
        ...template,
        placeholderCount: placeholderCount(templateBody),
      })),
    harnessTemplatesByScenario: SCENARIOS.map((scenario) => ({
      scenario,
      count: harnessScenarioCounts.get(scenario) ?? 0,
      percentage: percentage(harnessScenarioCounts.get(scenario) ?? 0, harnesses.length),
    })),
    harnessTemplatesByTargetAgent: TARGET_AGENTS.map((targetAgent) => ({
      targetAgent,
      count: harnessAgentCounts.get(targetAgent) ?? 0,
      percentage: percentage(harnessAgentCounts.get(targetAgent) ?? 0, harnesses.length),
    })),
    invalidHarnessTemplateCount: harnesses.filter(
      (harness) =>
        !safeJson(harness.requiredFields, requiredFieldsSchema) ||
        !safeJson(harness.clarificationPolicy, clarificationPolicySchema),
    ).length,
  })
}

export function getProjectContextInsights(
  sqlite: Database.Database,
  scope: InsightScope,
): ProjectContextInsights {
  const parameters = [scope.projectId, scope.projectId, scope.projectId, scope.projectId]
  const projectProfiles = z.array(contextRowSchema).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT projects.id AS projectId, projects.name AS projectName, COUNT(profiles.id) AS profileCount
    FROM scoped_projects projects LEFT JOIN project_context_profiles profiles ON profiles.project_id = projects.id
    GROUP BY projects.id, projects.name ORDER BY projects.name ASC, projects.id ASC
  `)
      .all(...parameters),
  )
  const profiles = z.array(profileRowSchema).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT profiles.tech_stack AS techStack, profiles.validation_commands AS validationCommands,
      profiles.forbidden_actions AS forbiddenActions, profiles.repo_path AS repoPath
    FROM project_context_profiles profiles INNER JOIN scoped_projects projects ON projects.id = profiles.project_id
  `)
      .all(...parameters),
  )
  const projectsWithoutDefaultProfileCount = z.object({ count: z.number().int() }).parse(
    sqlite
      .prepare(`${scopedDataCte}
    SELECT COUNT(*) AS count FROM scoped_projects projects WHERE NOT EXISTS (
      SELECT 1 FROM project_context_profiles profiles WHERE profiles.project_id = projects.id AND profiles.is_default = 1
    )
  `)
      .get(...parameters),
  ).count
  return projectContextInsightsSchema.parse({
    projectProfiles,
    projectsWithoutDefaultProfileCount,
    profilesWithoutTechStackCount: profiles.filter((profile) => isBlank(profile.techStack)).length,
    profilesWithoutValidationCommandsCount: profiles.filter((profile) =>
      isBlank(profile.validationCommands),
    ).length,
    profilesWithoutForbiddenActionsCount: profiles.filter((profile) =>
      isBlank(profile.forbiddenActions),
    ).length,
    repoPathProfileCount: profiles.filter((profile) => !isBlank(profile.repoPath)).length,
  })
}
