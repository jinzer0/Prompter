import type {
  ExportFormat,
  FormatPromptForExportInput,
  Project,
  PromptAsset,
  PromptVersion,
} from "../../../electron/ipc-types"
import type { CompiledPromptResult } from "./prompt-compiler/types"
import type { PromptVersionMetadata } from "./prompt-version-diff"

export type PromptExportChoice = "raw" | ExportFormat
export type PromptExportBase = Omit<FormatPromptForExportInput, "format">

export const promptExportOptions = [
  { value: "raw", label: "Compiled prompt raw" },
  { value: "codex", label: "Codex Prompt" },
  { value: "claude_code", label: "Claude Code Prompt" },
  { value: "cursor", label: "Cursor Prompt" },
  { value: "markdown", label: "Markdown Prompt" },
  { value: "generic_agent", label: "Generic Agent Prompt" },
  { value: "agents_md", label: "AGENTS.md Snippet" },
  { value: "skill_md", label: "SKILL.md Draft" },
] as const satisfies readonly { readonly value: PromptExportChoice; readonly label: string }[]

export const promptExportChoiceLabels: Record<PromptExportChoice, string> = {
  raw: "Compiled prompt raw",
  markdown: "Markdown Prompt",
  codex: "Codex Prompt",
  claude_code: "Claude Code Prompt",
  cursor: "Cursor Prompt",
  generic_agent: "Generic Agent Prompt",
  agents_md: "AGENTS.md Snippet",
  skill_md: "SKILL.md Draft",
}

const unsavedPromptVersionId = "00000000-0000-4000-8000-000000000000"

function mutableLines(lines: readonly string[]): string[] {
  return [...lines]
}

export function parsePromptExportChoice(value: string): PromptExportChoice {
  switch (value) {
    case "raw":
      return "raw"
    case "markdown":
      return "markdown"
    case "codex":
      return "codex"
    case "claude_code":
      return "claude_code"
    case "cursor":
      return "cursor"
    case "generic_agent":
      return "generic_agent"
    case "agents_md":
      return "agents_md"
    case "skill_md":
      return "skill_md"
    default:
      return "raw"
  }
}

export function exportBaseFromCompiled(
  compiled: CompiledPromptResult,
  compiledPrompt: string,
  selectedProject: Project | null,
): PromptExportBase {
  return {
    promptVersionId: unsavedPromptVersionId,
    title: compiled.title,
    scenario: compiled.scenario,
    targetAgent: compiled.targetAgent,
    originalInput: compiled.originalInput,
    compiledPrompt,
    assumptions: mutableLines(compiled.assumptions),
    questions: compiled.questions,
    answers: compiled.answers,
    acceptanceCriteria: mutableLines(compiled.acceptanceCriteria),
    validationCommands: mutableLines(compiled.validationCommands),
    projectName: selectedProject?.name ?? null,
    qualityScore: compiled.qualityScore,
  }
}

export type VersionExportBaseInput = {
  readonly metadata: PromptVersionMetadata
  readonly projectName: string | null
  readonly selectedAsset: PromptAsset
  readonly selectedVersion: PromptVersion
}

export function exportBaseFromVersion({
  metadata,
  projectName,
  selectedAsset,
  selectedVersion,
}: VersionExportBaseInput): PromptExportBase {
  return {
    promptAssetId: selectedAsset.id,
    promptVersionId: selectedVersion.id,
    title: selectedAsset.title,
    scenario: selectedAsset.scenario,
    targetAgent: selectedAsset.targetAgent,
    originalInput: selectedVersion.originalInput,
    compiledPrompt: selectedVersion.compiledPrompt,
    assumptions: mutableLines(metadata.assumptions),
    acceptanceCriteria: mutableLines(metadata.acceptanceCriteria),
    validationCommands: mutableLines(metadata.validationCommands),
    projectName,
    qualityScore: metadata.qualityScore,
    createdAt: selectedVersion.createdAt,
    updatedAt: selectedAsset.updatedAt,
  }
}
