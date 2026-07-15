import { createHash, randomUUID } from "node:crypto"
import { mkdtemp, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createBackupNativeService } from "../electron/backup/backup-native-service"
import { createBackupImportSessionStore } from "../electron/backup/backup-session-store"
import { createBackupValidationService } from "../electron/backup/backup-validation-service"
import type { AppDatabase } from "../electron/db/repositories/common"
import { backupEnvelopeSchema } from "../electron/ipc-contract"

const directories: string[] = []

export const projectId = "11111111-1111-4111-8111-111111111111"
const assetId = "22222222-2222-4222-8222-222222222222"
const versionId = "33333333-3333-4333-8333-333333333333"

export function fullEnvelope() {
  return backupEnvelopeSchema.parse({
    schemaVersion: 1,
    appName: "Prompter",
    backupType: "full",
    exportedAt: 100,
    metadata: {
      itemCounts: {
        projects: 99,
        promptAssets: 0,
        promptVersions: 0,
        tags: 0,
        promptTags: 0,
        harnessTemplates: 0,
        projectContextProfiles: 0,
        promptTemplates: 0,
        promptQualityReviews: 0,
      },
      sourceSummary: "Project backup",
      excludesSecrets: true,
      excludesSecretStatus: true,
      includesSettings: false,
      plaintext: true,
      schemaVersion: 1,
    },
    data: {
      projects: [
        {
          id: projectId,
          name: "Project",
          description: null,
          techStack: null,
          defaultAgent: "codex",
          createdAt: 1,
          updatedAt: 2,
        },
      ],
      promptAssets: [],
      promptVersions: [],
      tags: [],
      promptTags: [],
      harnessTemplates: [],
      projectContextProfiles: [],
      promptTemplates: [],
      promptQualityReviews: [],
    },
  })
}

export function promptAssetsEnvelope() {
  return backupEnvelopeSchema.parse({
    ...fullEnvelope(),
    backupType: "prompt_assets",
    data: {
      promptAssets: [
        {
          id: assetId,
          projectId,
          title: "Prompt",
          scenario: "feature",
          targetAgent: "codex",
          currentVersionId: versionId,
          parentPromptId: null,
          parentPromptVersionId: null,
          derivationType: null,
          createdAt: 1,
          updatedAt: 2,
        },
      ],
      promptVersions: [
        {
          id: versionId,
          promptAssetId: assetId,
          versionNumber: 1,
          originalInput: "Build it",
          compiledPrompt: "# Objective\nBuild it",
          assumptions: null,
          questions: null,
          answers: null,
          acceptanceCriteria: null,
          validationCommands: null,
          qualityScore: null,
          createdAt: 1,
        },
      ],
      tags: [],
      promptTags: [],
      promptQualityReviews: [],
    },
  })
}

export function createHarness(initialPath?: string, db?: AppDatabase) {
  let selectedPath = initialPath
  let now = 1_000
  let declaredSize: number | undefined
  const calls = { opened: 0, sized: 0, read: 0 }
  const sessions = createBackupImportSessionStore({ now: () => now, createId: randomUUID })
  const native = createBackupNativeService({
    showSaveDialog: async () => ({ canceled: true }),
    showOpenDialog: async () => {
      calls.opened += 1
      return selectedPath === undefined
        ? { canceled: true, filePaths: [] }
        : { canceled: false, filePaths: [selectedPath] }
    },
    readFile: async (filePath) => {
      calls.read += 1
      return readFile(filePath, "utf8")
    },
    getFileSize: async (filePath) => {
      calls.sized += 1
      return declaredSize ?? (await stat(filePath)).size
    },
    writeFile: async () => undefined,
    now: () => now,
    createId: randomUUID,
    hashText: (text) => createHash("sha256").update(text).digest("hex"),
  })
  return {
    service: createBackupValidationService({
      ...(db === undefined ? {} : { db }),
      native,
      sessions,
    }),
    sessions,
    calls,
    selectFile: (filePath: string | undefined) => {
      selectedPath = filePath
    },
    setNow: (timestamp: number) => {
      now = timestamp
    },
    setDeclaredSize: (size: number | undefined) => {
      declaredSize = size
    },
  }
}

export async function tempDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "prompter-phase16-validation-"))
  directories.push(directory)
  return directory
}

export async function cleanupValidationDirectories(): Promise<void> {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })))
}
