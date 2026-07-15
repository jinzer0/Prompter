import { readdir } from "node:fs/promises"
import { join } from "node:path"

import type {
  ProjectContextCompilerBuildResult,
  ProjectContextProfile,
  PromptCompilerAnalyzeResult,
  PromptCompilerCompileResult,
} from "../electron/ipc-types"

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
