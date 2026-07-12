import { readdir } from "node:fs/promises"
import { join } from "node:path"

import type {
  ExportPromptResult,
  ProjectContextCompilerBuildResult,
  ProjectContextProfile,
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
export const validProjectId = "44444444-4444-4444-8444-444444444444"
export const validProjectContextProfileId = "66666666-6666-4666-8666-666666666666"
export const projectContextProfileFixture: ProjectContextProfile = {
  id: validProjectContextProfileId,
  projectId: validProjectId,
  name: "Default Context",
  summary: "A safe project summary.",
  techStack: "TypeScript, Electron, SQLite",
  architectureNotes: null,
  codingConventions: null,
  constraints: null,
  forbiddenActions: null,
  acceptanceDefaults: null,
  validationCommands: "npm run typecheck",
  securityNotes: null,
  additionalContext: null,
  testingNotes: null,
  packageManager: "npm",
  defaultBranch: "main",
  repoPath: null,
  isDefault: true,
  createdAt: 1,
  updatedAt: 2,
}
export const projectContextCompilerBuildFixture: ProjectContextCompilerBuildResult = {
  profileId: validProjectContextProfileId,
  profileName: "Default Context",
  context: "## Project Context Profile\n\n### Summary\n\nA safe project summary.",
  sectionNames: ["Summary"],
  warnings: [],
}
const exportPromptResultFixture: ExportPromptResult = {
  format: "markdown",
  filename: "prompt-export.md",
  content: "# Prompt Export",
  mimeType: "text/markdown",
}

export function createFailingServices(onServiceCall: () => void) {
  const promptQualityFailure = (): never => {
    onServiceCall()
    throw new Error("prompt quality service should not be called")
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
  }
}
