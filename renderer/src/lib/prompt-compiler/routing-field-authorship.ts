import type { PromptCompilerInput } from "./types"

export type CompilerRoutingFields = Pick<PromptCompilerInput, "scenario" | "targetAgent">

export type CompilerRoutingFieldGenerations = {
  readonly scenario: number
  readonly targetAgent: number
}

export type CompilerDefaultRoutingPatch = {
  readonly scenario?: PromptCompilerInput["scenario"]
  readonly targetAgent?: PromptCompilerInput["targetAgent"]
}

export type CompilerRoutingFieldAuthorship = {
  readonly current: () => CompilerRoutingFieldGenerations
  readonly markAllAuthored: () => void
  readonly markChanged: (current: CompilerRoutingFields, next: CompilerRoutingFields) => void
}

export function createCompilerRoutingFieldAuthorship(): CompilerRoutingFieldAuthorship {
  let generations: CompilerRoutingFieldGenerations = { scenario: 0, targetAgent: 0 }

  function markAllAuthored(): void {
    generations = {
      scenario: generations.scenario + 1,
      targetAgent: generations.targetAgent + 1,
    }
  }

  function markChanged(current: CompilerRoutingFields, next: CompilerRoutingFields): void {
    generations = {
      scenario: generations.scenario + (current.scenario === next.scenario ? 0 : 1),
      targetAgent: generations.targetAgent + (current.targetAgent === next.targetAgent ? 0 : 1),
    }
  }

  return { current: () => generations, markAllAuthored, markChanged }
}
