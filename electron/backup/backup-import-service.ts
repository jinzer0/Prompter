import { randomUUID } from "node:crypto"

import type Database from "better-sqlite3"

import { eq } from "drizzle-orm"
import type { AppDatabase } from "../db/repositories/common.js"
import * as schema from "../db/schema.js"
import { backupImportResultSchema, importBackupInputSchema } from "../ipc-contract.js"
import type { BackupImportResult, ImportBackupInput } from "../ipc-types.js"
import { resolveBackupImport } from "./backup-import-resolution.js"
import type { BackupImportCheckpoint } from "./backup-import-types.js"
import { writeResolvedBackupImport } from "./backup-import-writer.js"
import type { BackupImportSessionStore } from "./backup-session-store.js"

type BackupImportServiceDependencies = {
  readonly db: AppDatabase
  readonly sqlite: Database.Database
  readonly sessions: BackupImportSessionStore
  readonly createId?: () => string
  readonly onWriteCheckpoint?: (checkpoint: BackupImportCheckpoint) => void
}

export class BackupImportPreviewMismatchError extends Error {
  readonly name = "BackupImportPreviewMismatchError"

  constructor(readonly field: "previewFingerprint" | "previewRevision") {
    super(`Backup import ${field} does not match the ready session`)
  }
}

export class BackupImportDestinationProjectError extends Error {
  readonly name = "BackupImportDestinationProjectError"

  constructor(readonly destinationProjectId: string | null) {
    super(
      destinationProjectId === null
        ? "Prompt asset backups require a destination project"
        : `Destination project ${destinationProjectId} does not exist`,
    )
  }
}

const noWriteCheckpoint = (): void => undefined

function destinationProjectExists(db: AppDatabase, projectId: string): boolean {
  return (
    db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId))
      .get() !== undefined
  )
}

export function createBackupImportService(dependencies: BackupImportServiceDependencies) {
  return {
    async importBackup(input: ImportBackupInput): Promise<BackupImportResult> {
      const parsed = importBackupInputSchema.parse(input)
      const session = dependencies.sessions.requireReadyImportSession(parsed.importSessionId)
      if (parsed.previewFingerprint !== session.previewFingerprint) {
        throw new BackupImportPreviewMismatchError("previewFingerprint")
      }
      if (parsed.previewRevision !== session.previewRevision) {
        throw new BackupImportPreviewMismatchError("previewRevision")
      }
      if (session.envelope.backupType === "prompt_assets") {
        const destinationProjectId = parsed.destinationProjectId
        if (
          destinationProjectId === undefined ||
          !destinationProjectExists(dependencies.db, destinationProjectId)
        ) {
          throw new BackupImportDestinationProjectError(destinationProjectId ?? null)
        }
      }

      const resolution = resolveBackupImport({
        db: dependencies.db,
        envelope: session.envelope,
        destinationProjectId: parsed.destinationProjectId,
        initialWarnings: session.resolutionPlan.warnings,
        createId: dependencies.createId ?? randomUUID,
      })

      try {
        writeResolvedBackupImport({
          db: dependencies.db,
          sqlite: dependencies.sqlite,
          resolution,
          onCheckpoint: dependencies.onWriteCheckpoint ?? noWriteCheckpoint,
        })
      } catch (error) {
        dependencies.sessions.consumeImportSessionAfterFailure(session.id)
        throw error
      }

      dependencies.sessions.consumeImportSessionAfterSuccess(session.id)
      return backupImportResultSchema.parse({
        backupType: resolution.backupType,
        importedCounts: resolution.importedCounts,
        createdProjectIds: resolution.createdProjectIds,
        createdPromptAssetIds: resolution.createdPromptAssetIds,
        createdPromptTemplateIds: resolution.createdPromptTemplateIds,
        createdHarnessTemplateIds: resolution.createdHarnessTemplateIds,
        warnings: resolution.warnings,
        searchIndexStatus: resolution.searchRows.length === 0 ? "not_required" : "updated",
        message: "Backup imported",
      })
    },
  }
}

export { BackupImportResolutionError } from "./backup-import-resolution.js"
