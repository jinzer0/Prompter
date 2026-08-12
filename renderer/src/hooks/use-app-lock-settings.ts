import { useCallback, useEffect, useRef, useState } from "react"

import type {
  AppLockSettings,
  ChangeAppLockPassphraseInput,
  ElectronBridge,
  SetupAppLockInput,
} from "../../../electron/ipc-types"

export type AppLockSettingsPhase = "loading" | "ready" | "error" | "working"

export function createLatestRequestGuard() {
  let mounted = true
  let revision = 0
  return {
    begin: () => {
      revision += 1
      const requestRevision = revision
      return { isCurrent: () => mounted && revision === requestRevision }
    },
    mount: () => {
      mounted = true
    },
    unmount: () => {
      mounted = false
      revision += 1
    },
  }
}

type AsyncPhaseOperationOptions<TResult> = {
  readonly isCurrent: () => boolean
  readonly operation: () => Promise<TResult>
  readonly setPhase: (phase: AppLockSettingsPhase) => void
}

export function settleAsyncPhase(
  isCurrent: () => boolean,
  setPhase: (phase: AppLockSettingsPhase) => void,
): void {
  if (isCurrent()) setPhase("ready")
}

export async function runAsyncPhaseOperation<TResult>(
  options: AsyncPhaseOperationOptions<TResult>,
): Promise<TResult> {
  options.setPhase("working")
  try {
    return await options.operation()
  } finally {
    settleAsyncPhase(options.isCurrent, options.setPhase)
  }
}

export type AppLockSettingsController = {
  readonly phase: AppLockSettingsPhase
  readonly settings: AppLockSettings | null
  readonly message: string | null
  readonly setSetting: (key: "lockOnStart" | "timeoutMinutes", value: boolean | number) => void
  readonly setup: (
    input: Pick<SetupAppLockInput, "passphrase" | "confirmation">,
  ) => Promise<boolean>
  readonly lockNow: () => Promise<void>
  readonly saveSettings: () => Promise<void>
  readonly changePassphrase: (input: ChangeAppLockPassphraseInput) => Promise<boolean>
  readonly disable: (passphrase: string) => Promise<boolean>
  readonly reload: () => Promise<void>
}

type UseAppLockSettingsOptions = {
  readonly bridge: ElectronBridge["appLock"]
  readonly onStateChange: () => Promise<void>
}

export function useAppLockSettings({
  bridge,
  onStateChange,
}: UseAppLockSettingsOptions): AppLockSettingsController {
  const [phase, setPhase] = useState<AppLockSettingsPhase>("loading")
  const [settings, setSettings] = useState<AppLockSettings | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const guardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(null)
  if (guardRef.current === null) guardRef.current = createLatestRequestGuard()
  const guard = guardRef.current

  const reload = useCallback(async (): Promise<void> => {
    const request = guard.begin()
    setPhase("loading")
    try {
      const loaded = await bridge.getSettings()
      if (!request.isCurrent()) return
      setSettings(loaded)
      setMessage(null)
      setPhase("ready")
    } catch (error) {
      if (!(error instanceof Error)) throw error
      if (!request.isCurrent()) return
      setMessage("App-lock settings could not be loaded.")
      setPhase("error")
    }
  }, [bridge, guard])

  useEffect(() => {
    guard.mount()
    void reload()
    return guard.unmount
  }, [guard, reload])

  function setSetting(key: "lockOnStart" | "timeoutMinutes", value: boolean | number): void {
    setSettings((current) => (current === null ? null : { ...current, [key]: value }))
  }

  async function setup(
    input: Pick<SetupAppLockInput, "passphrase" | "confirmation">,
  ): Promise<boolean> {
    if (
      settings === null ||
      !Number.isInteger(settings.timeoutMinutes) ||
      settings.timeoutMinutes < 1 ||
      settings.timeoutMinutes > 240
    ) {
      setMessage("Inactivity timeout must be a whole number from 1 to 240.")
      return false
    }
    const request = guard.begin()
    setPhase("working")
    try {
      await bridge.setup({
        ...input,
        lockOnStart: settings.lockOnStart,
        timeoutMinutes: settings.timeoutMinutes,
        requireForBackup: true,
        requireForExport: true,
        requireForLlm: true,
      })
      const loaded = await bridge.getSettings()
      if (!request.isCurrent()) return false
      setSettings(loaded)
      setMessage("App lock enabled.")
      await onStateChange()
      return true
    } catch (error) {
      if (!(error instanceof Error)) throw error
      if (!request.isCurrent()) return false
      setMessage("App lock could not be enabled.")
      return false
    } finally {
      settleAsyncPhase(request.isCurrent, setPhase)
    }
  }

  async function lockNow(): Promise<void> {
    const request = guard.begin()
    try {
      await runAsyncPhaseOperation({
        isCurrent: request.isCurrent,
        operation: async () => {
          await bridge.lock()
          if (request.isCurrent()) await onStateChange()
        },
        setPhase,
      })
    } catch (error) {
      if (!(error instanceof Error)) throw error
      if (request.isCurrent()) setMessage("Prompter could not be locked.")
    }
  }

  async function saveSettings(): Promise<void> {
    if (
      settings === null ||
      !Number.isInteger(settings.timeoutMinutes) ||
      settings.timeoutMinutes < 1 ||
      settings.timeoutMinutes > 240
    ) {
      setMessage("Inactivity timeout must be a whole number from 1 to 240.")
      return
    }
    const request = guard.begin()
    setPhase("working")
    try {
      const updated = await bridge.updateSettings({
        lockOnStart: settings.lockOnStart,
        timeoutMinutes: settings.timeoutMinutes,
      })
      if (!request.isCurrent()) return
      if (updated === null) {
        setMessage("App-lock settings could not be saved.")
        return
      }
      setSettings(updated)
      setMessage("App-lock settings saved.")
      await onStateChange()
    } catch (error) {
      if (!(error instanceof Error)) throw error
      if (request.isCurrent()) setMessage("App-lock settings could not be saved.")
    } finally {
      settleAsyncPhase(request.isCurrent, setPhase)
    }
  }

  async function changePassphrase(input: ChangeAppLockPassphraseInput): Promise<boolean> {
    const request = guard.begin()
    setPhase("working")
    try {
      const changed = await bridge.changePassphrase(input)
      if (!request.isCurrent()) return false
      setMessage(changed ? "Passphrase changed." : "Current passphrase was not accepted.")
      return changed
    } catch (error) {
      if (!(error instanceof Error)) throw error
      if (request.isCurrent()) setMessage("Passphrase could not be changed.")
      return false
    } finally {
      settleAsyncPhase(request.isCurrent, setPhase)
    }
  }

  async function disable(passphrase: string): Promise<boolean> {
    const request = guard.begin()
    setPhase("working")
    try {
      const disabled = await bridge.disable({ passphrase })
      if (!request.isCurrent()) return false
      if (disabled) setSettings(await bridge.getSettings())
      if (!request.isCurrent()) return false
      setMessage(disabled ? "App lock disabled." : "Current passphrase was not accepted.")
      if (disabled) await onStateChange()
      return disabled
    } catch (error) {
      if (!(error instanceof Error)) throw error
      if (request.isCurrent()) setMessage("App lock could not be disabled.")
      return false
    } finally {
      settleAsyncPhase(request.isCurrent, setPhase)
    }
  }

  return {
    phase,
    settings,
    message,
    setSetting,
    setup,
    lockNow,
    saveSettings,
    changePassphrase,
    disable,
    reload,
  }
}
