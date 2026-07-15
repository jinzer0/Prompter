import { z } from "zod"

import type {
  applyPromptQualityScoreToVersionInputSchema,
  applyPromptQualityScoreToVersionResultSchema,
  backupConflictSchema,
  backupConsequenceSchema,
  backupEnvelopeSchema,
  backupExportResultSchema,
  backupHarnessTemplateSchema,
  backupImportResultSchema,
  backupImportStrategySchema,
  backupItemCountsSchema,
  backupMetadataSchema,
  backupProjectContextProfileSchema,
  backupProjectSchema,
  backupPromptAssetSchema,
  backupPromptQualityReviewSchema,
  backupPromptTagSchema,
  backupPromptTemplateSchema,
  backupPromptVersionSchema,
  backupTagSchema,
  backupTypeSchema,
  backupValidationPreviewSchema,
  backupValidationResultSchema,
  backupWarningSchema,
  cancelImportSessionInputSchema,
  cancelImportSessionResultSchema,
  cancelMaintenanceActionSessionInputSchema,
  clipboardReadTextResultSchema,
  comparePromptVersionsInputSchema,
  comparePromptVersionsResultSchema,
  copyTextInputSchema,
  copyTextResultSchema,
  createDerivedPromptAssetInputSchema,
  createDerivedPromptAssetResultSchema,
  createHarnessTemplateInputSchema,
  createNextPromptVersionInputSchema,
  createNextPromptVersionResultSchema,
  createProjectContextProfileInputSchema,
  createProjectInputSchema,
  createPromptAssetInputSchema,
  createPromptTemplateFromVersionInputSchema,
  createPromptTemplateInputSchema,
  createPromptVersionInputSchema,
  createPromptWithInitialVersionInputSchema,
  createPromptWithInitialVersionResultSchema,
  createTagInputSchema,
  deletePromptTemplateResultSchema,
  deleteResultSchema,
  duplicatePromptAssetInputSchema,
  duplicatePromptAssetResultSchema,
  executeMaintenanceActionInputSchema,
  exportFormatSchema,
  exportFullBackupInputSchema,
  exportHarnessTemplatesPackInputSchema,
  exportProjectBackupInputSchema,
  exportPromptAssetsBackupInputSchema,
  exportPromptInputSchema,
  exportPromptResultSchema,
  exportPromptTemplatesPackInputSchema,
  formatPromptForExportInputSchema,
  getLatestPromptQualityReviewInputSchema,
  getPromptQualityReviewInputSchema,
  harnessTemplateSchema,
  importBackupInputSchema,
  listHarnessTemplatesInputSchema,
  listPromptQualityReviewsForVersionInputSchema,
  listPromptTemplatesInputSchema,
  maintenanceActionPreviewSchema,
  maintenanceActionResultSchema,
  maintenanceActionStatusSchema,
  maintenanceActionTypeSchema,
  maintenanceCategorySchema,
  maintenanceFindingSchema,
  maintenanceScanInputSchema,
  maintenanceScanResultSchema,
  maintenanceScanSummarySchema,
  maintenanceSeveritySchema,
  openAIKeyStatusSchema,
  PingResponse,
  payloadSchemas,
  preparedMaintenanceActionSchema,
  prepareMaintenanceActionInputSchema,
  projectContextCompilerBuildResultSchema,
  projectContextProfileSchema,
  projectSchema,
  promptAssetFilterSchema,
  promptAssetSchema,
  promptCompilerAnalyzeInputSchema,
  promptCompilerAnalyzeOutputSchema,
  promptCompilerAnalyzeResultSchema,
  promptCompilerCompileInputSchema,
  promptCompilerCompileOutputSchema,
  promptCompilerCompileResultSchema,
  promptCompilerErrorSchema,
  promptDerivationTypeSchema,
  promptLineageSchema,
  promptLineageSummarySchema,
  promptQualityGradeSchema,
  promptQualityLLMReviewResultSchema,
  promptQualityReviewModeSchema,
  promptQualityReviewResultSchema,
  promptQualityReviewSnapshotSchema,
  promptSearchFilterSchema,
  promptSearchResultItemSchema,
  promptSearchResultSchema,
  promptTemplateListResultSchema,
  promptTemplateSchema,
  promptVersionSchema,
  reviewPromptQualityDraftInputSchema,
  reviewPromptQualityVersionInputSchema,
  saveOpenAIKeyInputSchema,
  savePromptQualityReviewInputSchema,
  savePromptToFileInputSchema,
  savePromptToFileResultSchema,
  settingSchema,
  settingsDefaultsSchema,
  tagLinkSchema,
  tagSchema,
  tagWithCountSchema,
  updateDefaultsInputSchema,
  updateHarnessTemplateInputSchema,
  updateProjectContextProfileInputSchema,
  updateProjectInputSchema,
  updatePromptAssetInputSchema,
  updatePromptTemplateInputSchema,
  updateTagInputSchema,
} from "./ipc-contract.js"

// allow: SIZE_OK - central renderer-facing IPC type surface mirrors the typed contract.

export const MENU_ACTION_CHANNEL = "prompter:menu-action" as const
export const MENU_ACTIONS = [
  "newPrompt",
  "newProject",
  "quickCaptureFromClipboard",
  "focusSearch",
  "savePrompt",
  "copyCompiledPrompt",
  "exportPrompt",
  "exportFullBackup",
  "importBackup",
  "openSettings",
  "openLibraryMaintenance",
  "closeActivePanel",
] as const

export const menuActionSchema = z.enum(MENU_ACTIONS)
export type MenuAction = z.infer<typeof menuActionSchema>

type Input<TSchema extends z.ZodType> = z.input<TSchema>
type BackupOperation<TInput, TResult> = (input: TInput) => Promise<TResult>

export type Project = z.infer<typeof projectSchema>
export type ProjectContextProfile = z.infer<typeof projectContextProfileSchema>
export type ProjectContextCompilerBuildResult = z.infer<
  typeof projectContextCompilerBuildResultSchema
>
export type PromptAsset = z.infer<typeof promptAssetSchema>
export type PromptVersion = z.infer<typeof promptVersionSchema>
export type PromptDerivationType = z.infer<typeof promptDerivationTypeSchema>
export type PromptAssetVersionResult = z.infer<typeof createPromptWithInitialVersionResultSchema>
export type CreatePromptWithInitialVersionResult = PromptAssetVersionResult
export type DuplicatePromptAssetResult = z.infer<typeof duplicatePromptAssetResultSchema>
export type CreateDerivedPromptAssetResult = z.infer<typeof createDerivedPromptAssetResultSchema>
export type PromptLineageSummary = z.infer<typeof promptLineageSummarySchema>
export type PromptLineage = z.infer<typeof promptLineageSchema>
export type CreateNextPromptVersionResult = z.infer<typeof createNextPromptVersionResultSchema>
export type ComparePromptVersionsResult = z.infer<typeof comparePromptVersionsResultSchema>
export type PromptAssetFilter = z.output<typeof promptAssetFilterSchema>
export type PromptSearchFilter = z.output<typeof promptSearchFilterSchema>
export type PromptSearchResultItem = z.infer<typeof promptSearchResultItemSchema>
export type SearchPromptsResponse = z.infer<typeof promptSearchResultSchema>
export type Tag = z.infer<typeof tagSchema>
export type TagWithCount = z.infer<typeof tagWithCountSchema>
export type TagCount = TagWithCount
export type TagLink = z.infer<typeof tagLinkSchema>
export type PromptSearchTag = Tag
export type PromptSearchResult = {
  readonly promptAsset: PromptAsset
  readonly currentVersion: PromptVersion
  readonly tags: readonly PromptSearchTag[]
  readonly preview: string
  readonly projectName: string | null
}
export type HarnessTemplate = z.infer<typeof harnessTemplateSchema>
export type ListHarnessTemplatesInput = z.output<typeof listHarnessTemplatesInputSchema>
export type PromptTemplate = z.infer<typeof promptTemplateSchema>
export type PromptTemplateListResult = z.infer<typeof promptTemplateListResultSchema>
export type DeletePromptTemplateResult = z.infer<typeof deletePromptTemplateResultSchema>
export type Setting = z.infer<typeof settingSchema>
export type SettingsDefaults = z.infer<typeof settingsDefaultsSchema>
export type OpenAIKeyStatus = z.infer<typeof openAIKeyStatusSchema>
export type ExportFormat = z.infer<typeof exportFormatSchema>
export type ExportPromptInput = z.output<typeof exportPromptInputSchema>
export type ExportPromptResult = z.infer<typeof exportPromptResultSchema>
export type FormatPromptForExportInput = z.output<typeof formatPromptForExportInputSchema>
export type SavePromptToFileInput = z.output<typeof savePromptToFileInputSchema>
export type SavePromptToFileResult = z.infer<typeof savePromptToFileResultSchema>
export type CopyTextInput = z.output<typeof copyTextInputSchema>
export type CopyTextResult = z.infer<typeof copyTextResultSchema>
export type ClipboardReadTextResult = z.infer<typeof clipboardReadTextResultSchema>
export type PromptCompilerAnalyzeInput = z.output<typeof promptCompilerAnalyzeInputSchema>
export type PromptCompilerCompileInput = z.output<typeof promptCompilerCompileInputSchema>
export type PromptCompilerAnalyzeOutput = z.input<typeof promptCompilerAnalyzeOutputSchema>
export type PromptCompilerCompileOutput = z.infer<typeof promptCompilerCompileOutputSchema>
export type PromptCompilerError = z.infer<typeof promptCompilerErrorSchema>
export type PromptCompilerAnalyzeResult = z.input<typeof promptCompilerAnalyzeResultSchema>
export type PromptCompilerCompileResult = z.infer<typeof promptCompilerCompileResultSchema>
export type PromptQualityReviewMode = z.infer<typeof promptQualityReviewModeSchema>
export type PromptQualityGrade = z.infer<typeof promptQualityGradeSchema>
export type PromptQualityReviewSnapshot = z.infer<typeof promptQualityReviewSnapshotSchema>
export type PromptQualityReviewResult = z.infer<typeof promptQualityReviewResultSchema>
export type PromptQualityLLMReviewResult = z.infer<typeof promptQualityLLMReviewResultSchema>
export type ReviewPromptQualityDraftInput = z.input<typeof reviewPromptQualityDraftInputSchema>
export type ReviewPromptQualityVersionInput = z.input<typeof reviewPromptQualityVersionInputSchema>
export type SavePromptQualityReviewInput = z.output<typeof savePromptQualityReviewInputSchema>
export type ListPromptQualityReviewsForVersionInput = z.input<
  typeof listPromptQualityReviewsForVersionInputSchema
>
export type GetLatestPromptQualityReviewInput = z.output<
  typeof getLatestPromptQualityReviewInputSchema
>
export type GetPromptQualityReviewInput = z.output<typeof getPromptQualityReviewInputSchema>
export type ApplyPromptQualityScoreToVersionInput = z.output<
  typeof applyPromptQualityScoreToVersionInputSchema
>
export type ApplyPromptQualityScoreToVersionResult = z.infer<
  typeof applyPromptQualityScoreToVersionResultSchema
>
export type MaintenanceSeverity = z.infer<typeof maintenanceSeveritySchema>
export type MaintenanceCategory = z.infer<typeof maintenanceCategorySchema>
export type MaintenanceFinding = z.infer<typeof maintenanceFindingSchema>
export type MaintenanceActionType = z.infer<typeof maintenanceActionTypeSchema>
export type MaintenanceActionStatus = z.infer<typeof maintenanceActionStatusSchema>
export type MaintenanceActionPreview = z.infer<typeof maintenanceActionPreviewSchema>
export type MaintenanceScanSummary = z.infer<typeof maintenanceScanSummarySchema>
export type MaintenanceScanInput = z.input<typeof maintenanceScanInputSchema>
export type MaintenanceScanResult = z.output<typeof maintenanceScanResultSchema>
export type PrepareMaintenanceActionInput = z.input<typeof prepareMaintenanceActionInputSchema>
export type PreparedMaintenanceAction = z.output<typeof preparedMaintenanceActionSchema>
export type ExecuteMaintenanceActionInput = z.input<typeof executeMaintenanceActionInputSchema>
export type CancelMaintenanceActionSessionInput = z.input<
  typeof cancelMaintenanceActionSessionInputSchema
>
export type MaintenanceActionResult = z.output<typeof maintenanceActionResultSchema>
export type MaintenanceBridge = {
  readonly scanLibrary: (input: MaintenanceScanInput) => Promise<MaintenanceScanResult>
  readonly prepareAction: (
    input: PrepareMaintenanceActionInput,
  ) => Promise<PreparedMaintenanceAction>
  readonly executeAction: (input: ExecuteMaintenanceActionInput) => Promise<MaintenanceActionResult>
  readonly cancelActionSession: (input: CancelMaintenanceActionSessionInput) => Promise<void>
}
export type BackupType = z.infer<typeof backupTypeSchema>
export type BackupEnvelope = z.infer<typeof backupEnvelopeSchema>
export type BackupMetadata = z.infer<typeof backupMetadataSchema>
export type BackupItemCounts = z.infer<typeof backupItemCountsSchema>
export type BackupProject = z.infer<typeof backupProjectSchema>
export type BackupPromptAsset = z.infer<typeof backupPromptAssetSchema>
export type BackupPromptVersion = z.infer<typeof backupPromptVersionSchema>
export type BackupTag = z.infer<typeof backupTagSchema>
export type BackupPromptTag = z.infer<typeof backupPromptTagSchema>
export type BackupHarnessTemplate = z.infer<typeof backupHarnessTemplateSchema>
export type BackupProjectContextProfile = z.infer<typeof backupProjectContextProfileSchema>
export type BackupPromptTemplate = z.infer<typeof backupPromptTemplateSchema>
export type BackupPromptQualityReview = z.infer<typeof backupPromptQualityReviewSchema>
export type BackupWarning = z.infer<typeof backupWarningSchema>
export type BackupConflict = z.infer<typeof backupConflictSchema>
export type BackupConsequence = z.infer<typeof backupConsequenceSchema>
export type BackupValidationPreview = z.infer<typeof backupValidationPreviewSchema>
export type BackupExportResult = z.infer<typeof backupExportResultSchema>
export type BackupValidationResult = z.infer<typeof backupValidationResultSchema>
export type BackupImportStrategy = z.infer<typeof backupImportStrategySchema>
export type BackupImportResult = z.infer<typeof backupImportResultSchema>
export type CancelImportSessionResult = z.infer<typeof cancelImportSessionResultSchema>
export type ExportFullBackupInput = z.output<typeof exportFullBackupInputSchema>
export type ExportProjectBackupInput = z.output<typeof exportProjectBackupInputSchema>
export type ExportPromptAssetsBackupInput = z.output<typeof exportPromptAssetsBackupInputSchema>
export type ExportPromptTemplatesPackInput = z.output<typeof exportPromptTemplatesPackInputSchema>
export type ExportHarnessTemplatesPackInput = z.output<typeof exportHarnessTemplatesPackInputSchema>
export type ImportBackupInput = z.output<typeof importBackupInputSchema>
export type CancelImportSessionInput = z.output<typeof cancelImportSessionInputSchema>
export type DeleteResult = z.infer<typeof deleteResultSchema>
export type CreateProjectInput = z.output<typeof createProjectInputSchema>
export type UpdateProjectInput = z.output<typeof updateProjectInputSchema>
export type CreateProjectContextProfileInput = z.input<
  typeof createProjectContextProfileInputSchema
>
export type UpdateProjectContextProfileInput = z.output<
  typeof updateProjectContextProfileInputSchema
>
export type CreatePromptAssetInput = z.output<typeof createPromptAssetInputSchema>
export type UpdatePromptAssetInput = z.output<typeof updatePromptAssetInputSchema>
export type CreatePromptWithInitialVersionInput = z.output<
  typeof createPromptWithInitialVersionInputSchema
>
export type DuplicatePromptAssetInput = z.output<typeof duplicatePromptAssetInputSchema>
export type CreateDerivedPromptAssetInput = z.output<typeof createDerivedPromptAssetInputSchema>
export type CreatePromptVersionInput = z.output<typeof createPromptVersionInputSchema>
export type CreateNextPromptVersionInput = z.output<typeof createNextPromptVersionInputSchema>
export type ComparePromptVersionsInput = z.output<typeof comparePromptVersionsInputSchema>
export type CreateTagInput = z.output<typeof createTagInputSchema>
export type UpdateTagInput = z.output<typeof updateTagInputSchema>
export type CreateHarnessTemplateInput = z.output<typeof createHarnessTemplateInputSchema>
export type UpdateHarnessTemplateInput = z.output<typeof updateHarnessTemplateInputSchema>
export type CreatePromptTemplateInput = z.output<typeof createPromptTemplateInputSchema>
export type ListPromptTemplatesInput = z.output<typeof listPromptTemplatesInputSchema>
export type UpdatePromptTemplateInput = z.output<typeof updatePromptTemplateInputSchema>
export type CreatePromptTemplateFromVersionInput = z.output<
  typeof createPromptTemplateFromVersionInputSchema
>
export type SaveOpenAIKeyInput = z.output<typeof saveOpenAIKeyInputSchema>
export type UpdateDefaultsInput = z.output<typeof updateDefaultsInputSchema>

export type { PingResponse }

export type ElectronBridge = {
  readonly ping: () => Promise<PingResponse>
  readonly menu: {
    readonly onAction: (callback: (action: MenuAction) => void) => () => void
  }
  readonly projects: {
    readonly create: (input: Input<typeof payloadSchemas.createProject>) => Promise<Project>
    readonly list: () => Promise<readonly Project[]>
    readonly get: (id: string) => Promise<Project | null>
    readonly update: (id: string, input: UpdateProjectInput) => Promise<Project>
    readonly delete: (id: string) => Promise<DeleteResult>
  }
  readonly projectContextProfiles: {
    readonly create: (input: CreateProjectContextProfileInput) => Promise<ProjectContextProfile>
    readonly list: (projectId: string) => Promise<readonly ProjectContextProfile[]>
    readonly get: (projectId: string, profileId: string) => Promise<ProjectContextProfile | null>
    readonly getDefault: (projectId: string) => Promise<ProjectContextProfile | null>
    readonly update: (
      projectId: string,
      profileId: string,
      input: UpdateProjectContextProfileInput,
    ) => Promise<ProjectContextProfile>
    readonly delete: (projectId: string, profileId: string) => Promise<DeleteResult>
    readonly duplicate: (projectId: string, profileId: string) => Promise<ProjectContextProfile>
    readonly setDefault: (projectId: string, profileId: string) => Promise<ProjectContextProfile>
    readonly buildCompilerContext: (
      projectId: string,
      profileId: string,
    ) => Promise<ProjectContextCompilerBuildResult>
  }
  readonly prompts: {
    readonly createAsset: (input: CreatePromptAssetInput) => Promise<PromptAsset>
    readonly listAssets: (filter?: PromptAssetFilter) => Promise<readonly PromptAsset[]>
    readonly getAsset: (id: string) => Promise<PromptAsset | null>
    readonly updateAsset: (id: string, input: UpdatePromptAssetInput) => Promise<PromptAsset>
    readonly deleteAsset: (id: string) => Promise<DeleteResult>
    readonly createVersion: (input: CreatePromptVersionInput) => Promise<PromptVersion>
    readonly createNextVersion: (
      input: Input<typeof payloadSchemas.createNextPromptVersion>,
    ) => Promise<CreateNextPromptVersionResult>
    readonly listVersions: (promptAssetId: string) => Promise<readonly PromptVersion[]>
    readonly getVersion: (id: string) => Promise<PromptVersion | null>
    readonly getCurrentVersion: (promptAssetId: string) => Promise<PromptVersion | null>
    readonly setCurrentVersion: (promptAssetId: string, versionId: string) => Promise<PromptAsset>
    readonly compareVersions: (
      baseVersionId: string,
      compareVersionId: string,
    ) => Promise<ComparePromptVersionsResult>
    readonly createWithInitialVersion: (
      input: Input<typeof payloadSchemas.createPromptWithInitialVersion>,
    ) => Promise<CreatePromptWithInitialVersionResult>
    readonly duplicateAsset: (
      input: Input<typeof payloadSchemas.duplicateAsset>,
    ) => Promise<DuplicatePromptAssetResult>
    readonly createDerivedAsset: (
      input: Input<typeof payloadSchemas.createDerivedAsset>,
    ) => Promise<CreateDerivedPromptAssetResult>
    readonly getLineage: (promptAssetId: string) => Promise<PromptLineage>
  }
  readonly promptTemplates: {
    readonly create: (
      input: Input<typeof payloadSchemas.createPromptTemplate>,
    ) => Promise<PromptTemplate>
    readonly list: (
      filter?: Input<typeof payloadSchemas.listPromptTemplates>,
    ) => Promise<PromptTemplateListResult>
    readonly get: (id: string) => Promise<PromptTemplate>
    readonly update: (id: string, input: UpdatePromptTemplateInput) => Promise<PromptTemplate>
    readonly duplicate: (id: string) => Promise<PromptTemplate>
    readonly delete: (id: string) => Promise<DeletePromptTemplateResult>
    readonly createFromVersion: (
      input: Input<typeof payloadSchemas.createPromptTemplateFromVersion>,
    ) => Promise<PromptTemplate>
  }
  readonly search: {
    readonly searchPrompts: (
      input: Input<typeof payloadSchemas.searchPrompts>,
    ) => Promise<SearchPromptsResponse>
    readonly rebuildIndex: () => Promise<{ readonly rebuilt: true }>
  }
  readonly maintenance: MaintenanceBridge
  readonly tags: {
    readonly create: (input: CreateTagInput) => Promise<Tag>
    readonly list: () => Promise<readonly Tag[]>
    readonly update: (id: string, input: UpdateTagInput) => Promise<Tag>
    readonly delete: (id: string) => Promise<DeleteResult>
    readonly attachToPrompt: (promptAssetId: string, tagId: string) => Promise<TagLink>
    readonly detachFromPrompt: (promptAssetId: string, tagId: string) => Promise<TagLink>
    readonly listForPrompt: (promptAssetId: string) => Promise<readonly Tag[]>
    readonly listWithCounts: () => Promise<readonly TagWithCount[]>
    readonly createAndAttachToPrompt: (input: {
      readonly promptAssetId: string
      readonly tagName: string
    }) => Promise<TagLink>
  }
  readonly harnessTemplates: {
    readonly create: (
      input: Input<typeof payloadSchemas.createHarnessTemplate>,
    ) => Promise<HarnessTemplate>
    readonly list: (filter?: ListHarnessTemplatesInput) => Promise<readonly HarnessTemplate[]>
    readonly get: (id: string) => Promise<HarnessTemplate | null>
    readonly update: (id: string, input: UpdateHarnessTemplateInput) => Promise<HarnessTemplate>
    readonly delete: (id: string) => Promise<DeleteResult>
    readonly duplicate: (id: string) => Promise<HarnessTemplate>
  }
  readonly settings: {
    readonly get: (key: string) => Promise<Setting | null>
    readonly set: (key: string, value: string) => Promise<Setting>
    readonly list: () => Promise<readonly Setting[]>
    readonly getDefaults: () => Promise<SettingsDefaults>
    readonly updateDefaults: (input: UpdateDefaultsInput) => Promise<SettingsDefaults>
  }
  readonly secrets: {
    readonly saveOpenAIKey: (input: SaveOpenAIKeyInput) => Promise<OpenAIKeyStatus>
    readonly hasOpenAIKey: () => Promise<boolean>
    readonly getOpenAIKeyStatus: () => Promise<OpenAIKeyStatus>
    readonly deleteOpenAIKey: () => Promise<OpenAIKeyStatus>
  }
  readonly promptCompiler: {
    readonly analyze: (input: PromptCompilerAnalyzeInput) => Promise<PromptCompilerAnalyzeResult>
    readonly compile: (input: PromptCompilerCompileInput) => Promise<PromptCompilerCompileResult>
  }
  readonly promptQuality: {
    readonly reviewDraft: (
      input: ReviewPromptQualityDraftInput,
    ) => Promise<PromptQualityReviewResult>
    readonly reviewVersion: (
      input: ReviewPromptQualityVersionInput,
    ) => Promise<PromptQualityReviewResult>
    readonly saveReview: (input: SavePromptQualityReviewInput) => Promise<PromptQualityReviewResult>
    readonly listReviewsForVersion: (
      input: ListPromptQualityReviewsForVersionInput,
    ) => Promise<readonly PromptQualityReviewResult[]>
    readonly getLatestReview: (
      input: GetLatestPromptQualityReviewInput,
    ) => Promise<PromptQualityReviewResult | null>
    readonly getReview: (
      input: GetPromptQualityReviewInput,
    ) => Promise<PromptQualityReviewResult | null>
    readonly applyScoreToVersion: (
      input: ApplyPromptQualityScoreToVersionInput,
    ) => Promise<ApplyPromptQualityScoreToVersionResult>
    readonly reviewWithLLM: () => Promise<PromptQualityLLMReviewResult>
  }
  readonly exports: {
    readonly formatPrompt: (input: FormatPromptForExportInput) => Promise<ExportPromptResult>
    readonly savePromptToFile: (input: SavePromptToFileInput) => Promise<SavePromptToFileResult>
  }
  readonly clipboard: {
    readonly copyText: (input: CopyTextInput) => Promise<CopyTextResult>
    readonly readText: () => Promise<ClipboardReadTextResult>
  }
  readonly backup: {
    readonly exportFullBackup: BackupOperation<ExportFullBackupInput, BackupExportResult>
    readonly exportProjectBackup: BackupOperation<ExportProjectBackupInput, BackupExportResult>
    readonly exportPromptAssetsBackup: BackupOperation<
      ExportPromptAssetsBackupInput,
      BackupExportResult
    >
    readonly exportPromptTemplatesPack: BackupOperation<
      ExportPromptTemplatesPackInput,
      BackupExportResult
    >
    readonly exportHarnessTemplatesPack: BackupOperation<
      ExportHarnessTemplatesPackInput,
      BackupExportResult
    >
    readonly validateBackupFile: () => Promise<BackupValidationResult>
    readonly importBackup: BackupOperation<ImportBackupInput, BackupImportResult>
    readonly cancelImportSession: BackupOperation<
      CancelImportSessionInput,
      CancelImportSessionResult
    >
  }
}
