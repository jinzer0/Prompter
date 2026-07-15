import type { z } from "zod"

import {
  type IpcChannel,
  PERSISTENCE_CHANNELS,
  PING_CHANNEL,
  PING_RESPONSE,
  type PingResponse,
  payloadSchemas,
  responseSchemas,
} from "./ipc-contract.js"
import type { ElectronBridge, MenuAction } from "./ipc-types.js"

// allow: SIZE_OK - central renderer bridge registry mirrors the typed IPC contract.

export type { ElectronBridge, PingResponse }
export { PING_CHANNEL, PING_RESPONSE }

type InvokeIpc = (channel: IpcChannel, payload?: unknown) => Promise<unknown>
type SubscribeMenuAction = (callback: (action: MenuAction) => void) => () => void
type BridgeRequest = <TPayload extends z.ZodType, TResponse extends z.ZodType>(
  channel: IpcChannel,
  payloadSchema: TPayload,
  responseSchema: TResponse,
  payload: z.input<TPayload>,
) => Promise<z.output<TResponse>>

function createBridgeRequest(invoke: InvokeIpc): BridgeRequest {
  return async (channel, payloadSchema, responseSchema, payload) => {
    const parsedPayload = payloadSchema.parse(payload)
    const response = await invoke(channel, parsedPayload)
    return responseSchema.parse(response)
  }
}

export function createElectronBridge(
  invoke: InvokeIpc,
  subscribeMenuAction: SubscribeMenuAction = () => () => undefined,
): ElectronBridge {
  const request = createBridgeRequest(invoke)
  const ch = PERSISTENCE_CHANNELS
  const payload = payloadSchemas
  const response = responseSchemas

  return {
    async ping() {
      const result = await invoke(PING_CHANNEL)

      if (result === PING_RESPONSE) {
        return result
      }

      throw new TypeError("Unexpected ping response from main process")
    },
    menu: {
      onAction: subscribeMenuAction,
    },
    projects: {
      create: (input) =>
        request(ch.createProject, payload.createProject, response.createProject, input),
      list: () => request(ch.listProjects, payload.listProjects, response.listProjects, undefined),
      get: (id) => request(ch.getProject, payload.getProject, response.getProject, { id }),
      update: (id, input) =>
        request(ch.updateProject, payload.updateProject, response.updateProject, { id, input }),
      delete: (id) =>
        request(ch.deleteProject, payload.deleteProject, response.deleteProject, { id }),
    },
    projectContextProfiles: {
      create: (input) =>
        request(
          ch.createProjectContextProfile,
          payload.createProjectContextProfile,
          response.createProjectContextProfile,
          input,
        ),
      list: (projectId) =>
        request(
          ch.listProjectContextProfiles,
          payload.listProjectContextProfiles,
          response.listProjectContextProfiles,
          { projectId },
        ),
      get: (projectId, profileId) =>
        request(
          ch.getProjectContextProfile,
          payload.getProjectContextProfile,
          response.getProjectContextProfile,
          { projectId, profileId },
        ),
      getDefault: (projectId) =>
        request(
          ch.getDefaultProjectContextProfile,
          payload.getDefaultProjectContextProfile,
          response.getDefaultProjectContextProfile,
          { projectId },
        ),
      update: (projectId, profileId, input) =>
        request(
          ch.updateProjectContextProfile,
          payload.updateProjectContextProfile,
          response.updateProjectContextProfile,
          { projectId, profileId, input },
        ),
      delete: (projectId, profileId) =>
        request(
          ch.deleteProjectContextProfile,
          payload.deleteProjectContextProfile,
          response.deleteProjectContextProfile,
          { projectId, profileId },
        ),
      duplicate: (projectId, profileId) =>
        request(
          ch.duplicateProjectContextProfile,
          payload.duplicateProjectContextProfile,
          response.duplicateProjectContextProfile,
          { projectId, profileId },
        ),
      setDefault: (projectId, profileId) =>
        request(
          ch.setDefaultProjectContextProfile,
          payload.setDefaultProjectContextProfile,
          response.setDefaultProjectContextProfile,
          { projectId, profileId },
        ),
      buildCompilerContext: (projectId, profileId) =>
        request(
          ch.buildProjectContextForCompiler,
          payload.buildProjectContextForCompiler,
          response.buildProjectContextForCompiler,
          { projectId, profileId },
        ),
    },
    prompts: {
      createAsset: (input) =>
        request(ch.createPromptAsset, payload.createPromptAsset, response.createPromptAsset, input),
      listAssets: (filter) =>
        request(ch.listPromptAssets, payload.listPromptAssets, response.listPromptAssets, filter),
      getAsset: (id) =>
        request(ch.getPromptAsset, payload.getPromptAsset, response.getPromptAsset, { id }),
      updateAsset: (id, input) =>
        request(ch.updatePromptAsset, payload.updatePromptAsset, response.updatePromptAsset, {
          id,
          input,
        }),
      deleteAsset: (id) =>
        request(ch.deletePromptAsset, payload.deletePromptAsset, response.deletePromptAsset, {
          id,
        }),
      createVersion: (input) =>
        request(
          ch.createPromptVersion,
          payload.createPromptVersion,
          response.createPromptVersion,
          input,
        ),
      createNextVersion: (input) =>
        request(
          ch.createNextPromptVersion,
          payload.createNextPromptVersion,
          response.createNextPromptVersion,
          input,
        ),
      listVersions: (promptAssetId) =>
        request(ch.listPromptVersions, payload.listPromptVersions, response.listPromptVersions, {
          id: promptAssetId,
        }),
      getVersion: (id) =>
        request(ch.getPromptVersion, payload.getPromptVersion, response.getPromptVersion, { id }),
      getCurrentVersion: (promptAssetId) =>
        request(
          ch.getCurrentPromptVersion,
          payload.getCurrentPromptVersion,
          response.getCurrentPromptVersion,
          { id: promptAssetId },
        ),
      setCurrentVersion: (promptAssetId, versionId) =>
        request(
          ch.setCurrentPromptVersion,
          payload.setCurrentPromptVersion,
          response.setCurrentPromptVersion,
          {
            promptAssetId,
            versionId,
          },
        ),
      compareVersions: (baseVersionId, compareVersionId) =>
        request(
          ch.comparePromptVersions,
          payload.comparePromptVersions,
          response.comparePromptVersions,
          { baseVersionId, compareVersionId },
        ),
      createWithInitialVersion: (input) =>
        request(
          ch.createPromptWithInitialVersion,
          payload.createPromptWithInitialVersion,
          response.createPromptWithInitialVersion,
          input,
        ),
      duplicateAsset: (input) =>
        request(ch.duplicateAsset, payload.duplicateAsset, response.duplicateAsset, input),
      createDerivedAsset: (input) =>
        request(
          ch.createDerivedAsset,
          payload.createDerivedAsset,
          response.createDerivedAsset,
          input,
        ),
      getLineage: (promptAssetId) =>
        request(ch.getLineage, payload.getLineage, response.getLineage, { promptAssetId }),
    },
    promptTemplates: {
      create: (input) =>
        request(
          ch.createPromptTemplate,
          payload.createPromptTemplate,
          response.createPromptTemplate,
          input,
        ),
      list: (filter) =>
        request(
          ch.listPromptTemplates,
          payload.listPromptTemplates,
          response.listPromptTemplates,
          filter,
        ),
      get: (id) =>
        request(ch.getPromptTemplate, payload.getPromptTemplate, response.getPromptTemplate, {
          id,
        }),
      update: (id, input) =>
        request(
          ch.updatePromptTemplate,
          payload.updatePromptTemplate,
          response.updatePromptTemplate,
          { id, input },
        ),
      duplicate: (id) =>
        request(
          ch.duplicatePromptTemplate,
          payload.duplicatePromptTemplate,
          response.duplicatePromptTemplate,
          { id },
        ),
      delete: (id) =>
        request(
          ch.deletePromptTemplate,
          payload.deletePromptTemplate,
          response.deletePromptTemplate,
          { id },
        ),
      createFromVersion: (input) =>
        request(
          ch.createPromptTemplateFromVersion,
          payload.createPromptTemplateFromVersion,
          response.createPromptTemplateFromVersion,
          input,
        ),
    },
    search: {
      searchPrompts: (input) =>
        request(ch.searchPrompts, payload.searchPrompts, response.searchPrompts, input),
      rebuildIndex: () =>
        request(
          ch.rebuildSearchIndex,
          payload.rebuildSearchIndex,
          response.rebuildSearchIndex,
          undefined,
        ),
    },
    maintenance: {
      scanLibrary: (input) =>
        request(
          ch.scanMaintenanceLibrary,
          payload.scanMaintenanceLibrary,
          response.scanMaintenanceLibrary,
          input,
        ),
      prepareAction: (input) =>
        request(
          ch.prepareMaintenanceAction,
          payload.prepareMaintenanceAction,
          response.prepareMaintenanceAction,
          input,
        ),
      executeAction: (input) =>
        request(
          ch.executeMaintenanceAction,
          payload.executeMaintenanceAction,
          response.executeMaintenanceAction,
          input,
        ),
      cancelActionSession: (input) =>
        request(
          ch.cancelMaintenanceActionSession,
          payload.cancelMaintenanceActionSession,
          response.cancelMaintenanceActionSession,
          input,
        ),
    },
    tags: {
      create: (input) => request(ch.createTag, payload.createTag, response.createTag, input),
      list: () => request(ch.listTags, payload.listTags, response.listTags, undefined),
      update: (id, input) =>
        request(ch.updateTag, payload.updateTag, response.updateTag, { id, input }),
      delete: (id) => request(ch.deleteTag, payload.deleteTag, response.deleteTag, { id }),
      attachToPrompt: (promptAssetId, tagId) =>
        request(ch.attachTagToPrompt, payload.attachTagToPrompt, response.attachTagToPrompt, {
          promptAssetId,
          tagId,
        }),
      detachFromPrompt: (promptAssetId, tagId) =>
        request(ch.detachTagFromPrompt, payload.detachTagFromPrompt, response.detachTagFromPrompt, {
          promptAssetId,
          tagId,
        }),
      listForPrompt: (promptAssetId) =>
        request(ch.listTagsForPrompt, payload.listTagsForPrompt, response.listTagsForPrompt, {
          id: promptAssetId,
        }),
      listWithCounts: () =>
        request(
          ch.listTagsWithCounts,
          payload.listTagsWithCounts,
          response.listTagsWithCounts,
          undefined,
        ),
      createAndAttachToPrompt: (input) =>
        request(
          ch.createAndAttachTagToPrompt,
          payload.createAndAttachTagToPrompt,
          response.createAndAttachTagToPrompt,
          input,
        ),
    },
    harnessTemplates: {
      create: (input) =>
        request(
          ch.createHarnessTemplate,
          payload.createHarnessTemplate,
          response.createHarnessTemplate,
          input,
        ),
      list: (filter) =>
        request(
          ch.listHarnessTemplates,
          payload.listHarnessTemplates,
          response.listHarnessTemplates,
          filter,
        ),
      get: (id) =>
        request(ch.getHarnessTemplate, payload.getHarnessTemplate, response.getHarnessTemplate, {
          id,
        }),
      update: (id, input) =>
        request(
          ch.updateHarnessTemplate,
          payload.updateHarnessTemplate,
          response.updateHarnessTemplate,
          {
            id,
            input,
          },
        ),
      delete: (id) =>
        request(
          ch.deleteHarnessTemplate,
          payload.deleteHarnessTemplate,
          response.deleteHarnessTemplate,
          { id },
        ),
      duplicate: (id) =>
        request(
          ch.duplicateHarnessTemplate,
          payload.duplicateHarnessTemplate,
          response.duplicateHarnessTemplate,
          { id },
        ),
    },
    settings: {
      get: (key) => request(ch.getSetting, payload.getSetting, response.getSetting, { key }),
      set: (key, value) =>
        request(ch.setSetting, payload.setSetting, response.setSetting, { key, value }),
      list: () => request(ch.listSettings, payload.listSettings, response.listSettings, undefined),
      getDefaults: () =>
        request(
          ch.getSettingsDefaults,
          payload.getSettingsDefaults,
          response.getSettingsDefaults,
          undefined,
        ),
      updateDefaults: (input) =>
        request(
          ch.updateSettingsDefaults,
          payload.updateSettingsDefaults,
          response.updateSettingsDefaults,
          input,
        ),
    },
    secrets: {
      saveOpenAIKey: (input) =>
        request(ch.saveOpenAIKey, payload.saveOpenAIKey, response.saveOpenAIKey, input),
      hasOpenAIKey: () =>
        request(ch.hasOpenAIKey, payload.hasOpenAIKey, response.hasOpenAIKey, undefined),
      getOpenAIKeyStatus: () =>
        request(
          ch.getOpenAIKeyStatus,
          payload.getOpenAIKeyStatus,
          response.getOpenAIKeyStatus,
          undefined,
        ),
      deleteOpenAIKey: () =>
        request(ch.deleteOpenAIKey, payload.deleteOpenAIKey, response.deleteOpenAIKey, undefined),
    },
    promptCompiler: {
      analyze: (input) =>
        request(
          ch.promptCompilerAnalyze,
          payload.promptCompilerAnalyze,
          response.promptCompilerAnalyze,
          input,
        ),
      compile: (input) =>
        request(
          ch.promptCompilerCompile,
          payload.promptCompilerCompile,
          response.promptCompilerCompile,
          input,
        ),
    },
    promptQuality: {
      reviewDraft: (input) =>
        request(
          ch.reviewPromptQualityDraft,
          payload.reviewPromptQualityDraft,
          response.reviewPromptQualityDraft,
          input,
        ),
      reviewVersion: (input) =>
        request(
          ch.reviewPromptQualityVersion,
          payload.reviewPromptQualityVersion,
          response.reviewPromptQualityVersion,
          input,
        ),
      saveReview: (input) =>
        request(
          ch.savePromptQualityReview,
          payload.savePromptQualityReview,
          response.savePromptQualityReview,
          input,
        ),
      listReviewsForVersion: (input) =>
        request(
          ch.listPromptQualityReviewsForVersion,
          payload.listPromptQualityReviewsForVersion,
          response.listPromptQualityReviewsForVersion,
          input,
        ),
      getLatestReview: (input) =>
        request(
          ch.getLatestPromptQualityReview,
          payload.getLatestPromptQualityReview,
          response.getLatestPromptQualityReview,
          input,
        ),
      getReview: (input) =>
        request(
          ch.getPromptQualityReview,
          payload.getPromptQualityReview,
          response.getPromptQualityReview,
          input,
        ),
      applyScoreToVersion: (input) =>
        request(
          ch.applyPromptQualityScoreToVersion,
          payload.applyPromptQualityScoreToVersion,
          response.applyPromptQualityScoreToVersion,
          input,
        ),
      reviewWithLLM: () =>
        request(
          ch.reviewPromptQualityWithLLM,
          payload.reviewPromptQualityWithLLM,
          response.reviewPromptQualityWithLLM,
          undefined,
        ),
    },
    exports: {
      formatPrompt: (input) =>
        request(
          ch.formatPromptForExport,
          payload.formatPromptForExport,
          response.formatPromptForExport,
          input,
        ),
      savePromptToFile: (input) =>
        request(ch.savePromptToFile, payload.savePromptToFile, response.savePromptToFile, input),
    },
    clipboard: {
      copyText: (input) => request(ch.copyText, payload.copyText, response.copyText, input),
      readText: () => request(ch.readText, payload.readText, response.readText, undefined),
    },
    backup: {
      exportFullBackup: (input) =>
        request(ch.exportFullBackup, payload.exportFullBackup, response.exportFullBackup, input),
      exportProjectBackup: (input) =>
        request(
          ch.exportProjectBackup,
          payload.exportProjectBackup,
          response.exportProjectBackup,
          input,
        ),
      exportPromptAssetsBackup: (input) =>
        request(
          ch.exportPromptAssetsBackup,
          payload.exportPromptAssetsBackup,
          response.exportPromptAssetsBackup,
          input,
        ),
      exportPromptTemplatesPack: (input) =>
        request(
          ch.exportPromptTemplatesPack,
          payload.exportPromptTemplatesPack,
          response.exportPromptTemplatesPack,
          input,
        ),
      exportHarnessTemplatesPack: (input) =>
        request(
          ch.exportHarnessTemplatesPack,
          payload.exportHarnessTemplatesPack,
          response.exportHarnessTemplatesPack,
          input,
        ),
      validateBackupFile: () =>
        request(
          ch.validateBackupFile,
          payload.validateBackupFile,
          response.validateBackupFile,
          undefined,
        ),
      importBackup: (input) =>
        request(ch.importBackup, payload.importBackup, response.importBackup, input),
      cancelImportSession: (input) =>
        request(
          ch.cancelImportSession,
          payload.cancelImportSession,
          response.cancelImportSession,
          input,
        ),
    },
  }
}
