import { useEffect, useReducer } from "react"

import type { PrepareMaintenanceActionInput } from "../../../electron/ipc-types"
import {
  buildMaintenanceScanInput,
  createInitialMaintenanceState,
  type MaintenanceScanOptions,
  maintenanceReducer,
} from "./maintenance-state"

export type {
  MaintenanceActionPhase,
  MaintenanceError,
  MaintenanceEvent,
  MaintenanceOperation,
  MaintenanceScanPhase,
  MaintenanceState,
} from "./maintenance-state"
export {
  buildMaintenanceScanInput,
  createInitialMaintenanceState,
  DEFAULT_MAINTENANCE_SCAN_OPTIONS,
  maintenanceReducer,
} from "./maintenance-state"

type UseMaintenanceOptions = {
  readonly currentProjectId: string | null
}

export function useMaintenance({ currentProjectId }: UseMaintenanceOptions) {
  const [state, dispatch] = useReducer(maintenanceReducer, createInitialMaintenanceState())

  useEffect(() => {
    if (currentProjectId === null && state.currentProjectOnly) {
      dispatch({ type: "current_project_filter_changed", enabled: false })
    }
  }, [currentProjectId, state.currentProjectOnly])

  function setScanOptions(options: MaintenanceScanOptions): void {
    dispatch({ type: "scan_options_changed", options })
  }

  function setCurrentProjectFilter(enabled: boolean): void {
    dispatch({
      type: "current_project_filter_changed",
      enabled: enabled && currentProjectId !== null,
    })
  }

  function setSelectedActionInput(input: PrepareMaintenanceActionInput | null): void {
    dispatch({ type: "action_selected", input })
  }

  async function scanLibrary(): Promise<void> {
    dispatch({ type: "scan_started" })

    try {
      const scanResult = await window.prompter.maintenance.scanLibrary(
        buildMaintenanceScanInput(state, currentProjectId),
      )
      dispatch({ type: "scan_succeeded", scanResult })
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      dispatch({
        type: "operation_failed",
        operation: "scan",
        message: "Maintenance scan could not be completed.",
      })
    }
  }

  async function prepareAction(): Promise<void> {
    const input = state.selectedActionInput
    if (input === null || state.preparedAction !== null) {
      return
    }

    dispatch({ type: "prepare_started" })

    try {
      const preparedAction = await window.prompter.maintenance.prepareAction(input)
      dispatch({ type: "prepare_succeeded", preparedAction })
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      dispatch({
        type: "operation_failed",
        operation: "prepare",
        message: "Maintenance action could not be prepared.",
      })
    }
  }

  async function executeAction(): Promise<void> {
    const preparedAction = state.preparedAction
    if (preparedAction === null) {
      return
    }

    dispatch({ type: "execute_started" })

    try {
      const result = await window.prompter.maintenance.executeAction({
        actionSessionId: preparedAction.actionSessionId,
        actionType: preparedAction.actionType,
      })
      dispatch({ type: "execute_finished", result })
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      dispatch({
        type: "operation_failed",
        operation: "execute",
        message: "Maintenance action could not be completed.",
      })
    }
  }

  async function cancelActionSession(): Promise<void> {
    const preparedAction = state.preparedAction
    if (preparedAction === null) {
      return
    }

    dispatch({ type: "cancel_started" })

    try {
      await window.prompter.maintenance.cancelActionSession({
        actionSessionId: preparedAction.actionSessionId,
      })
      dispatch({ type: "cancel_succeeded" })
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      dispatch({
        type: "operation_failed",
        operation: "cancel",
        message: "Maintenance action session could not be cancelled.",
      })
    }
  }

  const isWorking =
    state.scanPhase === "scanning" ||
    state.actionPhase === "preparing" ||
    state.actionPhase === "executing" ||
    state.actionPhase === "cancelling"

  return {
    actionPhase: state.actionPhase,
    cancelActionSession,
    canFilterCurrentProject: currentProjectId !== null,
    canRescan: state.scanResult !== null && state.scanStale && !isWorking,
    currentProjectOnly: state.currentProjectOnly && currentProjectId !== null,
    error: state.error,
    executeAction,
    findings: state.scanResult?.findings ?? [],
    isWorking,
    prepareAction,
    preparedAction: state.preparedAction,
    preparedActionPreview: state.preparedAction?.preview ?? null,
    recommendedActions: state.scanResult?.recommendedActions ?? [],
    rescan: scanLibrary,
    resultSummary: state.resultSummary,
    scanLibrary,
    scanOptions: state.scanOptions,
    scanPhase: state.scanPhase,
    scanStale: state.scanStale,
    scanSummary: state.scanResult?.summary ?? null,
    selectedActionInput: state.selectedActionInput,
    setCurrentProjectFilter,
    setScanOptions,
    setSelectedActionInput,
  }
}
