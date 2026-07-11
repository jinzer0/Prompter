import type Database from "better-sqlite3"
import type { CreateProjectInput } from "../ipc-contract.js"
import {
  createPromptCompilerService,
  type PromptCompilerClientFactory,
  type PromptCompilerServiceConfig,
} from "../prompt-compiler/prompt-compiler-service.js"
import {
  createUnavailableOpenAIKeyStore,
  type OpenAIKeyStore,
} from "../secrets/open-ai-key-store.js"
import type { AppDatabase } from "./repositories/common.js"
import { createHarnessTemplateRepository } from "./repositories/harness-templates.js"
import { createProjectContextProfileRepository } from "./repositories/project-context-profiles.js"
import { createProjectRepository } from "./repositories/projects.js"
import { createPromptRepository } from "./repositories/prompts.js"
import { createSearchRepository } from "./repositories/search.js"
import { createSettingsRepository } from "./repositories/settings.js"
import { createTagRepository } from "./repositories/tags.js"

export type PersistenceServices = ReturnType<typeof createPersistenceServices>

export function createPersistenceServices(
  db: AppDatabase,
  sqlite: Database.Database,
  openAIKeyStore: OpenAIKeyStore = createUnavailableOpenAIKeyStore(),
  promptCompilerClientFactory?: PromptCompilerClientFactory,
) {
  const projects = createProjectRepository(db)
  const projectContextProfiles = createProjectContextProfileRepository(db)
  const prompts = createPromptRepository(db)
  const search = createSearchRepository(sqlite)
  const tags = createTagRepository(db)
  const harnessTemplates = createHarnessTemplateRepository(db)
  const settings = createSettingsRepository(db)
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
    ...search,
    ...tags,
    ...harnessTemplates,
    ...settings,
    ...openAIKeyStore,
    ...promptCompiler,
  }
}
