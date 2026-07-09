import type { z } from "zod"
import type { PingResponse, payloadSchemas } from "./ipc-contract.js"
import type {
  ComparePromptVersionsResult,
  CopyTextInput,
  CopyTextResult,
  CreateHarnessTemplateInput,
  CreateNextPromptVersionResult,
  CreatePromptAssetInput,
  CreatePromptVersionInput,
  CreateTagInput,
  DeleteResult,
  ExportPromptResult,
  FormatPromptForExportInput,
  HarnessTemplate,
  OpenAIKeyStatus,
  Project,
  PromptAsset,
  PromptAssetFilter,
  PromptCompilerAnalyzeInput,
  PromptCompilerAnalyzeResult,
  PromptCompilerCompileInput,
  PromptCompilerCompileResult,
  PromptVersion,
  SaveOpenAIKeyInput,
  SavePromptToFileInput,
  SavePromptToFileResult,
  SearchPromptsResponse,
  Setting,
  SettingsDefaults,
  Tag,
  TagLink,
  TagWithCount,
  UpdateDefaultsInput,
  UpdateHarnessTemplateInput,
  UpdateProjectInput,
  UpdatePromptAssetInput,
  UpdateTagInput,
} from "./ipc-types.js"

type Input<TSchema extends z.ZodType> = z.input<TSchema>

export type ElectronBridge = {
  readonly ping: () => Promise<PingResponse>
  readonly projects: {
    readonly create: (input: Input<typeof payloadSchemas.createProject>) => Promise<Project>
    readonly list: () => Promise<readonly Project[]>
    readonly get: (id: string) => Promise<Project | null>
    readonly update: (id: string, input: UpdateProjectInput) => Promise<Project>
    readonly delete: (id: string) => Promise<DeleteResult>
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
    readonly create: (input: CreateHarnessTemplateInput) => Promise<HarnessTemplate>
    readonly list: () => Promise<readonly HarnessTemplate[]>
    readonly get: (id: string) => Promise<HarnessTemplate | null>
    readonly update: (id: string, input: UpdateHarnessTemplateInput) => Promise<HarnessTemplate>
    readonly delete: (id: string) => Promise<DeleteResult>
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
  }
}
