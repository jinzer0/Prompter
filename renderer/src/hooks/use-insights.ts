import { useCallback, useEffect, useMemo, useReducer } from "react"

import type { InsightsDateRange } from "../../../electron/ipc-types"
import { createInsightsLoader } from "./insights-loader"
import { createInitialInsightsState, reduceInsightsState } from "./insights-state"

export type UseInsightsResult = ReturnType<typeof useInsights>

export function useInsights() {
  const [state, dispatch] = useReducer(reduceInsightsState, undefined, createInitialInsightsState)
  const loader = useMemo(() => createInsightsLoader(window.prompter.insights, dispatch), [])

  useEffect(() => {
    void loader.load(state.filters)
    return loader.invalidate
  }, [loader, state.filters])

  const setProjectId = useCallback((projectId: string | null): void => {
    dispatch({ kind: "project_filter_changed", projectId })
  }, [])

  const setDateRange = useCallback((dateRange: InsightsDateRange): void => {
    dispatch({ kind: "date_range_changed", dateRange })
  }, [])

  const retry = useCallback(async (): Promise<void> => {
    await loader.load(state.filters)
  }, [loader, state.filters])

  return { ...state, retry, setDateRange, setProjectId }
}
