import type {
  HarnessTemplate,
  ProjectContextCompilerBuildResult,
  PromptCompilerCompileOutput,
} from "../../../../electron/ipc-types"
import type { PromptScenario, TargetAgent } from "../prompter-options"

export type PromptCompilerInput = {
  readonly title?: string
  readonly originalInput: string
  readonly scenario: PromptScenario
  readonly targetAgent: TargetAgent
  readonly harnessTemplateId?: string | null
  readonly projectContextProfileId?: string | null
  readonly includeProjectContextProfile?: boolean
  readonly projectContextProfileBuildResult?: ProjectContextCompilerBuildResult | null
  readonly projectContext?: string
  readonly techStack?: string
  readonly constraints?: string
  readonly acceptanceCriteria?: string
  readonly validationCommands?: string
  readonly additionalNotes?: string
}

export type SaveableCompiledOutput = {
  readonly title: string
  readonly originalInput: string
  readonly compiledPrompt: string
  readonly scenario: PromptScenario
  readonly targetAgent: TargetAgent
  readonly summary?: string
  readonly assumptions: readonly string[]
  readonly questions?: PromptCompilerCompileOutput["questions"]
  readonly answers?: PromptCompilerCompileOutput["answers"]
  readonly acceptanceCriteria: readonly string[]
  readonly validationCommands: readonly string[]
}

export type CompiledPromptResult = SaveableCompiledOutput & {
  readonly suggestedTags?: readonly string[]
  readonly qualityScore?: number
  readonly warnings?: readonly string[]
}

export type PromptTemplateProvenance = {
  readonly templateId: string
  readonly templateName: string
  readonly sourcePromptAssetId: string | null
  readonly sourcePromptVersionId: string | null
}

export type LoadedHarnessTemplate = Pick<HarnessTemplate, "id" | "templateBody" | "requiredFields">
