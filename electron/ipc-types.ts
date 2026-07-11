import { z } from "zod"

import type {
  clipboardReadTextResultSchema,
  comparePromptVersionsInputSchema,
  comparePromptVersionsResultSchema,
  copyTextInputSchema,
  copyTextResultSchema,
  createHarnessTemplateInputSchema,
  createNextPromptVersionInputSchema,
  createNextPromptVersionResultSchema,
  createProjectContextProfileInputSchema,
  createProjectInputSchema,
  createPromptAssetInputSchema,
  createPromptVersionInputSchema,
  createTagInputSchema,
  deleteResultSchema,
  exportFormatSchema,
  exportPromptInputSchema,
  exportPromptResultSchema,
  formatPromptForExportInputSchema,
  harnessTemplateSchema,
  listHarnessTemplatesInputSchema,
  openAIKeyStatusSchema,
  PingResponse,
  payloadSchemas,
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
  promptSearchFilterSchema,
  promptSearchResultItemSchema,
  promptSearchResultSchema,
  promptVersionSchema,
  saveOpenAIKeyInputSchema,
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
  updateTagInputSchema,
} from "./ipc-contract.js"

export const MENU_ACTION_CHANNEL = "prompter:menu-action" as const
export const MENU_ACTIONS = [
  "newPrompt",
  "newProject",
  "quickCaptureFromClipboard",
  "focusSearch",
  "savePrompt",
  "copyCompiledPrompt",
  "exportPrompt",
  "openSettings",
  "closeActivePanel",
] as const

export const menuActionSchema = z.enum(MENU_ACTIONS)
export type MenuAction = (typeof MENU_ACTIONS)[number]

type Input<TSchema extends z.ZodType> = z.input<TSchema>

export type Project = z.infer<typeof projectSchema>
export type ProjectContextProfile = z.infer<typeof projectContextProfileSchema>
export type ProjectContextCompilerBuildResult = z.infer<
  typeof projectContextCompilerBuildResultSchema
>
export type PromptAsset = z.infer<typeof promptAssetSchema>
export type PromptVersion = z.infer<typeof promptVersionSchema>
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
export type CreatePromptVersionInput = z.output<typeof createPromptVersionInputSchema>
export type CreateNextPromptVersionInput = z.output<typeof createNextPromptVersionInputSchema>
export type ComparePromptVersionsInput = z.output<typeof comparePromptVersionsInputSchema>
export type CreateTagInput = z.output<typeof createTagInputSchema>
export type UpdateTagInput = z.output<typeof updateTagInputSchema>
export type CreateHarnessTemplateInput = z.output<typeof createHarnessTemplateInputSchema>
export type UpdateHarnessTemplateInput = z.output<typeof updateHarnessTemplateInputSchema>
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
  }
  readonly search: {
    readonly searchPrompts: (
      input: Input<typeof payloadSchemas.searchPrompts>,
    ) => Promise<SearchPromptsResponse>
    readonly rebuildIndex: () => Promise<{ readonly rebuilt: true }>
  }
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
  readonly exports: {
    readonly formatPrompt: (input: FormatPromptForExportInput) => Promise<ExportPromptResult>
    readonly savePromptToFile: (input: SavePromptToFileInput) => Promise<SavePromptToFileResult>
  }
  readonly clipboard: {
    readonly copyText: (input: CopyTextInput) => Promise<CopyTextResult>
    readonly readText: () => Promise<ClipboardReadTextResult>
  }
}
