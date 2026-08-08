import type Database from "better-sqlite3"

import type {
  DashboardSummary,
  InsightsFilterInput,
  MaintenanceSnapshot,
  ProjectContextInsights,
  ProjectHealthInsights,
  QualityInsights,
  ScenarioDistributionInsights,
  TagInsights,
  TargetAgentDistributionInsights,
  TemplateInsights,
  VersionActivityInsights,
} from "../ipc-types.js"
import {
  getDashboardSummary,
  getProjectHealth,
  getScenarioDistribution,
  getTargetAgentDistribution,
} from "./overview.js"
import { getQualityInsights, getVersionActivity } from "./quality-activity.js"
import { createInsightScope } from "./query-helpers.js"
import { getTagInsights } from "./tag-insights.js"
import { getProjectContextInsights, getTemplateInsights } from "./template-context.js"

export type InsightsService = {
  readonly getDashboardSummary: (input: InsightsFilterInput) => DashboardSummary
  readonly getProjectHealth: (input: InsightsFilterInput) => ProjectHealthInsights
  readonly getScenarioDistribution: (input: InsightsFilterInput) => ScenarioDistributionInsights
  readonly getTargetAgentDistribution: (
    input: InsightsFilterInput,
  ) => TargetAgentDistributionInsights
  readonly getQualityInsights: (input: InsightsFilterInput) => QualityInsights
  readonly getVersionActivity: (input: InsightsFilterInput) => VersionActivityInsights
  readonly getTagInsights: (input: InsightsFilterInput) => TagInsights
  readonly getTemplateInsights: (input: InsightsFilterInput) => TemplateInsights
  readonly getProjectContextInsights: (input: InsightsFilterInput) => ProjectContextInsights
  readonly getMaintenanceSnapshot: (input: InsightsFilterInput) => MaintenanceSnapshot
}

export type InsightsServiceConfig = {
  readonly now?: () => number
  readonly sqlite: Database.Database
}

export const unavailableMaintenanceSnapshot = {
  status: "unavailable",
  lastScannedAt: null,
  summary: null,
} as const satisfies MaintenanceSnapshot

export function createInsightsService(config: InsightsServiceConfig): InsightsService {
  function scope(input: InsightsFilterInput) {
    return createInsightScope(input, (config.now ?? Date.now)())
  }

  return {
    getDashboardSummary: (input) => getDashboardSummary(config.sqlite, scope(input)),
    getProjectHealth: (input) => getProjectHealth(config.sqlite, scope(input)),
    getScenarioDistribution: (input) => getScenarioDistribution(config.sqlite, scope(input)),
    getTargetAgentDistribution: (input) => getTargetAgentDistribution(config.sqlite, scope(input)),
    getQualityInsights: (input) => getQualityInsights(config.sqlite, scope(input)),
    getVersionActivity: (input) => getVersionActivity(config.sqlite, scope(input)),
    getTagInsights: (input) => getTagInsights(config.sqlite, scope(input)),
    getTemplateInsights: (input) => getTemplateInsights(config.sqlite, scope(input)),
    getProjectContextInsights: (input) => getProjectContextInsights(config.sqlite, scope(input)),
    getMaintenanceSnapshot: () => unavailableMaintenanceSnapshot,
  }
}
