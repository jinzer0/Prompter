import type { AppDatabase } from "../db/repositories/common.js"
import {
  backupEnvelopeSchema,
  backupExportResultSchema,
  exportFullBackupInputSchema,
  exportHarnessTemplatesPackInputSchema,
  exportProjectBackupInputSchema,
  exportPromptAssetsBackupInputSchema,
  exportPromptTemplatesPackInputSchema,
} from "../ipc-contract.js"
import type {
  BackupEnvelope,
  BackupExportResult,
  BackupItemCounts,
  BackupType,
  ExportFullBackupInput,
  ExportHarnessTemplatesPackInput,
  ExportProjectBackupInput,
  ExportPromptAssetsBackupInput,
  ExportPromptTemplatesPackInput,
} from "../ipc-types.js"
import {
  collectFullBackupData,
  collectHarnessTemplatesBackupData,
  collectProjectBackupData,
  collectPromptAssetsBackupData,
  collectPromptTemplatesBackupData,
  selectedProjectExists,
} from "./backup-export-collectors.js"
import type { BackupNativeService } from "./backup-native-service.js"

const defaultFilenames = {
  full: "prompter-library.prompter-backup.json",
  project: "prompter-project.prompter-project.json",
  prompt_assets: "prompter-prompts.prompter-project.json",
  prompt_templates: "prompter-prompt-templates.prompter-templates.json",
  harness_templates: "prompter-harness-templates.prompter-templates.json",
} as const satisfies Record<BackupType, string>

export class BackupExportSelectionError extends Error {
  readonly name = "BackupExportSelectionError"

  constructor(readonly entity: string) {
    super(`Selected ${entity} rows are unavailable`)
  }
}

type BackupExportServiceDependencies = {
  readonly db: AppDatabase
  readonly native: BackupNativeService
}

function itemCounts(data: BackupEnvelope["data"]): BackupItemCounts {
  return {
    projects: "projects" in data ? data.projects.length : 0,
    promptAssets: "promptAssets" in data ? data.promptAssets.length : 0,
    promptVersions: "promptVersions" in data ? data.promptVersions.length : 0,
    tags: "tags" in data ? data.tags.length : 0,
    promptTags: "promptTags" in data ? data.promptTags.length : 0,
    harnessTemplates: "harnessTemplates" in data ? data.harnessTemplates.length : 0,
    projectContextProfiles:
      "projectContextProfiles" in data ? data.projectContextProfiles.length : 0,
    promptTemplates: "promptTemplates" in data ? data.promptTemplates.length : 0,
    promptQualityReviews: "promptQualityReviews" in data ? data.promptQualityReviews.length : 0,
  }
}

function assertSelectionCount(
  selectedIds: readonly string[],
  actualCount: number,
  entity: string,
): void {
  if (new Set(selectedIds).size !== actualCount) {
    throw new BackupExportSelectionError(entity)
  }
}

function sourceSummary(backupType: BackupType, counts: BackupItemCounts): string {
  switch (backupType) {
    case "full":
      return "Full Prompter library"
    case "project":
      return "Project backup"
    case "prompt_assets":
      return `${counts.promptAssets} prompt asset backup`
    case "prompt_templates":
      return `${counts.promptTemplates} prompt template backup`
    case "harness_templates":
      return `${counts.harnessTemplates} harness template backup`
    default: {
      const exhaustive: never = backupType
      throw new Error(`Unsupported backup type: ${exhaustive}`)
    }
  }
}

function envelope(
  backupType: BackupType,
  data: BackupEnvelope["data"],
  native: BackupNativeService,
): BackupEnvelope {
  const metadataCounts = itemCounts(data)
  const version = native.getAppVersion()
  const draft = {
    schemaVersion: 1,
    appName: "Prompter",
    backupType,
    exportedAt: native.now(),
    ...(version === undefined ? {} : { exportedByAppVersion: version }),
    metadata: {
      itemCounts: metadataCounts,
      sourceSummary: sourceSummary(backupType, metadataCounts),
      excludesSecrets: true,
      excludesSecretStatus: true,
      includesSettings: false,
      plaintext: true,
      schemaVersion: 1,
    },
    data,
  }
  return backupEnvelopeSchema.parse(draft)
}

async function saveEnvelope(
  backup: BackupEnvelope,
  native: BackupNativeService,
): Promise<BackupExportResult> {
  const saved = await native.saveBackup({
    defaultFilename: defaultFilenames[backup.backupType],
    content: JSON.stringify(backup, null, 2),
  })
  return backupExportResultSchema.parse({
    cancelled: saved.cancelled,
    backupType: backup.backupType,
    itemCounts: backup.metadata.itemCounts,
    message: saved.cancelled ? "Backup export cancelled" : "Backup exported",
  })
}

export function createBackupExportService(dependencies: BackupExportServiceDependencies) {
  return {
    async exportFullBackup(input: ExportFullBackupInput): Promise<BackupExportResult> {
      exportFullBackupInputSchema.parse(input)
      return saveEnvelope(
        envelope("full", collectFullBackupData(dependencies.db), dependencies.native),
        dependencies.native,
      )
    },
    async exportProjectBackup(input: ExportProjectBackupInput): Promise<BackupExportResult> {
      const parsed = exportProjectBackupInputSchema.parse(input)
      const data = collectProjectBackupData(dependencies.db, parsed.projectId)
      if (!selectedProjectExists(data)) {
        throw new BackupExportSelectionError("project")
      }
      return saveEnvelope(envelope("project", data, dependencies.native), dependencies.native)
    },
    async exportPromptAssetsBackup(
      input: ExportPromptAssetsBackupInput,
    ): Promise<BackupExportResult> {
      const parsed = exportPromptAssetsBackupInputSchema.parse(input)
      const data = collectPromptAssetsBackupData(dependencies.db, parsed.promptAssetIds)
      assertSelectionCount(parsed.promptAssetIds, data.promptAssets.length, "prompt asset")
      return saveEnvelope(envelope("prompt_assets", data, dependencies.native), dependencies.native)
    },
    async exportPromptTemplatesPack(
      input: ExportPromptTemplatesPackInput,
    ): Promise<BackupExportResult> {
      const parsed = exportPromptTemplatesPackInputSchema.parse(input)
      const data = collectPromptTemplatesBackupData(dependencies.db, parsed.promptTemplateIds)
      if (parsed.promptTemplateIds !== undefined) {
        assertSelectionCount(
          parsed.promptTemplateIds,
          data.promptTemplates.length,
          "prompt template",
        )
      }
      if (data.promptTemplates.length === 0) {
        throw new BackupExportSelectionError("prompt template")
      }
      return saveEnvelope(
        envelope("prompt_templates", data, dependencies.native),
        dependencies.native,
      )
    },
    async exportHarnessTemplatesPack(
      input: ExportHarnessTemplatesPackInput,
    ): Promise<BackupExportResult> {
      const parsed = exportHarnessTemplatesPackInputSchema.parse(input)
      const data = collectHarnessTemplatesBackupData(dependencies.db, parsed.harnessTemplateIds)
      if (parsed.harnessTemplateIds !== undefined) {
        assertSelectionCount(
          parsed.harnessTemplateIds,
          data.harnessTemplates.length,
          "harness template",
        )
      }
      if (data.harnessTemplates.length === 0) {
        throw new BackupExportSelectionError("harness template")
      }
      return saveEnvelope(
        envelope("harness_templates", data, dependencies.native),
        dependencies.native,
      )
    },
  }
}
