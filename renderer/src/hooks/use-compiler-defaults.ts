import { useEffect } from "react"

import type { PromptCompilerInput } from "../lib/prompt-compiler/types"

type SetDraft = (update: (current: PromptCompilerInput) => PromptCompilerInput) => void
type SetMessage = (message: string | null) => void

export function useCompilerDefaults(setDraft: SetDraft, setMessage: SetMessage): void {
  useEffect(() => {
    let isActive = true

    async function loadDefaults(): Promise<void> {
      try {
        const defaults = await window.prompter.settings.getDefaults()

        if (isActive) {
          setDraft((current) => ({
            ...current,
            scenario: defaults.defaultScenario,
            targetAgent: defaults.defaultTargetAgent,
          }))
        }
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error
        }

        if (isActive) {
          setMessage("Compiler defaults could not be loaded.")
        }
      }
    }

    void loadDefaults()

    return () => {
      isActive = false
    }
  }, [setDraft, setMessage])
}
