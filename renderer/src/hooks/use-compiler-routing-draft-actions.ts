import { type Dispatch, type SetStateAction, useCallback } from "react"

import type {
  CompilerProjectAction,
  CompilerProjectTransitionResolution,
} from "../lib/compiler-project-binding"
import { promptCompilerDraftChangeResetsStaleState } from "../lib/prompt-compiler/draft-state"
import type {
  CompilerDefaultRoutingPatch,
  CompilerRoutingFieldAuthorship,
} from "../lib/prompt-compiler/routing-field-authorship"
import type { PromptCompilerInput } from "../lib/prompt-compiler/types"

type UseCompilerRoutingDraftActionsConfig = {
  readonly authorship: CompilerRoutingFieldAuthorship
  readonly currentActionIsAllowed: (action: CompilerProjectAction) => boolean
  readonly draftRef: { current: PromptCompilerInput }
  readonly onProjectTransition: (transition: CompilerProjectTransitionResolution) => void
  readonly resetStaleDraftState: () => void
  readonly setDraft: Dispatch<SetStateAction<PromptCompilerInput>>
}

export function useCompilerRoutingDraftActions({
  authorship,
  currentActionIsAllowed,
  draftRef,
  onProjectTransition,
  resetStaleDraftState,
  setDraft,
}: UseCompilerRoutingDraftActionsConfig) {
  const applyCompilerDraft = useCallback(
    (next: PromptCompilerInput, markRoutingFieldChanges: boolean): void => {
      const current = draftRef.current

      if (markRoutingFieldChanges) {
        authorship.markChanged(current, next)
      }

      if (
        currentActionIsAllowed("compile_static") &&
        promptCompilerDraftChangeResetsStaleState(current, next)
      ) {
        resetStaleDraftState()
      }

      draftRef.current = next
      setDraft(next)
    },
    [authorship, currentActionIsAllowed, draftRef, resetStaleDraftState, setDraft],
  )

  const setCompilerDraft = useCallback<Dispatch<SetStateAction<PromptCompilerInput>>>(
    (update) => {
      const current = draftRef.current
      applyCompilerDraft(typeof update === "function" ? update(current) : update, true)
    },
    [applyCompilerDraft, draftRef],
  )

  const applyDefaultRoutingPatch = useCallback(
    (patch: CompilerDefaultRoutingPatch): void => {
      applyCompilerDraft({ ...draftRef.current, ...patch }, false)
    },
    [applyCompilerDraft, draftRef],
  )

  const handleProjectTransition = useCallback(
    (transition: CompilerProjectTransitionResolution): void => {
      if (transition.kind === "preserve") {
        authorship.markAllAuthored()
      }
      onProjectTransition(transition)
    },
    [authorship, onProjectTransition],
  )

  return { applyDefaultRoutingPatch, handleProjectTransition, setCompilerDraft }
}
