import { backupValidationPreviewSchema } from "../ipc-contract.js"
import type {
  BackupConflict,
  BackupConsequence,
  BackupEnvelope,
  BackupItemCounts,
  BackupValidationPreview,
  BackupWarning,
} from "../ipc-types.js"

export const BACKUP_IMPORT_SESSION_TTL_MS = 15 * 60 * 1_000

type ImportSessionStatus = "ready" | "cancelled" | "consumed" | "expired"
type TerminalImportSessionStatus = Exclude<ImportSessionStatus, "ready">

export type BackupResolutionPlan = {
  readonly itemCounts: BackupItemCounts
  readonly conflicts: readonly BackupConflict[]
  readonly warnings: readonly BackupWarning[]
  readonly consequences: readonly BackupConsequence[]
  readonly requiresDestinationProject: boolean
}

export type BackupImportSession = {
  readonly id: string
  readonly envelope: BackupEnvelope
  readonly resolutionPlan: BackupResolutionPlan
  readonly previewFingerprint: string
  readonly previewRevision: number
  readonly createdAt: number
  readonly expiresAt: number
  readonly preview: BackupValidationPreview
  status: ImportSessionStatus
}

type BackupImportSessionStoreDependencies = {
  readonly now: () => number
  readonly createId: () => string
}

type CreateBackupImportSessionInput = {
  readonly envelope: BackupEnvelope
  readonly resolutionPlan: BackupResolutionPlan
  readonly previewFingerprint: string
  readonly preview: Omit<
    BackupValidationPreview,
    "importSessionId" | "previewFingerprint" | "previewRevision" | "expiresAt"
  >
}

export class BackupImportSessionNotFoundError extends Error {
  readonly name = "BackupImportSessionNotFoundError"

  constructor(readonly importSessionId: string) {
    super(`Backup import session ${importSessionId} was not found`)
  }
}

export class BackupImportSessionStateError extends Error {
  readonly name = "BackupImportSessionStateError"

  constructor(
    readonly importSessionId: string,
    readonly status: ImportSessionStatus,
  ) {
    super(`Backup import session ${importSessionId} is ${status}`)
  }
}

export function createBackupImportSessionStore(dependencies: BackupImportSessionStoreDependencies) {
  const readySessions = new Map<string, BackupImportSession>()
  const terminalStatuses = new Map<string, TerminalImportSessionStatus>()

  function cleanupExpiredSessions(): void {
    const now = dependencies.now()
    for (const session of readySessions.values()) {
      if (session.expiresAt <= now) {
        terminalizeImportSession(session.id, "expired")
      }
    }
  }

  function terminalizeImportSession(
    importSessionId: string,
    status: TerminalImportSessionStatus,
  ): void {
    const session = readySessions.get(importSessionId)
    if (session !== undefined) {
      session.status = status
    }
    readySessions.delete(importSessionId)
    terminalStatuses.set(importSessionId, status)
  }

  function requireReadyImportSession(importSessionId: string): BackupImportSession {
    cleanupExpiredSessions()
    const session = readySessions.get(importSessionId)
    if (session !== undefined) {
      return session
    }
    const status = terminalStatuses.get(importSessionId)
    if (status === undefined) {
      throw new BackupImportSessionNotFoundError(importSessionId)
    }
    throw new BackupImportSessionStateError(importSessionId, status)
  }

  return {
    cleanupExpiredSessions,
    createImportSession(input: CreateBackupImportSessionInput): BackupImportSession {
      cleanupExpiredSessions()
      const createdAt = dependencies.now()
      const expiresAt = createdAt + BACKUP_IMPORT_SESSION_TTL_MS
      const id = dependencies.createId()
      const preview = backupValidationPreviewSchema.parse({
        ...input.preview,
        importSessionId: id,
        previewFingerprint: input.previewFingerprint,
        previewRevision: 1,
        expiresAt,
      })
      const session = {
        id,
        envelope: input.envelope,
        resolutionPlan: input.resolutionPlan,
        previewFingerprint: input.previewFingerprint,
        previewRevision: preview.previewRevision,
        createdAt,
        expiresAt,
        preview,
        status: "ready" as const,
      }
      readySessions.set(id, session)
      return session
    },
    getImportSession(importSessionId: string): BackupImportSession | null {
      cleanupExpiredSessions()
      return readySessions.get(importSessionId) ?? null
    },
    requireReadyImportSession,
    cancelImportSession(importSessionId: string): void {
      requireReadyImportSession(importSessionId)
      terminalizeImportSession(importSessionId, "cancelled")
    },
    revokeBackupImportSessions(): void {
      for (const session of readySessions.values()) {
        terminalizeImportSession(session.id, "cancelled")
      }
    },
    consumeImportSessionAfterSuccess(importSessionId: string): void {
      terminalizeImportSession(importSessionId, "consumed")
    },
    consumeImportSessionAfterFailure(importSessionId: string): void {
      terminalizeImportSession(importSessionId, "consumed")
    },
  }
}

export type BackupImportSessionStore = ReturnType<typeof createBackupImportSessionStore>
