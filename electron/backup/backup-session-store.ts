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
  const sessions = new Map<string, BackupImportSession>()

  function cleanupExpiredSessions(): void {
    const now = dependencies.now()
    for (const session of sessions.values()) {
      if (session.status === "ready" && session.expiresAt <= now) {
        session.status = "expired"
      }
    }
  }

  function requireReadyImportSession(importSessionId: string): BackupImportSession {
    cleanupExpiredSessions()
    const session = sessions.get(importSessionId)
    if (session === undefined) {
      throw new BackupImportSessionNotFoundError(importSessionId)
    }
    if (session.status !== "ready") {
      throw new BackupImportSessionStateError(importSessionId, session.status)
    }
    return session
  }

  function consumeImportSession(importSessionId: string): void {
    requireReadyImportSession(importSessionId).status = "consumed"
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
      sessions.set(id, session)
      return session
    },
    getImportSession(importSessionId: string): BackupImportSession | null {
      return sessions.get(importSessionId) ?? null
    },
    requireReadyImportSession,
    cancelImportSession(importSessionId: string): void {
      requireReadyImportSession(importSessionId).status = "cancelled"
    },
    consumeImportSessionAfterSuccess: consumeImportSession,
    consumeImportSessionAfterFailure: consumeImportSession,
  }
}

export type BackupImportSessionStore = ReturnType<typeof createBackupImportSessionStore>
