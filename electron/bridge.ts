import type { z } from "zod"

import type { ElectronBridge } from "./bridge-types.js"
import {
  type IpcChannel,
  PERSISTENCE_CHANNELS,
  PING_CHANNEL,
  PING_RESPONSE,
  type PingResponse,
  payloadSchemas,
  responseSchemas,
} from "./ipc-contract.js"

// allow: SIZE_OK - central renderer bridge registry mirrors the typed IPC contract.

export type { ElectronBridge, PingResponse }
export { PING_CHANNEL, PING_RESPONSE }

type InvokeIpc = (channel: IpcChannel, payload?: unknown) => Promise<unknown>
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

export function createElectronBridge(invoke: InvokeIpc): ElectronBridge {
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
      list: () =>
        request(
          ch.listHarnessTemplates,
          payload.listHarnessTemplates,
          response.listHarnessTemplates,
          undefined,
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
    },
  }
}
