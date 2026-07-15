import { createPersistenceIpcHandlers } from "../electron/ipc-handlers"
import type { MaintenanceScanInput } from "../electron/ipc-types"
import type {
  MaintenanceActionConfirmationDecision,
  MaintenanceActionConfirmationRequest,
} from "../electron/maintenance/maintenance-action-service"
import { createMaintenanceServices } from "../electron/maintenance/maintenance-services"
import { createFailingServices } from "./electron-contract-service-fixture"
import type { TestDatabase } from "./electron-search-test-helpers"

export const wholeLibraryMaintenanceInput = {
  includePromptDuplicates: true,
  includeTagDuplicates: true,
  includeUnusedTags: true,
  includeCurrentVersionIssues: true,
  includeEmptyAssets: true,
  includeSearchIndexHealth: true,
  includePromptTemplateIssues: true,
  includeHarnessTemplateIssues: true,
  includeQualityFindings: true,
} satisfies MaintenanceScanInput

export function createMaintenanceIntegrationHandlers(
  database: TestDatabase,
  confirmAction: (
    request: MaintenanceActionConfirmationRequest,
  ) => Promise<MaintenanceActionConfirmationDecision>,
) {
  return createPersistenceIpcHandlers({
    ...createFailingServices(() => {
      throw new TypeError("Unexpected integration service call")
    }),
    ...database.services,
    ...createMaintenanceServices({ sqlite: database.sqlite, confirmAction }),
  })
}

export function seedMaintenanceIntegrationScan(database: TestDatabase) {
  const project = database.services.createProject({ name: "Maintenance integration" })
  const otherProject = database.services.createProject({ name: "Maintenance foreign project" })
  const duplicatePrompt = database.services.createPromptWithInitialVersion({
    projectId: project.id,
    title: "Shared integration prompt",
    scenario: "feature",
    targetAgent: "codex",
    originalInput: "shared integration input",
    compiledPrompt: "shared integration output",
  })
  database.services.createPromptWithInitialVersion({
    projectId: project.id,
    title: "shared-integration-prompt",
    scenario: "feature",
    targetAgent: "codex",
    originalInput: "project duplicate input",
    compiledPrompt: "project duplicate output",
  })
  const foreignPrompt = database.services.createPromptWithInitialVersion({
    projectId: otherProject.id,
    title: "Shared integration prompt",
    scenario: "docs",
    targetAgent: "cursor",
    originalInput: "foreign duplicate input",
    compiledPrompt: "foreign duplicate output",
  })
  const brokenPrompt = database.services.createPromptWithInitialVersion({
    projectId: project.id,
    title: "Broken integration pointer",
    scenario: "bugfix",
    targetAgent: "codex",
    originalInput: "repair input",
    compiledPrompt: "repair output",
  })
  database.sqlite
    .prepare("UPDATE prompt_assets SET current_version_id = NULL WHERE id = ?")
    .run(brokenPrompt.asset.id)
  database.sqlite
    .prepare("DELETE FROM prompt_search_fts WHERE prompt_asset_id = ?")
    .run(duplicatePrompt.asset.id)

  const canonicalTag = database.services.createTag({ name: "build tools" })
  const duplicateTag = database.services.createTag({ name: "Build-Tools" })
  database.services.attachTagToPrompt(duplicatePrompt.asset.id, duplicateTag.id)
  database.services.createTag({ name: "integration unused" })

  const eligibleEmpty = database.services.createPromptAsset({
    projectId: project.id,
    title: "Eligible empty integration asset",
    scenario: "feature",
    targetAgent: "codex",
  })
  const protectedEmpty = database.services.createPromptAsset({
    projectId: project.id,
    title: "Protected empty integration asset",
    scenario: "feature",
    targetAgent: "codex",
  })
  const protectedTemplate = database.services.createPromptTemplate({
    name: "Review Guide",
    description: null,
    scenario: "code_review",
    targetAgent: "codex",
    templateBody: "",
  })
  database.sqlite
    .prepare("UPDATE prompt_templates SET source_prompt_asset_id = ? WHERE id = ?")
    .run(protectedEmpty.id, protectedTemplate.id)
  database.services.createPromptTemplate({
    name: "review-guide",
    description: null,
    scenario: "code_review",
    targetAgent: "codex",
    templateBody: "body",
  })
  database.services.createHarnessTemplate({
    name: "Agent Harness",
    scenario: "feature",
    targetAgent: "codex",
    templateBody: "",
    requiredFields: "{}",
    clarificationPolicy: "[]",
  })
  database.services.createHarnessTemplate({
    name: "agent-harness",
    scenario: "feature",
    targetAgent: "codex",
    templateBody: "body",
    requiredFields: '["objective"]',
    clarificationPolicy: '{"mode":"ask"}',
  })
  const qualityPrompt = database.services.createPromptWithInitialVersion({
    projectId: project.id,
    title: "Quality integration prompt",
    scenario: "code_review",
    targetAgent: "codex",
    originalInput: "review this prompt",
    compiledPrompt: "reviewed output",
    qualityScore: null,
  })
  database.services.savePromptQualityReview({
    promptVersionId: qualityPrompt.version.id,
    review: database.services.reviewPromptQualityVersion(qualityPrompt.version.id),
  })

  return { canonicalTag, duplicateTag, eligibleEmpty, foreignPrompt, project, protectedEmpty }
}
