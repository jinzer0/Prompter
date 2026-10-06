import type { SettingsRepository } from "./db/repositories/settings.js"
import { appThemeSchema, setSettingInputSchema, updateDefaultsInputSchema } from "./ipc-contract.js"
import type {
  AppearanceState,
  Setting,
  SettingsDefaults,
  UpdateDefaultsInput,
} from "./ipc-types.js"

export type AppearanceNativeTheme = {
  themeSource: AppearanceState["preference"]
  readonly shouldUseDarkColors: boolean
  on(event: "updated", listener: () => void): void
  removeListener(event: "updated", listener: () => void): void
}

type AppearanceServiceDependencies = {
  readonly nativeTheme: AppearanceNativeTheme
  readonly settings: Pick<SettingsRepository, "getDefaults" | "updateDefaults" | "setSetting">
}

export function createAppearanceService({ nativeTheme, settings }: AppearanceServiceDependencies) {
  let preference = appThemeSchema.parse(settings.getDefaults().appTheme)
  nativeTheme.themeSource = preference
  let state = currentState()
  let disposed = false
  const subscribers = new Set<(state: AppearanceState) => void>()

  function currentState(): AppearanceState {
    return {
      preference,
      effectiveTheme:
        preference === "system" ? (nativeTheme.shouldUseDarkColors ? "dark" : "light") : preference,
    }
  }

  function getState(): AppearanceState {
    return { ...state }
  }

  function publishState(): void {
    const next = currentState()
    if (next.preference === state.preference && next.effectiveTheme === state.effectiveTheme) {
      return
    }
    state = next
    for (const subscriber of subscribers) {
      subscriber(getState())
    }
  }

  function applyPreference(next: AppearanceState["preference"]): void {
    preference = next
    nativeTheme.themeSource = next
    publishState()
  }

  nativeTheme.on("updated", publishState)

  return {
    getState,
    subscribe(callback: (state: AppearanceState) => void): () => void {
      if (disposed) {
        return () => {}
      }
      subscribers.add(callback)
      return () => {
        subscribers.delete(callback)
      }
    },
    updateDefaults(input: UpdateDefaultsInput): SettingsDefaults {
      const parsed = updateDefaultsInputSchema.parse(input)
      const defaults = settings.updateDefaults(parsed)
      applyPreference(defaults.appTheme)
      return defaults
    },
    setSetting(key: string, value: string): Setting {
      const parsed = setSettingInputSchema.parse({ key, value })
      const next = parsed.key === "app_theme" ? appThemeSchema.parse(parsed.value) : undefined
      const setting = settings.setSetting(parsed.key, parsed.value)
      if (next !== undefined) {
        applyPreference(next)
      }
      return setting
    },
    dispose(): void {
      if (disposed) {
        return
      }
      disposed = true
      nativeTheme.removeListener("updated", publishState)
      subscribers.clear()
    },
  }
}
