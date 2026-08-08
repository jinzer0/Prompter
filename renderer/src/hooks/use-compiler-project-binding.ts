import { type Dispatch, type SetStateAction, useCallback, useReducer, useRef } from "react"

import {
  COMPILER_PROJECT_REBIND_REQUIRED_MESSAGE,
  type CompilerProjectAction,
  type CompilerProjectBindingEvent,
  type CompilerProjectTransitionResolution,
  compilerProjectActionIsAllowed,
  createCompilerProjectBinding,
  rebindCompilerDraft,
  reduceCompilerProjectBinding,
} from "../lib/compiler-project-binding"
import type { PromptCompilerInput } from "../lib/prompt-compiler/types"

type CompilerRebindInput = {
  readonly clearGeneratedState: () => void
  readonly draftRef: { current: PromptCompilerInput }
  readonly projectName: string | null
  readonly setDraft: Dispatch<SetStateAction<PromptCompilerInput>>
  readonly setMessage: (message: string | null) => void
}

export function useCompilerProjectBinding(projectId: string | null) {
  const [state, dispatch] = useReducer(
    reduceCompilerProjectBinding,
    projectId,
    createCompilerProjectBinding,
  )
  const stateRef = useRef(state)
  stateRef.current = state

  const update = useCallback((event: CompilerProjectBindingEvent): void => {
    stateRef.current = reduceCompilerProjectBinding(stateRef.current, event)
    dispatch(event)
  }, [])

  const handleProjectTransition = useCallback(
    (transition: CompilerProjectTransitionResolution): void => {
      switch (transition.kind) {
        case "preserve":
          update({ kind: "project_preserved", request: transition.request })
          return
        case "reset":
          update({ kind: "project_reset", projectId: transition.projectId })
          return
        case "unchanged":
          return
        default:
          transition satisfies never
      }
    },
    [update],
  )

  function actionIsAllowed(action: CompilerProjectAction): boolean {
    return compilerProjectActionIsAllowed(state, projectId, action)
  }

  const currentActionIsAllowed = useCallback(
    (action: CompilerProjectAction): boolean =>
      compilerProjectActionIsAllowed(stateRef.current, projectId, action),
    [projectId],
  )

  const rebind = useCallback(
    (input: CompilerRebindInput): boolean => {
      const current = stateRef.current
      if (
        current.kind !== "preserved_unbound" ||
        projectId === null ||
        current.targetProjectId !== projectId
      ) {
        input.setMessage(COMPILER_PROJECT_REBIND_REQUIRED_MESSAGE)
        return false
      }

      input.clearGeneratedState()
      const nextDraft = rebindCompilerDraft(input.draftRef.current)
      input.draftRef.current = nextDraft
      input.setDraft(nextDraft)
      update({ kind: "rebind_requested", projectId })
      input.setMessage(
        `Compiler rebound to ${input.projectName ?? "the current project"}. Recompile to save.`,
      )
      return true
    },
    [projectId, update],
  )

  return {
    actionIsAllowed,
    currentActionIsAllowed,
    handleProjectTransition,
    rebind,
    state,
  }
}
