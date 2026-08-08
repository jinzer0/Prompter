import { afterEach, describe, expect, it } from "vitest"

import { createInsightsService } from "../electron/insights/service.js"
import { VERSION_HEAVY_PROMPT_THRESHOLD } from "../electron/insights/thresholds.js"
import {
  dashboardSummarySchema,
  maintenanceSnapshotSchema,
  projectContextInsightsSchema,
  projectHealthInsightsSchema,
  qualityInsightsSchema,
  SCENARIOS,
  scenarioDistributionInsightsSchema,
  TARGET_AGENTS,
  tagInsightsSchema,
  targetAgentDistributionInsightsSchema,
  templateInsightsSchema,
  versionActivityInsightsSchema,
} from "../electron/ipc-contract.js"
import {
  cleanupTestDatabases,
  createTestDatabase,
  ids,
  NOW,
  seedInsightsFixture,
  seedVersionHeavyThresholdFixture,
  snapshotTables,
} from "./phase18-insights-test-helpers.js"
import "./phase18-insights-activity-cases.js"

afterEach(cleanupTestDatabases)

describe("Phase 18 Insights persistence", () => {
  it("returns global current analytics including orphan prompts and canonical count metrics", async () => {
    // Given: a migrated database containing scoped, orphan, scored, and versionless prompts.
    const database = await createTestDatabase()
    const defaultHarnessCount = seedInsightsFixture(database)
    const service = createInsightsService({ sqlite: database.sqlite, now: () => NOW })

    // When: all dashboard queries run against the fixed clock.
    const summary = dashboardSummarySchema.parse(
      service.getDashboardSummary({ projectId: null, dateRange: "all" }),
    )
    const projectHealth = projectHealthInsightsSchema.parse(
      service.getProjectHealth({ projectId: null, dateRange: "all" }),
    )
    const scenarios = scenarioDistributionInsightsSchema.parse(
      service.getScenarioDistribution({ projectId: null, dateRange: "all" }),
    )
    const agents = targetAgentDistributionInsightsSchema.parse(
      service.getTargetAgentDistribution({ projectId: null, dateRange: "all" }),
    )
    const quality = qualityInsightsSchema.parse(
      service.getQualityInsights({ projectId: null, dateRange: "all" }),
    )
    const activity = versionActivityInsightsSchema.parse(
      service.getVersionActivity({ projectId: null, dateRange: "all" }),
    )
    const tags = tagInsightsSchema.parse(
      service.getTagInsights({ projectId: null, dateRange: "all" }),
    )
    const templates = templateInsightsSchema.parse(
      service.getTemplateInsights({ projectId: null, dateRange: "all" }),
    )
    const contexts = projectContextInsightsSchema.parse(
      service.getProjectContextInsights({ projectId: null, dateRange: "all" }),
    )
    const maintenance = maintenanceSnapshotSchema.parse(
      service.getMaintenanceSnapshot({ projectId: null, dateRange: "all" }),
    )

    // Then: global analytics retain orphans while fixed buckets and canonical counts stay explicit.
    expect(summary).toMatchObject({
      projectCount: 2,
      promptAssetCount: 6,
      promptVersionCount: 9,
      tagCount: 6,
      promptTemplateCount: 3,
      harnessTemplateCount: defaultHarnessCount + 1,
      projectContextProfileCount: 2,
      averageQualityScore: 65,
      unevaluatedCurrentPromptCount: 1,
      maintenanceIssueCount: null,
      lastUpdatedAt: NOW - 2 * 24 * 60 * 60 * 1000,
    })
    expect(projectHealth.projects.map((project) => project.projectId)).toEqual([
      ids.projectA,
      ids.projectB,
    ])
    expect(projectHealth.projects[0]).toMatchObject({
      promptAssetCount: 4,
      promptVersionCount: 7,
      averageQualityScore: 62.5,
      unevaluatedCurrentPromptCount: 1,
      tagCount: 2,
      contextProfileCount: 1,
      versionHeavyPromptCount: 1,
      emptyPromptCount: 1,
    })
    expect(scenarios.items.map((item) => item.scenario)).toEqual(SCENARIOS)
    expect(scenarios.items.find((item) => item.scenario === "feature")).toMatchObject({
      count: 2,
      percentage: 100 / 3,
      averageQualityScore: 62.5,
    })
    expect(agents.items.map((item) => item.targetAgent)).toEqual(TARGET_AGENTS)
    expect(agents.items.find((item) => item.targetAgent === "codex")).toMatchObject({
      count: 2,
      percentage: 100 / 3,
      mostCommonScenario: "feature",
    })
    expect(quality.scoreDistribution.map((item) => item.bucket)).toEqual([
      "excellent",
      "good",
      "usable",
      "needs_work",
      "weak",
      "no_score",
    ])
    expect(quality.lowestQualityCurrentPrompts.map((prompt) => prompt.promptAssetId)).toEqual([
      ids.assetA4,
      ids.orphanAsset,
      ids.assetB1,
      ids.assetA1,
    ])
    expect(quality.unevaluatedCurrentPrompts.map((prompt) => prompt.promptAssetId)).toEqual([
      ids.assetA2,
    ])
    expect(activity).toMatchObject({
      recentVersionCounts: { last7Days: 2, last30Days: 4, all: 9 },
      averageVersionsPerPrompt: 1.5,
    })
    expect(activity.mostVersionedPrompts.map((prompt) => prompt.promptAssetId)).toContain(
      ids.orphanAsset,
    )
    expect(tags).toMatchObject({ unusedTagCount: 3, duplicateTagCandidateCount: 1 })
    expect(tags.mostUsedTags[0]).toMatchObject({ tagId: ids.tagShared, promptCount: 2 })
    expect(tags.lowQualityTagConcentration).toEqual([
      { tagId: ids.tagProjectA, name: "Project A", promptCount: 1 },
    ])
    expect(templates).toMatchObject({
      promptTemplateCount: 3,
      harnessTemplateCount: defaultHarnessCount + 1,
      sourcePromptTemplateCount: 2,
      missingSourcePromptTemplateCount: 0,
      invalidHarnessTemplateCount: 1,
    })
    expect(templates.placeholderHeavyPromptTemplates[0]).toMatchObject({
      promptTemplateId: ids.templateA,
      placeholderCount: 2,
    })
    expect(contexts).toMatchObject({
      projectsWithoutDefaultProfileCount: 1,
      profilesWithoutTechStackCount: 1,
      profilesWithoutValidationCommandsCount: 1,
      profilesWithoutForbiddenActionsCount: 1,
      repoPathProfileCount: 1,
    })
    expect(maintenance).toEqual({ status: "unavailable", lastScannedAt: null, summary: null })
  })

  it("keeps project inventory scoped and excludes orphan current prompts", async () => {
    // Given: deterministic records that span the 30-day boundary and include an orphan current prompt.
    const database = await createTestDatabase()
    const defaultHarnessCount = seedInsightsFixture(database)
    const service = createInsightsService({ sqlite: database.sqlite, now: () => NOW })

    // When: the Alpha project is queried for the trailing 30 days.
    const filter = { projectId: ids.projectA, dateRange: "30d" } as const
    const summary = service.getDashboardSummary(filter)
    const scenarios = service.getScenarioDistribution(filter)
    const quality = service.getQualityInsights(filter)
    const activity = service.getVersionActivity(filter)
    const templates = service.getTemplateInsights(filter)

    // Then: inventories and quality/version rows contain only Alpha data.
    expect(summary).toMatchObject({
      projectCount: 1,
      promptAssetCount: 4,
      promptVersionCount: 7,
      tagCount: 2,
      promptTemplateCount: 1,
      harnessTemplateCount: defaultHarnessCount + 1,
      projectContextProfileCount: 1,
    })
    expect(scenarios.items.find((item) => item.scenario === "feature")?.recentPromptCount).toBe(1)
    expect(scenarios.items.find((item) => item.scenario === "bugfix")?.recentPromptCount).toBe(1)
    expect(quality.lowestQualityCurrentPrompts.map((prompt) => prompt.promptAssetId)).not.toContain(
      ids.orphanAsset,
    )
    expect(activity.recentVersionCounts).toEqual({ last7Days: 1, last30Days: 2, all: 2 })
    expect(activity.mostVersionedPrompts.map((prompt) => prompt.promptAssetId)).not.toContain(
      ids.orphanAsset,
    )
    expect(templates.promptTemplateCount).toBe(1)
    expect(templates.harnessTemplateCount).toBe(defaultHarnessCount + 1)
  })

  it("counts only prompts at the version-heavy threshold in project health", async () => {
    // Given: a project with one prompt just below the threshold and one at the threshold.
    const database = await createTestDatabase()
    const projectId = seedVersionHeavyThresholdFixture(database)
    const service = createInsightsService({ sqlite: database.sqlite, now: () => NOW })

    // When: project health is queried for that isolated project.
    const projectHealth = projectHealthInsightsSchema.parse(
      service.getProjectHealth({ projectId, dateRange: "all" }),
    )

    // Then: only the threshold prompt is treated as version-heavy.
    expect(projectHealth.projects).toHaveLength(1)
    expect(projectHealth.projects[0]).toMatchObject({
      promptAssetCount: 2,
      promptVersionCount: VERSION_HEAVY_PROMPT_THRESHOLD * 2 - 1,
      versionHeavyPromptCount: 1,
    })
  })

  it("counts unused globally normalized duplicate tags under every project scope", async () => {
    // Given: global duplicate tags without prompt attachments.
    const database = await createTestDatabase()
    seedInsightsFixture(database)
    const service = createInsightsService({ sqlite: database.sqlite, now: () => NOW })

    // When: tag insights are calculated under separate project filters.
    const alpha = service.getTagInsights({ projectId: ids.projectA, dateRange: "all" })
    const beta = service.getTagInsights({ projectId: ids.projectB, dateRange: "all" })

    // Then: the Phase 17 candidate group is present independently of scoped usage.
    expect(alpha.duplicateTagCandidateCount).toBe(1)
    expect(beta.duplicateTagCandidateCount).toBe(1)
  })

  it("exposes all queries through PersistenceServices without mutating relevant tables", async () => {
    // Given: a migrated fixture and a complete snapshot of Insights-readable tables.
    const database = await createTestDatabase()
    seedInsightsFixture(database)
    const before = snapshotTables(database)
    const filter = { projectId: null, dateRange: "all" } as const

    // When: each composed PersistenceServices method is used.
    database.services.getDashboardSummary(filter)
    database.services.getProjectHealth(filter)
    database.services.getScenarioDistribution(filter)
    database.services.getTargetAgentDistribution(filter)
    database.services.getQualityInsights(filter)
    database.services.getVersionActivity(filter)
    database.services.getTagInsights(filter)
    database.services.getTemplateInsights(filter)
    database.services.getProjectContextInsights(filter)
    database.services.getMaintenanceSnapshot(filter)
    const after = snapshotTables(database)

    // Then: the methods are available and every inspected table is unchanged.
    expect(after).toEqual(before)
  })
})
