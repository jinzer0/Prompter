import { readdir } from "node:fs/promises"
import { join } from "node:path"

import type {
  PromptCompilerAnalyzeResult,
  PromptCompilerCompileResult,
} from "../electron/ipc-types"
import { createUnavailableOpenAIKeyStore } from "../electron/secrets/open-ai-key-store"

export async function listFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const paths = await Promise.all(
    entries.map((entry) => {
      const filePath = join(directory, entry.name)

      if (entry.isDirectory()) {
        return listFiles(filePath)
      }

      return Promise.resolve([filePath])
    }),
  )

  return paths.flat()
}

export const validPromptAssetId = "11111111-1111-4111-8111-111111111111"
export const settingsDefaultsFixture = {
  defaultModel: "gpt-4.1",
  defaultTargetAgent: "codex",
  defaultProjectId: null,
  defaultScenario: "feature",
  appTheme: "system",
  compilerDefaultLanguage: "ko",
} as const
export const promptCompilerAnalyzeFixture: PromptCompilerAnalyzeResult = {
  ok: true,
  value: {
    detectedScenario: "feature",
    detectedTargetAgent: "codex",
    summary: "Build a focused feature prompt.",
    clarificationNeeded: false,
    questions: [],
    assumptions: ["The agent can inspect the repository."],
    suggestedTags: ["feature"],
    riskLevel: "low",
  },
}
export const promptCompilerCompileFixture: PromptCompilerCompileResult = {
  ok: true,
  value: {
    title: "Build a focused feature prompt",
    scenario: "feature",
    targetAgent: "codex",
    summary: "Generate an agent-ready implementation prompt.",
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
    acceptanceCriteria: ["The prompt is ready to hand to an agent."],
    validationCommands: ["npm run typecheck"],
    suggestedTags: ["feature"],
    qualityScore: 80,
    warnings: [],
  },
}

export function createFailingServices(onServiceCall: () => void) {
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
    createHarnessTemplate: () => {
      throw new Error("unused service")
    },
    listHarnessTemplates: () => [],
    getHarnessTemplate: () => null,
    updateHarnessTemplate: () => {
      throw new Error("unused service")
    },
    deleteHarnessTemplate: (id: string) => ({ id }),
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
    async analyze() {
      return promptCompilerAnalyzeFixture
    },
    async compile() {
      return promptCompilerCompileFixture
    },
  }
}
