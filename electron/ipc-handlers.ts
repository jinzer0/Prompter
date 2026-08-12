import { type IpcMainInvokeEvent, ipcMain } from "electron"
import type { z } from "zod"

import type { AppLockService } from "./app-lock/app-lock-service.js"
import { BackupExportPrivacyConfirmationRequiredError } from "./backup/backup-export-service.js"
import type { PersistenceServices } from "./db/services.js"
import {
  APP_LOCK_CHANNELS,
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
  PreparedPlaintextBackupInput,
  PrepareEncryptedBackupInput,
  PromptSearchResultItem,
  SavePreparedEncryptedBackupInput,
  SearchPromptsResponse,
  UnlockEncryptedBackupInput,
} from "./ipc-types.js"
import type { MaintenanceServices } from "./maintenance/maintenance-services.js"
import { PrivacyConfirmationRequiredError } from "./privacy/privacy-guard-service.js"
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
  readonly prepareEncryptedBackup: (input: PrepareEncryptedBackupInput) => unknown
  readonly savePreparedPlaintextBackup: (input: PreparedPlaintextBackupInput) => Promise<unknown>
  readonly savePreparedEncryptedBackup: (
    input: SavePreparedEncryptedBackupInput,
  ) => Promise<unknown>
  readonly validateBackupFile: () => Promise<unknown>
  readonly validateEncryptedBackupFile: () => Promise<unknown>
  readonly unlockEncryptedBackup: (input: UnlockEncryptedBackupInput) => Promise<unknown>
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
  | "privacyGuard"
  | "getAppLockMetadata"
  | "setAppLockMetadata"
  | "deleteAppLockMetadata"
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

type ProtectedResponseKind =
  | "compiler"
  | "quality"
  | "save_prompt"
  | "copy"
  | "plaintext_backup"
  | "encrypted_backup"

async function protectedResponse<TSchema extends z.ZodType>(
  responseSchema: TSchema,
  operation: () => Promise<unknown>,
  kind: ProtectedResponseKind,
): Promise<z.output<TSchema>> {
  try {
    return responseSchema.parse(await operation())
  } catch (error) {
    if (error instanceof PrivacyConfirmationRequiredError) {
      const confirmation = {
        status: "confirmation_required" as const,
        privacyConfirmationSessionId: error.privacyConfirmationSessionId,
        scanResult: error.scanResult,
      }
      switch (kind) {
        case "compiler":
          return responseSchema.parse({
            ...confirmation,
            ok: false,
            code: "openai_request_failed",
            message: error.message,
          })
        case "quality":
          return responseSchema.parse({
            ...confirmation,
            ok: false,
            code: "llm_review_unavailable",
            message: error.message,
          })
        case "save_prompt":
          return responseSchema.parse({ ...confirmation, cancelled: true })
        case "copy":
          return responseSchema.parse({ ...confirmation, copied: true })
        case "plaintext_backup":
        case "encrypted_backup":
          throw error
      }
    }
    if (error instanceof BackupExportPrivacyConfirmationRequiredError) {
      if (kind === "plaintext_backup" || kind === "encrypted_backup") {
        return responseSchema.parse({
          status: "confirmation_required",
          plaintext: error.plaintext,
          preparedBackupSessionId: error.preparedBackupSessionId,
          privacyConfirmationSessionId: error.privacyConfirmationSessionId,
          scanResult: error.scanResult,
          cancelled: true,
          backupType: error.backupType,
          itemCounts: error.itemCounts,
          message: error.message,
        })
      }
      throw error
    }
    throw error
  }
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
    promptCompilerAnalyze: (payload: unknown) => {
      const parsed = payloadSchemas.promptCompilerAnalyze.parse(payload)
      return protectedResponse(
        responseSchemas.promptCompilerAnalyze,
        () => services.promptCompilerAnalyze(parsed),
        "compiler",
      )
    },
    promptCompilerCompile: (payload: unknown) => {
      const parsed = payloadSchemas.promptCompilerCompile.parse(payload)
      return protectedResponse(
        responseSchemas.promptCompilerCompile,
        () => services.promptCompilerCompile(parsed),
        "compiler",
      )
    },
    formatPromptForExport: (payload: unknown) =>
      services.formatPromptForExport(payloadSchemas.formatPromptForExport.parse(payload)),
    savePromptToFile: (payload: unknown) => {
      const parsed = payloadSchemas.savePromptToFile.parse(payload)
      return protectedResponse(
        responseSchemas.savePromptToFile,
        () => services.savePromptToFile(parsed),
        "save_prompt",
      )
    },
    copyText: (payload: unknown) => {
      const parsed = payloadSchemas.copyText.parse(payload)
      return protectedResponse(responseSchemas.copyText, () => services.copyText(parsed), "copy")
    },
    readText: (payload: unknown) => {
      payloadSchemas.readText.parse(payload)
      return services.readText()
    },
    reviewPromptQualityDraft: (payload: unknown) =>
      responseSchemas.reviewPromptQualityDraft.parse(
        services.reviewPromptQualityDraft(payloadSchemas.reviewPromptQualityDraft.parse(payload)),
      ),
    async reviewPromptQualityWithLLM(payload: unknown) {
      const parsed = payloadSchemas.reviewPromptQualityWithLLM.parse(payload)
      return protectedResponse(
        responseSchemas.reviewPromptQualityWithLLM,
        () =>
          services.reviewPromptQualityWithLLM({
            snapshot: parsed,
            ...(parsed.privacyConfirmationSessionId === undefined
              ? {}
              : { privacyConfirmationSessionId: parsed.privacyConfirmationSessionId }),
          }),
        "quality",
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
      return protectedResponse(
        responseSchemas.exportFullBackup,
        () => services.exportFullBackup(parsed),
        "plaintext_backup",
      )
    },
    exportProjectBackup: (payload: unknown) => {
      const parsed = payloadSchemas.exportProjectBackup.parse(payload)
      return protectedResponse(
        responseSchemas.exportProjectBackup,
        () => services.exportProjectBackup(parsed),
        "plaintext_backup",
      )
    },
    exportPromptAssetsBackup: (payload: unknown) => {
      const parsed = payloadSchemas.exportPromptAssetsBackup.parse(payload)
      return protectedResponse(
        responseSchemas.exportPromptAssetsBackup,
        () => services.exportPromptAssetsBackup(parsed),
        "plaintext_backup",
      )
    },
    exportPromptTemplatesPack: (payload: unknown) => {
      const parsed = payloadSchemas.exportPromptTemplatesPack.parse(payload)
      return protectedResponse(
        responseSchemas.exportPromptTemplatesPack,
        () => services.exportPromptTemplatesPack(parsed),
        "plaintext_backup",
      )
    },
    exportHarnessTemplatesPack: (payload: unknown) => {
      const parsed = payloadSchemas.exportHarnessTemplatesPack.parse(payload)
      return protectedResponse(
        responseSchemas.exportHarnessTemplatesPack,
        () => services.exportHarnessTemplatesPack(parsed),
        "plaintext_backup",
      )
    },
    savePreparedPlaintextBackup: (payload: unknown) => {
      const parsed = payloadSchemas.savePreparedPlaintextBackup.parse(payload)
      const input: PreparedPlaintextBackupInput =
        parsed.privacyConfirmationSessionId === undefined
          ? { preparedBackupSessionId: parsed.preparedBackupSessionId }
          : {
              preparedBackupSessionId: parsed.preparedBackupSessionId,
              privacyConfirmationSessionId: parsed.privacyConfirmationSessionId,
            }
      return protectedResponse(
        responseSchemas.savePreparedPlaintextBackup,
        () => services.savePreparedPlaintextBackup(input),
        "plaintext_backup",
      )
    },
    prepareEncryptedBackup: (payload: unknown) =>
      responseSchemas.prepareEncryptedBackup.parse(
        services.prepareEncryptedBackup(payloadSchemas.prepareEncryptedBackup.parse(payload)),
      ),
    savePreparedEncryptedBackup: (payload: unknown) =>
      protectedResponse(
        responseSchemas.savePreparedEncryptedBackup,
        () =>
          services.savePreparedEncryptedBackup(
            payloadSchemas.savePreparedEncryptedBackup.parse(payload),
          ),
        "encrypted_backup",
      ),
    validateBackupFile: (payload: unknown) => {
      payloadSchemas.validateBackupFile.parse(payload)
      return services
        .validateBackupFile()
        .then((result) => responseSchemas.validateBackupFile.parse(result))
    },
    validateEncryptedBackupFile: (payload: unknown) => {
      payloadSchemas.validateEncryptedBackupFile.parse(payload)
      return services
        .validateEncryptedBackupFile()
        .then((result) => responseSchemas.validateEncryptedBackupFile.parse(result))
    },
    unlockEncryptedBackup: (payload: unknown) => {
      const parsed = payloadSchemas.unlockEncryptedBackup.parse(payload)
      return services
        .unlockEncryptedBackup(parsed)
        .then((result) => responseSchemas.unlockEncryptedBackup.parse(result))
    },
    scanSensitiveText: (payload: unknown) =>
      responseSchemas.scanSensitiveText.parse(
        services.privacy.scanText(payloadSchemas.scanSensitiveText.parse(payload)),
      ),
    scanDraftPrivacy: (payload: unknown) =>
      responseSchemas.scanDraftPrivacy.parse(
        services.privacy.scanDraft(payloadSchemas.scanDraftPrivacy.parse(payload)),
      ),
    scanLibraryPrivacy: (payload: unknown) =>
      responseSchemas.scanLibraryPrivacy.parse(
        services.privacy.scanLibrary(payloadSchemas.scanLibraryPrivacy.parse(payload)),
      ),
    scanExportContent: (payload: unknown) =>
      responseSchemas.scanExportContent.parse(
        services.privacy.scanExportContent(payloadSchemas.scanExportContent.parse(payload)),
      ),
    getPrivacySettings: (payload: unknown) => {
      payloadSchemas.getPrivacySettings.parse(payload)
      return responseSchemas.getPrivacySettings.parse(services.getPrivacySettings())
    },
    updatePrivacySettings: (payload: unknown) =>
      responseSchemas.updatePrivacySettings.parse(
        services.updatePrivacySettings(payloadSchemas.updatePrivacySettings.parse(payload)),
      ),
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
    getDashboardSummary: (payload: unknown) =>
      responseSchemas.getDashboardSummary.parse(
        services.getDashboardSummary(payloadSchemas.getDashboardSummary.parse(payload)),
      ),
    getProjectHealth: (payload: unknown) =>
      responseSchemas.getProjectHealth.parse(
        services.getProjectHealth(payloadSchemas.getProjectHealth.parse(payload)),
      ),
    getScenarioDistribution: (payload: unknown) =>
      responseSchemas.getScenarioDistribution.parse(
        services.getScenarioDistribution(payloadSchemas.getScenarioDistribution.parse(payload)),
      ),
    getTargetAgentDistribution: (payload: unknown) =>
      responseSchemas.getTargetAgentDistribution.parse(
        services.getTargetAgentDistribution(
          payloadSchemas.getTargetAgentDistribution.parse(payload),
        ),
      ),
    getQualityInsights: (payload: unknown) =>
      responseSchemas.getQualityInsights.parse(
        services.getQualityInsights(payloadSchemas.getQualityInsights.parse(payload)),
      ),
    getVersionActivity: (payload: unknown) =>
      responseSchemas.getVersionActivity.parse(
        services.getVersionActivity(payloadSchemas.getVersionActivity.parse(payload)),
      ),
    getTagInsights: (payload: unknown) =>
      responseSchemas.getTagInsights.parse(
        services.getTagInsights(payloadSchemas.getTagInsights.parse(payload)),
      ),
    getTemplateInsights: (payload: unknown) =>
      responseSchemas.getTemplateInsights.parse(
        services.getTemplateInsights(payloadSchemas.getTemplateInsights.parse(payload)),
      ),
    getProjectContextInsights: (payload: unknown) =>
      responseSchemas.getProjectContextInsights.parse(
        services.getProjectContextInsights(payloadSchemas.getProjectContextInsights.parse(payload)),
      ),
    getMaintenanceSnapshot: (payload: unknown) =>
      responseSchemas.getMaintenanceSnapshot.parse(
        services.getMaintenanceSnapshot(payloadSchemas.getMaintenanceSnapshot.parse(payload)),
      ),
  }
}

type PersistenceIpcHandler = (payload: unknown) => unknown

export function createPersistenceIpcRegistrationHandlers(services: IpcServices) {
  const handlers = createPersistenceIpcHandlers(services)
  return {
    ...handlers,
    getSettingsDefaults: handlers.getDefaults,
    updateSettingsDefaults: handlers.updateDefaults,
  } satisfies Record<keyof typeof PERSISTENCE_CHANNELS, PersistenceIpcHandler>
}

export class AppLockedError extends Error {
  readonly name = "AppLockedError"

  constructor() {
    super("Prompter is locked")
  }
}

function requireUnlocked(appLock: AppLockService): number {
  if (appLock.getState().locked) {
    throw new AppLockedError()
  }
  return appLock.getStateRevision()
}

function requireCurrentUnlockEpoch(appLock: AppLockService, epoch: number): void {
  if (appLock.getState().locked || appLock.getStateRevision() !== epoch) {
    throw new AppLockedError()
  }
}

export function registerIpcHandlers(
  services: IpcServices,
  appLock?: AppLockService,
  onAppLockStateChanged?: () => void,
  assertTrustedSender: (event: IpcMainInvokeEvent) => void = () => undefined,
): void {
  const handlers: Record<string, PersistenceIpcHandler> =
    createPersistenceIpcRegistrationHandlers(services)

  ipcMain.handle(PING_CHANNEL, (event) => {
    assertTrustedSender(event)
    return PING_RESPONSE
  })
  for (const [key, channel] of Object.entries(PERSISTENCE_CHANNELS)) {
    const handler = handlers[key]
    if (handler === undefined) {
      throw new Error(`Missing persistence handler: ${key}`)
    }
    ipcMain.handle(channel, (event, payload) => {
      assertTrustedSender(event)
      if (appLock === undefined) {
        return handler(payload)
      }
      const epoch = requireUnlocked(appLock)
      const result = handler(payload)
      if (result instanceof Promise) {
        return result.then((value) => {
          requireCurrentUnlockEpoch(appLock, epoch)
          return value
        })
      }
      requireCurrentUnlockEpoch(appLock, epoch)
      return result
    })
  }
  if (appLock === undefined) {
    return
  }
  const appLockHandlers = {
    getState: (_event: IpcMainInvokeEvent, payload: unknown) => {
      payloadSchemas.appLockGetState.parse(payload)
      return responseSchemas.appLockGetState.parse(appLock.getState())
    },
    setup: async (_event: IpcMainInvokeEvent, payload: unknown) => {
      const state = responseSchemas.appLockSetup.parse(
        await appLock.setup(payloadSchemas.appLockSetup.parse(payload)),
      )
      onAppLockStateChanged?.()
      return state
    },
    unlock: async (_event: IpcMainInvokeEvent, payload: unknown) => {
      const unlocked = responseSchemas.appLockUnlock.parse(
        await appLock.unlock(payloadSchemas.appLockUnlock.parse(payload)),
      )
      onAppLockStateChanged?.()
      return unlocked
    },
    lock: (_event: IpcMainInvokeEvent, payload: unknown) => {
      payloadSchemas.appLockLock.parse(payload)
      const state = responseSchemas.appLockLock.parse(appLock.lock())
      onAppLockStateChanged?.()
      return state
    },
    disable: async (_event: IpcMainInvokeEvent, payload: unknown) => {
      const disabled = responseSchemas.appLockDisable.parse(
        await appLock.disable(payloadSchemas.appLockDisable.parse(payload)),
      )
      onAppLockStateChanged?.()
      return disabled
    },
    changePassphrase: async (_event: IpcMainInvokeEvent, payload: unknown) => {
      const changed = responseSchemas.appLockChangePassphrase.parse(
        await appLock.changePassphrase(payloadSchemas.appLockChangePassphrase.parse(payload)),
      )
      onAppLockStateChanged?.()
      return changed
    },
    getSettings: (_event: IpcMainInvokeEvent, payload: unknown) => {
      payloadSchemas.appLockGetSettings.parse(payload)
      return responseSchemas.appLockGetSettings.parse(appLock.getSettings())
    },
    updateSettings: (_event: IpcMainInvokeEvent, payload: unknown) => {
      const settings = responseSchemas.appLockUpdateSettings.parse(
        appLock.updateSettings(payloadSchemas.appLockUpdateSettings.parse(payload)),
      )
      onAppLockStateChanged?.()
      return settings
    },
  } satisfies Record<
    keyof typeof APP_LOCK_CHANNELS,
    (event: IpcMainInvokeEvent, payload: unknown) => unknown
  >
  const registrationHandlers: Record<
    string,
    (event: IpcMainInvokeEvent, payload: unknown) => unknown
  > = appLockHandlers
  for (const [key, channel] of Object.entries(APP_LOCK_CHANNELS)) {
    const handler = registrationHandlers[key]
    if (handler === undefined) {
      throw new Error(`Missing app-lock handler: ${key}`)
    }
    ipcMain.handle(channel, (event, payload) => {
      assertTrustedSender(event)
      return handler(event, payload)
    })
  }
}
