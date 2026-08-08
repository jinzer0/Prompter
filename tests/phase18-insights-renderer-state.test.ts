import { describe, expect, it } from "vitest"

import type { InsightsBridge, InsightsFilterInput } from "../electron/ipc-types"
import { createInsightsLoader } from "../renderer/src/hooks/insights-loader"
import {
  createInitialInsightsState,
  type InsightsData,
  reduceInsightsState,
} from "../renderer/src/hooks/insights-state"
import {
  createDeferred,
  createTestBridge,
  emptyData,
  readyData,
} from "./phase18-insights-renderer-fixtures"

const projectId = "11111111-1111-4111-8111-111111111111"

describe("phase18 insights renderer state", () => {
  it("starts loading with dashboard-local all-project filters", () => {
    // Given: no external project, prompt, or compiler selection.
    // When: the insights state is initialized.
    const state = createInitialInsightsState()
    // Then: only the local default filter is represented.
    expect(state).toEqual({
      phase: "loading",
      filters: { projectId: null, dateRange: "all" },
      data: null,
      error: null,
    })
  })
  it("loads all ten read-only datasets in parallel with one frozen filter snapshot", async () => {
    // Given: the summary keeps the aggregate request pending.
    const deferred = createDeferred<InsightsData["dashboardSummary"]>()
    const calls: { readonly method: keyof InsightsBridge; readonly filter: InsightsFilterInput }[] =
      []
    const bridge = createTestBridge({
      data: readyData,
      getSummary: () => deferred.promise,
      onCall: (method, filter) => calls.push({ method, filter }),
    })
    let state = createInitialInsightsState()
    const loader = createInsightsLoader(bridge, (event) => {
      state = reduceInsightsState(state, event)
    })
    // When: a dashboard load starts without waiting for summary.
    const pending = loader.load({ projectId, dateRange: "30d" })
    // Then: every method has already received the identical immutable object.
    expect(calls.map(({ method }) => method)).toEqual([
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
    ])
    expect(calls.every(({ filter }) => filter === calls[0]?.filter)).toBe(true)
    expect(Object.isFrozen(calls[0]?.filter)).toBe(true)
    expect(state.phase).toBe("loading")
    deferred.resolve(readyData.dashboardSummary)
    await pending
    expect(state.phase).toBe("ready")
  })

  it("defines empty from zero project and prompt inventory despite global templates", async () => {
    // Given: global template panels have data but project and prompt inventory is zero.
    let state = createInitialInsightsState()
    const loader = createInsightsLoader(createTestBridge({ data: emptyData }), (event) => {
      state = reduceInsightsState(state, event)
    })
    // When: all datasets resolve.
    await loader.load(state.filters)
    // Then: the dashboard has one deterministic empty state.
    expect(state.phase).toBe("empty")
    expect(state.data).toEqual(emptyData)
  })

  it("stays ready when optional panels are empty but library inventory exists", async () => {
    // Given: project and prompt inventory exists while every optional list is empty.
    let state = createInitialInsightsState()
    const loader = createInsightsLoader(createTestBridge({ data: readyData }), (event) => {
      state = reduceInsightsState(state, event)
    })
    // When: all datasets resolve.
    await loader.load(state.filters)
    // Then: optional panel emptiness does not replace the dashboard.
    expect(state.phase).toBe("ready")
  })

  it("changes the project filter without touching the date range", () => {
    // Given: the dashboard has its default local filters.
    const initial = createInitialInsightsState()
    // When: its project filter changes.
    const filtered = reduceInsightsState(initial, { kind: "project_filter_changed", projectId })
    // Then: loading restarts with the date range preserved.
    expect(filtered.filters).toEqual({ projectId, dateRange: "all" })
    expect(filtered.phase).toBe("loading")
  })

  it("changes the date range without touching the project filter", () => {
    // Given: the dashboard has a local project filter.
    const initial = reduceInsightsState(createInitialInsightsState(), {
      kind: "project_filter_changed",
      projectId,
    })
    // When: its date range changes.
    const filtered = reduceInsightsState(initial, { kind: "date_range_changed", dateRange: "30d" })
    // Then: loading restarts with the project filter preserved.
    expect(filtered.filters).toEqual({ projectId, dateRange: "30d" })
    expect(filtered.phase).toBe("loading")
  })

  it("retains filter identity across load events with the same values", () => {
    // Given: a filter change has produced the hook effect dependency.
    const filtered = reduceInsightsState(
      reduceInsightsState(createInitialInsightsState(), {
        kind: "project_filter_changed",
        projectId,
      }),
      { kind: "date_range_changed", dateRange: "30d" },
    )
    // When: loading starts with an immutable copy of those values.
    const loading = reduceInsightsState(filtered, {
      kind: "load_started",
      filters: Object.freeze({ ...filtered.filters }),
    })
    // Then: the effect dependency remains stable and cannot reload in a loop.
    expect(loading.filters).toBe(filtered.filters)
  })

  it("ignores an older response when a newer filtered request resolves first", async () => {
    // Given: the first summary is deferred and the second request can complete.
    const firstSummary = createDeferred<InsightsData["dashboardSummary"]>()
    let summaryCalls = 0
    const bridge = createTestBridge({
      data: readyData,
      getSummary: () => {
        summaryCalls += 1
        return summaryCalls === 1
          ? firstSummary.promise
          : Promise.resolve(readyData.dashboardSummary)
      },
    })
    let state = createInitialInsightsState()
    const loader = createInsightsLoader(bridge, (event) => {
      state = reduceInsightsState(state, event)
    })
    // When: a newer project request completes before the all-project request.
    const stale = loader.load({ projectId: null, dateRange: "all" })
    await loader.load({ projectId, dateRange: "7d" })
    firstSummary.resolve(emptyData.dashboardSummary)
    await stale
    // Then: late data cannot replace the current filtered result.
    expect(state.phase).toBe("ready")
    expect(state.filters).toEqual({ projectId, dateRange: "7d" })
    expect(state.data?.dashboardSummary.promptAssetCount).toBe(1)
  })

  it("preserves both filters when an error is retried", async () => {
    // Given: the first aggregate request fails and the retry succeeds.
    let summaryCalls = 0
    const received: InsightsFilterInput[] = []
    const bridge = createTestBridge({
      data: readyData,
      getSummary: () => {
        summaryCalls += 1
        return summaryCalls === 1
          ? Promise.reject(new TypeError("database unavailable"))
          : Promise.resolve(readyData.dashboardSummary)
      },
      onCall: (method, filter) => {
        if (method === "getDashboardSummary") received.push(filter)
      },
    })
    let state = reduceInsightsState(
      reduceInsightsState(createInitialInsightsState(), {
        kind: "project_filter_changed",
        projectId,
      }),
      { kind: "date_range_changed", dateRange: "90d" },
    )
    const loader = createInsightsLoader(bridge, (event) => {
      state = reduceInsightsState(state, event)
    })
    // When: the failed request is retried with current state filters.
    await loader.load(state.filters)
    expect(state.phase).toBe("error")
    await loader.load(state.filters)
    // Then: retry reaches ready without altering either filter.
    expect(state.phase).toBe("ready")
    expect(state.filters).toEqual({ projectId, dateRange: "90d" })
    expect(received).toEqual([
      { projectId, dateRange: "90d" },
      { projectId, dateRange: "90d" },
    ])
  })

  it("converts a deferred non-Error bridge rejection into the deterministic error state", async () => {
    // Given: one panel request remains pending and will reject with a non-Error value.
    const deferred = createDeferred<InsightsData["projectHealth"]>()
    const bridge = createTestBridge({
      data: readyData,
      getProjectHealth: () => deferred.promise,
    })
    let state = createInitialInsightsState()
    const loader = createInsightsLoader(bridge, (event) => {
      state = reduceInsightsState(state, event)
    })
    // When: the bridge rejects after the load has started.
    const pending = loader.load(state.filters)
    deferred.reject("bridge rejected")
    await pending
    // Then: the rejection is consumed as the same generic load failure.
    expect(state).toEqual({
      phase: "error",
      filters: { projectId: null, dateRange: "all" },
      data: null,
      error: "Insights could not be loaded.",
    })
  })
})
