import type {
  BackupHarnessTemplate,
  BackupItemCounts,
  BackupProject,
  BackupProjectContextProfile,
  BackupPromptAsset,
  BackupPromptQualityReview,
  BackupPromptTag,
  BackupPromptTemplate,
  BackupPromptVersion,
  BackupTag,
  BackupType,
  BackupWarning,
} from "../ipc-types.js"

export type BackupImportCheckpoint =
  | "after_assets"
  | "after_versions"
  | "after_quality_reviews"
  | "during_fts_update"

export type ResolvedPromptAsset = Omit<
  BackupPromptAsset,
  | "id"
  | "projectId"
  | "currentVersionId"
  | "parentPromptId"
  | "parentPromptVersionId"
  | "derivationType"
> & {
  readonly id: string
  readonly projectId: string | null
  readonly currentVersionId: null
  readonly parentPromptId: null
  readonly parentPromptVersionId: null
  readonly derivationType: null
}

export type ResolvedPromptAssetUpdate = {
  readonly id: string
  readonly currentVersionId: string
  readonly parentPromptId: string | null
  readonly parentPromptVersionId: string | null
  readonly derivationType: BackupPromptAsset["derivationType"]
}

export type ResolvedBackupImportName = {
  readonly sourceId: string
  readonly sourceName: string
  readonly resolvedName: string
}

export type ResolvedBackupImport = {
  readonly backupType: BackupType
  readonly tags: readonly BackupTag[]
  readonly projects: readonly BackupProject[]
  readonly promptAssets: readonly ResolvedPromptAsset[]
  readonly promptVersions: readonly BackupPromptVersion[]
  readonly promptAssetUpdates: readonly ResolvedPromptAssetUpdate[]
  readonly promptTags: readonly BackupPromptTag[]
  readonly projectContextProfiles: readonly BackupProjectContextProfile[]
  readonly promptTemplates: readonly BackupPromptTemplate[]
  readonly harnessTemplates: readonly BackupHarnessTemplate[]
  readonly promptQualityReviews: readonly BackupPromptQualityReview[]
  readonly searchRows: readonly {
    readonly promptAssetId: string
    readonly title: string
    readonly originalInput: string
    readonly compiledPrompt: string
  }[]
  readonly importedCounts: BackupItemCounts
  readonly createdProjectIds: readonly string[]
  readonly createdPromptAssetIds: readonly string[]
  readonly createdPromptTemplateIds: readonly string[]
  readonly createdHarnessTemplateIds: readonly string[]
  readonly resolvedNames: {
    readonly projects: readonly ResolvedBackupImportName[]
    readonly promptTemplates: readonly ResolvedBackupImportName[]
    readonly harnessTemplates: readonly ResolvedBackupImportName[]
  }
  readonly warnings: readonly BackupWarning[]
}
