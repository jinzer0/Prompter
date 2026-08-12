import { useEffect, useReducer, useRef } from "react"

import type { PrivacyBridge, PrivacySettings } from "../../../electron/ipc-types"

export const DEFAULT_PRIVACY_SETTINGS = {
  warnBeforeLLM: true,
  warnBeforeExport: true,
  warnBeforeBackup: true,
  enableLibraryScan: true,
} as const satisfies PrivacySettings

export type PrivacySettingsKey = keyof PrivacySettings
export type PrivacySettingsBridge = Pick<PrivacyBridge, "getSettings" | "updateSettings">

export type PrivacySettingsState =
  | { readonly kind: "ready"; readonly settings: PrivacySettings }
  | { readonly kind: "loading"; readonly settings: PrivacySettings }
  | { readonly kind: "saving"; readonly settings: PrivacySettings }
  | { readonly kind: "saved"; readonly settings: PrivacySettings }
  | {
      readonly kind: "error"
      readonly settings: PrivacySettings
      readonly message: string
    }

export type PrivacySettingsEvent =
  | { readonly type: "setting_changed"; readonly key: PrivacySettingsKey; readonly value: boolean }
  | { readonly type: "load_started" }
  | { readonly type: "load_succeeded"; readonly settings: PrivacySettings }
  | { readonly type: "save_started" }
  | { readonly type: "save_succeeded"; readonly settings: PrivacySettings }
  | { readonly type: "operation_failed"; readonly message: string }

type PrivacySettingsCommand = {
  readonly bridge: Pick<PrivacyBridge, "updateSettings">
  readonly dispatch: (event: PrivacySettingsEvent) => void
  readonly settings: PrivacySettings
}

type PrivacySettingsLoadCommand = {
  readonly bridge: Pick<PrivacyBridge, "getSettings">
  readonly dispatch: (event: PrivacySettingsEvent) => void
}

function assertNever(value: never): never {
  throw new TypeError(`Unexpected privacy settings event: ${JSON.stringify(value)}`)
}

export function createInitialPrivacySettingsState(): PrivacySettingsState {
  return { kind: "ready", settings: DEFAULT_PRIVACY_SETTINGS }
}

export function privacySettingsReducer(
  state: PrivacySettingsState,
  event: PrivacySettingsEvent,
): PrivacySettingsState {
  switch (event.type) {
    case "setting_changed":
      return {
        kind: "ready",
        settings: { ...state.settings, [event.key]: event.value },
      }
    case "load_started":
      return { kind: "loading", settings: state.settings }
    case "load_succeeded":
      return { kind: "ready", settings: event.settings }
    case "save_started":
      return { kind: "saving", settings: state.settings }
    case "save_succeeded":
      return { kind: "saved", settings: event.settings }
    case "operation_failed":
      return { kind: "error", settings: state.settings, message: event.message }
    default:
      return assertNever(event)
  }
}

export async function loadPrivacySettings({
  bridge,
  dispatch,
}: PrivacySettingsLoadCommand): Promise<void> {
  dispatch({ type: "load_started" })
  try {
    const settings = await bridge.getSettings()
    dispatch({ type: "load_succeeded", settings })
  } catch (error) {
    if (!(error instanceof Error)) throw error
    dispatch({ type: "operation_failed", message: "Privacy settings could not be loaded." })
  }
}

export async function persistPrivacySettings({
  bridge,
  dispatch,
  settings,
}: PrivacySettingsCommand): Promise<void> {
  dispatch({ type: "save_started" })
  try {
    const updated = await bridge.updateSettings(settings)
    dispatch({ type: "save_succeeded", settings: updated })
  } catch (error) {
    if (!(error instanceof Error)) throw error
    dispatch({ type: "operation_failed", message: "Privacy settings could not be saved." })
  }
}

export type UsePrivacySettingsResult = {
  readonly canPersist: boolean
  readonly isSaving: boolean
  readonly isWorking: boolean
  readonly message: string | null
  readonly reload: () => Promise<void>
  readonly save: () => Promise<void>
  readonly setSetting: (key: PrivacySettingsKey, value: boolean) => void
  readonly settings: PrivacySettings
  readonly state: PrivacySettingsState
}

type PrivacySettingsPresentation = {
  readonly isSaving: boolean
  readonly isWorking: boolean
  readonly message: string | null
}

function privacySettingsPresentation(state: PrivacySettingsState): PrivacySettingsPresentation {
  switch (state.kind) {
    case "ready":
      return { isSaving: false, isWorking: false, message: null }
    case "loading":
      return { isSaving: false, isWorking: true, message: null }
    case "saving":
      return { isSaving: true, isWorking: true, message: null }
    case "saved":
      return { isSaving: false, isWorking: false, message: "Privacy settings saved." }
    case "error":
      return { isSaving: false, isWorking: false, message: state.message }
    default:
      return assertNever(state)
  }
}

export function usePrivacySettings(bridge: PrivacySettingsBridge | null): UsePrivacySettingsResult {
  const [state, dispatch] = useReducer(
    privacySettingsReducer,
    undefined,
    createInitialPrivacySettingsState,
  )
  const busy = useRef(false)

  useEffect(() => {
    if (bridge === null) return
    void loadPrivacySettings({ bridge, dispatch })
  }, [bridge])

  async function reload(): Promise<void> {
    if (bridge === null || busy.current) return
    busy.current = true
    try {
      await loadPrivacySettings({ bridge, dispatch })
    } finally {
      busy.current = false
    }
  }

  async function save(): Promise<void> {
    if (bridge === null || busy.current) return
    busy.current = true
    try {
      await persistPrivacySettings({ bridge, dispatch, settings: state.settings })
    } finally {
      busy.current = false
    }
  }

  const presentation = privacySettingsPresentation(state)

  return {
    canPersist: bridge !== null,
    isSaving: presentation.isSaving,
    isWorking: presentation.isWorking,
    message: presentation.message,
    reload,
    save,
    setSetting: (key, value) => dispatch({ type: "setting_changed", key, value }),
    settings: state.settings,
    state,
  }
}
