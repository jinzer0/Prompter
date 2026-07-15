import { ipcMain } from "electron"

import type { PersistenceServices } from "./db/services.js"
import {
  PERSISTENCE_CHANNELS,
  PING_CHANNEL,
  PING_RESPONSE,
  payloadSchemas,
  responseSchemas,
} from "./ipc-contract.js"
import type {
  CancelImportSessionInput,
  ExportFullBackupInput,
  ExportHarnessTemplatesPackInput,
  ExportProjectBackupInput,
  ExportPromptAssetsBackupInput,
  ExportPromptTemplatesPackInput,
  HarnessTemplate,
  ImportBackupInput,
  ListHarnessTemplatesInput,
  PromptSearchResultItem,
  SearchPromptsResponse,
} from "./ipc-types.js"
import type { MaintenanceServices } from "./maintenance/maintenance-services.js"
import type { PromptExportNativeService } from "./prompt-export-native.js"

// allow: SIZE_OK - central IPC handler registry mirrors the typed channel contract.

type HarnessTemplateContractServices = {
  readonly listHarnessTemplates: (filter?: ListHarnessTemplatesInput) => readonly HarnessTemplate[]
  readonly duplicateHarnessTemplate?: (id: string) => HarnessTemplate
}
type BackupContractServices = {
  readonly exportFullBackup: (input: ExportFullBackupInput) => Promise<unknown>
  readonly exportProjectBackup: (input: ExportProjectBackupInput) => Promise<unknown>
  readonly exportPromptAssetsBackup: (input: ExportPromptAssetsBackupInput) => Promise<unknown>
  readonly exportPromptTemplatesPack: (input: ExportPromptTemplatesPackInput) => Promise<unknown>
  readonly exportHarnessTemplatesPack: (input: ExportHarnessTemplatesPackInput) => Promise<unknown>
  readonly validateBackupFile: () => Promise<unknown>
  readonly importBackup: (input: ImportBackupInput) => Promise<unknown>
  readonly cancelImportSession: (input: CancelImportSessionInput) => Promise<unknown>
}
type IpcServices = Omit<
  PersistenceServices,
  | "listHarnessTemplates"
  | "duplicateHarnessTemplate"
  | "seedDefaultHarnessTemplates"
  | "analyze"
  | "compile"
  | "scanLibrary"
  | "mergeDuplicateTags"
  | "deleteUnusedTags"
  | "repairCurrentVersions"
  | "deleteEmptyPromptAssets"
  | "rebuildMaintenanceSearchIndex"
> &
  HarnessTemplateContractServices &
  MaintenanceServices &
  PromptExportNativeService &
  BackupContractServices

function textPreview(value: string): string {
  const firstLine =
    value
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("#")) ?? value.trim()

  return firstLine.length > 140 ? `${firstLine.slice(0, 140).trimEnd()}...` : firstLine
}

function searchResultItem(
  hit: ReturnType<PersistenceServices["searchPrompts"]>[number],
): PromptSearchResultItem {
  return {
    promptAssetId: hit.promptAsset.id,
    currentVersionId: hit.currentVersion.id,
    title: hit.promptAsset.title,
    scenario: hit.promptAsset.scenario,
    targetAgent: hit.promptAsset.targetAgent,
    projectId: hit.promptAsset.projectId,
    projectName: hit.projectName,
    versionNumber: hit.currentVersion.versionNumber,
    compiledPromptPreview: textPreview(hit.currentVersion.compiledPrompt),
    originalInputPreview: textPreview(hit.currentVersion.originalInput),
    matchedTextPreview: hit.preview,
    qualityScore: hit.currentVersion.qualityScore,
    tags: [...hit.tags],
    createdAt: hit.promptAsset.createdAt,
    updatedAt: hit.promptAsset.updatedAt,
  }
}

function searchResult(
  hits: ReturnType<PersistenceServices["searchPrompts"]>,
): SearchPromptsResponse {
  const items = hits.map(searchResultItem)

  return { items, total: hits.length }
}

export function createPersistenceIpcHandlers(services: IpcServices) {
  return {
    createProject: (payload: unknown) =>
      services.createProject(payloadSchemas.createProject.parse(payload)),
    listProjects: (payload: unknown) => {
      payloadSchemas.listProjects.parse(payload)
      return services.listProjects()
    },
    getProject: (payload: unknown) =>
      services.getProject(payloadSchemas.getProject.parse(payload).id),
    updateProject: (payload: unknown) => {
      const parsed = payloadSchemas.updateProject.parse(payload)
      return services.updateProject(parsed.id, parsed.input)
    },
    deleteProject: (payload: unknown) =>
      services.deleteProject(payloadSchemas.deleteProject.parse(payload).id),
    createPromptAsset: (payload: unknown) =>
      services.createPromptAsset(payloadSchemas.createPromptAsset.parse(payload)),
    createPromptWithInitialVersion: (payload: unknown) =>
      responseSchemas.createPromptWithInitialVersion.parse(
        services.createPromptWithInitialVersion(
          payloadSchemas.createPromptWithInitialVersion.parse(payload),
        ),
      ),
    duplicateAsset: (payload: unknown) =>
      responseSchemas.duplicateAsset.parse(
        services.duplicatePromptAsset(payloadSchemas.duplicateAsset.parse(payload)),
      ),
    createDerivedAsset: (payload: unknown) =>
      responseSchemas.createDerivedAsset.parse(
        services.createDerivedPromptAsset(payloadSchemas.createDerivedAsset.parse(payload)),
      ),
    getLineage: (payload: unknown) =>
      responseSchemas.getLineage.parse(
        services.getLineage(payloadSchemas.getLineage.parse(payload).promptAssetId),
      ),
    listPromptAssets: (payload: unknown) =>
      services.listPromptAssets(payloadSchemas.listPromptAssets.parse(payload)),
    getPromptAsset: (payload: unknown) =>
      services.getPromptAsset(payloadSchemas.getPromptAsset.parse(payload).id),
    updatePromptAsset: (payload: unknown) => {
      const parsed = payloadSchemas.updatePromptAsset.parse(payload)
      return services.updatePromptAsset(parsed.id, parsed.input)
    },
    deletePromptAsset: (payload: unknown) =>
      services.deletePromptAsset(payloadSchemas.deletePromptAsset.parse(payload).id),
    createPromptVersion: (payload: unknown) =>
      services.createPromptVersion(payloadSchemas.createPromptVersion.parse(payload)),
    createNextPromptVersion: (payload: unknown) =>
      services.createNextPromptVersion(payloadSchemas.createNextPromptVersion.parse(payload)),
    listPromptVersions: (payload: unknown) =>
      services.listPromptVersions(payloadSchemas.listPromptVersions.parse(payload).id),
    getPromptVersion: (payload: unknown) =>
      services.getPromptVersion(payloadSchemas.getPromptVersion.parse(payload).id),
    getCurrentPromptVersion: (payload: unknown) =>
      services.getCurrentPromptVersion(payloadSchemas.getCurrentPromptVersion.parse(payload).id),
    setCurrentPromptVersion: (payload: unknown) => {
      const parsed = payloadSchemas.setCurrentPromptVersion.parse(payload)
      return services.setCurrentPromptVersion(parsed.promptAssetId, parsed.versionId)
    },
    comparePromptVersions: (payload: unknown) => {
      const parsed = payloadSchemas.comparePromptVersions.parse(payload)
      return services.comparePromptVersions(parsed.baseVersionId, parsed.compareVersionId)
    },
    createTag: (payload: unknown) => services.createTag(payloadSchemas.createTag.parse(payload)),
    listTags: (payload: unknown) => {
      payloadSchemas.listTags.parse(payload)
      return services.listTags()
    },
    updateTag: (payload: unknown) => {
      const parsed = payloadSchemas.updateTag.parse(payload)
      return services.updateTag(parsed.id, parsed.input)
    },
    deleteTag: (payload: unknown) => services.deleteTag(payloadSchemas.deleteTag.parse(payload).id),
    attachTagToPrompt: (payload: unknown) => {
      const parsed = payloadSchemas.attachTagToPrompt.parse(payload)
      return services.attachTagToPrompt(parsed.promptAssetId, parsed.tagId)
    },
    detachTagFromPrompt: (payload: unknown) => {
      const parsed = payloadSchemas.detachTagFromPrompt.parse(payload)
      return services.detachTagFromPrompt(parsed.promptAssetId, parsed.tagId)
    },
    listTagsForPrompt: (payload: unknown) =>
      services.listTagsForPrompt(payloadSchemas.listTagsForPrompt.parse(payload).id),
    listTagsWithCounts: (payload: unknown) => {
      payloadSchemas.listTagsWithCounts.parse(payload)
      return services.listTagsWithCounts()
    },
    createAndAttachTagToPrompt: (payload: unknown) => {
      const parsed = payloadSchemas.createAndAttachTagToPrompt.parse(payload)
      return services.createAndAttachTagToPrompt(parsed.promptAssetId, { name: parsed.tagName })
    },
    searchPrompts: (payload: unknown) => {
      const parsed = payloadSchemas.searchPrompts.parse(payload)
      return searchResult(services.searchPrompts(parsed))
    },
    rebuildSearchIndex: (payload: unknown) => {
      payloadSchemas.rebuildSearchIndex.parse(payload)
      services.rebuildSearchIndex()
      return { rebuilt: true as const }
    },
    scanMaintenanceLibrary: (payload: unknown) =>
      responseSchemas.scanMaintenanceLibrary.parse(
        services.scanLibrary(payloadSchemas.scanMaintenanceLibrary.parse(payload)),
      ),
    prepareMaintenanceAction: (payload: unknown) =>
      responseSchemas.prepareMaintenanceAction.parse(
        services.prepareAction(payloadSchemas.prepareMaintenanceAction.parse(payload)),
      ),
    async executeMaintenanceAction(payload: unknown) {
      const parsed = payloadSchemas.executeMaintenanceAction.parse(payload)
      return responseSchemas.executeMaintenanceAction.parse(await services.executeAction(parsed))
    },
    cancelMaintenanceActionSession: (payload: unknown) =>
      responseSchemas.cancelMaintenanceActionSession.parse(
        services.cancelActionSession(payloadSchemas.cancelMaintenanceActionSession.parse(payload)),
      ),
    createHarnessTemplate: (payload: unknown) =>
      services.createHarnessTemplate(payloadSchemas.createHarnessTemplate.parse(payload)),
    listHarnessTemplates: (payload: unknown) => {
      const parsed = payloadSchemas.listHarnessTemplates.parse(payload)
      return services.listHarnessTemplates(parsed)
    },
    getHarnessTemplate: (payload: unknown) =>
      services.getHarnessTemplate(payloadSchemas.getHarnessTemplate.parse(payload).id),
    updateHarnessTemplate: (payload: unknown) => {
      const parsed = payloadSchemas.updateHarnessTemplate.parse(payload)
      return services.updateHarnessTemplate(parsed.id, parsed.input)
    },
    deleteHarnessTemplate: (payload: unknown) =>
      services.deleteHarnessTemplate(payloadSchemas.deleteHarnessTemplate.parse(payload).id),
    duplicateHarnessTemplate: (payload: unknown) => {
      const parsed = payloadSchemas.duplicateHarnessTemplate.parse(payload)

      if (services.duplicateHarnessTemplate === undefined) {
        throw new Error("duplicateHarnessTemplate service is not available")
      }

      return services.duplicateHarnessTemplate(parsed.id)
    },
    createPromptTemplate: (payload: unknown) =>
      responseSchemas.createPromptTemplate.parse(
        services.createPromptTemplate(payloadSchemas.createPromptTemplate.parse(payload)),
      ),
    listPromptTemplates: (payload: unknown) =>
      responseSchemas.listPromptTemplates.parse(
        services.listPromptTemplates(payloadSchemas.listPromptTemplates.parse(payload)),
      ),
    getPromptTemplate: (payload: unknown) =>
      responseSchemas.getPromptTemplate.parse(
        services.getPromptTemplate(payloadSchemas.getPromptTemplate.parse(payload).id),
      ),
    updatePromptTemplate: (payload: unknown) => {
      const parsed = payloadSchemas.updatePromptTemplate.parse(payload)
      return responseSchemas.updatePromptTemplate.parse(
        services.updatePromptTemplate(parsed.id, parsed.input),
      )
    },
    duplicatePromptTemplate: (payload: unknown) =>
      responseSchemas.duplicatePromptTemplate.parse(
        services.duplicatePromptTemplate(payloadSchemas.duplicatePromptTemplate.parse(payload).id),
      ),
    deletePromptTemplate: (payload: unknown) =>
      responseSchemas.deletePromptTemplate.parse(
        services.deletePromptTemplate(payloadSchemas.deletePromptTemplate.parse(payload).id),
      ),
    createPromptTemplateFromVersion: (payload: unknown) =>
      responseSchemas.createPromptTemplateFromVersion.parse(
        services.createPromptTemplateFromVersion(
          payloadSchemas.createPromptTemplateFromVersion.parse(payload),
        ),
      ),
    createProjectContextProfile: (payload: unknown) =>
      services.createProjectContextProfile(
        payloadSchemas.createProjectContextProfile.parse(payload),
      ),
    listProjectContextProfiles: (payload: unknown) =>
      services.listProjectContextProfiles(payloadSchemas.listProjectContextProfiles.parse(payload)),
    getProjectContextProfile: (payload: unknown) =>
      services.getProjectContextProfile(payloadSchemas.getProjectContextProfile.parse(payload)),
    getDefaultProjectContextProfile: (payload: unknown) => {
      const parsed = payloadSchemas.getDefaultProjectContextProfile.parse(payload)
      return services.getDefaultProjectContextProfile(parsed.projectId)
    },
    updateProjectContextProfile: (payload: unknown) => {
      const parsed = payloadSchemas.updateProjectContextProfile.parse(payload)
      return services.updateProjectContextProfile(
        { projectId: parsed.projectId, profileId: parsed.profileId },
        parsed.input,
      )
    },
    deleteProjectContextProfile: (payload: unknown) =>
      services.deleteProjectContextProfile(
        payloadSchemas.deleteProjectContextProfile.parse(payload),
      ),
    duplicateProjectContextProfile: (payload: unknown) =>
      services.duplicateProjectContextProfile(
        payloadSchemas.duplicateProjectContextProfile.parse(payload),
      ),
    setDefaultProjectContextProfile: (payload: unknown) =>
      services.setDefaultProjectContextProfile(
        payloadSchemas.setDefaultProjectContextProfile.parse(payload),
      ),
    buildProjectContextForCompiler: (payload: unknown) =>
      services.buildCompilerContext(payloadSchemas.buildProjectContextForCompiler.parse(payload)),
    getSetting: (payload: unknown) =>
      services.getSetting(payloadSchemas.getSetting.parse(payload).key),
    setSetting: (payload: unknown) => {
      const parsed = payloadSchemas.setSetting.parse(payload)
      return services.setSetting(parsed.key, parsed.value)
    },
    listSettings: (payload: unknown) => {
      payloadSchemas.listSettings.parse(payload)
      return services.listSettings()
    },
    getDefaults: (payload: unknown) => {
      payloadSchemas.getSettingsDefaults.parse(payload)
      return services.getDefaults()
    },
    updateDefaults: (payload: unknown) =>
      services.updateDefaults(payloadSchemas.updateSettingsDefaults.parse(payload)),
    saveOpenAIKey: (payload: unknown) =>
      services.saveOpenAIKey(payloadSchemas.saveOpenAIKey.parse(payload)),
    hasOpenAIKey: (payload: unknown) => {
      payloadSchemas.hasOpenAIKey.parse(payload)
      return services.hasOpenAIKey()
    },
    getOpenAIKeyStatus: (payload: unknown) => {
      payloadSchemas.getOpenAIKeyStatus.parse(payload)
      return services.getOpenAIKeyStatus()
    },
    deleteOpenAIKey: (payload: unknown) => {
      payloadSchemas.deleteOpenAIKey.parse(payload)
      return services.deleteOpenAIKey()
    },
    promptCompilerAnalyze: (payload: unknown) =>
      services.promptCompilerAnalyze(payloadSchemas.promptCompilerAnalyze.parse(payload)),
    promptCompilerCompile: (payload: unknown) =>
      services.promptCompilerCompile(payloadSchemas.promptCompilerCompile.parse(payload)),
    formatPromptForExport: (payload: unknown) =>
      services.formatPromptForExport(payloadSchemas.formatPromptForExport.parse(payload)),
    savePromptToFile: (payload: unknown) =>
      services.savePromptToFile(payloadSchemas.savePromptToFile.parse(payload)),
    copyText: (payload: unknown) => services.copyText(payloadSchemas.copyText.parse(payload)),
    readText: (payload: unknown) => {
      payloadSchemas.readText.parse(payload)
      return services.readText()
    },
    reviewPromptQualityDraft: (payload: unknown) =>
      responseSchemas.reviewPromptQualityDraft.parse(
        services.reviewPromptQualityDraft(payloadSchemas.reviewPromptQualityDraft.parse(payload)),
      ),
    async reviewPromptQualityWithLLM(payload: unknown) {
      payloadSchemas.reviewPromptQualityWithLLM.parse(payload)
      return responseSchemas.reviewPromptQualityWithLLM.parse(
        await services.reviewPromptQualityWithLLM(),
      )
    },
    reviewPromptQualityVersion: (payload: unknown) => {
      const parsed = payloadSchemas.reviewPromptQualityVersion.parse(payload)
      return responseSchemas.reviewPromptQualityVersion.parse(
        services.reviewPromptQualityVersion(parsed.promptVersionId),
      )
    },
    savePromptQualityReview: (payload: unknown) =>
      responseSchemas.savePromptQualityReview.parse(
        services.savePromptQualityReview(payloadSchemas.savePromptQualityReview.parse(payload)),
      ),
    listPromptQualityReviewsForVersion: (payload: unknown) =>
      responseSchemas.listPromptQualityReviewsForVersion.parse(
        services.listPromptQualityReviewsForVersion(
          payloadSchemas.listPromptQualityReviewsForVersion.parse(payload),
        ),
      ),
    getLatestPromptQualityReview: (payload: unknown) =>
      responseSchemas.getLatestPromptQualityReview.parse(
        services.getLatestPromptQualityReview(
          payloadSchemas.getLatestPromptQualityReview.parse(payload),
        ),
      ),
    getPromptQualityReview: (payload: unknown) =>
      responseSchemas.getPromptQualityReview.parse(
        services.getPromptQualityReview(payloadSchemas.getPromptQualityReview.parse(payload)),
      ),
    applyPromptQualityScoreToVersion: (payload: unknown) =>
      responseSchemas.applyPromptQualityScoreToVersion.parse(
        services.applyPromptQualityScoreToVersion(
          payloadSchemas.applyPromptQualityScoreToVersion.parse(payload),
        ),
      ),
    exportFullBackup: (payload: unknown) => {
      const parsed = payloadSchemas.exportFullBackup.parse(payload)
      return services
        .exportFullBackup(parsed)
        .then((result) => responseSchemas.exportFullBackup.parse(result))
    },
    exportProjectBackup: (payload: unknown) => {
      const parsed = payloadSchemas.exportProjectBackup.parse(payload)
      return services
        .exportProjectBackup(parsed)
        .then((result) => responseSchemas.exportProjectBackup.parse(result))
    },
    exportPromptAssetsBackup: (payload: unknown) => {
      const parsed = payloadSchemas.exportPromptAssetsBackup.parse(payload)
      return services
        .exportPromptAssetsBackup(parsed)
        .then((result) => responseSchemas.exportPromptAssetsBackup.parse(result))
    },
    exportPromptTemplatesPack: (payload: unknown) => {
      const parsed = payloadSchemas.exportPromptTemplatesPack.parse(payload)
      return services
        .exportPromptTemplatesPack(parsed)
        .then((result) => responseSchemas.exportPromptTemplatesPack.parse(result))
    },
    exportHarnessTemplatesPack: (payload: unknown) => {
      const parsed = payloadSchemas.exportHarnessTemplatesPack.parse(payload)
      return services
        .exportHarnessTemplatesPack(parsed)
        .then((result) => responseSchemas.exportHarnessTemplatesPack.parse(result))
    },
    validateBackupFile: (payload: unknown) => {
      payloadSchemas.validateBackupFile.parse(payload)
      return services
        .validateBackupFile()
        .then((result) => responseSchemas.validateBackupFile.parse(result))
    },
    importBackup: (payload: unknown) => {
      const parsed = payloadSchemas.importBackup.parse(payload)
      return services
        .importBackup(parsed)
        .then((result) => responseSchemas.importBackup.parse(result))
    },
    cancelImportSession: (payload: unknown) => {
      const parsed = payloadSchemas.cancelImportSession.parse(payload)
      return services
        .cancelImportSession(parsed)
        .then((result) => responseSchemas.cancelImportSession.parse(result))
    },
  }
}

export function registerIpcHandlers(services: IpcServices): void {
  const handlers = createPersistenceIpcHandlers(services)

  ipcMain.handle(PING_CHANNEL, () => PING_RESPONSE)
  ipcMain.handle(PERSISTENCE_CHANNELS.createProject, (_event, payload) =>
    handlers.createProject(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.listProjects, (_event, payload) =>
    handlers.listProjects(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.getProject, (_event, payload) => handlers.getProject(payload))
  ipcMain.handle(PERSISTENCE_CHANNELS.updateProject, (_event, payload) =>
    handlers.updateProject(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.deleteProject, (_event, payload) =>
    handlers.deleteProject(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.createPromptAsset, (_event, payload) =>
    handlers.createPromptAsset(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.createPromptWithInitialVersion, (_event, payload) =>
    handlers.createPromptWithInitialVersion(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.duplicateAsset, (_event, payload) =>
    handlers.duplicateAsset(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.createDerivedAsset, (_event, payload) =>
    handlers.createDerivedAsset(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.getLineage, (_event, payload) => handlers.getLineage(payload))
  ipcMain.handle(PERSISTENCE_CHANNELS.listPromptAssets, (_event, payload) =>
    handlers.listPromptAssets(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.getPromptAsset, (_event, payload) =>
    handlers.getPromptAsset(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.updatePromptAsset, (_event, payload) =>
    handlers.updatePromptAsset(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.deletePromptAsset, (_event, payload) =>
    handlers.deletePromptAsset(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.createPromptVersion, (_event, payload) =>
    handlers.createPromptVersion(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.createNextPromptVersion, (_event, payload) =>
    handlers.createNextPromptVersion(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.listPromptVersions, (_event, payload) =>
    handlers.listPromptVersions(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.getPromptVersion, (_event, payload) =>
    handlers.getPromptVersion(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.getCurrentPromptVersion, (_event, payload) =>
    handlers.getCurrentPromptVersion(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.setCurrentPromptVersion, (_event, payload) =>
    handlers.setCurrentPromptVersion(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.comparePromptVersions, (_event, payload) =>
    handlers.comparePromptVersions(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.createTag, (_event, payload) => handlers.createTag(payload))
  ipcMain.handle(PERSISTENCE_CHANNELS.listTags, (_event, payload) => handlers.listTags(payload))
  ipcMain.handle(PERSISTENCE_CHANNELS.updateTag, (_event, payload) => handlers.updateTag(payload))
  ipcMain.handle(PERSISTENCE_CHANNELS.deleteTag, (_event, payload) => handlers.deleteTag(payload))
  ipcMain.handle(PERSISTENCE_CHANNELS.attachTagToPrompt, (_event, payload) =>
    handlers.attachTagToPrompt(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.detachTagFromPrompt, (_event, payload) =>
    handlers.detachTagFromPrompt(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.listTagsForPrompt, (_event, payload) =>
    handlers.listTagsForPrompt(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.listTagsWithCounts, (_event, payload) =>
    handlers.listTagsWithCounts(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.createAndAttachTagToPrompt, (_event, payload) =>
    handlers.createAndAttachTagToPrompt(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.searchPrompts, (_event, payload) =>
    handlers.searchPrompts(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.rebuildSearchIndex, (_event, payload) =>
    handlers.rebuildSearchIndex(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.scanMaintenanceLibrary, (_event, payload) =>
    handlers.scanMaintenanceLibrary(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.prepareMaintenanceAction, (_event, payload) =>
    handlers.prepareMaintenanceAction(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.executeMaintenanceAction, (_event, payload) =>
    handlers.executeMaintenanceAction(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.cancelMaintenanceActionSession, (_event, payload) =>
    handlers.cancelMaintenanceActionSession(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.createHarnessTemplate, (_event, payload) =>
    handlers.createHarnessTemplate(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.listHarnessTemplates, (_event, payload) =>
    handlers.listHarnessTemplates(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.getHarnessTemplate, (_event, payload) =>
    handlers.getHarnessTemplate(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.updateHarnessTemplate, (_event, payload) =>
    handlers.updateHarnessTemplate(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.deleteHarnessTemplate, (_event, payload) =>
    handlers.deleteHarnessTemplate(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.duplicateHarnessTemplate, (_event, payload) =>
    handlers.duplicateHarnessTemplate(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.createPromptTemplate, (_event, payload) =>
    handlers.createPromptTemplate(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.listPromptTemplates, (_event, payload) =>
    handlers.listPromptTemplates(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.getPromptTemplate, (_event, payload) =>
    handlers.getPromptTemplate(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.updatePromptTemplate, (_event, payload) =>
    handlers.updatePromptTemplate(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.duplicatePromptTemplate, (_event, payload) =>
    handlers.duplicatePromptTemplate(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.deletePromptTemplate, (_event, payload) =>
    handlers.deletePromptTemplate(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.createPromptTemplateFromVersion, (_event, payload) =>
    handlers.createPromptTemplateFromVersion(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.createProjectContextProfile, (_event, payload) =>
    handlers.createProjectContextProfile(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.listProjectContextProfiles, (_event, payload) =>
    handlers.listProjectContextProfiles(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.getProjectContextProfile, (_event, payload) =>
    handlers.getProjectContextProfile(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.getDefaultProjectContextProfile, (_event, payload) =>
    handlers.getDefaultProjectContextProfile(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.updateProjectContextProfile, (_event, payload) =>
    handlers.updateProjectContextProfile(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.deleteProjectContextProfile, (_event, payload) =>
    handlers.deleteProjectContextProfile(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.duplicateProjectContextProfile, (_event, payload) =>
    handlers.duplicateProjectContextProfile(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.setDefaultProjectContextProfile, (_event, payload) =>
    handlers.setDefaultProjectContextProfile(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.buildProjectContextForCompiler, (_event, payload) =>
    handlers.buildProjectContextForCompiler(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.getSetting, (_event, payload) => handlers.getSetting(payload))
  ipcMain.handle(PERSISTENCE_CHANNELS.setSetting, (_event, payload) => handlers.setSetting(payload))
  ipcMain.handle(PERSISTENCE_CHANNELS.listSettings, (_event, payload) =>
    handlers.listSettings(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.getSettingsDefaults, (_event, payload) =>
    handlers.getDefaults(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.updateSettingsDefaults, (_event, payload) =>
    handlers.updateDefaults(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.saveOpenAIKey, (_event, payload) =>
    handlers.saveOpenAIKey(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.hasOpenAIKey, (_event, payload) =>
    handlers.hasOpenAIKey(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.getOpenAIKeyStatus, (_event, payload) =>
    handlers.getOpenAIKeyStatus(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.deleteOpenAIKey, (_event, payload) =>
    handlers.deleteOpenAIKey(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.promptCompilerAnalyze, (_event, payload) =>
    handlers.promptCompilerAnalyze(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.promptCompilerCompile, (_event, payload) =>
    handlers.promptCompilerCompile(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.formatPromptForExport, (_event, payload) =>
    handlers.formatPromptForExport(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.savePromptToFile, (_event, payload) =>
    handlers.savePromptToFile(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.copyText, (_event, payload) => handlers.copyText(payload))
  ipcMain.handle(PERSISTENCE_CHANNELS.readText, (_event, payload) => handlers.readText(payload))
  ipcMain.handle(PERSISTENCE_CHANNELS.reviewPromptQualityDraft, (_event, payload) =>
    handlers.reviewPromptQualityDraft(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.reviewPromptQualityWithLLM, (_event, payload) =>
    handlers.reviewPromptQualityWithLLM(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.reviewPromptQualityVersion, (_event, payload) =>
    handlers.reviewPromptQualityVersion(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.savePromptQualityReview, (_event, payload) =>
    handlers.savePromptQualityReview(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.listPromptQualityReviewsForVersion, (_event, payload) =>
    handlers.listPromptQualityReviewsForVersion(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.getLatestPromptQualityReview, (_event, payload) =>
    handlers.getLatestPromptQualityReview(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.getPromptQualityReview, (_event, payload) =>
    handlers.getPromptQualityReview(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.applyPromptQualityScoreToVersion, (_event, payload) =>
    handlers.applyPromptQualityScoreToVersion(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.exportFullBackup, (_event, payload) =>
    handlers.exportFullBackup(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.exportProjectBackup, (_event, payload) =>
    handlers.exportProjectBackup(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.exportPromptAssetsBackup, (_event, payload) =>
    handlers.exportPromptAssetsBackup(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.exportPromptTemplatesPack, (_event, payload) =>
    handlers.exportPromptTemplatesPack(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.exportHarnessTemplatesPack, (_event, payload) =>
    handlers.exportHarnessTemplatesPack(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.validateBackupFile, (_event, payload) =>
    handlers.validateBackupFile(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.importBackup, (_event, payload) =>
    handlers.importBackup(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.cancelImportSession, (_event, payload) =>
    handlers.cancelImportSession(payload),
  )
}
