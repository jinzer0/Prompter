import { ipcMain } from "electron"

import type { PersistenceServices } from "./db/services.js"
import {
  PERSISTENCE_CHANNELS,
  PING_CHANNEL,
  PING_RESPONSE,
  payloadSchemas,
} from "./ipc-contract.js"

export function createPersistenceIpcHandlers(services: PersistenceServices) {
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
    listPromptVersions: (payload: unknown) =>
      services.listPromptVersions(payloadSchemas.listPromptVersions.parse(payload).id),
    getPromptVersion: (payload: unknown) =>
      services.getPromptVersion(payloadSchemas.getPromptVersion.parse(payload).id),
    setCurrentPromptVersion: (payload: unknown) => {
      const parsed = payloadSchemas.setCurrentPromptVersion.parse(payload)
      return services.setCurrentPromptVersion(parsed.promptAssetId, parsed.versionId)
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
    createHarnessTemplate: (payload: unknown) =>
      services.createHarnessTemplate(payloadSchemas.createHarnessTemplate.parse(payload)),
    listHarnessTemplates: (payload: unknown) => {
      payloadSchemas.listHarnessTemplates.parse(payload)
      return services.listHarnessTemplates()
    },
    getHarnessTemplate: (payload: unknown) =>
      services.getHarnessTemplate(payloadSchemas.getHarnessTemplate.parse(payload).id),
    updateHarnessTemplate: (payload: unknown) => {
      const parsed = payloadSchemas.updateHarnessTemplate.parse(payload)
      return services.updateHarnessTemplate(parsed.id, parsed.input)
    },
    deleteHarnessTemplate: (payload: unknown) =>
      services.deleteHarnessTemplate(payloadSchemas.deleteHarnessTemplate.parse(payload).id),
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
  }
}

export function registerIpcHandlers(services: PersistenceServices): void {
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
  ipcMain.handle(PERSISTENCE_CHANNELS.listPromptVersions, (_event, payload) =>
    handlers.listPromptVersions(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.getPromptVersion, (_event, payload) =>
    handlers.getPromptVersion(payload),
  )
  ipcMain.handle(PERSISTENCE_CHANNELS.setCurrentPromptVersion, (_event, payload) =>
    handlers.setCurrentPromptVersion(payload),
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
  ipcMain.handle(PERSISTENCE_CHANNELS.getSetting, (_event, payload) => handlers.getSetting(payload))
  ipcMain.handle(PERSISTENCE_CHANNELS.setSetting, (_event, payload) => handlers.setSetting(payload))
  ipcMain.handle(PERSISTENCE_CHANNELS.listSettings, (_event, payload) =>
    handlers.listSettings(payload),
  )
}
