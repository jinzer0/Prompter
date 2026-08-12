import { randomUUID } from "node:crypto"

import type { EncryptedBackupEnvelope } from "./encrypted-backup-schemas.js"

export const ENCRYPTED_BACKUP_IMPORT_SESSION_TTL_MS = 15 * 60 * 1_000

type EncryptedBackupImportSessionStatus = "ready" | "cancelled" | "consumed" | "expired"
type TerminalEncryptedBackupImportSessionStatus = Exclude<
  EncryptedBackupImportSessionStatus,
  "ready"
>

export type EncryptedBackupImportSession = {
  readonly id: string
  readonly encryptedBackup: EncryptedBackupEnvelope
  readonly createdAt: number
  readonly expiresAt: number
  status: EncryptedBackupImportSessionStatus
}

type CreateEncryptedBackupImportSessionInput = {
  readonly encryptedBackup: EncryptedBackupEnvelope
}

type EncryptedBackupImportSessionStoreDependencies = {
  readonly now?: () => number
  readonly createId?: () => string
  readonly ttlMs?: number
}

export type EncryptedBackupImportSessionFailure = {
  readonly code: "session_not_found" | "session_cancelled" | "session_consumed" | "session_expired"
  readonly message: "Encrypted backup import session is unavailable."
}

const unavailableMessage = "Encrypted backup import session is unavailable." as const
const failureCodeByStatus = {
  cancelled: "session_cancelled",
  consumed: "session_consumed",
  expired: "session_expired",
} as const satisfies Record<
  TerminalEncryptedBackupImportSessionStatus,
  EncryptedBackupImportSessionFailure["code"]
>

export class EncryptedBackupImportSessionUnavailableError extends Error {
  readonly name = "EncryptedBackupImportSessionUnavailableError"
  readonly failure: EncryptedBackupImportSessionFailure

  constructor(code: EncryptedBackupImportSessionFailure["code"]) {
    super(unavailableMessage)
    this.failure = { code, message: unavailableMessage }
  }
}

export function createEncryptedBackupImportSessionStore(
  dependencies: EncryptedBackupImportSessionStoreDependencies = {},
) {
  const readySessions = new Map<string, EncryptedBackupImportSession>()
  const claimedSessions = new Map<string, EncryptedBackupImportSession>()
  const terminalStatuses = new Map<string, TerminalEncryptedBackupImportSessionStatus>()
  const now = dependencies.now ?? Date.now
  const createId = dependencies.createId ?? randomUUID
  const ttlMs = dependencies.ttlMs ?? ENCRYPTED_BACKUP_IMPORT_SESSION_TTL_MS

  function expireEncryptedBackupImportSessions(): void {
    const currentTime = now()
    for (const session of readySessions.values()) {
      if (session.expiresAt <= currentTime) {
        terminalizeEncryptedBackupImportSession(session.id, "expired")
      }
    }
  }

  function terminalizeEncryptedBackupImportSession(
    encryptedBackupImportSessionId: string,
    status: TerminalEncryptedBackupImportSessionStatus,
  ): void {
    const session =
      readySessions.get(encryptedBackupImportSessionId) ??
      claimedSessions.get(encryptedBackupImportSessionId)
    if (session !== undefined) {
      session.status = status
    }
    readySessions.delete(encryptedBackupImportSessionId)
    claimedSessions.delete(encryptedBackupImportSessionId)
    terminalStatuses.set(encryptedBackupImportSessionId, status)
  }

  function requireReadyEncryptedBackupImportSession(
    encryptedBackupImportSessionId: string,
  ): EncryptedBackupImportSession {
    expireEncryptedBackupImportSessions()
    const session = readySessions.get(encryptedBackupImportSessionId)
    if (session !== undefined) {
      return session
    }
    if (claimedSessions.has(encryptedBackupImportSessionId)) {
      throw new EncryptedBackupImportSessionUnavailableError("session_consumed")
    }
    const status = terminalStatuses.get(encryptedBackupImportSessionId)
    throw new EncryptedBackupImportSessionUnavailableError(
      status === undefined ? "session_not_found" : failureCodeByStatus[status],
    )
  }

  function claimEncryptedBackupImportSession(
    encryptedBackupImportSessionId: string,
  ): EncryptedBackupImportSession {
    const session = requireReadyEncryptedBackupImportSession(encryptedBackupImportSessionId)
    readySessions.delete(session.id)
    claimedSessions.set(session.id, session)
    return session
  }

  return {
    createEncryptedBackupImportSession(
      input: CreateEncryptedBackupImportSessionInput,
    ): EncryptedBackupImportSession {
      expireEncryptedBackupImportSessions()
      const createdAt = now()
      const session: EncryptedBackupImportSession = {
        id: createId(),
        encryptedBackup: input.encryptedBackup,
        createdAt,
        expiresAt: createdAt + ttlMs,
        status: "ready",
      }
      readySessions.set(session.id, session)
      return session
    },
    getEncryptedBackupImportSession(
      encryptedBackupImportSessionId: string,
    ): EncryptedBackupImportSession | null {
      expireEncryptedBackupImportSessions()
      return readySessions.get(encryptedBackupImportSessionId) ?? null
    },
    requireReadyEncryptedBackupImportSession,
    claimEncryptedBackupImportSession,
    releaseEncryptedBackupImportSessionClaim(session: EncryptedBackupImportSession): void {
      if (claimedSessions.get(session.id) === session) {
        if (session.expiresAt <= now()) {
          terminalizeEncryptedBackupImportSession(session.id, "expired")
        } else {
          claimedSessions.delete(session.id)
          readySessions.set(session.id, session)
        }
      }
    },
    cancelEncryptedBackupImportSession(encryptedBackupImportSessionId: string): void {
      requireReadyEncryptedBackupImportSession(encryptedBackupImportSessionId)
      terminalizeEncryptedBackupImportSession(encryptedBackupImportSessionId, "cancelled")
    },
    preserveEncryptedBackupImportSessionAfterInvalidPassphrase(
      encryptedBackupImportSessionId: string,
    ): void {
      requireReadyEncryptedBackupImportSession(encryptedBackupImportSessionId)
    },
    expireEncryptedBackupImportSessions,
    consumeEncryptedBackupImportSessionAfterSuccess(encryptedBackupImportSessionId: string): void {
      terminalizeEncryptedBackupImportSession(encryptedBackupImportSessionId, "consumed")
    },
  }
}

export type EncryptedBackupImportSessionStore = ReturnType<
  typeof createEncryptedBackupImportSessionStore
>
