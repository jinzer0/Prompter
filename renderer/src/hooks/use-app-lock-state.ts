import { useCallback, useEffect, useRef, useState } from "react"

import type { AppLockState, ElectronBridge } from "../../../electron/ipc-types"
import { createLatestRequestGuard } from "./use-app-lock-settings"

export type AppLockPhase =
  | { readonly kind: "loading" }
  | { readonly kind: "protected_error" }
  | { readonly kind: "locked"; readonly state: AppLockState }
  | { readonly kind: "unlocked"; readonly state: AppLockState }

type StateBridge = Pick<ElectronBridge["appLock"], "getState">

export async function getProtectedAppLockState(bridge: StateBridge): Promise<AppLockPhase> {
  return bridge.getState().then(
    (state) => (state.locked ? { kind: "locked", state } : { kind: "unlocked", state }),
    () => ({ kind: "protected_error" }),
  )
}

type UnlockAppOptions = {
  readonly clearPassphrase: () => void
  readonly passphrase: string
  readonly unlock: (passphrase: string) => Promise<boolean>
}

export async function unlockApp(options: UnlockAppOptions): Promise<boolean> {
  options.clearPassphrase()
  return options.unlock(options.passphrase)
}

type AppLockPhaseRequestOptions = {
  readonly guard: ReturnType<typeof createLatestRequestGuard>
  readonly operation: () => Promise<AppLockPhase>
  readonly setPhase: (phase: AppLockPhase) => void
}

export async function runLatestAppLockPhaseRequest(
  options: AppLockPhaseRequestOptions,
): Promise<void> {
  const request = options.guard.begin()
  const nextPhase = await options.operation()
  if (request.isCurrent()) options.setPhase(nextPhase)
}

export type UseAppLockStateResult = {
  readonly phase: AppLockPhase
  readonly lock: () => Promise<void>
  readonly refresh: () => Promise<void>
  readonly unlock: (passphrase: string) => Promise<boolean>
}

export function useAppLockState(bridge: ElectronBridge["appLock"]): UseAppLockStateResult {
  const [phase, setPhase] = useState<AppLockPhase>({ kind: "loading" })
  const guardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(null)
  if (guardRef.current === null) guardRef.current = createLatestRequestGuard()
  const guard = guardRef.current

  const refresh = useCallback(async (): Promise<void> => {
    await runLatestAppLockPhaseRequest({
      guard,
      operation: () => getProtectedAppLockState(bridge),
      setPhase,
    })
  }, [bridge, guard])

  useEffect(() => {
    guard.mount()
    void refresh()
    return guard.unmount
  }, [guard, refresh])

  const lock = useCallback(async (): Promise<void> => {
    await runLatestAppLockPhaseRequest({
      guard,
      operation: () =>
        bridge.lock().then(
          (state): AppLockPhase => ({ kind: "locked", state }),
          (): AppLockPhase => ({ kind: "protected_error" }),
        ),
      setPhase,
    })
  }, [bridge, guard])

  const unlock = useCallback(
    async (passphrase: string): Promise<boolean> => {
      let unlocked = false
      await runLatestAppLockPhaseRequest({
        guard,
        operation: async () => {
          unlocked = await bridge.unlock({ passphrase }).then(
            (result) => result,
            () => false,
          )
          return getProtectedAppLockState(bridge)
        },
        setPhase,
      })
      return unlocked
    },
    [bridge, guard],
  )

  return { phase, lock, refresh, unlock }
}
