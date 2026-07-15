import type Database from "better-sqlite3"
import type {
  CreateDerivedPromptAssetInput,
  CreateProjectInput,
  CreatePromptTemplateFromVersionInput,
  CreatePromptWithInitialVersionInput,
  DuplicatePromptAssetInput,
  PromptAsset,
  PromptDerivationType,
  PromptVersion,
} from "../ipc-types.js"
import { createMaintenanceActionRepository } from "../maintenance/maintenance-action-repository.js"
import { createMaintenanceScanService } from "../maintenance/scan-service.js"
import {
  createPromptCompilerService,
  type PromptCompilerClientFactory,
  type PromptCompilerServiceConfig,
} from "../prompt-compiler/prompt-compiler-service.js"
import { createPromptQualityService } from "../prompt-quality/prompt-quality-service.js"
import {
  createUnavailableOpenAIKeyStore,
  type OpenAIKeyStore,
} from "../secrets/open-ai-key-store.js"
import {
  PersistenceNotFoundError,
  PromptTemplateSourceOverrideError,
  PromptVersionOwnershipError,
} from "./errors.js"
import type { AppDatabase } from "./repositories/common.js"
import { createHarnessTemplateRepository } from "./repositories/harness-templates.js"
import { createProjectContextProfileRepository } from "./repositories/project-context-profiles.js"
import { createProjectRepository } from "./repositories/projects.js"
import { createPromptQualityReviewRepository } from "./repositories/prompt-quality-reviews.js"
import { createPromptTemplateRepository } from "./repositories/prompt-templates.js"
import { createPromptRepository } from "./repositories/prompts.js"
import { createSearchRepository } from "./repositories/search.js"
import { createSettingsRepository } from "./repositories/settings.js"
import { createTagRepository } from "./repositories/tags.js"

type PromptLineageWrite = {
  readonly parentPromptId: string
  readonly parentPromptVersionId: string
  readonly derivationType: PromptDerivationType
}

type SourcePrompt = {
  readonly asset: PromptAsset
  readonly version: PromptVersion
}

type PromptTemplateFromVersionCommand = CreatePromptTemplateFromVersionInput & {
  readonly scenario?: never
  readonly targetAgent?: never
}

export type PersistenceServices = ReturnType<typeof createPersistenceServices>

export function createPersistenceServices(
  db: AppDatabase,
  sqlite: Database.Database,
  openAIKeyStore: OpenAIKeyStore = createUnavailableOpenAIKeyStore(),
  promptCompilerClientFactory?: PromptCompilerClientFactory,
) {
  const projects = createProjectRepository(db)
  const projectContextProfiles = createProjectContextProfileRepository(db)
  const {
    createInitialPromptVersion,
    createPromptAssetWithLineage,
    assertLineageIsAcyclic,
    ...prompts
  } = createPromptRepository(db)
  const { upsertPromptInSearchIndex, deletePromptFromSearchIndex, ...search } =
    createSearchRepository(sqlite)
  const { attachTagsToPrompt, ...tags } = createTagRepository(db)
  const promptTemplates = createPromptTemplateRepository(db)
  const harnessTemplates = createHarnessTemplateRepository(db)
  const settings = createSettingsRepository(db)
  const promptQualityReviews = createPromptQualityReviewRepository(db)
  const maintenanceActions = createMaintenanceActionRepository(sqlite)
  const maintenance = createMaintenanceScanService(sqlite)
  const promptQuality = createPromptQualityService({
    getPromptAsset: (id) => prompts.getPromptAsset(id),
    getPromptVersion: (id) => prompts.getPromptVersion(id),
    getOpenAIKeyForMainProcessOnly: openAIKeyStore.getOpenAIKeyForMainProcessOnly,
    reviews: promptQualityReviews,
  })
  const promptCompilerConfig: PromptCompilerServiceConfig =
    promptCompilerClientFactory === undefined
      ? {
          getDefaults: () => settings.getDefaults(),
          getOpenAIKeyForMainProcessOnly: openAIKeyStore.getOpenAIKeyForMainProcessOnly,
          getHarnessTemplate: (id) => harnessTemplates.getHarnessTemplate(id),
          getProjectContextProfileForCompiler: (input) =>
            projectContextProfiles.buildCompilerContext(input),
        }
      : {
          getDefaults: () => settings.getDefaults(),
          getOpenAIKeyForMainProcessOnly: openAIKeyStore.getOpenAIKeyForMainProcessOnly,
          getHarnessTemplate: (id) => harnessTemplates.getHarnessTemplate(id),
          getProjectContextProfileForCompiler: (input) =>
            projectContextProfiles.buildCompilerContext(input),
          createClient: promptCompilerClientFactory,
        }
  const promptCompiler = createPromptCompilerService(promptCompilerConfig)

  function resolveSourcePrompt(
    sourcePromptAssetId: string,
    sourcePromptVersionId: string | undefined,
  ): SourcePrompt {
    const asset = prompts.getPromptAsset(sourcePromptAssetId)
    if (asset === null) {
      throw new PersistenceNotFoundError("prompt asset", sourcePromptAssetId)
    }

    const version =
      sourcePromptVersionId === undefined
        ? prompts.getCurrentPromptVersion(sourcePromptAssetId)
        : prompts.getPromptVersion(sourcePromptVersionId)
    if (version === null) {
      throw new PersistenceNotFoundError(
        "prompt version",
        sourcePromptVersionId ?? sourcePromptAssetId,
      )
    }
    if (version.promptAssetId !== asset.id) {
      throw new PromptVersionOwnershipError(asset.id, version.id)
    }

    return { asset, version }
  }

  function createAtomicPrompt(
    input: CreatePromptWithInitialVersionInput,
    lineage?: PromptLineageWrite,
  ) {
    return db.transaction(() => {
      const asset = createPromptAssetWithLineage({ ...input, ...lineage })
      const version = createInitialPromptVersion({
        promptAssetId: asset.id,
        originalInput: input.originalInput,
        compiledPrompt: input.compiledPrompt,
        assumptions: input.assumptions,
        questions: input.questions,
        answers: input.answers,
        acceptanceCriteria: input.acceptanceCriteria,
        validationCommands: input.validationCommands,
        qualityScore: input.qualityScore,
      })
      const currentAsset = prompts.setCurrentPromptVersion(asset.id, version.id)

      attachTagsToPrompt({
        promptAssetId: currentAsset.id,
        tagIds: input.tagIds ?? [],
        tagNames: input.tagNames ?? [],
      })
      upsertPromptInSearchIndex(currentAsset, version)

      return { asset: currentAsset, version }
    })
  }

  return {
    ...projects,
    createProject(input: CreateProjectInput) {
      return db.transaction(() => {
        const project = projects.createProject(input)

        projectContextProfiles.createProjectContextProfile({
          projectId: project.id,
          name: "Default Context",
          summary: project.description,
          techStack: project.techStack,
          isDefault: true,
        })

        return project
      })
    },
    ...projectContextProfiles,
    ...prompts,
    createPromptWithInitialVersion(input: CreatePromptWithInitialVersionInput) {
      return createAtomicPrompt(input)
    },
    duplicatePromptAsset(input: DuplicatePromptAssetInput) {
      const source = resolveSourcePrompt(input.sourcePromptAssetId, input.sourcePromptVersionId)
      assertLineageIsAcyclic(source.asset.id)
      const sourceTagIds = input.copyTags
        ? tags.listTagsForPrompt(source.asset.id).map((tag) => tag.id)
        : []

      return createAtomicPrompt(
        {
          projectId: source.asset.projectId,
          title: `Copy of ${source.asset.title}`,
          scenario: source.asset.scenario,
          targetAgent: source.asset.targetAgent,
          originalInput: source.version.originalInput,
          compiledPrompt: source.version.compiledPrompt,
          assumptions: source.version.assumptions,
          questions: source.version.questions,
          answers: source.version.answers,
          acceptanceCriteria: source.version.acceptanceCriteria,
          validationCommands: source.version.validationCommands,
          qualityScore: null,
          tagIds: sourceTagIds,
        },
        {
          parentPromptId: source.asset.id,
          parentPromptVersionId: source.version.id,
          derivationType: "duplicate",
        },
      )
    },
    createDerivedPromptAsset(input: CreateDerivedPromptAssetInput) {
      const source = resolveSourcePrompt(input.sourcePromptAssetId, input.sourcePromptVersionId)
      assertLineageIsAcyclic(source.asset.id)

      return createAtomicPrompt(
        {
          projectId: source.asset.projectId,
          title: input.title,
          scenario: source.asset.scenario,
          targetAgent: source.asset.targetAgent,
          originalInput: input.originalInput,
          compiledPrompt: input.compiledPrompt,
          assumptions: input.assumptions,
          questions: input.questions,
          answers: input.answers,
          acceptanceCriteria: input.acceptanceCriteria,
          validationCommands: input.validationCommands,
          qualityScore: input.qualityScore,
          tagIds: input.tagIds,
          tagNames: input.tagNames,
        },
        {
          parentPromptId: source.asset.id,
          parentPromptVersionId: source.version.id,
          derivationType: "derived",
        },
      )
    },
    deletePromptAsset(id: string) {
      return db.transaction(() => {
        deletePromptFromSearchIndex(id)
        return prompts.deletePromptAsset(id)
      })
    },
    ...search,
    ...tags,
    ...promptTemplates,
    createPromptTemplateFromVersion(input: PromptTemplateFromVersionCommand) {
      if (Object.hasOwn(input, "scenario") || Object.hasOwn(input, "targetAgent")) {
        throw new PromptTemplateSourceOverrideError()
      }

      return promptTemplates.createPromptTemplateFromVersion(input)
    },
    ...harnessTemplates,
    ...settings,
    ...openAIKeyStore,
    ...maintenanceActions,
    ...maintenance,
    ...promptCompiler,
    ...promptQuality,
  }
}
