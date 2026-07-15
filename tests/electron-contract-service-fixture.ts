import type { ExportPromptResult } from "../electron/ipc-types"
import { createUnavailableOpenAIKeyStore } from "../electron/secrets/open-ai-key-store"
import {
  projectContextCompilerBuildFixture,
  projectContextProfileFixture,
  promptCompilerAnalyzeFixture,
  promptCompilerCompileFixture,
  settingsDefaultsFixture,
} from "./electron-contract-helpers"

const exportPromptResultFixture: ExportPromptResult = {
  format: "markdown",
  filename: "prompt-export.md",
  content: "# Prompt Export",
  mimeType: "text/markdown",
}

export function createFailingServices(onServiceCall: () => void) {
  const phase15Failure = (): never => {
    onServiceCall()
    throw new Error("Phase 15 service should not be called")
  }
  const promptQualityFailure = (): never => {
    onServiceCall()
    throw new Error("prompt quality service should not be called")
  }
  const backupFailure = async (): Promise<never> => {
    onServiceCall()
    throw new Error("backup service should not be called")
  }
  const maintenanceFailure = (): never => {
    onServiceCall()
    throw new Error("maintenance service should not be called")
  }

  return {
    createProject: () => {
      onServiceCall()
      throw new Error("repository should not be called")
    },
    listProjects: () => [],
    getProject: () => null,
    updateProject: () => {
      throw new Error("unused service")
    },
    deleteProject: (id: string) => ({ id }),
    createPromptAsset: () => {
      throw new Error("unused service")
    },
    createPromptWithInitialVersion: phase15Failure,
    duplicatePromptAsset: phase15Failure,
    createDerivedPromptAsset: phase15Failure,
    getLineage: phase15Failure,
    listPromptAssets: () => [],
    getPromptAsset: () => null,
    updatePromptAsset: () => {
      throw new Error("unused service")
    },
    deletePromptAsset: (id: string) => ({ id }),
    createPromptVersion: () => {
      onServiceCall()
      throw new Error("repository should not be called")
    },
    createNextPromptVersion: () => {
      onServiceCall()
      throw new Error("repository should not be called")
    },
    listPromptVersions: () => [],
    getPromptVersion: () => null,
    getCurrentPromptVersion: () => null,
    setCurrentPromptVersion: () => {
      throw new Error("unused service")
    },
    comparePromptVersions: () => {
      throw new Error("unused service")
    },
    createTag: () => {
      throw new Error("unused service")
    },
    listTags: () => [],
    updateTag: () => {
      throw new Error("unused service")
    },
    deleteTag: (id: string) => ({ id }),
    attachTagToPrompt: (promptAssetId: string, tagId: string) => ({ promptAssetId, tagId }),
    detachTagFromPrompt: (promptAssetId: string, tagId: string) => ({ promptAssetId, tagId }),
    listTagsForPrompt: () => [],
    listTagsWithCounts: () => [],
    createAndAttachTagToPrompt: (promptAssetId: string, input: { readonly name: string }) => ({
      promptAssetId,
      tagId: input.name,
    }),
    rebuildSearchIndex: () => {
      onServiceCall()
    },
    searchPrompts: () => {
      onServiceCall()
      return []
    },
    scanLibrary: maintenanceFailure,
    prepareAction: maintenanceFailure,
    executeAction: async () => maintenanceFailure(),
    cancelActionSession: maintenanceFailure,
    createHarnessTemplate: () => {
      throw new Error("unused service")
    },
    listHarnessTemplates: () => [],
    getHarnessTemplate: () => null,
    updateHarnessTemplate: () => {
      throw new Error("unused service")
    },
    deleteHarnessTemplate: (id: string) => ({ id }),
    createPromptTemplate: phase15Failure,
    listPromptTemplates: phase15Failure,
    getPromptTemplate: phase15Failure,
    updatePromptTemplate: phase15Failure,
    duplicatePromptTemplate: phase15Failure,
    deletePromptTemplate: phase15Failure,
    createPromptTemplateFromVersion: phase15Failure,
    createProjectContextProfile: () => {
      onServiceCall()
      throw new Error("repository should not be called")
    },
    listProjectContextProfiles: () => [],
    getProjectContextProfile: () => null,
    getDefaultProjectContextProfile: () => null,
    updateProjectContextProfile: () => {
      onServiceCall()
      throw new Error("repository should not be called")
    },
    deleteProjectContextProfile: (input: { readonly profileId: string }) => ({
      id: input.profileId,
    }),
    duplicateProjectContextProfile: () => projectContextProfileFixture,
    setDefaultProjectContextProfile: () => projectContextProfileFixture,
    buildCompilerContext: () => projectContextCompilerBuildFixture,
    getSetting: () => null,
    setSetting: (key: string, value: string) => ({ key, value, updatedAt: 1 }),
    listSettings: () => [],
    getDefaults: () => settingsDefaultsFixture,
    updateDefaults: () => settingsDefaultsFixture,
    ...createUnavailableOpenAIKeyStore(),
    async promptCompilerAnalyze() {
      onServiceCall()
      return promptCompilerAnalyzeFixture
    },
    async promptCompilerCompile() {
      onServiceCall()
      return promptCompilerCompileFixture
    },
    reviewPromptQualityDraft: promptQualityFailure,
    reviewPromptQualityWithLLM: async () => promptQualityFailure(),
    reviewPromptQualityVersion: promptQualityFailure,
    savePromptQualityReview: promptQualityFailure,
    listPromptQualityReviewsForVersion: promptQualityFailure,
    getLatestPromptQualityReview: promptQualityFailure,
    getPromptQualityReview: promptQualityFailure,
    applyPromptQualityScoreToVersion: promptQualityFailure,
    formatPromptForExport: () => {
      onServiceCall()
      return exportPromptResultFixture
    },
    async savePromptToFile() {
      onServiceCall()
      return { cancelled: true as const }
    },
    async copyText() {
      onServiceCall()
      return { copied: true as const }
    },
    async readText() {
      onServiceCall()
      return { text: "", isEmpty: true, length: 0 }
    },
    exportFullBackup: backupFailure,
    exportProjectBackup: backupFailure,
    exportPromptAssetsBackup: backupFailure,
    exportPromptTemplatesPack: backupFailure,
    exportHarnessTemplatesPack: backupFailure,
    validateBackupFile: backupFailure,
    importBackup: backupFailure,
    cancelImportSession: backupFailure,
  }
}
