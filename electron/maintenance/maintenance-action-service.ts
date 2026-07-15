import type Database from "better-sqlite3"

import {
  cancelMaintenanceActionSessionInputSchema,
  executeMaintenanceActionInputSchema,
  maintenanceActionResultSchema,
  preparedMaintenanceActionSchema,
  prepareMaintenanceActionInputSchema,
} from "../ipc-contract.js"
import type {
  CancelMaintenanceActionSessionInput,
  ExecuteMaintenanceActionInput,
  MaintenanceActionResult,
  MaintenanceActionStatus,
  PreparedMaintenanceAction,
  PrepareMaintenanceActionInput,
} from "../ipc-types.js"
import type { MaintenanceActionPlan } from "./maintenance-action-plan.js"
import { createMaintenanceActionPlanner } from "./maintenance-action-preparation.js"
import {
  createMaintenanceActionRepository,
  type MaintenanceActionRepository,
  MaintenanceActionStaleError,
} from "./maintenance-action-repository.js"
import {
  type MaintenanceActionSession,
  type MaintenanceActionSessionStore,
  MaintenanceActionSessionUnavailableError,
  type StoredMaintenanceActionPreview,
} from "./maintenance-action-session-store.js"

export type MaintenanceActionConfirmationRequest = {
  readonly preview: StoredMaintenanceActionPreview
  readonly affectedDisplayNames: readonly string[]
  readonly warnings: readonly string[]
  readonly consequences: readonly string[]
}

export type MaintenanceActionConfirmationDecision = "confirmed" | "cancelled"

type MaintenanceActionServiceDependencies = {
  readonly sqlite: Database.Database
  readonly sessions: MaintenanceActionSessionStore
  readonly confirmAction: (
    request: MaintenanceActionConfirmationRequest,
  ) => Promise<MaintenanceActionConfirmationDecision>
}

const resultMessageByStatus = {
  succeeded: "Maintenance action completed.",
  stale: "Maintenance action could not run because its prepared data changed.",
  failed: "Maintenance action could not be completed.",
  confirmation_cancelled: "Maintenance action confirmation was canceled.",
} as const satisfies Record<MaintenanceActionStatus, string>

function changedCount(plan: MaintenanceActionPlan): number {
  switch (plan.actionType) {
    case "merge_duplicate_tags":
      return plan.duplicateTags.length
    case "delete_unused_tags":
      return plan.tags.length
    case "repair_current_versions":
      return plan.repairs.length
    case "delete_empty_prompt_assets":
      return plan.assets.length
    case "rebuild_search_index":
      return 1
    default:
      return assertNever(plan)
  }
}

function executeTrustedPlan(
  repository: MaintenanceActionRepository,
  plan: MaintenanceActionPlan,
): void {
  switch (plan.actionType) {
    case "merge_duplicate_tags":
      repository.mergeDuplicateTags(plan)
      return
    case "delete_unused_tags":
      repository.deleteUnusedTags(plan)
      return
    case "repair_current_versions":
      repository.repairCurrentVersions(plan)
      return
    case "delete_empty_prompt_assets":
      repository.deleteEmptyPromptAssets(plan)
      return
    case "rebuild_search_index":
      repository.rebuildMaintenanceSearchIndex()
      return
    default:
      assertNever(plan)
  }
}

function sessionResult(
  session: MaintenanceActionSession,
  status: MaintenanceActionStatus,
  completedCount: number,
): MaintenanceActionResult {
  return maintenanceActionResultSchema.parse({
    actionSessionId: session.id,
    actionType: session.actionType,
    status,
    changedCount: completedCount,
    skippedCount: 0,
    message: resultMessageByStatus[status],
    warnings: session.warningLedger,
  })
}

function unavailableResult(input: ExecuteMaintenanceActionInput): MaintenanceActionResult {
  return maintenanceActionResultSchema.parse({
    actionSessionId: input.actionSessionId,
    actionType: input.actionType,
    status: "failed",
    changedCount: 0,
    skippedCount: 0,
    message: "Maintenance action session is unavailable.",
    warnings: [],
  })
}

export function createMaintenanceActionService(dependencies: MaintenanceActionServiceDependencies) {
  const planner = createMaintenanceActionPlanner(dependencies.sqlite)
  const repository = createMaintenanceActionRepository(dependencies.sqlite)

  return {
    prepareAction(input: PrepareMaintenanceActionInput): PreparedMaintenanceAction {
      const planned = planner.prepare(prepareMaintenanceActionInputSchema.parse(input))
      const session = dependencies.sessions.createActionSession(planned)
      return preparedMaintenanceActionSchema.parse({
        actionSessionId: session.id,
        actionType: session.actionType,
        preview: session.preview,
        affectedDisplayNames: session.affectedDisplayNames,
        warnings: session.warningLedger,
        requiresConfirmation: true,
        expiresAt: session.expiresAt,
      })
    },
    async executeAction(input: ExecuteMaintenanceActionInput): Promise<MaintenanceActionResult> {
      const parsedInput = executeMaintenanceActionInputSchema.parse(input)
      let session: MaintenanceActionSession
      try {
        session = dependencies.sessions.requireReadyActionSession(parsedInput.actionSessionId)
      } catch (error) {
        if (error instanceof MaintenanceActionSessionUnavailableError) {
          return unavailableResult(parsedInput)
        }
        throw error
      }

      if (session.actionType !== parsedInput.actionType) {
        dependencies.sessions.consumeActionSessionAfterFailure(session.id)
        return sessionResult(session, "failed", 0)
      }

      try {
        const decision = await dependencies.confirmAction({
          preview: session.preview,
          affectedDisplayNames: session.affectedDisplayNames,
          warnings: session.warningLedger,
          consequences: session.consequenceLedger,
        })
        if (decision === "cancelled") {
          dependencies.sessions.preserveActionSessionAfterConfirmationCancel(session.id)
          return sessionResult(session, "confirmation_cancelled", 0)
        }

        executeTrustedPlan(repository, session.executionPlan)
        dependencies.sessions.consumeActionSessionAfterSuccess(session.id)
        return sessionResult(session, "succeeded", changedCount(session.executionPlan))
      } catch (error) {
        dependencies.sessions.consumeActionSessionAfterFailure(session.id)
        if (error instanceof MaintenanceActionStaleError) {
          return sessionResult(session, "stale", 0)
        }
        return sessionResult(session, "failed", 0)
      }
    },
    cancelActionSession(input: CancelMaintenanceActionSessionInput): void {
      const parsedInput = cancelMaintenanceActionSessionInputSchema.parse(input)
      dependencies.sessions.cancelActionSession(parsedInput.actionSessionId)
    },
  }
}

export type MaintenanceActionService = ReturnType<typeof createMaintenanceActionService>

function assertNever(value: never): never {
  throw new TypeError(`Unexpected maintenance action plan: ${String(value)}`)
}
