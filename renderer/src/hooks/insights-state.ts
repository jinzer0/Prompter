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
} from "../../../electron/ipc-types"

export type InsightsData = {
  readonly dashboardSummary: DashboardSummary
  readonly projectHealth: ProjectHealthInsights
  readonly scenarioDistribution: ScenarioDistributionInsights
  readonly targetAgentDistribution: TargetAgentDistributionInsights
  readonly quality: QualityInsights
  readonly versionActivity: VersionActivityInsights
  readonly tags: TagInsights
  readonly templates: TemplateInsights
  readonly projectContexts: ProjectContextInsights
  readonly maintenance: MaintenanceSnapshot
}

export type InsightsState =
  | {
      readonly phase: "loading"
      readonly filters: InsightsFilterInput
      readonly data: null
      readonly error: null
    }
  | {
      readonly phase: "ready" | "empty"
      readonly filters: InsightsFilterInput
      readonly data: InsightsData
      readonly error: null
    }
  | {
      readonly phase: "error"
      readonly filters: InsightsFilterInput
      readonly data: null
      readonly error: string
    }

export type InsightsPhase = InsightsState["phase"]

export type InsightsStateEvent =
  | { readonly kind: "project_filter_changed"; readonly projectId: string | null }
  | {
      readonly kind: "date_range_changed"
      readonly dateRange: InsightsFilterInput["dateRange"]
    }
  | { readonly kind: "load_started"; readonly filters: InsightsFilterInput }
  | {
      readonly kind: "load_succeeded"
      readonly filters: InsightsFilterInput
      readonly data: InsightsData
    }
  | {
      readonly kind: "load_failed"
      readonly filters: InsightsFilterInput
      readonly message: string
    }

export const INITIAL_INSIGHTS_FILTERS = Object.freeze({
  projectId: null,
  dateRange: "all",
}) satisfies InsightsFilterInput

export function createInitialInsightsState(): InsightsState {
  return {
    phase: "loading",
    filters: INITIAL_INSIGHTS_FILTERS,
    data: null,
    error: null,
  }
}

function assertNever(event: never): never {
  throw new TypeError(`Unexpected insights state event: ${JSON.stringify(event)}`)
}

function hasLibraryInventory(summary: DashboardSummary): boolean {
  return summary.projectCount + summary.promptAssetCount + summary.promptVersionCount > 0
}

function retainEqualFilters(
  state: InsightsState,
  filters: InsightsFilterInput,
): InsightsFilterInput {
  return state.filters.projectId === filters.projectId &&
    state.filters.dateRange === filters.dateRange
    ? state.filters
    : filters
}

export function reduceInsightsState(
  state: InsightsState,
  event: InsightsStateEvent,
): InsightsState {
  switch (event.kind) {
    case "project_filter_changed":
      return {
        phase: "loading",
        filters: { ...state.filters, projectId: event.projectId },
        data: null,
        error: null,
      }
    case "date_range_changed":
      return {
        phase: "loading",
        filters: { ...state.filters, dateRange: event.dateRange },
        data: null,
        error: null,
      }
    case "load_started":
      return {
        phase: "loading",
        filters: retainEqualFilters(state, event.filters),
        data: null,
        error: null,
      }
    case "load_succeeded":
      return {
        phase: hasLibraryInventory(event.data.dashboardSummary) ? "ready" : "empty",
        filters: retainEqualFilters(state, event.filters),
        data: event.data,
        error: null,
      }
    case "load_failed":
      return {
        phase: "error",
        filters: retainEqualFilters(state, event.filters),
        data: null,
        error: event.message,
      }
    default:
      return assertNever(event)
  }
}
