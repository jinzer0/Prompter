import type { AppDatabase } from "./repositories/common.js"
import { createHarnessTemplateRepository } from "./repositories/harness-templates.js"
import { createProjectRepository } from "./repositories/projects.js"
import { createPromptRepository } from "./repositories/prompts.js"
import { createSettingsRepository } from "./repositories/settings.js"
import { createTagRepository } from "./repositories/tags.js"

export type PersistenceServices = ReturnType<typeof createPersistenceServices>

export function createPersistenceServices(db: AppDatabase) {
  const projects = createProjectRepository(db)
  const prompts = createPromptRepository(db)
  const tags = createTagRepository(db)
  const harnessTemplates = createHarnessTemplateRepository(db)
  const settings = createSettingsRepository(db)

  return {
    ...projects,
    ...prompts,
    ...tags,
    ...harnessTemplates,
    ...settings,
  }
}
