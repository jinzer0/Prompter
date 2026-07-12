import { describe, expect, it } from "vitest"

import { createElectronBridge } from "../electron/bridge"
import { createPersistenceIpcHandlers } from "../electron/ipc-handlers"
import type {
  PromptCompilerAnalyzeResult,
  PromptCompilerCompileResult,
} from "../electron/ipc-types"

// allow: SIZE_OK - central Phase 9 settings and secrets contract uses a complete IPC service fake.

const validProjectId = "22222222-2222-4222-8222-222222222222"
const phase9SecretStatus = {
  hasKey: true,
  maskedKey: "sk-proj-••••••••••••••••7890",
  updatedAt: 1,
}
const phase9Defaults = {
  defaultModel: "gpt-4.1",
  defaultTargetAgent: "codex",
  defaultProjectId: null,
  defaultScenario: "feature",
  appTheme: "system",
  compilerDefaultLanguage: "ko",
} as const
const promptCompilerAnalyzeFixture: PromptCompilerAnalyzeResult = {
  ok: true,
  value: {
    detectedScenario: "feature",
    detectedTargetAgent: "codex",
    summary: "Analyze prompt.",
    clarificationNeeded: false,
    questions: [],
    assumptions: [],
    suggestedTags: [],
    riskLevel: "low",
  },
}
const promptCompilerCompileFixture: PromptCompilerCompileResult = {
  ok: true,
  value: {
    title: "Compile prompt",
    scenario: "feature",
    targetAgent: "codex",
    summary: "Compile prompt.",
    compiledPrompt: [
      "# Objective",
      "# Context",
      "# Task",
      "# Scope",
      "# Constraints",
      "# Acceptance Criteria",
      "# Validation",
      "# Working Instructions",
      "# Final Response Format",
    ].join("\n\n"),
    assumptions: [],
    questions: [],
    answers: [],
    acceptanceCriteria: [],
    validationCommands: [],
    suggestedTags: [],
    qualityScore: 80,
    warnings: [],
  },
}

function createPhase9Services(onServiceCall: () => void) {
  const promptQualityFailure = (): never => {
    onServiceCall()
    throw new Error("unused service")
  }

  return {
    createProject: () => {
      throw new Error("unused service")
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
    listPromptAssets: () => [],
    getPromptAsset: () => null,
    updatePromptAsset: () => {
      throw new Error("unused service")
    },
    deletePromptAsset: (id: string) => ({ id }),
    createPromptVersion: () => {
      throw new Error("unused service")
    },
    createNextPromptVersion: () => {
      throw new Error("unused service")
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
    createAndAttachTagToPrompt: () => {
      throw new Error("unused service")
    },
    rebuildSearchIndex: () => undefined,
    searchPrompts: () => [],
    createHarnessTemplate: () => {
      throw new Error("unused service")
    },
    listHarnessTemplates: () => [],
    getHarnessTemplate: () => null,
    updateHarnessTemplate: () => {
      throw new Error("unused service")
    },
    deleteHarnessTemplate: (id: string) => ({ id }),
    createProjectContextProfile: () => {
      throw new Error("unused service")
    },
    listProjectContextProfiles: () => [],
    getProjectContextProfile: () => null,
    getDefaultProjectContextProfile: () => null,
    updateProjectContextProfile: () => {
      throw new Error("unused service")
    },
    deleteProjectContextProfile: (input: { readonly profileId: string }) => ({
      id: input.profileId,
    }),
    duplicateProjectContextProfile: () => {
      throw new Error("unused service")
    },
    setDefaultProjectContextProfile: () => {
      throw new Error("unused service")
    },
    buildCompilerContext: () => ({
      profileId: null,
      profileName: null,
      context: null,
      sectionNames: [],
      warnings: ["Selected project context profile is unavailable; profile context was excluded."],
    }),
    getSetting: () => null,
    setSetting: (key: string, value: string) => ({ key, value, updatedAt: 1 }),
    listSettings: () => [],
    getDefaults: () => phase9Defaults,
    updateDefaults: () => phase9Defaults,
    async saveOpenAIKey() {
      onServiceCall()
      return phase9SecretStatus
    },
    async hasOpenAIKey() {
      return false
    },
    async getOpenAIKeyStatus() {
      return { hasKey: false, maskedKey: null, updatedAt: null }
    },
    async deleteOpenAIKey() {
      return { hasKey: false, maskedKey: null, updatedAt: null }
    },
    async getOpenAIKeyForMainProcessOnly() {
      return null
    },
    async promptCompilerAnalyze() {
      return promptCompilerAnalyzeFixture
    },
    async promptCompilerCompile() {
      return promptCompilerCompileFixture
    },
    async analyze() {
      return promptCompilerAnalyzeFixture
    },
    async compile() {
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
    formatPromptForExport: () => ({
      format: "markdown" as const,
      filename: "prompt-export.md",
      content: "# Prompt Export",
      mimeType: "text/markdown" as const,
    }),
    async savePromptToFile() {
      return { cancelled: true as const }
    },
    async copyText() {
      return { copied: true as const }
    },
    async readText() {
      return { text: "", isEmpty: true, length: 0 }
    },
  }
}

describe("Phase 9 settings and secrets contract", () => {
  it("exposes defaults and secret status without a plaintext key getter", async () => {
    const bridge = createElectronBridge(async (channel) => {
      if (channel === "prompter:settings:defaults") {
        return phase9Defaults
      }

      if (channel === "prompter:secrets:openai-key:status") {
        return phase9SecretStatus
      }

      throw new Error(`Unexpected channel ${channel}`)
    })

    expect(Object.keys(bridge.settings)).toEqual([
      "get",
      "set",
      "list",
      "getDefaults",
      "updateDefaults",
    ])
    expect(Object.keys(bridge.secrets)).toEqual([
      "saveOpenAIKey",
      "hasOpenAIKey",
      "getOpenAIKeyStatus",
      "deleteOpenAIKey",
    ])
    expect(Object.keys(bridge.secrets)).not.toContain("getOpenAIKey")
    await expect(bridge.settings.getDefaults()).resolves.toEqual(phase9Defaults)
    await expect(bridge.secrets.getOpenAIKeyStatus()).resolves.toEqual(phase9SecretStatus)
  })

  it("rejects malformed Phase 9 IPC payloads before service calls", () => {
    let called = false
    const handlers = createPersistenceIpcHandlers(
      createPhase9Services(() => {
        called = true
      }),
    )

    expect(() => handlers.setSetting({ key: "openai_api_key", value: "sk-secret" })).toThrow()
    expect(() => handlers.setSetting({ key: "open_ai_key", value: "sk-secret" })).toThrow()
    expect(() => handlers.setSetting({ key: "api-key", value: "sk-secret" })).toThrow()
    expect(() => handlers.updateDefaults({ defaultTargetAgent: "unknown" })).toThrow()
    expect(() => handlers.updateDefaults({ defaultProjectId: "not-a-uuid" })).toThrow()
    expect(() => handlers.updateDefaults({ defaultProjectId: validProjectId })).not.toThrow()
    expect(() => handlers.saveOpenAIKey({ apiKey: "   " })).toThrow()
    expect(() => handlers.saveOpenAIKey({ apiKey: "sk-short" })).toThrow()
    expect(called).toBe(false)
  })
})
