import { useEffect } from "react"

import type { AppLockState } from "../../../electron/ipc-types"

const MIN_TIMEOUT_MINUTES = 1
const MAX_TIMEOUT_MINUTES = 240
const MOUSEMOVE_THROTTLE_MS = 1_000
const MINUTE_MS = 60_000

type AutoLockSessionOptions = {
  readonly lock: () => Promise<void>
  readonly timeoutMs: number
}

export function createAutoLockSession(options: AutoLockSessionOptions) {
  let lastActivityAt = Date.now()
  let deadline = lastActivityAt + options.timeoutMs
  let timeout: ReturnType<typeof setTimeout> | null = null
  let active = true
  let locking = false

  function lock(): void {
    if (!active || locking) return
    locking = true
    void options.lock()
  }

  function schedule(): void {
    if (timeout !== null) clearTimeout(timeout)
    timeout = setTimeout(lock, Math.max(0, deadline - Date.now()))
  }

  function activity(): void {
    if (!active) return
    lastActivityAt = Date.now()
    deadline = lastActivityAt + options.timeoutMs
    schedule()
  }

  function restore(): void {
    if (!active) return
    if (Date.now() >= deadline) {
      lock()
      return
    }
    schedule()
  }

  schedule()
  return {
    activity,
    cleanup: () => {
      active = false
      if (timeout !== null) clearTimeout(timeout)
    },
    current: () => ({ lastActivityAt, deadline }),
    restore,
  }
}

export function shouldAutoLock(state: AppLockState): boolean {
  return (
    state.enabled &&
    !state.locked &&
    state.timeoutMinutes >= MIN_TIMEOUT_MINUTES &&
    state.timeoutMinutes <= MAX_TIMEOUT_MINUTES
  )
}

type AutoLockActivityControllerOptions = {
  readonly now: () => number
  readonly reset: () => void
}

export function createAutoLockActivityController(options: AutoLockActivityControllerOptions) {
  let lastMousemoveAt = Number.NEGATIVE_INFINITY

  function activity(): void {
    lastMousemoveAt = options.now()
    options.reset()
  }

  return {
    activity,
    mousemove(): void {
      const currentTime = options.now()
      if (currentTime - lastMousemoveAt < MOUSEMOVE_THROTTLE_MS) return
      lastMousemoveAt = currentTime
      options.reset()
    },
  }
}

export function useAutoLock(state: AppLockState | null, lock: () => Promise<void>): void {
  useEffect(() => {
    if (state === null || !shouldAutoLock(state)) return

    const session = createAutoLockSession({ lock, timeoutMs: state.timeoutMinutes * MINUTE_MS })
    const activity = createAutoLockActivityController({ now: Date.now, reset: session.activity })
    const restoreVisibility = (): void => {
      if (document.visibilityState === "visible") session.restore()
    }

    window.addEventListener("keydown", activity.activity)
    window.addEventListener("pointerdown", activity.activity)
    window.addEventListener("mousemove", activity.mousemove)
    window.addEventListener("focus", session.restore)
    document.addEventListener("visibilitychange", restoreVisibility)

    return () => {
      session.cleanup()
      window.removeEventListener("keydown", activity.activity)
      window.removeEventListener("pointerdown", activity.activity)
      window.removeEventListener("mousemove", activity.mousemove)
      window.removeEventListener("focus", session.restore)
      document.removeEventListener("visibilitychange", restoreVisibility)
    }
  }, [lock, state])
}
