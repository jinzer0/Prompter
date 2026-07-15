import { asc, eq, inArray } from "drizzle-orm"
import { DEFAULT_HARNESS_TEMPLATE_IDS } from "../db/default-harness-templates.js"
import type { AppDatabase } from "../db/repositories/common.js"
import {
  harnessTemplates,
  projectContextProfiles,
  projects,
  promptAssets,
  promptQualityReviews,
  promptTags,
  promptTemplates,
  promptVersions,
  tags,
} from "../db/schema.js"
import type {
  BackupProject,
  BackupPromptAsset,
  BackupPromptQualityReview,
  BackupPromptTag,
  BackupPromptVersion,
  BackupTag,
} from "../ipc-types.js"

const projectColumns = {
  id: projects.id,
  name: projects.name,
  description: projects.description,
  techStack: projects.techStack,
  defaultAgent: projects.defaultAgent,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
}
const promptAssetColumns = {
  id: promptAssets.id,
  projectId: promptAssets.projectId,
  title: promptAssets.title,
  scenario: promptAssets.scenario,
  targetAgent: promptAssets.targetAgent,
  currentVersionId: promptAssets.currentVersionId,
  parentPromptId: promptAssets.parentPromptId,
  parentPromptVersionId: promptAssets.parentPromptVersionId,
  derivationType: promptAssets.derivationType,
  createdAt: promptAssets.createdAt,
  updatedAt: promptAssets.updatedAt,
}
const promptVersionColumns = {
  id: promptVersions.id,
  promptAssetId: promptVersions.promptAssetId,
  versionNumber: promptVersions.versionNumber,
  originalInput: promptVersions.originalInput,
  compiledPrompt: promptVersions.compiledPrompt,
  assumptions: promptVersions.assumptions,
  questions: promptVersions.questions,
  answers: promptVersions.answers,
  acceptanceCriteria: promptVersions.acceptanceCriteria,
  validationCommands: promptVersions.validationCommands,
  qualityScore: promptVersions.qualityScore,
  createdAt: promptVersions.createdAt,
}
const tagColumns = { id: tags.id, name: tags.name, createdAt: tags.createdAt }
const promptTagColumns = { promptAssetId: promptTags.promptAssetId, tagId: promptTags.tagId }
const harnessTemplateColumns = {
  id: harnessTemplates.id,
  name: harnessTemplates.name,
  scenario: harnessTemplates.scenario,
  targetAgent: harnessTemplates.targetAgent,
  templateBody: harnessTemplates.templateBody,
  requiredFields: harnessTemplates.requiredFields,
  clarificationPolicy: harnessTemplates.clarificationPolicy,
  createdAt: harnessTemplates.createdAt,
  updatedAt: harnessTemplates.updatedAt,
}
const profileColumns = {
  id: projectContextProfiles.id,
  projectId: projectContextProfiles.projectId,
  name: projectContextProfiles.name,
  summary: projectContextProfiles.summary,
  techStack: projectContextProfiles.techStack,
  architectureNotes: projectContextProfiles.architectureNotes,
  codingConventions: projectContextProfiles.codingConventions,
  constraints: projectContextProfiles.constraints,
  forbiddenActions: projectContextProfiles.forbiddenActions,
  acceptanceDefaults: projectContextProfiles.acceptanceDefaults,
  validationCommands: projectContextProfiles.validationCommands,
  securityNotes: projectContextProfiles.securityNotes,
  additionalContext: projectContextProfiles.additionalContext,
  testingNotes: projectContextProfiles.testingNotes,
  packageManager: projectContextProfiles.packageManager,
  defaultBranch: projectContextProfiles.defaultBranch,
  repoPath: projectContextProfiles.repoPath,
  isDefault: projectContextProfiles.isDefault,
  createdAt: projectContextProfiles.createdAt,
  updatedAt: projectContextProfiles.updatedAt,
}
const promptTemplateColumns = {
  id: promptTemplates.id,
  name: promptTemplates.name,
  description: promptTemplates.description,
  sourcePromptAssetId: promptTemplates.sourcePromptAssetId,
  sourcePromptVersionId: promptTemplates.sourcePromptVersionId,
  scenario: promptTemplates.scenario,
  targetAgent: promptTemplates.targetAgent,
  templateBody: promptTemplates.templateBody,
  createdAt: promptTemplates.createdAt,
  updatedAt: promptTemplates.updatedAt,
}
const reviewColumns = {
  id: promptQualityReviews.id,
  promptVersionId: promptQualityReviews.promptVersionId,
  source: promptQualityReviews.source,
  reviewMode: promptQualityReviews.reviewMode,
  overallScore: promptQualityReviews.overallScore,
  grade: promptQualityReviews.grade,
  dimensionScores: promptQualityReviews.dimensionScores,
  strengths: promptQualityReviews.strengths,
  issues: promptQualityReviews.issues,
  suggestions: promptQualityReviews.suggestions,
  missingSections: promptQualityReviews.missingSections,
  warnings: promptQualityReviews.warnings,
  recommendedClarifyingQuestions: promptQualityReviews.recommendedClarifyingQuestions,
  scoreExplanation: promptQualityReviews.scoreExplanation,
  snapshot: promptQualityReviews.snapshot,
  improvedPromptDraft: promptQualityReviews.improvedPromptDraft,
  createdAt: promptQualityReviews.createdAt,
}

export type SelectedPromptData = {
  readonly promptAssets: BackupPromptAsset[]
  readonly promptVersions: BackupPromptVersion[]
  readonly tags: BackupTag[]
  readonly promptTags: BackupPromptTag[]
  readonly promptQualityReviews: BackupPromptQualityReview[]
}

function selectedPromptData(db: AppDatabase, assetIds: readonly string[]): SelectedPromptData {
  const selectedAssets = db
    .select(promptAssetColumns)
    .from(promptAssets)
    .where(inArray(promptAssets.id, assetIds))
    .orderBy(asc(promptAssets.id))
    .all()
  const selectedVersions =
    selectedAssets.length === 0
      ? []
      : db
          .select(promptVersionColumns)
          .from(promptVersions)
          .where(
            inArray(
              promptVersions.promptAssetId,
              selectedAssets.map((asset) => asset.id),
            ),
          )
          .orderBy(asc(promptVersions.id))
          .all()
  const selectedLinks =
    selectedAssets.length === 0
      ? []
      : db
          .select(promptTagColumns)
          .from(promptTags)
          .where(
            inArray(
              promptTags.promptAssetId,
              selectedAssets.map((asset) => asset.id),
            ),
          )
          .orderBy(asc(promptTags.promptAssetId), asc(promptTags.tagId))
          .all()
  const selectedTags =
    selectedLinks.length === 0
      ? []
      : db
          .select(tagColumns)
          .from(tags)
          .where(
            inArray(
              tags.id,
              selectedLinks.map((link) => link.tagId),
            ),
          )
          .orderBy(asc(tags.id))
          .all()
  const selectedReviews =
    selectedVersions.length === 0
      ? []
      : db
          .select(reviewColumns)
          .from(promptQualityReviews)
          .where(
            inArray(
              promptQualityReviews.promptVersionId,
              selectedVersions.map((version) => version.id),
            ),
          )
          .orderBy(asc(promptQualityReviews.id))
          .all()

  return {
    promptAssets: selectedAssets,
    promptVersions: selectedVersions,
    tags: selectedTags,
    promptTags: selectedLinks,
    promptQualityReviews: selectedReviews,
  }
}

export function collectFullBackupData(db: AppDatabase) {
  return {
    projects: db.select(projectColumns).from(projects).orderBy(asc(projects.id)).all(),
    promptAssets: db
      .select(promptAssetColumns)
      .from(promptAssets)
      .orderBy(asc(promptAssets.id))
      .all(),
    promptVersions: db
      .select(promptVersionColumns)
      .from(promptVersions)
      .orderBy(asc(promptVersions.id))
      .all(),
    tags: db.select(tagColumns).from(tags).orderBy(asc(tags.id)).all(),
    promptTags: db
      .select(promptTagColumns)
      .from(promptTags)
      .orderBy(asc(promptTags.promptAssetId), asc(promptTags.tagId))
      .all(),
    harnessTemplates: db
      .select(harnessTemplateColumns)
      .from(harnessTemplates)
      .orderBy(asc(harnessTemplates.id))
      .all(),
    projectContextProfiles: db
      .select(profileColumns)
      .from(projectContextProfiles)
      .orderBy(asc(projectContextProfiles.id))
      .all(),
    promptTemplates: db
      .select(promptTemplateColumns)
      .from(promptTemplates)
      .orderBy(asc(promptTemplates.id))
      .all(),
    promptQualityReviews: db
      .select(reviewColumns)
      .from(promptQualityReviews)
      .orderBy(asc(promptQualityReviews.id))
      .all(),
  }
}

export function collectProjectBackupData(db: AppDatabase, projectId: string) {
  const projectRows = db
    .select(projectColumns)
    .from(projects)
    .where(eq(projects.id, projectId))
    .all()
  const prompts = selectedPromptData(
    db,
    db
      .select({ id: promptAssets.id })
      .from(promptAssets)
      .where(eq(promptAssets.projectId, projectId))
      .orderBy(asc(promptAssets.id))
      .all()
      .map((asset) => asset.id),
  )
  const versions = new Set(prompts.promptVersions.map((version) => version.id))
  const templates = db
    .select(promptTemplateColumns)
    .from(promptTemplates)
    .orderBy(asc(promptTemplates.id))
    .all()
    .filter(
      (template) =>
        (template.sourcePromptAssetId !== null &&
          prompts.promptAssets.some((asset) => asset.id === template.sourcePromptAssetId)) ||
        (template.sourcePromptVersionId !== null && versions.has(template.sourcePromptVersionId)),
    )

  return {
    projects: projectRows,
    ...prompts,
    projectContextProfiles: db
      .select(profileColumns)
      .from(projectContextProfiles)
      .where(eq(projectContextProfiles.projectId, projectId))
      .orderBy(asc(projectContextProfiles.id))
      .all(),
    promptTemplates: templates,
  }
}

export function collectPromptAssetsBackupData(db: AppDatabase, assetIds: readonly string[]) {
  return selectedPromptData(db, assetIds)
}

export function collectPromptTemplatesBackupData(db: AppDatabase, templateIds?: readonly string[]) {
  const query = db
    .select(promptTemplateColumns)
    .from(promptTemplates)
    .orderBy(asc(promptTemplates.id))
  return {
    promptTemplates:
      templateIds === undefined
        ? query.all()
        : db
            .select(promptTemplateColumns)
            .from(promptTemplates)
            .where(inArray(promptTemplates.id, templateIds))
            .orderBy(asc(promptTemplates.id))
            .all(),
  }
}

export function collectHarnessTemplatesBackupData(
  db: AppDatabase,
  templateIds?: readonly string[],
) {
  const defaultIds = new Set<string>(Object.values(DEFAULT_HARNESS_TEMPLATE_IDS))
  const query = db
    .select(harnessTemplateColumns)
    .from(harnessTemplates)
    .orderBy(asc(harnessTemplates.id))
  return {
    harnessTemplates:
      templateIds === undefined
        ? query.all().filter((template) => !defaultIds.has(template.id))
        : db
            .select(harnessTemplateColumns)
            .from(harnessTemplates)
            .where(inArray(harnessTemplates.id, templateIds))
            .orderBy(asc(harnessTemplates.id))
            .all(),
  }
}

export function selectedProjectExists(data: {
  readonly projects: readonly BackupProject[]
}): boolean {
  return data.projects.length === 1
}
