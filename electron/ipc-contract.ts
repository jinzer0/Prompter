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
export const PROMPT_DERIVATION_TYPES = ["duplicate", "derived"] as const
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
export const BACKUP_TYPES = [
  "full",
  "project",
  "prompt_assets",
  "prompt_templates",
  "harness_templates",
] as const
export const MAINTENANCE_SEVERITIES = ["low", "medium", "high"] as const
export const MAINTENANCE_CATEGORIES = [
  "duplicate_prompts",
  "duplicate_tags",
  "unused_tags",
  "empty_prompt_assets",
  "current_version_issues",
  "search_index_health",
  "prompt_template_issues",
  "harness_template_issues",
  "quality_review_findings",
] as const
export const MAINTENANCE_ACTION_TYPES = [
  "rebuild_search_index",
  "repair_current_versions",
  "merge_duplicate_tags",
  "delete_unused_tags",
  "delete_empty_prompt_assets",
] as const
export const MAINTENANCE_ACTION_STATUSES = [
  "succeeded",
  "stale",
  "failed",
  "confirmation_cancelled",
] as const
export const BACKUP_FILE_MAX_BYTES = 50 * 1024 * 1024
export const BACKUP_NAME_MAX_LENGTH = 200
export const BACKUP_LABEL_MAX_LENGTH = 1_000
export const BACKUP_BODY_MAX_LENGTH = 5 * 1024 * 1024
export const BACKUP_ROW_MAX_ITEMS = 10_000
export const BACKUP_PREVIEW_MAX_ITEMS = 1_000
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
  createPromptWithInitialVersion: "prompter:prompt-assets:create-with-initial-version",
  duplicateAsset: "prompter:prompt-assets:duplicate",
  createDerivedAsset: "prompter:prompt-assets:create-derived",
  getLineage: "prompter:prompt-assets:get-lineage",
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
  scanMaintenanceLibrary: "prompter:maintenance:scan-library",
  prepareMaintenanceAction: "prompter:maintenance:prepare-action",
  executeMaintenanceAction: "prompter:maintenance:execute-action",
  cancelMaintenanceActionSession: "prompter:maintenance:cancel-action-session",
  createHarnessTemplate: "prompter:harness-templates:create",
  listHarnessTemplates: "prompter:harness-templates:list",
  getHarnessTemplate: "prompter:harness-templates:get",
  updateHarnessTemplate: "prompter:harness-templates:update",
  deleteHarnessTemplate: "prompter:harness-templates:delete",
  duplicateHarnessTemplate: "prompter:harness-templates:duplicate",
  createPromptTemplate: "prompter:prompt-templates:create",
  listPromptTemplates: "prompter:prompt-templates:list",
  getPromptTemplate: "prompter:prompt-templates:get",
  updatePromptTemplate: "prompter:prompt-templates:update",
  duplicatePromptTemplate: "prompter:prompt-templates:duplicate",
  deletePromptTemplate: "prompter:prompt-templates:delete",
  createPromptTemplateFromVersion: "prompter:prompt-templates:create-from-version",
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
  exportFullBackup: "prompter:backup:export-full",
  exportProjectBackup: "prompter:backup:export-project",
  exportPromptAssetsBackup: "prompter:backup:export-prompt-assets",
  exportPromptTemplatesPack: "prompter:backup:export-prompt-templates",
  exportHarnessTemplatesPack: "prompter:backup:export-harness-templates",
  validateBackupFile: "prompter:backup:validate-file",
  importBackup: "prompter:backup:import",
  cancelImportSession: "prompter:backup:cancel-import-session",
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
export const promptDerivationTypeSchema = z.enum(PROMPT_DERIVATION_TYPES)
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
export const backupTypeSchema = z.enum(BACKUP_TYPES)
export const maintenanceSeveritySchema = z.enum(MAINTENANCE_SEVERITIES)
export const maintenanceCategorySchema = z.enum(MAINTENANCE_CATEGORIES)
export const maintenanceActionTypeSchema = z.enum(MAINTENANCE_ACTION_TYPES)
export const maintenanceActionStatusSchema = z.enum(MAINTENANCE_ACTION_STATUSES)

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

export const promptAssetSchema = z
  .object({
    id: idSchema,
    projectId: idSchema.nullable(),
    title: nameSchema,
    scenario: scenarioSchema,
    targetAgent: targetAgentSchema,
    currentVersionId: idSchema.nullable(),
    parentPromptId: idSchema.nullable(),
    parentPromptVersionId: idSchema.nullable(),
    derivationType: promptDerivationTypeSchema.nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()

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
export const promptAssetVersionResultSchema = z
  .object({
    asset: promptAssetSchema,
    version: promptVersionSchema,
  })
  .strict()
export const createPromptWithInitialVersionResultSchema = promptAssetVersionResultSchema
export const duplicatePromptAssetResultSchema = promptAssetVersionResultSchema
export const createDerivedPromptAssetResultSchema = promptAssetVersionResultSchema
export const promptLineageSummarySchema = z
  .object({
    promptAssetId: idSchema,
    promptVersionId: idSchema,
    title: nameSchema,
    versionNumber: z.number().int().positive(),
    derivationType: promptDerivationTypeSchema,
  })
  .strict()
export const promptLineageSchema = z
  .object({
    parent: promptLineageSummarySchema.nullable(),
    children: z.array(promptLineageSummarySchema),
  })
  .strict()
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
export const promptTemplateSchema = z
  .object({
    id: idSchema,
    name: nameSchema,
    description: nullableTextSchema,
    sourcePromptAssetId: idSchema.nullable(),
    sourcePromptVersionId: idSchema.nullable(),
    scenario: scenarioSchema,
    targetAgent: targetAgentSchema,
    templateBody: requiredPreservedTextSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
export const promptTemplateListResultSchema = z
  .object({
    templates: z.array(promptTemplateSchema),
    total: z.number().int().nonnegative(),
  })
  .strict()
export const deletePromptTemplateResultSchema = z
  .object({ id: idSchema, deleted: z.literal(true) })
  .strict()

export const maintenanceScanInputSchema = z
  .object({
    projectId: idSchema.optional(),
    includePromptDuplicates: z.boolean(),
    includeTagDuplicates: z.boolean(),
    includeUnusedTags: z.boolean(),
    includeCurrentVersionIssues: z.boolean(),
    includeEmptyAssets: z.boolean(),
    includeSearchIndexHealth: z.boolean(),
    includePromptTemplateIssues: z.boolean(),
    includeHarnessTemplateIssues: z.boolean(),
    includeQualityFindings: z.boolean(),
  })
  .strict()

export const maintenanceFindingSchema = z
  .object({
    id: idSchema,
    severity: maintenanceSeveritySchema,
    category: maintenanceCategorySchema,
    title: nameSchema,
    description: requiredTextSchema,
    affectedEntityType: nameSchema,
    affectedEntityIds: z.array(idSchema),
    suggestedActionType: maintenanceActionTypeSchema.optional(),
    safeAutoFixAvailable: z.boolean(),
  })
  .strict()

export const maintenanceActionPreviewSchema = z
  .object({
    actionType: maintenanceActionTypeSchema,
    title: nameSchema,
    description: requiredTextSchema,
    severity: maintenanceSeveritySchema,
    affectedEntityType: nameSchema,
    affectedEntityIds: z.array(idSchema),
    destructive: z.boolean(),
    relationshipChanging: z.boolean(),
    estimatedChangeCount: z.number().int().nonnegative(),
    backupRecommendation: requiredTextSchema.nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.destructive || value.relationshipChanging) && value.backupRecommendation === null) {
      ctx.addIssue({
        code: "custom",
        path: ["backupRecommendation"],
        message:
          "Backup recommendation is required for destructive or relationship-changing actions",
      })
    }
  })

const maintenanceCountSchema = z.number().int().nonnegative()
export const maintenanceScanSummarySchema = z
  .object({
    totalFindings: maintenanceCountSchema,
    severityCounts: z
      .object({
        low: maintenanceCountSchema,
        medium: maintenanceCountSchema,
        high: maintenanceCountSchema,
      })
      .strict(),
    categoryCounts: z
      .object({
        duplicate_prompts: maintenanceCountSchema,
        duplicate_tags: maintenanceCountSchema,
        unused_tags: maintenanceCountSchema,
        empty_prompt_assets: maintenanceCountSchema,
        current_version_issues: maintenanceCountSchema,
        search_index_health: maintenanceCountSchema,
        prompt_template_issues: maintenanceCountSchema,
        harness_template_issues: maintenanceCountSchema,
        quality_review_findings: maintenanceCountSchema,
      })
      .partial()
      .strict(),
    truncated: z.boolean(),
  })
  .strict()

export const maintenanceScanResultSchema = z
  .object({
    summary: maintenanceScanSummarySchema,
    findings: z.array(maintenanceFindingSchema),
    recommendedActions: z.array(maintenanceActionPreviewSchema),
  })
  .strict()

const mergeDuplicateTagsInputSchema = z
  .object({
    actionType: z.literal("merge_duplicate_tags"),
    canonicalTagId: idSchema,
    duplicateTagIds: z.array(idSchema).min(1),
  })
  .strict()
const deleteUnusedTagsInputSchema = z
  .object({
    actionType: z.literal("delete_unused_tags"),
    tagIds: z.array(idSchema).min(1),
  })
  .strict()
const repairCurrentVersionsInputSchema = z
  .object({
    actionType: z.literal("repair_current_versions"),
    promptAssetIds: z.array(idSchema).min(1),
  })
  .strict()
const deleteEmptyPromptAssetsInputSchema = z
  .object({
    actionType: z.literal("delete_empty_prompt_assets"),
    promptAssetIds: z.array(idSchema).min(1),
  })
  .strict()
const rebuildSearchIndexInputSchema = z
  .object({ actionType: z.literal("rebuild_search_index") })
  .strict()

export const prepareMaintenanceActionInputSchema = z
  .discriminatedUnion("actionType", [
    rebuildSearchIndexInputSchema,
    repairCurrentVersionsInputSchema,
    mergeDuplicateTagsInputSchema,
    deleteUnusedTagsInputSchema,
    deleteEmptyPromptAssetsInputSchema,
  ])
  .superRefine((value, ctx) => {
    if (
      value.actionType === "merge_duplicate_tags" &&
      value.duplicateTagIds.includes(value.canonicalTagId)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["duplicateTagIds"],
        message: "Canonical tag id must not appear in duplicate tag ids",
      })
    }
  })

export const preparedMaintenanceActionSchema = z
  .object({
    actionSessionId: idSchema,
    actionType: maintenanceActionTypeSchema,
    preview: maintenanceActionPreviewSchema,
    affectedDisplayNames: z.array(nameSchema),
    warnings: z.array(requiredTextSchema),
    requiresConfirmation: z.boolean(),
    expiresAt: timestampSchema,
  })
  .strict()
  .refine((value) => value.actionType === value.preview.actionType, {
    path: ["preview", "actionType"],
    message: "Prepared action type must match its preview",
  })

export const executeMaintenanceActionInputSchema = z
  .object({
    actionSessionId: idSchema,
    actionType: maintenanceActionTypeSchema,
  })
  .strict()

export const cancelMaintenanceActionSessionInputSchema = z
  .object({ actionSessionId: idSchema })
  .strict()

export const maintenanceActionResultSchema = z
  .object({
    actionSessionId: idSchema,
    actionType: maintenanceActionTypeSchema,
    status: maintenanceActionStatusSchema,
    changedCount: maintenanceCountSchema,
    skippedCount: maintenanceCountSchema,
    message: requiredTextSchema,
    warnings: z.array(requiredTextSchema),
  })
  .strict()

const backupNameSchema = z.string().trim().min(1).max(BACKUP_NAME_MAX_LENGTH)
const backupLabelSchema = z.string().trim().min(1).max(BACKUP_LABEL_MAX_LENGTH)
const backupBodySchema = z.string().max(BACKUP_BODY_MAX_LENGTH)
const nullableBackupBodySchema = backupBodySchema.nullable()
const backupRowArray = <TSchema extends z.ZodType>(schema: TSchema) =>
  z.array(schema).max(BACKUP_ROW_MAX_ITEMS)

function isJsonString(value: string): boolean {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

const backupJsonStringSchema = backupBodySchema.refine(isJsonString, "Expected a JSON string")
const nullableBackupJsonStringSchema = backupJsonStringSchema.nullable()

export const backupProjectSchema = z
  .object({
    id: idSchema,
    name: backupNameSchema,
    description: nullableBackupBodySchema,
    techStack: nullableBackupBodySchema,
    defaultAgent: targetAgentSchema.nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()

export const backupPromptAssetSchema = z
  .object({
    id: idSchema,
    projectId: idSchema.nullable(),
    title: backupNameSchema,
    scenario: scenarioSchema,
    targetAgent: targetAgentSchema,
    currentVersionId: idSchema.nullable(),
    parentPromptId: idSchema.nullable(),
    parentPromptVersionId: idSchema.nullable(),
    derivationType: promptDerivationTypeSchema.nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()

export const backupPromptVersionSchema = z
  .object({
    id: idSchema,
    promptAssetId: idSchema,
    versionNumber: z.number().int().positive(),
    originalInput: backupBodySchema,
    compiledPrompt: backupBodySchema,
    assumptions: nullableBackupBodySchema,
    questions: nullableBackupBodySchema,
    answers: nullableBackupBodySchema,
    acceptanceCriteria: nullableBackupBodySchema,
    validationCommands: nullableBackupBodySchema,
    qualityScore: promptQualityScoreSchema.nullable(),
    createdAt: timestampSchema,
  })
  .strict()

export const backupTagSchema = z
  .object({ id: idSchema, name: backupNameSchema, createdAt: timestampSchema })
  .strict()

export const backupPromptTagSchema = z.object({ promptAssetId: idSchema, tagId: idSchema }).strict()

export const backupHarnessTemplateSchema = z
  .object({
    id: idSchema,
    name: backupNameSchema,
    scenario: scenarioSchema,
    targetAgent: targetAgentSchema,
    templateBody: backupBodySchema,
    requiredFields: nullableBackupJsonStringSchema,
    clarificationPolicy: nullableBackupJsonStringSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()

export const backupProjectContextProfileSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    name: backupNameSchema,
    summary: nullableBackupBodySchema,
    techStack: nullableBackupBodySchema,
    architectureNotes: nullableBackupBodySchema,
    codingConventions: nullableBackupBodySchema,
    constraints: nullableBackupBodySchema,
    forbiddenActions: nullableBackupBodySchema,
    acceptanceDefaults: nullableBackupBodySchema,
    validationCommands: nullableBackupBodySchema,
    securityNotes: nullableBackupBodySchema,
    additionalContext: nullableBackupBodySchema,
    testingNotes: nullableBackupBodySchema,
    packageManager: nullableBackupBodySchema,
    defaultBranch: nullableBackupBodySchema,
    repoPath: nullableBackupBodySchema,
    isDefault: z.boolean(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()

export const backupPromptTemplateSchema = z
  .object({
    id: idSchema,
    name: backupNameSchema,
    description: nullableBackupBodySchema,
    sourcePromptAssetId: idSchema.nullable(),
    sourcePromptVersionId: idSchema.nullable(),
    scenario: scenarioSchema,
    targetAgent: targetAgentSchema,
    templateBody: backupBodySchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()

export const backupPromptQualityReviewSchema = z
  .object({
    id: idSchema,
    promptVersionId: idSchema,
    source: promptQualityReviewSourceSchema,
    reviewMode: promptQualityReviewModeSchema,
    overallScore: promptQualityScoreSchema,
    grade: promptQualityGradeSchema,
    dimensionScores: backupJsonStringSchema,
    strengths: backupJsonStringSchema,
    issues: backupJsonStringSchema,
    suggestions: backupJsonStringSchema,
    missingSections: backupJsonStringSchema,
    warnings: backupJsonStringSchema,
    recommendedClarifyingQuestions: backupJsonStringSchema,
    scoreExplanation: backupBodySchema,
    snapshot: backupJsonStringSchema,
    improvedPromptDraft: nullableBackupBodySchema,
    createdAt: timestampSchema,
  })
  .strict()

export const backupItemCountsSchema = z
  .object({
    projects: z.number().int().nonnegative().max(BACKUP_ROW_MAX_ITEMS),
    promptAssets: z.number().int().nonnegative().max(BACKUP_ROW_MAX_ITEMS),
    promptVersions: z.number().int().nonnegative().max(BACKUP_ROW_MAX_ITEMS),
    tags: z.number().int().nonnegative().max(BACKUP_ROW_MAX_ITEMS),
    promptTags: z.number().int().nonnegative().max(BACKUP_ROW_MAX_ITEMS),
    harnessTemplates: z.number().int().nonnegative().max(BACKUP_ROW_MAX_ITEMS),
    projectContextProfiles: z.number().int().nonnegative().max(BACKUP_ROW_MAX_ITEMS),
    promptTemplates: z.number().int().nonnegative().max(BACKUP_ROW_MAX_ITEMS),
    promptQualityReviews: z.number().int().nonnegative().max(BACKUP_ROW_MAX_ITEMS),
  })
  .strict()

export const backupMetadataSchema = z
  .object({
    itemCounts: backupItemCountsSchema,
    sourceSummary: backupLabelSchema,
    excludesSecrets: z.literal(true),
    excludesSecretStatus: z.literal(true),
    includesSettings: z.literal(false),
    plaintext: z.literal(true),
    schemaVersion: z.literal(1),
  })
  .strict()

export const fullBackupDataSchema = z
  .object({
    projects: backupRowArray(backupProjectSchema),
    promptAssets: backupRowArray(backupPromptAssetSchema),
    promptVersions: backupRowArray(backupPromptVersionSchema),
    tags: backupRowArray(backupTagSchema),
    promptTags: backupRowArray(backupPromptTagSchema),
    harnessTemplates: backupRowArray(backupHarnessTemplateSchema),
    projectContextProfiles: backupRowArray(backupProjectContextProfileSchema),
    promptTemplates: backupRowArray(backupPromptTemplateSchema),
    promptQualityReviews: backupRowArray(backupPromptQualityReviewSchema),
  })
  .strict()

export const projectBackupDataSchema = z
  .object({
    projects: z.array(backupProjectSchema).length(1),
    promptAssets: backupRowArray(backupPromptAssetSchema),
    promptVersions: backupRowArray(backupPromptVersionSchema),
    tags: backupRowArray(backupTagSchema),
    promptTags: backupRowArray(backupPromptTagSchema),
    projectContextProfiles: backupRowArray(backupProjectContextProfileSchema),
    promptTemplates: backupRowArray(backupPromptTemplateSchema),
    promptQualityReviews: backupRowArray(backupPromptQualityReviewSchema),
  })
  .strict()

export const promptAssetsBackupDataSchema = z
  .object({
    promptAssets: backupRowArray(backupPromptAssetSchema).min(1),
    promptVersions: backupRowArray(backupPromptVersionSchema),
    tags: backupRowArray(backupTagSchema),
    promptTags: backupRowArray(backupPromptTagSchema),
    promptQualityReviews: backupRowArray(backupPromptQualityReviewSchema),
  })
  .strict()

export const promptTemplatesBackupDataSchema = z
  .object({ promptTemplates: backupRowArray(backupPromptTemplateSchema).min(1) })
  .strict()

export const harnessTemplatesBackupDataSchema = z
  .object({ harnessTemplates: backupRowArray(backupHarnessTemplateSchema).min(1) })
  .strict()

export const backupDataSchema = z.union([
  fullBackupDataSchema,
  projectBackupDataSchema,
  promptAssetsBackupDataSchema,
  promptTemplatesBackupDataSchema,
  harnessTemplatesBackupDataSchema,
])

const backupEnvelopeShape = {
  schemaVersion: z.literal(1),
  appName: z.literal("Prompter"),
  exportedAt: timestampSchema,
  exportedByAppVersion: backupNameSchema.optional(),
  metadata: backupMetadataSchema,
} as const

export const backupEnvelopeSchema = z.discriminatedUnion("backupType", [
  z
    .object({
      ...backupEnvelopeShape,
      backupType: z.literal("full"),
      data: fullBackupDataSchema,
    })
    .strict(),
  z
    .object({
      ...backupEnvelopeShape,
      backupType: z.literal("project"),
      data: projectBackupDataSchema,
    })
    .strict(),
  z
    .object({
      ...backupEnvelopeShape,
      backupType: z.literal("prompt_assets"),
      data: promptAssetsBackupDataSchema,
    })
    .strict(),
  z
    .object({
      ...backupEnvelopeShape,
      backupType: z.literal("prompt_templates"),
      data: promptTemplatesBackupDataSchema,
    })
    .strict(),
  z
    .object({
      ...backupEnvelopeShape,
      backupType: z.literal("harness_templates"),
      data: harnessTemplatesBackupDataSchema,
    })
    .strict(),
])

export const backupWarningSchema = z
  .object({
    code: backupNameSchema,
    message: backupLabelSchema,
    entityType: backupNameSchema.optional(),
    sourceId: idSchema.optional(),
  })
  .strict()

export const backupConflictSchema = z
  .object({
    code: backupNameSchema,
    message: backupLabelSchema,
    resolution: backupLabelSchema,
    entityType: backupNameSchema.optional(),
    sourceId: idSchema.optional(),
  })
  .strict()

export const backupConsequenceSchema = z
  .object({
    code: backupNameSchema,
    message: backupLabelSchema,
    count: z.number().int().nonnegative().max(BACKUP_ROW_MAX_ITEMS),
  })
  .strict()

export const backupValidationPreviewSchema = z
  .object({
    importSessionId: idSchema,
    previewFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    previewRevision: z.number().int().positive(),
    backupType: backupTypeSchema,
    schemaVersion: z.literal(1),
    exportedAt: timestampSchema,
    itemCounts: backupItemCountsSchema,
    conflicts: z.array(backupConflictSchema).max(BACKUP_PREVIEW_MAX_ITEMS),
    warnings: z.array(backupWarningSchema).max(BACKUP_PREVIEW_MAX_ITEMS),
    consequences: z.array(backupConsequenceSchema).max(BACKUP_PREVIEW_MAX_ITEMS),
    requiresDestinationProject: z.boolean(),
    excludesSecrets: z.literal(true),
    excludesSecretStatus: z.literal(true),
    includesSettings: z.literal(false),
    plaintext: z.literal(true),
    expiresAt: timestampSchema,
  })
  .strict()

export const backupExportResultSchema = z
  .object({
    cancelled: z.boolean(),
    backupType: backupTypeSchema,
    itemCounts: backupItemCountsSchema,
    message: backupLabelSchema,
  })
  .strict()

export const backupValidationResultSchema = z.discriminatedUnion("cancelled", [
  z.object({ cancelled: z.literal(true) }).strict(),
  z.object({ cancelled: z.literal(false), preview: backupValidationPreviewSchema }).strict(),
])

export const backupImportResultSchema = z
  .object({
    backupType: backupTypeSchema,
    importedCounts: backupItemCountsSchema,
    createdProjectIds: backupRowArray(idSchema),
    createdPromptAssetIds: backupRowArray(idSchema),
    createdPromptTemplateIds: backupRowArray(idSchema),
    createdHarnessTemplateIds: backupRowArray(idSchema),
    warnings: z.array(backupWarningSchema).max(BACKUP_PREVIEW_MAX_ITEMS),
    searchIndexStatus: z.enum(["updated", "not_required"]),
    message: backupLabelSchema,
  })
  .strict()

export const cancelImportSessionResultSchema = z.object({ cancelled: z.literal(true) }).strict()
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
export const createPromptAssetInputSchema = z
  .object({
    projectId: idSchema.nullable().optional(),
    title: nameSchema,
    scenario: scenarioSchema,
    targetAgent: targetAgentSchema,
  })
  .strict()
export const updatePromptAssetInputSchema = createPromptAssetInputSchema
  .partial()
  .extend({ currentVersionId: idSchema.nullable().optional() })
  .strict()
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
const initialPromptVersionFieldsSchema = createPromptVersionInputSchema.omit({
  promptAssetId: true,
})
const optionalPromptTagsSchema = z.object({
  tagIds: z.array(idSchema).optional(),
  tagNames: z.array(nameSchema).optional(),
})
export const createPromptWithInitialVersionInputSchema = z
  .object({
    projectId: idSchema.nullable(),
    title: nameSchema,
    scenario: scenarioSchema,
    targetAgent: targetAgentSchema,
  })
  .extend(initialPromptVersionFieldsSchema.shape)
  .extend(optionalPromptTagsSchema.shape)
  .strict()
export const duplicatePromptAssetInputSchema = z
  .object({
    sourcePromptAssetId: idSchema,
    sourcePromptVersionId: idSchema.optional(),
    copyTags: z.boolean().default(true),
  })
  .strict()
export const createDerivedPromptAssetInputSchema = z
  .object({
    sourcePromptAssetId: idSchema,
    sourcePromptVersionId: idSchema,
    title: nameSchema,
  })
  .extend(initialPromptVersionFieldsSchema.shape)
  .extend(optionalPromptTagsSchema.shape)
  .strict()
export const getPromptLineageInputSchema = z.object({ promptAssetId: idSchema }).strict()
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
export const createPromptTemplateInputSchema = z
  .object({
    name: nameSchema,
    description: optionalTextSchema,
    scenario: scenarioSchema,
    targetAgent: targetAgentSchema,
    templateBody: requiredPreservedTextSchema,
  })
  .strict()
export const listPromptTemplatesInputSchema = z
  .object({
    query: z.string().trim().optional(),
    scenario: scenarioSchema.optional(),
    targetAgent: targetAgentSchema.optional(),
    limit: z.number().int().min(1).max(100).default(100),
  })
  .strict()
  .optional()
export const getPromptTemplateInputSchema = z.object({ id: idSchema }).strict()
export const duplicatePromptTemplateInputSchema = getPromptTemplateInputSchema
export const deletePromptTemplateInputSchema = getPromptTemplateInputSchema
export const updatePromptTemplateInputSchema = z
  .object({
    name: nameSchema.optional(),
    description: optionalTextSchema,
    scenario: scenarioSchema.optional(),
    targetAgent: targetAgentSchema.optional(),
    templateBody: requiredPreservedTextSchema.optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one prompt template field is required",
  )
export const updatePromptTemplatePayloadSchema = z
  .object({
    id: idSchema,
    input: updatePromptTemplateInputSchema,
  })
  .strict()
export const createPromptTemplateFromVersionInputSchema = z
  .object({
    sourcePromptAssetId: idSchema,
    sourcePromptVersionId: idSchema,
    name: nameSchema,
    description: optionalTextSchema,
    templateBody: requiredPreservedTextSchema,
  })
  .strict()
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

export const exportFullBackupInputSchema = z.object({}).strict()
export const exportProjectBackupInputSchema = z.object({ projectId: idSchema }).strict()
export const exportPromptAssetsBackupInputSchema = z
  .object({ promptAssetIds: z.array(idSchema).min(1).max(BACKUP_ROW_MAX_ITEMS) })
  .strict()
export const exportPromptTemplatesPackInputSchema = z
  .object({
    promptTemplateIds: z.array(idSchema).min(1).max(BACKUP_ROW_MAX_ITEMS).optional(),
    includeAll: z.literal(true).optional(),
  })
  .strict()
  .refine(
    (value) => (value.promptTemplateIds === undefined) !== (value.includeAll === undefined),
    "Choose promptTemplateIds or includeAll",
  )
export const exportHarnessTemplatesPackInputSchema = z
  .object({
    harnessTemplateIds: z.array(idSchema).min(1).max(BACKUP_ROW_MAX_ITEMS).optional(),
    includeAllUserTemplates: z.literal(true).optional(),
  })
  .strict()
  .refine(
    (value) =>
      (value.harnessTemplateIds === undefined) !== (value.includeAllUserTemplates === undefined),
    "Choose harnessTemplateIds or includeAllUserTemplates",
  )
export const validateBackupFileInputSchema = noPayloadSchema
export const backupImportStrategySchema = z.literal("safe_duplicate")
export const importBackupInputSchema = z
  .object({
    importSessionId: idSchema,
    previewFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    previewRevision: z.number().int().positive(),
    strategy: backupImportStrategySchema,
    destinationProjectId: idSchema.optional(),
  })
  .strict()
export const promptAssetsImportBackupInputSchema = importBackupInputSchema.extend({
  destinationProjectId: idSchema,
})
export const cancelImportSessionInputSchema = z.object({ importSessionId: idSchema }).strict()

export const payloadSchemas = {
  createProject: createProjectInputSchema,
  listProjects: noPayloadSchema,
  getProject: idPayloadSchema,
  updateProject: updateProjectPayloadSchema,
  deleteProject: idPayloadSchema,
  createPromptAsset: createPromptAssetInputSchema,
  createPromptWithInitialVersion: createPromptWithInitialVersionInputSchema,
  duplicateAsset: duplicatePromptAssetInputSchema,
  createDerivedAsset: createDerivedPromptAssetInputSchema,
  getLineage: getPromptLineageInputSchema,
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
  scanMaintenanceLibrary: maintenanceScanInputSchema,
  prepareMaintenanceAction: prepareMaintenanceActionInputSchema,
  executeMaintenanceAction: executeMaintenanceActionInputSchema,
  cancelMaintenanceActionSession: cancelMaintenanceActionSessionInputSchema,
  createHarnessTemplate: createHarnessTemplateInputSchema,
  listHarnessTemplates: listHarnessTemplatesInputSchema,
  getHarnessTemplate: idPayloadSchema,
  updateHarnessTemplate: updateHarnessTemplatePayloadSchema,
  deleteHarnessTemplate: idPayloadSchema,
  duplicateHarnessTemplate: duplicateHarnessTemplateInputSchema,
  createPromptTemplate: createPromptTemplateInputSchema,
  listPromptTemplates: listPromptTemplatesInputSchema,
  getPromptTemplate: getPromptTemplateInputSchema,
  updatePromptTemplate: updatePromptTemplatePayloadSchema,
  duplicatePromptTemplate: duplicatePromptTemplateInputSchema,
  deletePromptTemplate: deletePromptTemplateInputSchema,
  createPromptTemplateFromVersion: createPromptTemplateFromVersionInputSchema,
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
  exportFullBackup: exportFullBackupInputSchema,
  exportProjectBackup: exportProjectBackupInputSchema,
  exportPromptAssetsBackup: exportPromptAssetsBackupInputSchema,
  exportPromptTemplatesPack: exportPromptTemplatesPackInputSchema,
  exportHarnessTemplatesPack: exportHarnessTemplatesPackInputSchema,
  validateBackupFile: validateBackupFileInputSchema,
  importBackup: importBackupInputSchema,
  cancelImportSession: cancelImportSessionInputSchema,
} as const

export const responseSchemas = {
  createProject: projectSchema,
  listProjects: z.array(projectSchema),
  getProject: projectSchema.nullable(),
  updateProject: projectSchema,
  deleteProject: deleteResultSchema,
  createPromptAsset: promptAssetSchema,
  createPromptWithInitialVersion: createPromptWithInitialVersionResultSchema,
  duplicateAsset: duplicatePromptAssetResultSchema,
  createDerivedAsset: createDerivedPromptAssetResultSchema,
  getLineage: promptLineageSchema,
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
  scanMaintenanceLibrary: maintenanceScanResultSchema,
  prepareMaintenanceAction: preparedMaintenanceActionSchema,
  executeMaintenanceAction: maintenanceActionResultSchema,
  cancelMaintenanceActionSession: noPayloadSchema,
  createHarnessTemplate: harnessTemplateSchema,
  listHarnessTemplates: z.array(harnessTemplateSchema),
  getHarnessTemplate: harnessTemplateSchema.nullable(),
  updateHarnessTemplate: harnessTemplateSchema,
  deleteHarnessTemplate: deleteResultSchema,
  duplicateHarnessTemplate: harnessTemplateSchema,
  createPromptTemplate: promptTemplateSchema,
  listPromptTemplates: promptTemplateListResultSchema,
  getPromptTemplate: promptTemplateSchema,
  updatePromptTemplate: promptTemplateSchema,
  duplicatePromptTemplate: promptTemplateSchema,
  deletePromptTemplate: deletePromptTemplateResultSchema,
  createPromptTemplateFromVersion: promptTemplateSchema,
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
  exportFullBackup: backupExportResultSchema,
  exportProjectBackup: backupExportResultSchema,
  exportPromptAssetsBackup: backupExportResultSchema,
  exportPromptTemplatesPack: backupExportResultSchema,
  exportHarnessTemplatesPack: backupExportResultSchema,
  validateBackupFile: backupValidationResultSchema,
  importBackup: backupImportResultSchema,
  cancelImportSession: cancelImportSessionResultSchema,
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
