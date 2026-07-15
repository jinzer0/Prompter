import { type Dispatch, type SetStateAction, useCallback, useState } from "react"

import type { PromptCompilerInput } from "../lib/prompt-compiler/types"
import type { PromptDerivationDraft } from "../lib/prompt-derivation"
import type { DerivedPromptSaveSource } from "./use-compiler-persistence-actions"

type UseDerivedCompilerDraftConfig = {
  readonly clearSuggestedTags: () => void
  readonly draftRef: { current: PromptCompilerInput }
  readonly replaceEditablePrompt: (prompt: string) => number
  readonly resetTemplateDraft: () => void
  readonly setCompiled: Dispatch<SetStateAction<PromptDerivationDraft["compiled"] | null>>
  readonly setDraft: Dispatch<SetStateAction<PromptCompilerInput>>
  readonly setMessage: Dispatch<SetStateAction<string | null>>
}

export function useDerivedCompilerDraft({
  clearSuggestedTags,
  draftRef,
  replaceEditablePrompt,
  resetTemplateDraft,
  setCompiled,
  setDraft,
  setMessage,
}: UseDerivedCompilerDraftConfig) {
  const [source, setSource] = useState<DerivedPromptSaveSource | null>(null)
  const [sourceTitle, setSourceTitle] = useState<string | null>(null)

  const clearDerivedPrompt = useCallback((): void => {
    setSource(null)
    setSourceTitle(null)
  }, [])

  function seedDerivedPrompt(derivation: PromptDerivationDraft): void {
    draftRef.current = derivation.draft
    setDraft(derivation.draft)
    setCompiled(derivation.compiled)
    replaceEditablePrompt(derivation.editablePrompt)
    resetTemplateDraft()
    setSource({
      sourcePromptAssetId: derivation.sourcePromptAssetId,
      sourcePromptVersionId: derivation.sourcePromptVersionId,
    })
    setSourceTitle(derivation.sourceTitle)
    clearSuggestedTags()
    setMessage(`Derived draft seeded from ${derivation.sourceTitle}. Save when ready.`)
  }

  return { clearDerivedPrompt, seedDerivedPrompt, source, sourceTitle }
}
