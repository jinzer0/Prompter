import { randomUUID } from "node:crypto"

import type { MaintenanceActionPreview, MaintenanceActionType } from "../ipc-types.js"
import {
  detachMaintenanceActionPlan,
  type MaintenanceActionPlan,
} from "./maintenance-action-plan.js"

export const MAINTENANCE_ACTION_SESSION_TTL_MS = 15 * 60 * 1_000

type MaintenanceActionSessionStatus = "ready" | "cancelled" | "consumed" | "expired"
type MaintenanceSnapshotValue = string | number | boolean | null
type TerminalSessionStatus = Exclude<MaintenanceActionSessionStatus, "ready">

export type MaintenanceActionRowSnapshot = {
  readonly entityType: string
  readonly entityId: string
  readonly fields: Readonly<Record<string, MaintenanceSnapshotValue>>
}

type MaintenanceActionConfirmationMetadata =
  | {
      readonly destructive: false
      readonly relationshipChanging: false
      readonly backupRecommendation: string | null
    }
  | {
      readonly destructive: true
      readonly relationshipChanging: boolean
      readonly backupRecommendation: string
    }
  | {
      readonly destructive: false
      readonly relationshipChanging: true
      readonly backupRecommendation: string
    }

export type CreateMaintenanceActionSessionInput = MaintenanceActionConfirmationMetadata & {
  readonly executionPlan: MaintenanceActionPlan
  readonly preview: MaintenanceActionPreview
  readonly affectedDisplayNames: readonly string[]
  readonly selectedEntityIds: readonly string[]
  readonly expectedCounts: Readonly<Record<string, number>>
  readonly rowSnapshots: readonly MaintenanceActionRowSnapshot[]
  readonly warningLedger: readonly string[]
  readonly consequenceLedger: readonly string[]
}

export type StoredMaintenanceActionPreview = Omit<MaintenanceActionPreview, "affectedEntityIds"> & {
  readonly affectedEntityIds: readonly string[]
}

export type MaintenanceActionSession = Omit<CreateMaintenanceActionSessionInput, "preview"> & {
  readonly preview: StoredMaintenanceActionPreview
  readonly id: string
  readonly actionType: MaintenanceActionType
  readonly createdAt: number
  readonly expiresAt: number
  status: MaintenanceActionSessionStatus
}

export type MaintenanceActionSessionFailure = {
  readonly code: "session_not_found" | "session_cancelled" | "session_consumed" | "session_expired"
  readonly message: "Maintenance action session is unavailable."
}

type MaintenanceActionSessionStoreDependencies = {
  readonly now?: () => number
  readonly createId?: () => string
  readonly ttlMs?: number
}

const unavailableMessage = "Maintenance action session is unavailable." as const
const failureCodeByStatus = {
  cancelled: "session_cancelled",
  consumed: "session_consumed",
  expired: "session_expired",
} as const satisfies Record<TerminalSessionStatus, MaintenanceActionSessionFailure["code"]>

export class MaintenanceActionSessionUnavailableError extends Error {
  readonly name = "MaintenanceActionSessionUnavailableError"
  readonly failure: MaintenanceActionSessionFailure

  constructor(code: MaintenanceActionSessionFailure["code"]) {
    super(unavailableMessage)
    this.failure = { code, message: unavailableMessage }
  }
}

export function createMaintenanceActionSessionStore(
  dependencies: MaintenanceActionSessionStoreDependencies = {},
) {
  const sessions = new Map<string, MaintenanceActionSession>()
  const now = dependencies.now ?? Date.now
  const createId = dependencies.createId ?? randomUUID
  const ttlMs = dependencies.ttlMs ?? MAINTENANCE_ACTION_SESSION_TTL_MS

  function expireActionSessions(): void {
    const currentTime = now()
    for (const session of sessions.values()) {
      if (session.status === "ready" && session.expiresAt <= currentTime) {
        session.status = "expired"
      }
    }
  }

  function requireReadyActionSession(actionSessionId: string): MaintenanceActionSession {
    expireActionSessions()
    const session = sessions.get(actionSessionId)
    if (session === undefined) {
      throw new MaintenanceActionSessionUnavailableError("session_not_found")
    }
    if (session.status !== "ready") {
      throw new MaintenanceActionSessionUnavailableError(failureCodeByStatus[session.status])
    }
    return session
  }

  function consumeActionSession(actionSessionId: string): void {
    requireReadyActionSession(actionSessionId).status = "consumed"
  }

  return {
    createActionSession(input: CreateMaintenanceActionSessionInput): MaintenanceActionSession {
      expireActionSessions()
      const createdAt = now()
      const session: MaintenanceActionSession = {
        ...input,
        id: createId(),
        actionType: input.executionPlan.actionType,
        executionPlan: detachMaintenanceActionPlan(input.executionPlan),
        preview: Object.freeze({
          ...input.preview,
          affectedEntityIds: Object.freeze([...input.preview.affectedEntityIds]),
        }),
        affectedDisplayNames: Object.freeze([...input.affectedDisplayNames]),
        selectedEntityIds: Object.freeze([...input.selectedEntityIds]),
        expectedCounts: Object.freeze({ ...input.expectedCounts }),
        rowSnapshots: Object.freeze(
          input.rowSnapshots.map((snapshot) => ({
            ...snapshot,
            fields: Object.freeze({ ...snapshot.fields }),
          })),
        ),
        warningLedger: Object.freeze([...input.warningLedger]),
        consequenceLedger: Object.freeze([...input.consequenceLedger]),
        createdAt,
        expiresAt: createdAt + ttlMs,
        status: "ready",
      }
      sessions.set(session.id, session)
      return session
    },
    getActionSession(actionSessionId: string): MaintenanceActionSession | null {
      return sessions.get(actionSessionId) ?? null
    },
    requireReadyActionSession,
    cancelActionSession(actionSessionId: string): void {
      requireReadyActionSession(actionSessionId).status = "cancelled"
    },
    preserveActionSessionAfterConfirmationCancel(actionSessionId: string): void {
      requireReadyActionSession(actionSessionId)
    },
    expireActionSessions,
    consumeActionSessionAfterSuccess: consumeActionSession,
    consumeActionSessionAfterFailure: consumeActionSession,
  }
}

export type MaintenanceActionSessionStore = ReturnType<typeof createMaintenanceActionSessionStore>
