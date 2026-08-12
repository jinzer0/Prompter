import { randomUUID } from "node:crypto"

import type { BackupEnvelope, BackupItemCounts, BackupType } from "../ipc-types.js"

export const BACKUP_EXPORT_SESSION_TTL_MS = 15 * 60 * 1_000

type BackupExportSessionStatus = "ready" | "cancelled" | "consumed" | "expired"
type TerminalBackupExportSessionStatus = Exclude<BackupExportSessionStatus, "ready">

export type BackupExportSession = {
  readonly id: string
  readonly backupEnvelope: BackupEnvelope
  readonly backupType: BackupType
  readonly itemCounts: BackupItemCounts
  readonly createdAt: number
  readonly expiresAt: number
  status: BackupExportSessionStatus
}

type CreateBackupExportSessionInput = {
  readonly backupEnvelope: BackupEnvelope
}

type BackupExportSessionStoreDependencies = {
  readonly now?: () => number
  readonly createId?: () => string
  readonly ttlMs?: number
}

export type BackupExportSessionFailure = {
  readonly code: "session_not_found" | "session_cancelled" | "session_consumed" | "session_expired"
  readonly message: "Encrypted backup export session is unavailable."
}

const unavailableMessage = "Encrypted backup export session is unavailable." as const
const failureCodeByStatus = {
  cancelled: "session_cancelled",
  consumed: "session_consumed",
  expired: "session_expired",
} as const satisfies Record<TerminalBackupExportSessionStatus, BackupExportSessionFailure["code"]>

export class BackupExportSessionUnavailableError extends Error {
  readonly name = "BackupExportSessionUnavailableError"
  readonly failure: BackupExportSessionFailure

  constructor(code: BackupExportSessionFailure["code"]) {
    super(unavailableMessage)
    this.failure = { code, message: unavailableMessage }
  }
}

export function createBackupExportSessionStore(
  dependencies: BackupExportSessionStoreDependencies = {},
) {
  const readySessions = new Map<string, BackupExportSession>()
  const terminalStatuses = new Map<string, TerminalBackupExportSessionStatus>()
  const now = dependencies.now ?? Date.now
  const createId = dependencies.createId ?? randomUUID
  const ttlMs = dependencies.ttlMs ?? BACKUP_EXPORT_SESSION_TTL_MS

  function expireBackupExportSessions(): void {
    const currentTime = now()
    for (const session of readySessions.values()) {
      if (session.expiresAt <= currentTime) {
        terminalizeBackupExportSession(session.id, "expired")
      }
    }
  }

  function terminalizeBackupExportSession(
    backupExportSessionId: string,
    status: TerminalBackupExportSessionStatus,
  ): void {
    const session = readySessions.get(backupExportSessionId)
    if (session !== undefined) {
      session.status = status
    }
    readySessions.delete(backupExportSessionId)
    terminalStatuses.set(backupExportSessionId, status)
  }

  function requireReadyBackupExportSession(backupExportSessionId: string): BackupExportSession {
    expireBackupExportSessions()
    const session = readySessions.get(backupExportSessionId)
    if (session !== undefined) {
      return session
    }
    const status = terminalStatuses.get(backupExportSessionId)
    throw new BackupExportSessionUnavailableError(
      status === undefined ? "session_not_found" : failureCodeByStatus[status],
    )
  }

  return {
    createBackupExportSession(input: CreateBackupExportSessionInput): BackupExportSession {
      expireBackupExportSessions()
      const createdAt = now()
      const session: BackupExportSession = {
        id: createId(),
        backupEnvelope: input.backupEnvelope,
        backupType: input.backupEnvelope.backupType,
        itemCounts: input.backupEnvelope.metadata.itemCounts,
        createdAt,
        expiresAt: createdAt + ttlMs,
        status: "ready",
      }
      readySessions.set(session.id, session)
      return session
    },
    getBackupExportSession(backupExportSessionId: string): BackupExportSession | null {
      expireBackupExportSessions()
      return readySessions.get(backupExportSessionId) ?? null
    },
    requireReadyBackupExportSession,
    cancelBackupExportSession(backupExportSessionId: string): void {
      requireReadyBackupExportSession(backupExportSessionId)
      terminalizeBackupExportSession(backupExportSessionId, "cancelled")
    },
    revokeBackupExportSessions(): void {
      for (const session of readySessions.values()) {
        terminalizeBackupExportSession(session.id, "cancelled")
      }
    },
    expireBackupExportSessions,
    consumeBackupExportSessionAfterSuccess(backupExportSessionId: string): void {
      terminalizeBackupExportSession(backupExportSessionId, "consumed")
    },
  }
}

export type BackupExportSessionStore = ReturnType<typeof createBackupExportSessionStore>
