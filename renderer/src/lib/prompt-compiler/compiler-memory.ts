import { emptyCompilerInput } from "./llm-compiler-flow"
import type { CompiledPromptResult, PromptCompilerInput } from "./types"

export type CompilerMemoryValue = {
  readonly draft: PromptCompilerInput
  readonly compiled: CompiledPromptResult | null
  readonly editablePrompt: string
}

export type SavedCompilerRefresh = {
  readonly promptAssetId: string
  readonly tagNames: readonly string[]
}

type SavedRefreshState = {
  readonly pending: readonly SavedCompilerRefresh[]
  readonly isRunning: boolean
}

export type CompilerMemory = {
  readonly current: () => CompilerMemoryValue
  readonly hasSnapshot: () => boolean
  readonly update: (value: CompilerMemoryValue) => void
  readonly savedRefreshState: () => SavedRefreshState
  readonly subscribeSavedRefresh: (listener: () => void) => () => void
  readonly enqueueSavedRefresh: (refresh: SavedCompilerRefresh) => void
  readonly completeSavedRefresh: (refresh: SavedCompilerRefresh) => void
  readonly beginSavedRefresh: () => boolean
  readonly endSavedRefresh: () => void
}

export function createCompilerMemory(): CompilerMemory {
  let value: CompilerMemoryValue = {
    draft: emptyCompilerInput,
    compiled: null,
    editablePrompt: "",
  }
  let hasSnapshot = false
  let refreshState: SavedRefreshState = { pending: [], isRunning: false }
  const listeners = new Set<() => void>()
  const updateRefresh = (next: SavedRefreshState) => {
    refreshState = next
    for (const listener of listeners) listener()
  }
  return {
    current: () => value,
    hasSnapshot: () => hasSnapshot,
    update: (next) => {
      value = next
      hasSnapshot = true
    },
    savedRefreshState: () => refreshState,
    subscribeSavedRefresh: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    enqueueSavedRefresh: (refresh) => {
      updateRefresh({ ...refreshState, pending: [...refreshState.pending, refresh] })
    },
    completeSavedRefresh: (refresh) => {
      updateRefresh({
        ...refreshState,
        pending: refreshState.pending.filter((item) => item !== refresh),
      })
    },
    beginSavedRefresh: () => {
      if (refreshState.isRunning) return false
      updateRefresh({ ...refreshState, isRunning: true })
      return true
    },
    endSavedRefresh: () => {
      updateRefresh({ ...refreshState, isRunning: false })
    },
  }
}
