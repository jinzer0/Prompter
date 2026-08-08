import type {
  Project,
  PromptTemplateInsight,
  QualityPromptInsight,
  TagUsageInsight,
  VersionedPromptInsight,
} from "../electron/ipc-types"
import type { InsightsData } from "../renderer/src/hooks/insights-state"

export const projectId = "11111111-1111-4111-8111-111111111111"
export const promptAssetId = "22222222-2222-4222-8222-222222222222"
export const promptVersionId = "33333333-3333-4333-8333-333333333333"
export const tagId = "44444444-4444-4444-8444-444444444444"
export const promptTemplateId = "55555555-5555-4555-8555-555555555555"

export const project = {
  id: projectId,
  name: "Alpha workspace",
  description: null,
  techStack: "TypeScript",
  defaultAgent: "codex",
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_100_000_000,
} satisfies Project

export const qualityPrompt = {
  promptAssetId,
  currentVersionId: promptVersionId,
  title: "Improve renderer boundaries",
  projectId,
  qualityScore: 42,
  updatedAt: 1_700_100_000_000,
} satisfies QualityPromptInsight

export const versionedPrompt = {
  promptAssetId,
  currentVersionId: promptVersionId,
  title: "Improve renderer boundaries",
  projectId,
  versionCount: 6,
  currentVersionCreatedAt: 1_700_100_000_000,
} satisfies VersionedPromptInsight

export const orphanQualityPrompt = {
  ...qualityPrompt,
  projectId: null,
  title: "Orphaned quality prompt",
} satisfies QualityPromptInsight

export const orphanVersionedPrompt = {
  ...versionedPrompt,
  projectId: null,
  title: "Orphaned version prompt",
} satisfies VersionedPromptInsight

export const tagUsage = {
  tagId,
  name: "renderer",
  promptCount: 4,
} satisfies TagUsageInsight

export const promptTemplate = {
  promptTemplateId,
  name: "Feature delivery",
  scenario: "feature",
  targetAgent: "codex",
  sourcePromptAssetId: promptAssetId,
  sourcePromptVersionId: promptVersionId,
  placeholderCount: 3,
  updatedAt: 1_700_100_000_000,
} satisfies PromptTemplateInsight

export const readyInsightsData = {
  dashboardSummary: {
    projectCount: 1,
    promptAssetCount: 4,
    promptVersionCount: 8,
    tagCount: 3,
    promptTemplateCount: 2,
    harnessTemplateCount: 5,
    projectContextProfileCount: 1,
    averageQualityScore: 72,
    unevaluatedCurrentPromptCount: 1,
    maintenanceIssueCount: null,
    lastUpdatedAt: 1_700_100_000_000,
  },
  projectHealth: {
    projects: [
      {
        projectId,
        projectName: project.name,
        promptAssetCount: 4,
        promptVersionCount: 8,
        averageQualityScore: 72,
        unevaluatedCurrentPromptCount: 1,
        tagCount: 3,
        contextProfileCount: 1,
        lastUpdatedAt: 1_700_100_000_000,
        versionHeavyPromptCount: 1,
        emptyPromptCount: 0,
      },
    ],
  },
  scenarioDistribution: {
    items: [
      {
        scenario: "feature",
        count: 4,
        percentage: 100,
        averageQualityScore: 72,
        unevaluatedCurrentPromptCount: 1,
        recentPromptCount: 2,
      },
    ],
  },
  targetAgentDistribution: {
    items: [
      {
        targetAgent: "codex",
        count: 4,
        percentage: 100,
        averageQualityScore: 72,
        mostCommonScenario: "feature",
        unevaluatedCurrentPromptCount: 1,
      },
    ],
  },
  quality: {
    averageQualityScore: 72,
    scoreDistribution: [
      { bucket: "excellent", count: 1, percentage: 25 },
      { bucket: "needs_work", count: 1, percentage: 25 },
      { bucket: "no_score", count: 1, percentage: 25 },
    ],
    lowestQualityCurrentPrompts: [qualityPrompt],
    highestQualityPrompts: [{ ...qualityPrompt, qualityScore: 96 }],
    unevaluatedCurrentPrompts: [{ ...qualityPrompt, qualityScore: null }],
    scenarioAverageScores: [{ scenario: "feature", averageQualityScore: 72 }],
    targetAgentAverageScores: [{ targetAgent: "codex", averageQualityScore: 72 }],
  },
  versionActivity: {
    recentVersionCounts: { last7Days: 2, last30Days: 5, all: 8 },
    averageVersionsPerPrompt: 2,
    mostVersionedPrompts: [versionedPrompt],
    staleCurrentPrompts: [versionedPrompt],
    activity: [{ timestamp: 1_700_100_000_000, versionCount: 2 }],
  },
  tags: {
    mostUsedTags: [tagUsage],
    unusedTagCount: 1,
    projectTagDistribution: [
      { projectId, projectName: project.name, tagCount: 3, taggedPromptCount: 4 },
    ],
    scenarioTagFrequency: [{ scenario: "feature", tagId, tagName: tagUsage.name, promptCount: 4 }],
    lowQualityTagConcentration: [tagUsage],
    duplicateTagCandidateCount: 1,
  },
  templates: {
    promptTemplateCount: 2,
    harnessTemplateCount: 5,
    promptTemplatesByScenario: [{ scenario: "feature", count: 2, percentage: 100 }],
    promptTemplatesByTargetAgent: [{ targetAgent: "codex", count: 2, percentage: 100 }],
    sourcePromptTemplateCount: 1,
    missingSourcePromptTemplateCount: 0,
    placeholderHeavyPromptTemplates: [promptTemplate],
    recentPromptTemplates: [promptTemplate],
    harnessTemplatesByScenario: [{ scenario: "feature", count: 5, percentage: 100 }],
    harnessTemplatesByTargetAgent: [{ targetAgent: "codex", count: 5, percentage: 100 }],
    invalidHarnessTemplateCount: 0,
  },
  projectContexts: {
    projectProfiles: [{ projectId, projectName: project.name, profileCount: 1 }],
    projectsWithoutDefaultProfileCount: 0,
    profilesWithoutTechStackCount: 0,
    profilesWithoutValidationCommandsCount: 1,
    profilesWithoutForbiddenActionsCount: 1,
    repoPathProfileCount: 1,
  },
  maintenance: { status: "unavailable", lastScannedAt: null, summary: null },
} satisfies InsightsData

export const orphanQualityInsights = {
  ...readyInsightsData.quality,
  lowestQualityCurrentPrompts: [orphanQualityPrompt],
  highestQualityPrompts: [],
  unevaluatedCurrentPrompts: [],
}

export const orphanVersionActivityInsights = {
  ...readyInsightsData.versionActivity,
  mostVersionedPrompts: [orphanVersionedPrompt],
  staleCurrentPrompts: [],
}

export const globalTagInsights = {
  ...readyInsightsData.tags,
  projectTagDistribution: [],
}
