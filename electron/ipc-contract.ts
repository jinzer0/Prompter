import { z } from "zod"

export const PING_CHANNEL = "prompter:ping" as const
export const PING_RESPONSE = "pong" as const

export const SCENARIOS = [
  "feature",
  "bugfix",
  "refactor",
  "code_review",
  "docs",
  "research",
] as const
export const TARGET_AGENTS = ["codex", "claude_code", "cursor", "generic_agent"] as const

export const PERSISTENCE_CHANNELS = {
  createProject: "prompter:projects:create",
  listProjects: "prompter:projects:list",
  getProject: "prompter:projects:get",
  updateProject: "prompter:projects:update",
  deleteProject: "prompter:projects:delete",
  createPromptAsset: "prompter:prompt-assets:create",
  listPromptAssets: "prompter:prompt-assets:list",
  getPromptAsset: "prompter:prompt-assets:get",
  updatePromptAsset: "prompter:prompt-assets:update",
  deletePromptAsset: "prompter:prompt-assets:delete",
  createPromptVersion: "prompter:prompt-versions:create",
  listPromptVersions: "prompter:prompt-versions:list",
  getPromptVersion: "prompter:prompt-versions:get",
  setCurrentPromptVersion: "prompter:prompt-versions:set-current",
  createTag: "prompter:tags:create",
  listTags: "prompter:tags:list",
  updateTag: "prompter:tags:update",
  deleteTag: "prompter:tags:delete",
  attachTagToPrompt: "prompter:prompt-tags:attach",
  detachTagFromPrompt: "prompter:prompt-tags:detach",
  createHarnessTemplate: "prompter:harness-templates:create",
  listHarnessTemplates: "prompter:harness-templates:list",
  getHarnessTemplate: "prompter:harness-templates:get",
  updateHarnessTemplate: "prompter:harness-templates:update",
  deleteHarnessTemplate: "prompter:harness-templates:delete",
  getSetting: "prompter:settings:get",
  setSetting: "prompter:settings:set",
  listSettings: "prompter:settings:list",
} as const

export type PingResponse = typeof PING_RESPONSE
export type PersistenceChannel = (typeof PERSISTENCE_CHANNELS)[keyof typeof PERSISTENCE_CHANNELS]
export type IpcChannel = typeof PING_CHANNEL | PersistenceChannel

const idSchema = z.string().uuid()
const keySchema = z.string().trim().min(1)
const nameSchema = z.string().trim().min(1)
const timestampSchema = z.number().int().nonnegative()
const nullableTextSchema = z.string().nullable()
const optionalTextSchema = z.string().nullable().optional()
const requiredTextSchema = z.string().trim().min(1)
const noPayloadSchema = z.undefined()
const scenarioSchema = z.enum(SCENARIOS)
const targetAgentSchema = z.enum(TARGET_AGENTS)

export const projectSchema = z.object({
  id: idSchema,
  name: nameSchema,
  description: nullableTextSchema,
  techStack: nullableTextSchema,
  defaultAgent: targetAgentSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
})

export const promptAssetSchema = z.object({
  id: idSchema,
  projectId: idSchema.nullable(),
  title: nameSchema,
  scenario: scenarioSchema,
  targetAgent: targetAgentSchema,
  currentVersionId: idSchema.nullable(),
  parentPromptId: idSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
})

export const promptVersionSchema = z.object({
  id: idSchema,
  promptAssetId: idSchema,
  versionNumber: z.number().int().positive(),
  originalInput: z.string(),
  compiledPrompt: z.string(),
  assumptions: nullableTextSchema,
  questions: nullableTextSchema,
  answers: nullableTextSchema,
  acceptanceCriteria: nullableTextSchema,
  validationCommands: nullableTextSchema,
  qualityScore: z.number().int().nullable(),
  createdAt: timestampSchema,
})

export const tagSchema = z.object({ id: idSchema, name: nameSchema, createdAt: timestampSchema })
export const tagLinkSchema = z.object({ promptAssetId: idSchema, tagId: idSchema })
export const harnessTemplateSchema = z.object({
  id: idSchema,
  name: nameSchema,
  scenario: scenarioSchema,
  targetAgent: targetAgentSchema,
  templateBody: z.string().trim().min(1),
  requiredFields: nullableTextSchema,
  clarificationPolicy: nullableTextSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
})
export const settingSchema = z.object({
  key: keySchema,
  value: z.string(),
  updatedAt: timestampSchema,
})
export const deleteResultSchema = z.object({ id: idSchema })
export const idPayloadSchema = z.object({ id: idSchema })

export const createProjectInputSchema = z.object({
  name: nameSchema,
  description: optionalTextSchema,
  techStack: optionalTextSchema,
  defaultAgent: targetAgentSchema.nullable().optional(),
})
export const updateProjectInputSchema = createProjectInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one project field is required")

export const promptAssetFilterSchema = z
  .object({
    projectId: idSchema.nullable().optional(),
    scenario: scenarioSchema.optional(),
    targetAgent: targetAgentSchema.optional(),
  })
  .optional()
export const createPromptAssetInputSchema = z.object({
  projectId: idSchema.nullable().optional(),
  title: nameSchema,
  scenario: scenarioSchema,
  targetAgent: targetAgentSchema,
  parentPromptId: idSchema.nullable().optional(),
})
export const updatePromptAssetInputSchema = createPromptAssetInputSchema
  .partial()
  .extend({ currentVersionId: idSchema.nullable().optional() })
  .refine((value) => Object.keys(value).length > 0, "At least one prompt asset field is required")

export const createPromptVersionInputSchema = z.object({
  promptAssetId: idSchema,
  originalInput: requiredTextSchema,
  compiledPrompt: requiredTextSchema,
  assumptions: optionalTextSchema,
  questions: optionalTextSchema,
  answers: optionalTextSchema,
  acceptanceCriteria: optionalTextSchema,
  validationCommands: optionalTextSchema,
  qualityScore: z.number().int().nullable().optional(),
})
export const createTagInputSchema = z.object({ name: nameSchema })
export const updateTagInputSchema = createTagInputSchema
export const createHarnessTemplateInputSchema = z.object({
  name: nameSchema,
  scenario: scenarioSchema,
  targetAgent: targetAgentSchema,
  templateBody: z.string().trim().min(1),
  requiredFields: optionalTextSchema,
  clarificationPolicy: optionalTextSchema,
})
export const updateHarnessTemplateInputSchema = createHarnessTemplateInputSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one harness template field is required",
  )
export const setSettingInputSchema = z.object({ key: keySchema, value: z.string() })
export const updateProjectPayloadSchema = z.object({
  id: idSchema,
  input: updateProjectInputSchema,
})
export const updatePromptAssetPayloadSchema = z.object({
  id: idSchema,
  input: updatePromptAssetInputSchema,
})
export const updateTagPayloadSchema = z.object({ id: idSchema, input: updateTagInputSchema })
export const updateHarnessTemplatePayloadSchema = z.object({
  id: idSchema,
  input: updateHarnessTemplateInputSchema,
})
export const setCurrentPromptVersionPayloadSchema = z.object({
  promptAssetId: idSchema,
  versionId: idSchema,
})
export const keyPayloadSchema = z.object({ key: keySchema })

export const payloadSchemas = {
  createProject: createProjectInputSchema,
  listProjects: noPayloadSchema,
  getProject: idPayloadSchema,
  updateProject: updateProjectPayloadSchema,
  deleteProject: idPayloadSchema,
  createPromptAsset: createPromptAssetInputSchema,
  listPromptAssets: promptAssetFilterSchema,
  getPromptAsset: idPayloadSchema,
  updatePromptAsset: updatePromptAssetPayloadSchema,
  deletePromptAsset: idPayloadSchema,
  createPromptVersion: createPromptVersionInputSchema,
  listPromptVersions: idPayloadSchema,
  getPromptVersion: idPayloadSchema,
  setCurrentPromptVersion: setCurrentPromptVersionPayloadSchema,
  createTag: createTagInputSchema,
  listTags: noPayloadSchema,
  updateTag: updateTagPayloadSchema,
  deleteTag: idPayloadSchema,
  attachTagToPrompt: tagLinkSchema,
  detachTagFromPrompt: tagLinkSchema,
  createHarnessTemplate: createHarnessTemplateInputSchema,
  listHarnessTemplates: noPayloadSchema,
  getHarnessTemplate: idPayloadSchema,
  updateHarnessTemplate: updateHarnessTemplatePayloadSchema,
  deleteHarnessTemplate: idPayloadSchema,
  getSetting: keyPayloadSchema,
  setSetting: setSettingInputSchema,
  listSettings: noPayloadSchema,
} as const

export const responseSchemas = {
  createProject: projectSchema,
  listProjects: z.array(projectSchema),
  getProject: projectSchema.nullable(),
  updateProject: projectSchema,
  deleteProject: deleteResultSchema,
  createPromptAsset: promptAssetSchema,
  listPromptAssets: z.array(promptAssetSchema),
  getPromptAsset: promptAssetSchema.nullable(),
  updatePromptAsset: promptAssetSchema,
  deletePromptAsset: deleteResultSchema,
  createPromptVersion: promptVersionSchema,
  listPromptVersions: z.array(promptVersionSchema),
  getPromptVersion: promptVersionSchema.nullable(),
  setCurrentPromptVersion: promptAssetSchema,
  createTag: tagSchema,
  listTags: z.array(tagSchema),
  updateTag: tagSchema,
  deleteTag: deleteResultSchema,
  attachTagToPrompt: tagLinkSchema,
  detachTagFromPrompt: tagLinkSchema,
  createHarnessTemplate: harnessTemplateSchema,
  listHarnessTemplates: z.array(harnessTemplateSchema),
  getHarnessTemplate: harnessTemplateSchema.nullable(),
  updateHarnessTemplate: harnessTemplateSchema,
  deleteHarnessTemplate: deleteResultSchema,
  getSetting: settingSchema.nullable(),
  setSetting: settingSchema,
  listSettings: z.array(settingSchema),
} as const
