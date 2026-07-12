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
export const PROMPT_QUALITY_REVIEW_MODES = ["local", "llm"] as const
export const PROMPT_QUALITY_GRADES = ["excellent", "good", "needs_work", "weak"] as const
export const PROMPT_QUALITY_ISSUE_SEVERITIES = ["critical", "high", "medium", "low"] as const
export const PROMPT_QUALITY_SUGGESTION_PRIORITIES = ["high", "medium", "low"] as const
export const PROMPT_QUALITY_REVIEW_SOURCES = ["draft", "prompt_version"] as const
export const PROMPT_QUALITY_LLM_REVIEW_CODES = [
  "missing_openai_key",
  "llm_review_unavailable",
] as const
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
export const EXPORT_FORMATS = [
  "markdown",
  "codex",
  "claude_code",
  "cursor",
  "generic_agent",
  "agents_md",
  "skill_md",
] as const
export const PROJECT_CONTEXT_PROFILE_DB_FIELD_NAMES = [
  "id",
  "project_id",
  "name",
  "summary",
  "tech_stack",
  "architecture_notes",
  "coding_conventions",
  "constraints",
  "forbidden_actions",
  "acceptance_defaults",
  "validation_commands",
  "security_notes",
  "additional_context",
  "testing_notes",
  "package_manager",
  "default_branch",
  "repo_path",
  "is_default",
  "created_at",
  "updated_at",
] as const
export const PROJECT_CONTEXT_PROFILE_IPC_FIELD_NAMES = [
  "id",
  "projectId",
  "name",
  "summary",
  "techStack",
  "architectureNotes",
  "codingConventions",
  "constraints",
  "forbiddenActions",
  "acceptanceDefaults",
  "validationCommands",
  "securityNotes",
  "additionalContext",
  "testingNotes",
  "packageManager",
  "defaultBranch",
  "repoPath",
  "isDefault",
  "createdAt",
  "updatedAt",
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
  duplicateHarnessTemplate: "prompter:harness-templates:duplicate",
  createProjectContextProfile: "prompter:project-context-profiles:create",
  listProjectContextProfiles: "prompter:project-context-profiles:list",
  getProjectContextProfile: "prompter:project-context-profiles:get",
  getDefaultProjectContextProfile: "prompter:project-context-profiles:get-default",
  updateProjectContextProfile: "prompter:project-context-profiles:update",
  deleteProjectContextProfile: "prompter:project-context-profiles:delete",
  duplicateProjectContextProfile: "prompter:project-context-profiles:duplicate",
  setDefaultProjectContextProfile: "prompter:project-context-profiles:set-default",
  buildProjectContextForCompiler: "prompter:project-context-profiles:build-compiler-context",
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
  formatPromptForExport: "prompter:exports:format-prompt",
  savePromptToFile: "prompter:exports:save-prompt-to-file",
  copyText: "prompter:clipboard:copy-text",
  readText: "prompter:clipboard:read-text",
  reviewPromptQualityDraft: "prompter:prompt-quality:review-draft",
  reviewPromptQualityWithLLM: "prompter:prompt-quality:review-llm",
  reviewPromptQualityVersion: "prompter:prompt-quality:review-version",
  savePromptQualityReview: "prompter:prompt-quality:save-review",
  listPromptQualityReviewsForVersion: "prompter:prompt-quality:list-for-version",
  getLatestPromptQualityReview: "prompter:prompt-quality:get-latest",
  getPromptQualityReview: "prompter:prompt-quality:get",
  applyPromptQualityScoreToVersion: "prompter:prompt-quality:apply-score-to-version",
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
const nullableProfileTextInputSchema = z.string().nullable().optional().default(null)
const nullableProfileTextUpdateSchema = z.string().nullable().optional()
const requiredTextSchema = z.string().trim().min(1)
const requiredPreservedTextSchema = z
  .string()
  .refine((value) => value.trim().length > 0, "Text must not be blank")
const noPayloadSchema = z.undefined()
const scenarioSchema = z.enum(SCENARIOS)
const targetAgentSchema = z.enum(TARGET_AGENTS)
const appThemeSchema = z.enum(APP_THEMES)
const riskLevelSchema = z.enum(RISK_LEVELS)
const searchSortSchema = z.enum(SEARCH_SORTS)
const sortDirectionSchema = z.enum(SORT_DIRECTIONS)
export const promptQualityReviewModeSchema = z.enum(PROMPT_QUALITY_REVIEW_MODES)
export const promptQualityGradeSchema = z.enum(PROMPT_QUALITY_GRADES)
export const promptQualityIssueSeveritySchema = z.enum(PROMPT_QUALITY_ISSUE_SEVERITIES)
export const promptQualitySuggestionPrioritySchema = z.enum(PROMPT_QUALITY_SUGGESTION_PRIORITIES)
export const promptQualityReviewSourceSchema = z.enum(PROMPT_QUALITY_REVIEW_SOURCES)
export const promptQualityLLMReviewCodeSchema = z.enum(PROMPT_QUALITY_LLM_REVIEW_CODES)
const promptCompilerErrorCodeSchema = z.enum(PROMPT_COMPILER_ERROR_CODES)
export const exportFormatSchema = z.enum(EXPORT_FORMATS)

export const exportFormatLabels = {
  markdown: "Markdown Prompt",
  codex: "Codex Prompt",
  claude_code: "Claude Code Prompt",
  cursor: "Cursor Prompt",
  generic_agent: "Generic Agent Prompt",
  agents_md: "AGENTS.md Snippet",
  skill_md: "SKILL.md Draft",
} as const satisfies Record<(typeof EXPORT_FORMATS)[number], string>

function jsonArrayOrStringSchema<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => {
    if (typeof value !== "string") {
      return value
    }

    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }, z.array(schema))
}

function parseJsonString(value: string, ctx: z.RefinementCtx): unknown {
  try {
    return JSON.parse(value)
  } catch {
    ctx.addIssue({ code: "custom", message: "Invalid JSON string" })
    return z.NEVER
  }
}

const requiredFieldsValueSchema = z.union([
  z.array(z.string().trim().min(1)).transform((value) => JSON.stringify(value)),
  z.string().transform((value, ctx) => {
    const parsed = z.array(z.string().trim().min(1)).safeParse(parseJsonString(value, ctx))

    if (!parsed.success) {
      ctx.addIssue({ code: "custom", message: "requiredFields must be a JSON string array" })
      return z.NEVER
    }

    return JSON.stringify(parsed.data)
  }),
  z.null(),
])
const clarificationPolicyObjectSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => !Array.isArray(value), "clarificationPolicy must be a JSON object")
const clarificationPolicyValueSchema = z.union([
  clarificationPolicyObjectSchema.transform((value) => JSON.stringify(value)),
  z.string().transform((value, ctx) => {
    const parsed = clarificationPolicyObjectSchema.safeParse(parseJsonString(value, ctx))

    if (!parsed.success) {
      ctx.addIssue({ code: "custom", message: "clarificationPolicy must be a JSON object string" })
      return z.NEVER
    }

    return JSON.stringify(parsed.data)
  }),
  z.null(),
])

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

const projectContextProfileTextFieldsSchema = z.object({
  summary: nullableTextSchema,
  techStack: nullableTextSchema,
  architectureNotes: nullableTextSchema,
  codingConventions: nullableTextSchema,
  constraints: nullableTextSchema,
  forbiddenActions: nullableTextSchema,
  acceptanceDefaults: nullableTextSchema,
  validationCommands: nullableTextSchema,
  securityNotes: nullableTextSchema,
  additionalContext: nullableTextSchema,
  testingNotes: nullableTextSchema,
  packageManager: nullableTextSchema,
  defaultBranch: nullableTextSchema,
  repoPath: nullableTextSchema,
})
const projectContextProfileTextInputFieldsSchema = z.object({
  summary: nullableProfileTextInputSchema,
  techStack: nullableProfileTextInputSchema,
  architectureNotes: nullableProfileTextInputSchema,
  codingConventions: nullableProfileTextInputSchema,
  constraints: nullableProfileTextInputSchema,
  forbiddenActions: nullableProfileTextInputSchema,
  acceptanceDefaults: nullableProfileTextInputSchema,
  validationCommands: nullableProfileTextInputSchema,
  securityNotes: nullableProfileTextInputSchema,
  additionalContext: nullableProfileTextInputSchema,
  testingNotes: nullableProfileTextInputSchema,
  packageManager: nullableProfileTextInputSchema,
  defaultBranch: nullableProfileTextInputSchema,
  repoPath: nullableProfileTextInputSchema,
})
const projectContextProfileTextUpdateFieldsSchema = z.object({
  summary: nullableProfileTextUpdateSchema,
  techStack: nullableProfileTextUpdateSchema,
  architectureNotes: nullableProfileTextUpdateSchema,
  codingConventions: nullableProfileTextUpdateSchema,
  constraints: nullableProfileTextUpdateSchema,
  forbiddenActions: nullableProfileTextUpdateSchema,
  acceptanceDefaults: nullableProfileTextUpdateSchema,
  validationCommands: nullableProfileTextUpdateSchema,
  securityNotes: nullableProfileTextUpdateSchema,
  additionalContext: nullableProfileTextUpdateSchema,
  testingNotes: nullableProfileTextUpdateSchema,
  packageManager: nullableProfileTextUpdateSchema,
  defaultBranch: nullableProfileTextUpdateSchema,
  repoPath: nullableProfileTextUpdateSchema,
})
export const projectContextProfileSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    name: nameSchema,
    isDefault: z.boolean(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .extend(projectContextProfileTextFieldsSchema.shape)

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

const promptQualityScoreSchema = z.number().int().min(0).max(100)
export const promptQualityDimensionScoresSchema = z.object({
  clarity: promptQualityScoreSchema,
  context: promptQualityScoreSchema,
  scope: promptQualityScoreSchema,
  constraints: promptQualityScoreSchema,
  acceptanceCriteria: promptQualityScoreSchema,
  validation: promptQualityScoreSchema,
  safety: promptQualityScoreSchema,
  ambiguityRisk: promptQualityScoreSchema,
})
export const promptQualityIssueSchema = z.object({
  id: nameSchema,
  severity: promptQualityIssueSeveritySchema,
  title: nameSchema,
  description: requiredTextSchema,
  evidence: requiredTextSchema,
})
export const promptQualitySuggestionSchema = z.object({
  id: nameSchema,
  priority: promptQualitySuggestionPrioritySchema,
  title: nameSchema,
  description: requiredTextSchema,
})
export const promptQualityReviewSnapshotSchema = z.object({
  compiledPrompt: requiredPreservedTextSchema,
  originalInput: z.string(),
  scenario: scenarioSchema,
  targetAgent: targetAgentSchema,
  harnessTemplateId: idSchema.nullable(),
  projectContextProfileId: idSchema.nullable(),
  includeProjectContextProfile: z.boolean(),
  projectContext: nullableTextSchema,
  constraints: nullableTextSchema,
  acceptanceCriteria: nullableTextSchema,
  validationCommands: nullableTextSchema,
})
export const promptQualityReviewResultSchema = z.object({
  id: idSchema.nullable(),
  source: promptQualityReviewSourceSchema,
  promptVersionId: idSchema.nullable(),
  reviewMode: promptQualityReviewModeSchema,
  overallScore: promptQualityScoreSchema,
  grade: promptQualityGradeSchema,
  dimensionScores: promptQualityDimensionScoresSchema,
  strengths: z.array(requiredTextSchema),
  issues: z.array(promptQualityIssueSchema),
  suggestions: z.array(promptQualitySuggestionSchema),
  missingSections: z.array(requiredTextSchema),
  warnings: z.array(requiredTextSchema),
  recommendedClarifyingQuestions: z.array(requiredTextSchema),
  scoreExplanation: requiredTextSchema,
  snapshot: promptQualityReviewSnapshotSchema,
  createdAt: timestampSchema,
  improvedPromptDraft: z.string().nullable(),
})
export const promptQualityLLMReviewResultSchema = z.object({
  ok: z.literal(false),
  code: promptQualityLLMReviewCodeSchema,
  message: requiredTextSchema,
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
  templateBody: requiredPreservedTextSchema,
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
export const exportPromptInputSchema = z.object({
  promptAssetId: idSchema.optional(),
  promptVersionId: idSchema,
  title: z.string(),
  scenario: scenarioSchema,
  targetAgent: targetAgentSchema,
  originalInput: requiredTextSchema,
  compiledPrompt: requiredTextSchema,
  assumptions: jsonArrayOrStringSchema(z.string().trim().min(1)).optional(),
  questions: jsonArrayOrStringSchema(clarificationQuestionSchema).optional(),
  answers: jsonArrayOrStringSchema(clarificationAnswerSchema).optional(),
  acceptanceCriteria: jsonArrayOrStringSchema(z.string().trim().min(1)).optional(),
  validationCommands: jsonArrayOrStringSchema(z.string().trim().min(1)).optional(),
  tags: jsonArrayOrStringSchema(tagSchema).optional(),
  projectName: z.string().nullable().optional(),
  qualityScore: z.number().int().min(0).max(100).nullable().optional(),
  createdAt: timestampSchema.nullable().optional(),
  updatedAt: timestampSchema.nullable().optional(),
  format: exportFormatSchema,
})
const safeExportFilenameSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._ -]*$/, "filename must be a safe filename")
  .refine((value) => !value.includes(".."), "filename must not include path traversal")
export const formatPromptForExportInputSchema = exportPromptInputSchema
const directSavePromptToFileInputSchema = z.object({
  content: requiredTextSchema,
  format: exportFormatSchema,
  filename: safeExportFilenameSchema.optional(),
})
export const savePromptToFileInputSchema = z.union([
  exportPromptInputSchema.extend({ filename: safeExportFilenameSchema.optional() }),
  directSavePromptToFileInputSchema,
])
export const copyTextInputSchema = z.object({ text: requiredTextSchema })
export const clipboardReadTextResultSchema = z.object({
  text: z.string(),
  isEmpty: z.boolean(),
  length: z.number().int().nonnegative(),
})
export const exportPromptResultSchema = z.object({
  format: exportFormatSchema,
  filename: z.string().trim().min(1),
  content: z.string(),
  mimeType: z.literal("text/markdown"),
})
export const savePromptToFileResultSchema = z.union([
  z.object({ cancelled: z.literal(true) }),
  z.object({ cancelled: z.literal(false), filePath: z.string().trim().min(1) }),
])
export const copyTextResultSchema = z.object({ copied: z.literal(true) })
export const promptCompilerAnalyzeOutputSchema = z.object({
  detectedScenario: scenarioSchema,
  detectedTargetAgent: targetAgentSchema,
  summary: z.string().trim().min(1),
  clarificationNeeded: z.boolean(),
  questions: z.array(clarificationQuestionSchema).max(3),
  assumptions: z.array(z.string().trim().min(1)),
  suggestedTags: z.array(z.string().trim().min(1)),
  riskLevel: riskLevelSchema,
  warnings: z.array(z.string().trim().min(1)).default([]),
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
export const projectContextProfileIdentitySchema = z.object({
  projectId: idSchema,
  profileId: idSchema,
})

export const createProjectInputSchema = z.object({
  name: nameSchema,
  description: optionalTextSchema,
  techStack: optionalTextSchema,
  defaultAgent: targetAgentSchema.nullable().optional(),
})
export const updateProjectInputSchema = createProjectInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one project field is required")
export const createProjectContextProfileInputSchema = z
  .object({
    projectId: idSchema,
    name: nameSchema,
    isDefault: z.boolean().optional().default(false),
  })
  .extend(projectContextProfileTextInputFieldsSchema.shape)
export const updateProjectContextProfileInputSchema = z
  .object({
    name: nameSchema.optional(),
    isDefault: z.boolean().optional(),
  })
  .extend(projectContextProfileTextUpdateFieldsSchema.shape)
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one project context profile field is required",
  )
export const listProjectContextProfilesInputSchema = z.object({ projectId: idSchema })
export const getProjectContextProfileInputSchema = projectContextProfileIdentitySchema
export const deleteProjectContextProfileInputSchema = projectContextProfileIdentitySchema
export const duplicateProjectContextProfileInputSchema = projectContextProfileIdentitySchema
export const setDefaultProjectContextProfileInputSchema = projectContextProfileIdentitySchema
export const buildProjectContextForCompilerInputSchema = projectContextProfileIdentitySchema
export const updateProjectContextProfilePayloadSchema = projectContextProfileIdentitySchema.extend({
  input: updateProjectContextProfileInputSchema,
})
export const projectContextCompilerBuildResultSchema = z.object({
  profileId: idSchema.nullable(),
  profileName: z.string().nullable(),
  context: z.string().nullable(),
  sectionNames: z.array(z.string().trim().min(1)),
  warnings: z.array(z.string().trim().min(1)),
})

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
  templateBody: requiredPreservedTextSchema,
  requiredFields: requiredFieldsValueSchema.optional().default(null),
  clarificationPolicy: clarificationPolicyValueSchema.optional().default(null),
})
export const listHarnessTemplatesInputSchema = z
  .object({
    scenario: scenarioSchema.optional(),
    targetAgent: targetAgentSchema.optional(),
    query: z.string().trim().optional(),
  })
  .optional()
export const duplicateHarnessTemplateInputSchema = idPayloadSchema
export const updateHarnessTemplateInputSchema = z
  .object({
    name: nameSchema.optional(),
    scenario: scenarioSchema.optional(),
    targetAgent: targetAgentSchema.optional(),
    templateBody: requiredPreservedTextSchema.optional(),
    requiredFields: requiredFieldsValueSchema.optional(),
    clarificationPolicy: clarificationPolicyValueSchema.optional(),
  })
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
type PromptCompilerProjectContextFields = {
  readonly projectId?: string | null | undefined
  readonly projectContextProfileId?: string | null | undefined
  readonly includeProjectContextProfile?: boolean | undefined
}

function validatePromptCompilerProjectContext(
  value: PromptCompilerProjectContextFields,
  ctx: z.RefinementCtx,
): void {
  if (value.includeProjectContextProfile !== true) {
    return
  }

  if (value.projectId === undefined || value.projectId === null) {
    ctx.addIssue({
      code: "custom",
      path: ["projectId"],
      message: "projectId is required when includeProjectContextProfile is true",
    })
  }

  if (value.projectContextProfileId === undefined || value.projectContextProfileId === null) {
    ctx.addIssue({
      code: "custom",
      path: ["projectContextProfileId"],
      message: "projectContextProfileId is required when includeProjectContextProfile is true",
    })
  }
}

const promptCompilerBaseInputSchema = z.object({
  originalInput: requiredPreservedTextSchema,
  scenario: scenarioSchema.optional(),
  targetAgent: targetAgentSchema.optional(),
  projectContext: optionalTextSchema,
  techStack: optionalTextSchema,
  constraints: optionalTextSchema,
  acceptanceCriteria: optionalTextSchema,
  validationCommands: optionalTextSchema,
  additionalNotes: optionalTextSchema,
  projectId: idSchema.nullable().optional(),
  harnessTemplateId: idSchema.nullable().optional(),
  projectContextProfileId: idSchema.nullable().optional(),
  includeProjectContextProfile: z.boolean().optional(),
})
export const promptCompilerAnalyzeInputSchema = promptCompilerBaseInputSchema.superRefine(
  validatePromptCompilerProjectContext,
)
export const promptCompilerCompileInputSchema = promptCompilerBaseInputSchema
  .extend({
    scenario: scenarioSchema,
    targetAgent: targetAgentSchema,
    clarificationAnswers: z.array(clarificationAnswerSchema).optional(),
    assumptions: z.array(z.string().trim().min(1)).optional(),
  })
  .superRefine(validatePromptCompilerProjectContext)
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
export const reviewPromptQualityDraftInputSchema = promptQualityReviewSnapshotSchema.extend({
  reviewMode: promptQualityReviewModeSchema,
})
export const reviewPromptQualityWithLLMInputSchema = noPayloadSchema
export const reviewPromptQualityVersionInputSchema = z.object({
  promptVersionId: idSchema,
  reviewMode: promptQualityReviewModeSchema,
})
export const savePromptQualityReviewInputSchema = z.object({
  promptVersionId: idSchema,
  review: promptQualityReviewResultSchema,
})
export const listPromptQualityReviewsForVersionInputSchema = z.object({
  promptVersionId: idSchema,
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})
export const getLatestPromptQualityReviewInputSchema = z.object({ promptVersionId: idSchema })
export const getPromptQualityReviewInputSchema = z.object({ reviewId: idSchema })
export const applyPromptQualityScoreToVersionInputSchema = z.object({
  promptVersionId: idSchema,
  reviewId: idSchema,
  qualityScore: promptQualityScoreSchema,
})
export const applyPromptQualityScoreToVersionResultSchema = z.object({
  promptVersionId: idSchema,
  qualityScore: promptQualityScoreSchema,
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
  listHarnessTemplates: listHarnessTemplatesInputSchema,
  getHarnessTemplate: idPayloadSchema,
  updateHarnessTemplate: updateHarnessTemplatePayloadSchema,
  deleteHarnessTemplate: idPayloadSchema,
  duplicateHarnessTemplate: duplicateHarnessTemplateInputSchema,
  createProjectContextProfile: createProjectContextProfileInputSchema,
  listProjectContextProfiles: listProjectContextProfilesInputSchema,
  getProjectContextProfile: getProjectContextProfileInputSchema,
  getDefaultProjectContextProfile: listProjectContextProfilesInputSchema,
  updateProjectContextProfile: updateProjectContextProfilePayloadSchema,
  deleteProjectContextProfile: deleteProjectContextProfileInputSchema,
  duplicateProjectContextProfile: duplicateProjectContextProfileInputSchema,
  setDefaultProjectContextProfile: setDefaultProjectContextProfileInputSchema,
  buildProjectContextForCompiler: buildProjectContextForCompilerInputSchema,
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
  formatPromptForExport: formatPromptForExportInputSchema,
  savePromptToFile: savePromptToFileInputSchema,
  copyText: copyTextInputSchema,
  readText: noPayloadSchema,
  reviewPromptQualityDraft: reviewPromptQualityDraftInputSchema,
  reviewPromptQualityWithLLM: reviewPromptQualityWithLLMInputSchema,
  reviewPromptQualityVersion: reviewPromptQualityVersionInputSchema,
  savePromptQualityReview: savePromptQualityReviewInputSchema,
  listPromptQualityReviewsForVersion: listPromptQualityReviewsForVersionInputSchema,
  getLatestPromptQualityReview: getLatestPromptQualityReviewInputSchema,
  getPromptQualityReview: getPromptQualityReviewInputSchema,
  applyPromptQualityScoreToVersion: applyPromptQualityScoreToVersionInputSchema,
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
  duplicateHarnessTemplate: harnessTemplateSchema,
  createProjectContextProfile: projectContextProfileSchema,
  listProjectContextProfiles: z.array(projectContextProfileSchema),
  getProjectContextProfile: projectContextProfileSchema.nullable(),
  getDefaultProjectContextProfile: projectContextProfileSchema.nullable(),
  updateProjectContextProfile: projectContextProfileSchema,
  deleteProjectContextProfile: deleteResultSchema,
  duplicateProjectContextProfile: projectContextProfileSchema,
  setDefaultProjectContextProfile: projectContextProfileSchema,
  buildProjectContextForCompiler: projectContextCompilerBuildResultSchema,
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
  formatPromptForExport: exportPromptResultSchema,
  savePromptToFile: savePromptToFileResultSchema,
  copyText: copyTextResultSchema,
  readText: clipboardReadTextResultSchema,
  reviewPromptQualityDraft: promptQualityReviewResultSchema,
  reviewPromptQualityWithLLM: promptQualityLLMReviewResultSchema,
  reviewPromptQualityVersion: promptQualityReviewResultSchema,
  savePromptQualityReview: promptQualityReviewResultSchema,
  listPromptQualityReviewsForVersion: z.array(promptQualityReviewResultSchema),
  getLatestPromptQualityReview: promptQualityReviewResultSchema.nullable(),
  getPromptQualityReview: promptQualityReviewResultSchema.nullable(),
  applyPromptQualityScoreToVersion: applyPromptQualityScoreToVersionResultSchema,
} as const

export type ProjectContextProfile = z.infer<typeof projectContextProfileSchema>
export type CreateProjectInput = z.output<typeof createProjectInputSchema>
export type CreateProjectContextProfileInput = z.output<
  typeof createProjectContextProfileInputSchema
>
export type UpdateProjectContextProfileInput = z.output<
  typeof updateProjectContextProfileInputSchema
>
export type ListProjectContextProfilesInput = z.output<typeof listProjectContextProfilesInputSchema>
export type GetProjectContextProfileInput = z.output<typeof getProjectContextProfileInputSchema>
export type DeleteProjectContextProfileInput = z.output<
  typeof deleteProjectContextProfileInputSchema
>
export type DuplicateProjectContextProfileInput = z.output<
  typeof duplicateProjectContextProfileInputSchema
>
export type SetDefaultProjectContextProfileInput = z.output<
  typeof setDefaultProjectContextProfileInputSchema
>
export type BuildProjectContextForCompilerInput = z.output<
  typeof buildProjectContextForCompilerInputSchema
>
export type ProjectContextCompilerBuildResult = z.infer<
  typeof projectContextCompilerBuildResultSchema
>
export type DeleteResult = z.infer<typeof deleteResultSchema>
