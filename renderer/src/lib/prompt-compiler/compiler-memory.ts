import { emptyCompilerInput } from "./llm-compiler-flow"
import type { CompiledPromptResult, PromptCompilerInput } from "./types"

export type CompilerMemoryValue = {
  readonly draft: PromptCompilerInput
  readonly compiled: CompiledPromptResult | null
  readonly editablePrompt: string
}

export type CompilerMemory = {
  readonly current: () => CompilerMemoryValue
  readonly hasSnapshot: () => boolean
  readonly update: (value: CompilerMemoryValue) => void
}

export function createCompilerMemory(): CompilerMemory {
  let value: CompilerMemoryValue = {
    draft: emptyCompilerInput,
    compiled: null,
    editablePrompt: "",
  }
  let hasSnapshot = false
  return {
    current: () => value,
    hasSnapshot: () => hasSnapshot,
    update: (next) => {
      value = next
      hasSnapshot = true
    },
  }
}
