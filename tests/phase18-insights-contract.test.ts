import { describe, expect, it } from "vitest"

import { insightsDateRangeStart } from "../electron/insights/date-range.js"
import { qualityBucketForScore } from "../electron/insights/quality-buckets.js"
import {
  isCurrentVersionStale,
  isVersionHeavy,
  STALE_CURRENT_VERSION_AGE_DAYS,
  VERSION_HEAVY_PROMPT_THRESHOLD,
} from "../electron/insights/thresholds.js"
import {
  dashboardSummarySchema,
  insightsFilterInputSchema,
  maintenanceSnapshotSchema,
  PERSISTENCE_CHANNELS,
  payloadSchemas,
  projectContextInsightsSchema,
  projectHealthInsightsSchema,
  qualityInsightsSchema,
  responseSchemas,
  scenarioDistributionInsightsSchema,
  tagInsightsSchema,
  targetAgentDistributionInsightsSchema,
  templateInsightsSchema,
  versionActivityInsightsSchema,
} from "../electron/ipc-contract.js"

const id = "11111111-1111-4111-8111-111111111111"
const now = new Date(2026, 7, 8, 12).getTime()

describe("Phase 18 Insights contracts", () => {
  it("registers all read-only insights channels with shared filter payloads", () => {
    const insightChannels = [
      "getDashboardSummary",
      "getProjectHealth",
      "getScenarioDistribution",
      "getTargetAgentDistribution",
      "getQualityInsights",
      "getVersionActivity",
      "getTagInsights",
      "getTemplateInsights",
      "getProjectContextInsights",
      "getMaintenanceSnapshot",
    ] as const

    for (const channel of insightChannels) {
      expect(PERSISTENCE_CHANNELS[channel]).toMatch(/^prompter:insights:/)
      expect(payloadSchemas[channel].parse({ projectId: null, dateRange: "30d" })).toEqual({
        projectId: null,
        dateRange: "30d",
      })
      expect(responseSchemas[channel]).toBeDefined()
    }
  })

  it("accepts supported filter values and rejects invalid ranges", () => {
    for (const dateRange of ["all", "7d", "30d", "90d", "year"] as const) {
      expect(insightsFilterInputSchema.parse({ dateRange }).dateRange).toBe(dateRange)
    }

    expect(insightsFilterInputSchema.parse({}).projectId).toBeNull()
    expect(insightsFilterInputSchema.safeParse({ dateRange: "week" }).success).toBe(false)
    expect(insightsFilterInputSchema.safeParse({ projectId: "invalid" }).success).toBe(false)
    expect(insightsFilterInputSchema.safeParse({ includeArchived: true }).success).toBe(false)
    expect(insightsFilterInputSchema.safeParse({ dateRange: "all", extra: true }).success).toBe(
      false,
    )
  })

  it("validates nonnegative counts, bounded percentages, and nullable scores", () => {
    const summary = {
      projectCount: 1,
      promptAssetCount: 2,
      promptVersionCount: 3,
      tagCount: 4,
      promptTemplateCount: 5,
      harnessTemplateCount: 6,
      projectContextProfileCount: 7,
      averageQualityScore: null,
      unevaluatedCurrentPromptCount: 1,
      maintenanceIssueCount: null,
      lastUpdatedAt: null,
    }

    expect(dashboardSummarySchema.parse(summary).averageQualityScore).toBeNull()
    expect(dashboardSummarySchema.safeParse({ ...summary, tagCount: -1 }).success).toBe(false)
    expect(
      scenarioDistributionInsightsSchema.safeParse({
        items: [
          {
            scenario: "feature",
            count: 1,
            percentage: 101,
            averageQualityScore: null,
            unevaluatedCurrentPromptCount: 0,
            recentPromptCount: 0,
          },
        ],
      }).success,
    ).toBe(false)
  })

  it("accepts all ten strict response shapes with stable arrays", () => {
    expect(
      projectHealthInsightsSchema.parse({
        projects: [
          {
            projectId: id,
            projectName: "Project",
            promptAssetCount: 1,
            promptVersionCount: 1,
            averageQualityScore: 90,
            unevaluatedCurrentPromptCount: 0,
            tagCount: 0,
            contextProfileCount: 0,
            lastUpdatedAt: now,
            versionHeavyPromptCount: 0,
            emptyPromptCount: 0,
          },
        ],
      }).projects,
    ).toHaveLength(1)
    expect(
      scenarioDistributionInsightsSchema.parse({
        items: [
          {
            scenario: "feature",
            count: 1,
            percentage: 100,
            averageQualityScore: null,
            unevaluatedCurrentPromptCount: 1,
            recentPromptCount: 1,
          },
        ],
      }).items,
    ).toHaveLength(1)
    expect(
      targetAgentDistributionInsightsSchema.parse({
        items: [
          {
            targetAgent: "codex",
            count: 1,
            percentage: 100,
            averageQualityScore: null,
            mostCommonScenario: "feature",
            unevaluatedCurrentPromptCount: 1,
          },
        ],
      }).items,
    ).toHaveLength(1)
    expect(
      qualityInsightsSchema.parse({
        averageQualityScore: null,
        scoreDistribution: [{ bucket: "no_score", count: 1, percentage: 100 }],
      }).lowestQualityCurrentPrompts,
    ).toEqual([])
    expect(
      versionActivityInsightsSchema.parse({
        recentVersionCounts: { last7Days: 1, last30Days: 1, all: 1 },
        averageVersionsPerPrompt: 1,
        mostVersionedPrompts: [],
        staleCurrentPrompts: [],
        activity: [],
      }).activity,
    ).toEqual([])
    expect(
      tagInsightsSchema.parse({
        mostUsedTags: [],
        unusedTagCount: 0,
        projectTagDistribution: [],
        scenarioTagFrequency: [],
        lowQualityTagConcentration: [],
        duplicateTagCandidateCount: 0,
      }).mostUsedTags,
    ).toEqual([])
    expect(
      templateInsightsSchema.parse({
        promptTemplateCount: 0,
        harnessTemplateCount: 0,
        promptTemplatesByScenario: [],
        promptTemplatesByTargetAgent: [],
        sourcePromptTemplateCount: 0,
        missingSourcePromptTemplateCount: 0,
        placeholderHeavyPromptTemplates: [],
        recentPromptTemplates: [],
        harnessTemplatesByScenario: [],
        harnessTemplatesByTargetAgent: [],
        invalidHarnessTemplateCount: 0,
      }).recentPromptTemplates,
    ).toEqual([])
    expect(
      projectContextInsightsSchema.parse({
        projectProfiles: [],
        projectsWithoutDefaultProfileCount: 0,
        profilesWithoutTechStackCount: 0,
        profilesWithoutValidationCommandsCount: 0,
        profilesWithoutForbiddenActionsCount: 0,
        repoPathProfileCount: 0,
      }).projectProfiles,
    ).toEqual([])
    expect(
      maintenanceSnapshotSchema.parse({
        status: "unavailable",
        lastScannedAt: null,
        summary: null,
      }),
    ).toEqual({ status: "unavailable", lastScannedAt: null, summary: null })
  })

  it("calculates injected date bounds including the local year start", () => {
    const day = 24 * 60 * 60 * 1000

    expect(insightsDateRangeStart("all", now)).toBeNull()
    expect(insightsDateRangeStart("7d", now)).toBe(now - 7 * day)
    expect(insightsDateRangeStart("30d", now)).toBe(now - 30 * day)
    expect(insightsDateRangeStart("90d", now)).toBe(now - 90 * day)
    expect(insightsDateRangeStart("year", now)).toBe(new Date(2026, 0, 1).getTime())
  })

  it("uses exact navigation identifiers and dedicated tag and template rows", () => {
    const templateId = "22222222-2222-4222-8222-222222222222"

    expect(
      qualityInsightsSchema.parse({
        averageQualityScore: 50,
        scoreDistribution: [],
        lowestQualityCurrentPrompts: [
          {
            promptAssetId: id,
            currentVersionId: id,
            title: "Prompt",
            projectId: null,
            qualityScore: 50,
            updatedAt: now,
          },
        ],
      }).lowestQualityCurrentPrompts,
    ).toHaveLength(1)
    expect(
      versionActivityInsightsSchema.parse({
        recentVersionCounts: { last7Days: 1, last30Days: 1, all: 1 },
        averageVersionsPerPrompt: 1,
        mostVersionedPrompts: [
          {
            promptAssetId: id,
            currentVersionId: id,
            title: "Prompt",
            projectId: null,
            versionCount: 5,
            currentVersionCreatedAt: now,
          },
        ],
      }).mostVersionedPrompts,
    ).toHaveLength(1)
    expect(
      templateInsightsSchema.parse({
        promptTemplateCount: 1,
        harnessTemplateCount: 0,
        sourcePromptTemplateCount: 0,
        missingSourcePromptTemplateCount: 0,
        invalidHarnessTemplateCount: 0,
        placeholderHeavyPromptTemplates: [
          {
            promptTemplateId: templateId,
            name: "Template",
            scenario: "feature",
            targetAgent: "codex",
            sourcePromptAssetId: null,
            sourcePromptVersionId: null,
            placeholderCount: 4,
            updatedAt: now,
          },
        ],
      }).placeholderHeavyPromptTemplates,
    ).toHaveLength(1)
    expect(
      tagInsightsSchema.parse({
        mostUsedTags: [],
        unusedTagCount: 0,
        projectTagDistribution: [
          { projectId: id, projectName: "Project", tagCount: 2, taggedPromptCount: 3 },
        ],
        scenarioTagFrequency: [{ scenario: "feature", tagId: id, tagName: "api", promptCount: 3 }],
        lowQualityTagConcentration: [{ tagId: id, name: "api", promptCount: 2 }],
        duplicateTagCandidateCount: 0,
      }).projectTagDistribution,
    ).toHaveLength(1)
    expect(
      qualityInsightsSchema.safeParse({
        averageQualityScore: null,
        scoreDistribution: [],
        lowestQualityCurrentPrompts: [
          { promptAssetId: id, title: "Prompt", projectId: null, qualityScore: 50, updatedAt: now },
        ],
      }).success,
    ).toBe(false)
  })

  it("classifies exact quality boundaries and maintenance thresholds", () => {
    expect(qualityBucketForScore(90)).toBe("excellent")
    expect(qualityBucketForScore(89)).toBe("good")
    expect(qualityBucketForScore(75)).toBe("good")
    expect(qualityBucketForScore(74)).toBe("usable")
    expect(qualityBucketForScore(60)).toBe("usable")
    expect(qualityBucketForScore(59)).toBe("needs_work")
    expect(qualityBucketForScore(40)).toBe("needs_work")
    expect(qualityBucketForScore(39)).toBe("weak")
    expect(qualityBucketForScore(null)).toBe("no_score")
    expect(isVersionHeavy(VERSION_HEAVY_PROMPT_THRESHOLD - 1)).toBe(false)
    expect(isVersionHeavy(VERSION_HEAVY_PROMPT_THRESHOLD)).toBe(true)
    const staleBoundary = now - STALE_CURRENT_VERSION_AGE_DAYS * 24 * 60 * 60 * 1000
    expect(isCurrentVersionStale(staleBoundary, now)).toBe(false)
    expect(isCurrentVersionStale(staleBoundary - 1, now)).toBe(true)
  })
})
