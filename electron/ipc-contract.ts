import { z } from "zod"

// allow: SIZE_OK - central IPC boundary contract for channels, payloads, and response schemas.
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
export const APP_THEMES = ["system", "light", "dark"] as const
export const RISK_LEVELS = ["low", "medium", "high"] as const
export const SEARCH_SORTS = ["relevance", "updated_at", "title"] as const
export const SORT_DIRECTIONS = ["asc", "desc"] as const
export const PROMPT_COMPILER_ERROR_CODES = [
  "missing_openai_key",
  "openai_key_unavailable",
  "openai_request_failed",
  "invalid_llm_output",
] as const
export const COMPILED_PROMPT_REQUIRED_SECTIONS = [
  "# Objective",
  "# Context",
  "# Task",
  "# Scope",
  "# Constraints",
  "# Acceptance Criteria",
  "# Validation",
  "# Working Instructions",
  "# Final Response Format",
] as const

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
  createNextPromptVersion: "prompter:prompt-versions:create-next",
  listPromptVersions: "prompter:prompt-versions:list",
  getPromptVersion: "prompter:prompt-versions:get",
  getCurrentPromptVersion: "prompter:prompt-versions:get-current",
  setCurrentPromptVersion: "prompter:prompt-versions:set-current",
  comparePromptVersions: "prompter:prompt-versions:compare",
  createTag: "prompter:tags:create",
  listTags: "prompter:tags:list",
  updateTag: "prompter:tags:update",
  deleteTag: "prompter:tags:delete",
  attachTagToPrompt: "prompter:prompt-tags:attach",
  detachTagFromPrompt: "prompter:prompt-tags:detach",
  listTagsForPrompt: "prompter:tags:list-for-prompt",
  listTagsWithCounts: "prompter:tags:list-with-counts",
  createAndAttachTagToPrompt: "prompter:tags:create-and-attach",
  searchPrompts: "prompter:search:prompts",
  rebuildSearchIndex: "prompter:search:rebuild-index",
  createHarnessTemplate: "prompter:harness-templates:create",
  listHarnessTemplates: "prompter:harness-templates:list",
  getHarnessTemplate: "prompter:harness-templates:get",
  updateHarnessTemplate: "prompter:harness-templates:update",
  deleteHarnessTemplate: "prompter:harness-templates:delete",
  getSetting: "prompter:settings:get",
  setSetting: "prompter:settings:set",
  listSettings: "prompter:settings:list",
  getSettingsDefaults: "prompter:settings:defaults",
  updateSettingsDefaults: "prompter:settings:defaults:update",
  saveOpenAIKey: "prompter:secrets:openai-key:save",
  hasOpenAIKey: "prompter:secrets:openai-key:has",
  getOpenAIKeyStatus: "prompter:secrets:openai-key:status",
  deleteOpenAIKey: "prompter:secrets:openai-key:delete",
  promptCompilerAnalyze: "prompter:prompt-compiler:analyze",
  promptCompilerCompile: "prompter:prompt-compiler:compile",
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
const appThemeSchema = z.enum(APP_THEMES)
const riskLevelSchema = z.enum(RISK_LEVELS)
const searchSortSchema = z.enum(SEARCH_SORTS)
const sortDirectionSchema = z.enum(SORT_DIRECTIONS)
const promptCompilerErrorCodeSchema = z.enum(PROMPT_COMPILER_ERROR_CODES)

export function settingKeyIsPublic(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "")
  return !normalizedKey.includes("openai") && !normalizedKey.includes("apikey")
}

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
export const createNextPromptVersionResultSchema = z.object({
  asset: promptAssetSchema,
  version: promptVersionSchema,
})
export const comparePromptVersionsResultSchema = z.object({
  baseVersion: promptVersionSchema,
  compareVersion: promptVersionSchema,
})

export const tagSchema = z.object({ id: idSchema, name: nameSchema, createdAt: timestampSchema })
export const tagWithCountSchema = tagSchema.extend({ promptCount: z.number().int().nonnegative() })
export const tagLinkSchema = z.object({ promptAssetId: idSchema, tagId: idSchema })
export const promptSearchResultItemSchema = z.object({
  promptAssetId: idSchema,
  currentVersionId: idSchema,
  title: nameSchema,
  scenario: scenarioSchema,
  targetAgent: targetAgentSchema,
  projectId: idSchema.nullable(),
  projectName: nameSchema.nullable(),
  versionNumber: z.number().int().positive(),
  compiledPromptPreview: z.string(),
  originalInputPreview: z.string(),
  matchedTextPreview: z.string(),
  qualityScore: z.number().int().nullable(),
  tags: z.array(tagSchema),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
})
export const promptSearchResultSchema = z.object({
  items: z.array(promptSearchResultItemSchema),
  total: z.number().int().nonnegative(),
})
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
export const settingsDefaultsSchema = z.object({
  defaultModel: z.string().trim().min(1),
  defaultTargetAgent: targetAgentSchema,
  defaultProjectId: idSchema.nullable(),
  defaultScenario: scenarioSchema,
  appTheme: appThemeSchema,
  compilerDefaultLanguage: z.string().trim().min(1),
})
export const openAIKeyStatusSchema = z.object({
  hasKey: z.boolean(),
  maskedKey: z.string().nullable(),
  updatedAt: timestampSchema.nullable(),
})
export const clarificationQuestionSchema = z.object({
  id: z.string().trim().min(1),
  question: z.string().trim().min(1),
  whyItMatters: z.string().trim().min(1),
  options: z.array(z.string().trim().min(1)).max(6).optional(),
  required: z.boolean(),
})
export const clarificationAnswerSchema = z.object({
  questionId: z.string().trim().min(1),
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
})
export const promptCompilerAnalyzeOutputSchema = z.object({
  detectedScenario: scenarioSchema,
  detectedTargetAgent: targetAgentSchema,
  summary: z.string().trim().min(1),
  clarificationNeeded: z.boolean(),
  questions: z.array(clarificationQuestionSchema).max(3),
  assumptions: z.array(z.string().trim().min(1)),
  suggestedTags: z.array(z.string().trim().min(1)),
  riskLevel: riskLevelSchema,
})
export const promptCompilerCompileOutputSchema = z.object({
  title: nameSchema,
  scenario: scenarioSchema,
  targetAgent: targetAgentSchema,
  summary: z.string().trim().min(1),
  compiledPrompt: requiredTextSchema.refine(
    (value) => COMPILED_PROMPT_REQUIRED_SECTIONS.every((section) => value.includes(section)),
    "compiledPrompt must include every required section",
  ),
  assumptions: z.array(z.string().trim().min(1)),
  questions: z.array(clarificationQuestionSchema).max(3),
  answers: z.array(clarificationAnswerSchema),
  acceptanceCriteria: z.array(z.string().trim().min(1)),
  validationCommands: z.array(z.string().trim().min(1)),
  suggestedTags: z.array(z.string().trim().min(1)),
  qualityScore: z.number().int().min(0).max(100),
  warnings: z.array(z.string().trim().min(1)),
})
export const promptCompilerErrorSchema = z.object({
  ok: z.literal(false),
  code: promptCompilerErrorCodeSchema,
  message: z.string().trim().min(1),
})
export const promptCompilerAnalyzeResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), value: promptCompilerAnalyzeOutputSchema }),
  promptCompilerErrorSchema,
])
export const promptCompilerCompileResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), value: promptCompilerCompileOutputSchema }),
  promptCompilerErrorSchema,
])
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
export const listPromptVersionsInputSchema = idPayloadSchema
export const getPromptVersionInputSchema = idPayloadSchema
export const createNextPromptVersionInputSchema = createPromptVersionInputSchema.extend({
  makeCurrent: z.boolean().default(true),
})
export const createTagInputSchema = z.object({ name: nameSchema })
export const updateTagInputSchema = createTagInputSchema
export const promptSearchFilterSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  projectId: idSchema.nullable().optional(),
  query: z.string().default(""),
  scenario: scenarioSchema.optional(),
  scenarios: z.array(scenarioSchema).optional(),
  sortBy: searchSortSchema.default("relevance"),
  sortDirection: sortDirectionSchema.default("desc"),
  tagIds: z.array(idSchema).max(20).optional(),
  targetAgent: targetAgentSchema.optional(),
  targetAgents: z.array(targetAgentSchema).optional(),
})
export const createAndAttachTagPayloadSchema = z.object({
  promptAssetId: idSchema,
  tagName: nameSchema,
})
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
export const saveOpenAIKeyInputSchema = z.object({
  apiKey: z.string().trim().min(1, "API key is required").min(16, "API key is too short"),
})
export const updateDefaultsInputSchema = settingsDefaultsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one default setting is required")
const promptCompilerBaseInputSchema = z.object({
  originalInput: requiredTextSchema,
  scenario: scenarioSchema.optional(),
  targetAgent: targetAgentSchema.optional(),
  projectContext: optionalTextSchema,
  techStack: optionalTextSchema,
  constraints: optionalTextSchema,
  acceptanceCriteria: optionalTextSchema,
  validationCommands: optionalTextSchema,
  additionalNotes: optionalTextSchema,
  projectId: idSchema.nullable().optional(),
})
export const promptCompilerAnalyzeInputSchema = promptCompilerBaseInputSchema
export const promptCompilerCompileInputSchema = promptCompilerBaseInputSchema.extend({
  scenario: scenarioSchema,
  targetAgent: targetAgentSchema,
  clarificationAnswers: z.array(clarificationAnswerSchema).optional(),
  assumptions: z.array(z.string().trim().min(1)).optional(),
})
export const setSettingInputSchema = z.object({
  key: keySchema.refine(settingKeyIsPublic, "Secrets cannot be stored in settings"),
  value: z.string(),
})
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
export const setCurrentPromptVersionInputSchema = setCurrentPromptVersionPayloadSchema
export const comparePromptVersionsInputSchema = z.object({
  baseVersionId: idSchema,
  compareVersionId: idSchema,
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
  createNextPromptVersion: createNextPromptVersionInputSchema,
  listPromptVersions: listPromptVersionsInputSchema,
  getPromptVersion: getPromptVersionInputSchema,
  getCurrentPromptVersion: idPayloadSchema,
  setCurrentPromptVersion: setCurrentPromptVersionPayloadSchema,
  comparePromptVersions: comparePromptVersionsInputSchema,
  createTag: createTagInputSchema,
  listTags: noPayloadSchema,
  updateTag: updateTagPayloadSchema,
  deleteTag: idPayloadSchema,
  attachTagToPrompt: tagLinkSchema,
  detachTagFromPrompt: tagLinkSchema,
  listTagsForPrompt: idPayloadSchema,
  listTagsWithCounts: noPayloadSchema,
  createAndAttachTagToPrompt: createAndAttachTagPayloadSchema,
  searchPrompts: promptSearchFilterSchema,
  rebuildSearchIndex: noPayloadSchema,
  createHarnessTemplate: createHarnessTemplateInputSchema,
  listHarnessTemplates: noPayloadSchema,
  getHarnessTemplate: idPayloadSchema,
  updateHarnessTemplate: updateHarnessTemplatePayloadSchema,
  deleteHarnessTemplate: idPayloadSchema,
  getSetting: keyPayloadSchema,
  setSetting: setSettingInputSchema,
  listSettings: noPayloadSchema,
  getSettingsDefaults: noPayloadSchema,
  updateSettingsDefaults: updateDefaultsInputSchema,
  saveOpenAIKey: saveOpenAIKeyInputSchema,
  hasOpenAIKey: noPayloadSchema,
  getOpenAIKeyStatus: noPayloadSchema,
  deleteOpenAIKey: noPayloadSchema,
  promptCompilerAnalyze: promptCompilerAnalyzeInputSchema,
  promptCompilerCompile: promptCompilerCompileInputSchema,
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
  createNextPromptVersion: createNextPromptVersionResultSchema,
  listPromptVersions: z.array(promptVersionSchema),
  getPromptVersion: promptVersionSchema.nullable(),
  getCurrentPromptVersion: promptVersionSchema.nullable(),
  setCurrentPromptVersion: promptAssetSchema,
  comparePromptVersions: comparePromptVersionsResultSchema,
  createTag: tagSchema,
  listTags: z.array(tagSchema),
  updateTag: tagSchema,
  deleteTag: deleteResultSchema,
  attachTagToPrompt: tagLinkSchema,
  detachTagFromPrompt: tagLinkSchema,
  listTagsForPrompt: z.array(tagSchema),
  listTagsWithCounts: z.array(tagWithCountSchema),
  createAndAttachTagToPrompt: tagLinkSchema,
  searchPrompts: promptSearchResultSchema,
  rebuildSearchIndex: z.object({ rebuilt: z.literal(true) }),
  createHarnessTemplate: harnessTemplateSchema,
  listHarnessTemplates: z.array(harnessTemplateSchema),
  getHarnessTemplate: harnessTemplateSchema.nullable(),
  updateHarnessTemplate: harnessTemplateSchema,
  deleteHarnessTemplate: deleteResultSchema,
  getSetting: settingSchema.nullable(),
  setSetting: settingSchema,
  listSettings: z.array(settingSchema),
  getSettingsDefaults: settingsDefaultsSchema,
  updateSettingsDefaults: settingsDefaultsSchema,
  saveOpenAIKey: openAIKeyStatusSchema,
  hasOpenAIKey: z.boolean(),
  getOpenAIKeyStatus: openAIKeyStatusSchema,
  deleteOpenAIKey: openAIKeyStatusSchema,
  promptCompilerAnalyze: promptCompilerAnalyzeResultSchema,
  promptCompilerCompile: promptCompilerCompileResultSchema,
} as const
