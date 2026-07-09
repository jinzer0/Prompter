import type { z } from "zod"

import type {
  comparePromptVersionsInputSchema,
  comparePromptVersionsResultSchema,
  createHarnessTemplateInputSchema,
  createNextPromptVersionInputSchema,
  createNextPromptVersionResultSchema,
  createProjectInputSchema,
  createPromptAssetInputSchema,
  createPromptVersionInputSchema,
  createTagInputSchema,
  deleteResultSchema,
  harnessTemplateSchema,
  openAIKeyStatusSchema,
  projectSchema,
  promptAssetFilterSchema,
  promptAssetSchema,
  promptSearchFilterSchema,
  promptSearchResultItemSchema,
  promptSearchResultSchema,
  promptCompilerAnalyzeInputSchema,
  promptCompilerAnalyzeOutputSchema,
  promptCompilerAnalyzeResultSchema,
  promptCompilerCompileInputSchema,
  promptCompilerCompileOutputSchema,
  promptCompilerCompileResultSchema,
  promptCompilerErrorSchema,
  promptVersionSchema,
  saveOpenAIKeyInputSchema,
  settingSchema,
  settingsDefaultsSchema,
  tagLinkSchema,
  tagSchema,
  tagWithCountSchema,
  updateDefaultsInputSchema,
  updateHarnessTemplateInputSchema,
  updateProjectInputSchema,
  updatePromptAssetInputSchema,
  updateTagInputSchema,
} from "./ipc-contract.js"

export type Project = z.infer<typeof projectSchema>
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
export type Setting = z.infer<typeof settingSchema>
export type SettingsDefaults = z.infer<typeof settingsDefaultsSchema>
export type OpenAIKeyStatus = z.infer<typeof openAIKeyStatusSchema>
export type PromptCompilerAnalyzeInput = z.output<typeof promptCompilerAnalyzeInputSchema>
export type PromptCompilerCompileInput = z.output<typeof promptCompilerCompileInputSchema>
export type PromptCompilerAnalyzeOutput = z.infer<typeof promptCompilerAnalyzeOutputSchema>
export type PromptCompilerCompileOutput = z.infer<typeof promptCompilerCompileOutputSchema>
export type PromptCompilerError = z.infer<typeof promptCompilerErrorSchema>
export type PromptCompilerAnalyzeResult = z.infer<typeof promptCompilerAnalyzeResultSchema>
export type PromptCompilerCompileResult = z.infer<typeof promptCompilerCompileResultSchema>
export type DeleteResult = z.infer<typeof deleteResultSchema>
export type CreateProjectInput = z.output<typeof createProjectInputSchema>
export type UpdateProjectInput = z.output<typeof updateProjectInputSchema>
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
