import type {
  MaintenanceActionResult,
  MaintenanceScanInput,
  MaintenanceScanResult,
  PreparedMaintenanceAction,
  PrepareMaintenanceActionInput,
} from "../../../electron/ipc-types"

export type MaintenanceScanOptions = Omit<MaintenanceScanInput, "projectId">
export type MaintenanceScanPhase = "idle" | "scanning" | "ready" | "error"
export type MaintenanceActionPhase =
  | "idle"
  | "preparing"
  | "prepared"
  | "executing"
  | "cancelling"
  | "completed"
  | "cancelled"
  | "error"
export type MaintenanceOperation = "scan" | "prepare" | "execute" | "cancel"

export type MaintenanceError = {
  readonly operation: MaintenanceOperation
  readonly message: string
}

export type MaintenanceState = {
  readonly scanOptions: MaintenanceScanOptions
  readonly currentProjectOnly: boolean
  readonly scanPhase: MaintenanceScanPhase
  readonly scanResult: MaintenanceScanResult | null
  readonly scanStale: boolean
  readonly actionPhase: MaintenanceActionPhase
  readonly selectedActionInput: PrepareMaintenanceActionInput | null
  readonly preparedAction: PreparedMaintenanceAction | null
  readonly resultSummary: MaintenanceActionResult | null
  readonly error: MaintenanceError | null
}

export type MaintenanceEvent =
  | { readonly type: "scan_options_changed"; readonly options: MaintenanceScanOptions }
  | { readonly type: "current_project_filter_changed"; readonly enabled: boolean }
  | { readonly type: "scan_started" }
  | { readonly type: "scan_succeeded"; readonly scanResult: MaintenanceScanResult }
  | {
      readonly type: "operation_failed"
      readonly operation: MaintenanceOperation
      readonly message: string
    }
  | {
      readonly type: "action_selected"
      readonly input: PrepareMaintenanceActionInput | null
    }
  | { readonly type: "prepare_started" }
  | {
      readonly type: "prepare_succeeded"
      readonly preparedAction: PreparedMaintenanceAction
    }
  | { readonly type: "execute_started" }
  | { readonly type: "execute_finished"; readonly result: MaintenanceActionResult }
  | { readonly type: "cancel_started" }
  | { readonly type: "cancel_succeeded" }

export const DEFAULT_MAINTENANCE_SCAN_OPTIONS = {
  includePromptDuplicates: true,
  includeTagDuplicates: true,
  includeUnusedTags: true,
  includeCurrentVersionIssues: true,
  includeEmptyAssets: true,
  includeSearchIndexHealth: true,
  includePromptTemplateIssues: true,
  includeHarnessTemplateIssues: true,
  includeQualityFindings: true,
} as const satisfies MaintenanceScanOptions

export function createInitialMaintenanceState(): MaintenanceState {
  return {
    scanOptions: DEFAULT_MAINTENANCE_SCAN_OPTIONS,
    currentProjectOnly: false,
    scanPhase: "idle",
    scanResult: null,
    scanStale: false,
    actionPhase: "idle",
    selectedActionInput: null,
    preparedAction: null,
    resultSummary: null,
    error: null,
  }
}

export function buildMaintenanceScanInput(
  state: MaintenanceState,
  currentProjectId: string | null,
): MaintenanceScanInput {
  if (state.currentProjectOnly && currentProjectId !== null) {
    return { ...state.scanOptions, projectId: currentProjectId }
  }

  return state.scanOptions
}

function assertNever(value: never): never {
  throw new TypeError(`Unhandled maintenance state value: ${String(value)}`)
}

function reduceExecuteResult(
  state: MaintenanceState,
  result: MaintenanceActionResult,
): MaintenanceState {
  switch (result.status) {
    case "confirmation_cancelled":
      return {
        ...state,
        actionPhase: "prepared",
        resultSummary: result,
        error: null,
      }
    case "succeeded":
      return {
        ...state,
        scanStale: true,
        actionPhase: "completed",
        selectedActionInput: null,
        preparedAction: null,
        resultSummary: result,
        error: null,
      }
    case "stale":
      return {
        ...state,
        scanStale: true,
        actionPhase: "error",
        selectedActionInput: null,
        preparedAction: null,
        resultSummary: result,
        error: { operation: "execute", message: result.message },
      }
    case "failed":
      return {
        ...state,
        actionPhase: "error",
        selectedActionInput: null,
        preparedAction: null,
        resultSummary: result,
        error: { operation: "execute", message: result.message },
      }
    default:
      return assertNever(result.status)
  }
}

function failedOperationPhase(
  state: MaintenanceState,
  operation: MaintenanceOperation,
): Pick<MaintenanceState, "scanPhase" | "actionPhase"> {
  switch (operation) {
    case "scan":
      return { scanPhase: "error", actionPhase: state.actionPhase }
    case "prepare":
      return { scanPhase: state.scanPhase, actionPhase: "error" }
    case "execute":
    case "cancel":
      return { scanPhase: state.scanPhase, actionPhase: "prepared" }
    default:
      return assertNever(operation)
  }
}

export function maintenanceReducer(
  state: MaintenanceState,
  event: MaintenanceEvent,
): MaintenanceState {
  switch (event.type) {
    case "scan_options_changed":
      return { ...state, scanOptions: event.options }
    case "current_project_filter_changed":
      return { ...state, currentProjectOnly: event.enabled }
    case "scan_started":
      return { ...state, scanPhase: "scanning", error: null }
    case "scan_succeeded":
      return {
        ...state,
        scanPhase: "ready",
        scanResult: event.scanResult,
        scanStale: false,
        error: null,
      }
    case "operation_failed":
      return {
        ...state,
        ...failedOperationPhase(state, event.operation),
        error: { operation: event.operation, message: event.message },
      }
    case "action_selected":
      if (state.preparedAction !== null) {
        return state
      }

      return {
        ...state,
        actionPhase: "idle",
        selectedActionInput: event.input,
        preparedAction: null,
        resultSummary: null,
        error: null,
      }
    case "prepare_started":
      return { ...state, actionPhase: "preparing", resultSummary: null, error: null }
    case "prepare_succeeded":
      return {
        ...state,
        actionPhase: "prepared",
        preparedAction: event.preparedAction,
        resultSummary: null,
        error: null,
      }
    case "execute_started":
      return { ...state, actionPhase: "executing", resultSummary: null, error: null }
    case "execute_finished":
      return reduceExecuteResult(state, event.result)
    case "cancel_started":
      return { ...state, actionPhase: "cancelling", error: null }
    case "cancel_succeeded":
      return {
        ...state,
        actionPhase: "cancelled",
        selectedActionInput: null,
        preparedAction: null,
        resultSummary: null,
        error: null,
      }
    default:
      return assertNever(event)
  }
}
