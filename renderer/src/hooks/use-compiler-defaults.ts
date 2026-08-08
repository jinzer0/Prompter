import { useEffect, useRef } from "react"

import type { SettingsDefaults } from "../../../electron/ipc-types"
import type {
  CompilerDefaultRoutingPatch,
  CompilerRoutingFieldGenerations,
} from "../lib/prompt-compiler/routing-field-authorship"

type CompilerDefaultsLoaderConfig = {
  readonly applyDefaultRoutingPatch: (patch: CompilerDefaultRoutingPatch) => void
  readonly getDefaults: () => Promise<SettingsDefaults>
  readonly getRoutingFieldGenerations: () => CompilerRoutingFieldGenerations
  readonly setMessage: (message: string | null) => void
}

export function createCompilerDefaultsLoader(config: CompilerDefaultsLoaderConfig) {
  let isActive = true

  async function loadDefaults(): Promise<void> {
    const requestedGenerations = config.getRoutingFieldGenerations()

    try {
      const defaults = await config.getDefaults()

      if (!isActive) {
        return
      }

      const currentGenerations = config.getRoutingFieldGenerations()
      const patch = {
        ...(requestedGenerations.scenario === currentGenerations.scenario
          ? { scenario: defaults.defaultScenario }
          : {}),
        ...(requestedGenerations.targetAgent === currentGenerations.targetAgent
          ? { targetAgent: defaults.defaultTargetAgent }
          : {}),
      }

      if (patch.scenario !== undefined || patch.targetAgent !== undefined) {
        config.applyDefaultRoutingPatch(patch)
      }
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      if (isActive) {
        config.setMessage("Compiler defaults could not be loaded.")
      }
    }
  }

  return {
    dispose: () => {
      isActive = false
    },
    loadDefaults,
  }
}

type UseCompilerDefaultsConfig = Omit<CompilerDefaultsLoaderConfig, "getDefaults">

export function useCompilerDefaults(config: UseCompilerDefaultsConfig): void {
  const configRef = useRef(config)
  configRef.current = config

  useEffect(() => {
    const loader = createCompilerDefaultsLoader({
      applyDefaultRoutingPatch: (patch) => configRef.current.applyDefaultRoutingPatch(patch),
      getDefaults: () => window.prompter.settings.getDefaults(),
      getRoutingFieldGenerations: () => configRef.current.getRoutingFieldGenerations(),
      setMessage: (message) => configRef.current.setMessage(message),
    })

    void loader.loadDefaults()

    return loader.dispose
  }, [])
}
