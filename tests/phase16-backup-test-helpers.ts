import { createHash, randomUUID } from "node:crypto"
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createBackupExportService } from "../electron/backup/backup-export-service"
import { createBackupImportService } from "../electron/backup/backup-import-service"
import type { BackupImportCheckpoint } from "../electron/backup/backup-import-types"
import {
  type BackupNativeDependencies,
  createBackupNativeService,
} from "../electron/backup/backup-native-service"
import { createBackupImportSessionStore } from "../electron/backup/backup-session-store"
import { createBackupValidationService } from "../electron/backup/backup-validation-service"
import { backupEnvelopeSchema } from "../electron/ipc-contract"
import type {
  BackupEnvelope,
  BackupType,
  BackupValidationPreview,
  ImportBackupInput,
} from "../electron/ipc-types"
import { fullImportEnvelope } from "./phase16-backup-import-fixtures"
import {
  cleanupBackupImportTestDatabases,
  type SeededBackupFixture,
  type TestDatabase,
} from "./phase16-backup-import-test-helpers"

export type { BackupImportCheckpoint } from "../electron/backup/backup-import-types"
export {
  readBackupFtsRows,
  readRawBackupRows,
} from "./phase16-backup-database-inspection"
export {
  fullEnvelopeWithMissingCurrentVersion,
  fullImportEnvelope,
  importEnvelope,
  importFixtureIds,
  projectEnvelopeWithExternalLineage,
  rawReviewTexts,
} from "./phase16-backup-import-fixtures"
export {
  backupImportCounts,
  backupImportInput,
  createBackupImportSession,
  createBackupImportTestDatabase,
  reopenBackupImportTestDatabase,
  type SeededBackupFixture,
  seedBackupDatabase,
} from "./phase16-backup-import-test-helpers"

export type BackupNativeFailurePoint =
  | "show_save_dialog"
  | "show_open_dialog"
  | "read_file"
  | "get_file_size"
  | "write_file"
  | "hash_text"

export type BackupTestFailurePoint = BackupNativeFailurePoint | BackupImportCheckpoint

type FakeBackupNativeInput = {
  readonly saveFilePath?: string
  readonly openFilePath?: string
  readonly declaredFileSize?: number
  readonly failurePoint?: BackupNativeFailurePoint
}

type FakeBackupNativeCalls = {
  showSaveDialog: number
  showOpenDialog: number
  readFile: number
  getFileSize: number
  writeFile: number
  hashText: number
}

export type BackupExportTestScenario = {
  readonly backupType: BackupType
  readonly database: TestDatabase
  readonly fixture: SeededBackupFixture
  readonly harnessTemplateId?: string
}

const tempDirectories: string[] = []

export class InjectedBackupTestFailure extends Error {
  readonly name = "InjectedBackupTestFailure"

  constructor(readonly point: BackupTestFailurePoint) {
    super(`Injected backup test failure at ${point}`)
  }
}

function injectFailure(
  configuredPoint: BackupTestFailurePoint | undefined,
  currentPoint: BackupTestFailurePoint,
): void {
  if (configuredPoint === currentPoint) {
    throw new InjectedBackupTestFailure(currentPoint)
  }
}

export function createBackupImportFailureInjector(point: BackupImportCheckpoint) {
  return (currentPoint: BackupImportCheckpoint): void => {
    injectFailure(point, currentPoint)
  }
}

export function integrationBackupImportInput(
  preview: BackupValidationPreview,
  destinationProjectId?: string,
): ImportBackupInput {
  return {
    importSessionId: preview.importSessionId,
    previewFingerprint: preview.previewFingerprint,
    previewRevision: preview.previewRevision,
    strategy: "safe_duplicate",
    ...(destinationProjectId === undefined ? {} : { destinationProjectId }),
  }
}

export async function exportBackupScenario(scenario: BackupExportTestScenario): Promise<{
  readonly envelope: BackupEnvelope
  readonly filePath: string
  readonly text: string
}> {
  const filePath = await createTempBackupFile("")
  const native = createFakeBackupNative({ saveFilePath: filePath })
  const service = createBackupExportService({ db: scenario.database.db, native: native.native })

  switch (scenario.backupType) {
    case "full":
      await service.exportFullBackup({})
      break
    case "project":
      await service.exportProjectBackup({ projectId: scenario.fixture.projectId })
      break
    case "prompt_assets":
      await service.exportPromptAssetsBackup({ promptAssetIds: [scenario.fixture.promptAssetId] })
      break
    case "prompt_templates":
      await service.exportPromptTemplatesPack({
        promptTemplateIds: [scenario.fixture.promptTemplateId],
      })
      break
    case "harness_templates":
      await service.exportHarnessTemplatesPack({
        harnessTemplateIds: [scenario.harnessTemplateId ?? scenario.fixture.harnessTemplateId],
      })
      break
    default: {
      const exhaustive: never = scenario.backupType
      throw new TypeError(`Unsupported backup type: ${exhaustive}`)
    }
  }

  const text = await readFile(filePath, "utf8")
  return { envelope: backupEnvelopeSchema.parse(JSON.parse(text)), filePath, text }
}

export async function prepareBackupImportScenario(filePath: string, database: TestDatabase) {
  const sessions = createBackupImportSessionStore({ now: () => 1_000, createId: randomUUID })
  const native = createFakeBackupNative({ openFilePath: filePath })
  const validation = await createBackupValidationService({
    db: database.db,
    native: native.native,
    sessions,
  }).validateBackupFile()
  if (validation.cancelled) {
    throw new TypeError("Expected a validated backup preview")
  }
  return {
    preview: validation.preview,
    service: createBackupImportService({ db: database.db, sqlite: database.sqlite, sessions }),
  }
}

export async function createTempBackupFile(
  content: string,
  fileName = "backup.json",
): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "prompter-phase16-backup-"))
  tempDirectories.push(directory)
  const filePath = join(directory, fileName)
  await writeFile(filePath, content, "utf8")
  return filePath
}

export function forbiddenBackupEnvelopeText(): string {
  const envelope = fullImportEnvelope()
  return JSON.stringify({
    ...envelope,
    data: { ...envelope.data, settings: [] },
  })
}

export function createFakeBackupNative(input: FakeBackupNativeInput = {}) {
  const calls: FakeBackupNativeCalls = {
    showSaveDialog: 0,
    showOpenDialog: 0,
    readFile: 0,
    getFileSize: 0,
    writeFile: 0,
    hashText: 0,
  }
  const dependencies: BackupNativeDependencies = {
    showSaveDialog: async () => {
      calls.showSaveDialog += 1
      injectFailure(input.failurePoint, "show_save_dialog")
      return input.saveFilePath === undefined
        ? { canceled: true }
        : { canceled: false, filePath: input.saveFilePath }
    },
    showOpenDialog: async () => {
      calls.showOpenDialog += 1
      injectFailure(input.failurePoint, "show_open_dialog")
      return input.openFilePath === undefined
        ? { canceled: true, filePaths: [] }
        : { canceled: false, filePaths: [input.openFilePath] }
    },
    readFile: async (filePath) => {
      calls.readFile += 1
      injectFailure(input.failurePoint, "read_file")
      return readFile(filePath, "utf8")
    },
    getFileSize: async (filePath) => {
      calls.getFileSize += 1
      injectFailure(input.failurePoint, "get_file_size")
      return input.declaredFileSize ?? (await stat(filePath)).size
    },
    writeFile: async (filePath, content) => {
      calls.writeFile += 1
      injectFailure(input.failurePoint, "write_file")
      await writeFile(filePath, content, "utf8")
    },
    now: () => 1_000,
    createId: randomUUID,
    hashText: (text) => {
      calls.hashText += 1
      injectFailure(input.failurePoint, "hash_text")
      return createHash("sha256").update(text).digest("hex")
    },
    getAppVersion: () => "16.0.0-test",
  }
  return { calls, dependencies, native: createBackupNativeService(dependencies) }
}

export async function cleanupBackupTestResources(): Promise<void> {
  await cleanupBackupImportTestDatabases()
  await Promise.all(
    tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  )
}
