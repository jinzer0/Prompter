import type { InsightsBridge, InsightsFilterInput } from "../electron/ipc-types"
import type { InsightsData } from "../renderer/src/hooks/insights-state"

export function createDeferred<T>() {
  let settle: ((value: T) => void) | null = null
  let fail: ((reason?: unknown) => void) | null = null
  const promise = new Promise<T>((resolve, reject) => {
    settle = resolve
    fail = reject
  })
  return {
    promise,
    resolve(value: T): void {
      if (settle === null) {
        throw new TypeError("Deferred promise was not initialized")
      }
      settle(value)
    },
    reject(reason: unknown): void {
      if (fail === null) {
        throw new TypeError("Deferred promise was not initialized")
      }
      fail(reason)
    },
  }
}

export const emptyData = {
  dashboardSummary: {
    projectCount: 0,
    promptAssetCount: 0,
    promptVersionCount: 0,
    tagCount: 0,
    promptTemplateCount: 2,
    harnessTemplateCount: 3,
    projectContextProfileCount: 0,
    averageQualityScore: null,
    unevaluatedCurrentPromptCount: 0,
    maintenanceIssueCount: null,
    lastUpdatedAt: null,
  },
  projectHealth: { projects: [] },
  scenarioDistribution: { items: [] },
  targetAgentDistribution: { items: [] },
  quality: {
    averageQualityScore: null,
    scoreDistribution: [],
    lowestQualityCurrentPrompts: [],
    highestQualityPrompts: [],
    unevaluatedCurrentPrompts: [],
    scenarioAverageScores: [],
    targetAgentAverageScores: [],
  },
  versionActivity: {
    recentVersionCounts: { last7Days: 0, last30Days: 0, all: 0 },
    averageVersionsPerPrompt: 0,
    mostVersionedPrompts: [],
    staleCurrentPrompts: [],
    activity: [],
  },
  tags: {
    mostUsedTags: [],
    unusedTagCount: 0,
    projectTagDistribution: [],
    scenarioTagFrequency: [],
    lowQualityTagConcentration: [],
    duplicateTagCandidateCount: 0,
  },
  templates: {
    promptTemplateCount: 2,
    harnessTemplateCount: 3,
    promptTemplatesByScenario: [],
    promptTemplatesByTargetAgent: [],
    sourcePromptTemplateCount: 0,
    missingSourcePromptTemplateCount: 0,
    placeholderHeavyPromptTemplates: [],
    recentPromptTemplates: [],
    harnessTemplatesByScenario: [],
    harnessTemplatesByTargetAgent: [],
    invalidHarnessTemplateCount: 0,
  },
  projectContexts: {
    projectProfiles: [],
    projectsWithoutDefaultProfileCount: 0,
    profilesWithoutTechStackCount: 0,
    profilesWithoutValidationCommandsCount: 0,
    profilesWithoutForbiddenActionsCount: 0,
    repoPathProfileCount: 0,
  },
  maintenance: { status: "unavailable", lastScannedAt: null, summary: null },
} satisfies InsightsData

export const readyData = {
  ...emptyData,
  dashboardSummary: {
    ...emptyData.dashboardSummary,
    projectCount: 1,
    promptAssetCount: 1,
    promptVersionCount: 1,
  },
} satisfies InsightsData

type TestBridgeConfig = {
  readonly data: InsightsData
  readonly getProjectHealth?: InsightsBridge["getProjectHealth"]
  readonly getSummary?: InsightsBridge["getDashboardSummary"]
  readonly onCall?: (method: keyof InsightsBridge, filter: InsightsFilterInput) => void
}

export function createTestBridge(config: TestBridgeConfig): InsightsBridge {
  const called = (method: keyof InsightsBridge, filter: InsightsFilterInput): void => {
    config.onCall?.(method, filter)
  }
  return {
    getDashboardSummary: (filter) => {
      called("getDashboardSummary", filter)
      return config.getSummary?.(filter) ?? Promise.resolve(config.data.dashboardSummary)
    },
    getProjectHealth: (filter) => {
      called("getProjectHealth", filter)
      return config.getProjectHealth?.(filter) ?? Promise.resolve(config.data.projectHealth)
    },
    getScenarioDistribution: (filter) => {
      called("getScenarioDistribution", filter)
      return Promise.resolve(config.data.scenarioDistribution)
    },
    getTargetAgentDistribution: (filter) => {
      called("getTargetAgentDistribution", filter)
      return Promise.resolve(config.data.targetAgentDistribution)
    },
    getQualityInsights: (filter) => {
      called("getQualityInsights", filter)
      return Promise.resolve(config.data.quality)
    },
    getVersionActivity: (filter) => {
      called("getVersionActivity", filter)
      return Promise.resolve(config.data.versionActivity)
    },
    getTagInsights: (filter) => {
      called("getTagInsights", filter)
      return Promise.resolve(config.data.tags)
    },
    getTemplateInsights: (filter) => {
      called("getTemplateInsights", filter)
      return Promise.resolve(config.data.templates)
    },
    getProjectContextInsights: (filter) => {
      called("getProjectContextInsights", filter)
      return Promise.resolve(config.data.projectContexts)
    },
    getMaintenanceSnapshot: (filter) => {
      called("getMaintenanceSnapshot", filter)
      return Promise.resolve(config.data.maintenance)
    },
  }
}
