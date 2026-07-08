import type { z } from "zod"

import type {
  createHarnessTemplateInputSchema,
  createProjectInputSchema,
  createPromptAssetInputSchema,
  createPromptVersionInputSchema,
  createTagInputSchema,
  deleteResultSchema,
  harnessTemplateSchema,
  projectSchema,
  promptAssetFilterSchema,
  promptAssetSchema,
  promptVersionSchema,
  settingSchema,
  tagLinkSchema,
  tagSchema,
  updateHarnessTemplateInputSchema,
  updateProjectInputSchema,
  updatePromptAssetInputSchema,
  updateTagInputSchema,
} from "./ipc-contract.js"

export type Project = z.infer<typeof projectSchema>
export type PromptAsset = z.infer<typeof promptAssetSchema>
export type PromptVersion = z.infer<typeof promptVersionSchema>
export type PromptAssetFilter = z.output<typeof promptAssetFilterSchema>
export type Tag = z.infer<typeof tagSchema>
export type TagLink = z.infer<typeof tagLinkSchema>
export type HarnessTemplate = z.infer<typeof harnessTemplateSchema>
export type Setting = z.infer<typeof settingSchema>
export type DeleteResult = z.infer<typeof deleteResultSchema>
export type CreateProjectInput = z.output<typeof createProjectInputSchema>
export type UpdateProjectInput = z.output<typeof updateProjectInputSchema>
export type CreatePromptAssetInput = z.output<typeof createPromptAssetInputSchema>
export type UpdatePromptAssetInput = z.output<typeof updatePromptAssetInputSchema>
export type CreatePromptVersionInput = z.output<typeof createPromptVersionInputSchema>
export type CreateTagInput = z.output<typeof createTagInputSchema>
export type UpdateTagInput = z.output<typeof updateTagInputSchema>
export type CreateHarnessTemplateInput = z.output<typeof createHarnessTemplateInputSchema>
export type UpdateHarnessTemplateInput = z.output<typeof updateHarnessTemplateInputSchema>
