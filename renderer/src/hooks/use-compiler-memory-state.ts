import { useCallback, useState } from "react"

import type { CompilerMemory } from "../lib/prompt-compiler/compiler-memory"
import type { CompiledPromptResult, PromptCompilerInput } from "../lib/prompt-compiler/types"

export function useCompilerMemoryState(memory: CompilerMemory) {
  const initial = memory.current()
  const [draft, setDraftState] = useState<PromptCompilerInput>(initial.draft)
  const [compiled, setCompiledState] = useState<CompiledPromptResult | null>(initial.compiled)
  const [editablePrompt, setEditablePromptState] = useState(initial.editablePrompt)

  const setDraft: typeof setDraftState = useCallback(
    (update) => {
      setDraftState((current) => {
        const next = typeof update === "function" ? update(current) : update
        memory.update({ ...memory.current(), draft: next })
        return next
      })
    },
    [memory],
  )

  const setCompiled: typeof setCompiledState = useCallback(
    (update) => {
      setCompiledState((current) => {
        const next = typeof update === "function" ? update(current) : update
        memory.update({ ...memory.current(), compiled: next })
        return next
      })
    },
    [memory],
  )

  const setEditablePrompt = useCallback(
    (prompt: string): void => {
      memory.update({ ...memory.current(), editablePrompt: prompt })
      setEditablePromptState(prompt)
    },
    [memory],
  )

  return { compiled, draft, editablePrompt, setCompiled, setDraft, setEditablePrompt }
}
