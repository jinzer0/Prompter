import type { PromptScenario, TargetAgent } from "../prompter-options"

export type PromptCompilerInput = {
  readonly title?: string
  readonly originalInput: string
  readonly scenario: PromptScenario
  readonly targetAgent: TargetAgent
  readonly projectContext?: string
  readonly techStack?: string
  readonly constraints?: string
  readonly acceptanceCriteria?: string
  readonly validationCommands?: string
  readonly additionalNotes?: string
}

export type CompiledPromptResult = {
  readonly title: string
  readonly originalInput: string
  readonly compiledPrompt: string
  readonly scenario: PromptScenario
  readonly targetAgent: TargetAgent
  readonly assumptions: readonly string[]
  readonly acceptanceCriteria: readonly string[]
  readonly validationCommands: readonly string[]
  readonly qualityScore: number
}
