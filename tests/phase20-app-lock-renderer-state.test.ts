import { readFileSync } from "node:fs"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { AppLockState, ElectronBridge } from "../electron/ipc-types"
import {
  createLatestRequestGuard,
  runAsyncPhaseOperation,
} from "../renderer/src/hooks/use-app-lock-settings"
import {
  getProtectedAppLockState,
  runLatestAppLockPhaseRequest,
  unlockApp,
} from "../renderer/src/hooks/use-app-lock-state"
import { createAutoLockSession, shouldAutoLock } from "../renderer/src/hooks/use-auto-lock"
import { handleMenuAction } from "../renderer/src/lib/menu-actions"
import { createCompilerMemory } from "../renderer/src/lib/prompt-compiler/compiler-memory"
import { createDeferred } from "./phase18-insights-renderer-fixtures"

const unlockedState = {
  enabled: true,
  locked: false,
  lockOnStart: true,
  timeoutMinutes: 15,
  lastUnlockedAt: 1_000,
} satisfies AppLockState

describe("Phase 20 app-lock renderer state", () => {
  afterEach(() => {
    vi.useRealTimers()
  })
  it("treats a failed initial state request as protected", async () => {
    // Given: the typed bridge cannot load the app-lock state.
    const getState = vi
      .fn<ElectronBridge["appLock"]["getState"]>()
      .mockRejectedValue(new TypeError("bridge unavailable"))

    // When: the renderer resolves its initial protection state.
    const result = await getProtectedAppLockState({ getState })

    // Then: workspace rendering remains blocked and a retryable error is exposed.
    expect(result).toEqual({ kind: "protected_error" })
  })

  it("clears the submitted unlock passphrase before awaiting verification", async () => {
    // Given: an unlock request whose bridge result remains pending.
    const resolvers: Array<(value: boolean) => void> = []
    const bridgeUnlock = vi.fn<(passphrase: string) => Promise<boolean>>(
      (submittedPassphrase) =>
        new Promise((resolve) => {
          expect(submittedPassphrase).toBe("correct horse battery staple")
          resolvers.push(resolve)
        }),
    )
    const clearPassphrase = vi.fn<() => void>()

    // When: unlock begins.
    const result = unlockApp({
      clearPassphrase,
      passphrase: "correct horse battery staple",
      unlock: bridgeUnlock,
    })

    // Then: renderer state is cleared synchronously, before the bridge settles.
    expect(clearPassphrase).toHaveBeenCalledTimes(1)
    expect(bridgeUnlock).toHaveBeenCalledTimes(1)
    const resolveUnlock = resolvers[0]
    if (resolveUnlock === undefined) throw new TypeError("Expected pending unlock")
    resolveUnlock(true)
    await expect(result).resolves.toBe(true)
  })

  it("rejects an older unlocked refresh after a newer lock completes", async () => {
    // Given: an older state refresh and a newer lock request are both pending.
    const guard = createLatestRequestGuard()
    const refresh = createDeferred<AppLockState>()
    const lock = createDeferred<AppLockState>()
    const phases: string[] = []
    const olderRefresh = runLatestAppLockPhaseRequest({
      guard,
      operation: () => getProtectedAppLockState({ getState: () => refresh.promise }),
      setPhase: (phase) => phases.push(phase.kind),
    })
    const newerLock = runLatestAppLockPhaseRequest({
      guard,
      operation: async () => ({ kind: "locked", state: await lock.promise }),
      setPhase: (phase) => phases.push(phase.kind),
    })

    // When: locking completes before the stale unlocked refresh.
    lock.resolve({ ...unlockedState, locked: true })
    await newerLock
    refresh.resolve(unlockedState)
    await olderRefresh

    // Then: only the newer protected phase is allowed to render.
    expect(phases).toEqual(["locked"])
  })

  it("rejects an older unlocked refresh after a newer locked refresh completes", async () => {
    // Given: two state refreshes resolve out of order.
    const guard = createLatestRequestGuard()
    const olderRefreshResult = createDeferred<AppLockState>()
    const newerRefreshResult = createDeferred<AppLockState>()
    const phases: string[] = []
    const olderRefresh = runLatestAppLockPhaseRequest({
      guard,
      operation: () => getProtectedAppLockState({ getState: () => olderRefreshResult.promise }),
      setPhase: (phase) => phases.push(phase.kind),
    })
    const newerRefresh = runLatestAppLockPhaseRequest({
      guard,
      operation: () => getProtectedAppLockState({ getState: () => newerRefreshResult.promise }),
      setPhase: (phase) => phases.push(phase.kind),
    })

    // When: the current locked refresh completes before the older unlocked refresh.
    newerRefreshResult.resolve({ ...unlockedState, locked: true })
    await newerRefresh
    olderRefreshResult.resolve(unlockedState)
    await olderRefresh

    // Then: the stale completion cannot perform a second phase write.
    expect(phases).toEqual(["locked"])
  })

  it("rejects a pending state response after the hook owner unmounts", async () => {
    // Given: one pending phase request owned by a mounted lifecycle.
    const guard = createLatestRequestGuard()
    const state = createDeferred<AppLockState>()
    const phases: string[] = []
    const pending = runLatestAppLockPhaseRequest({
      guard,
      operation: () => getProtectedAppLockState({ getState: () => state.promise }),
      setPhase: (phase) => phases.push(phase.kind),
    })

    // When: the owner unmounts before the bridge responds.
    guard.unmount()
    state.resolve(unlockedState)
    await pending

    // Then: no post-unmount phase update is attempted.
    expect(phases).toEqual([])
  })

  it("only enables inactivity locking for valid enabled and unlocked state", () => {
    // Given: enabled, disabled, locked, and invalid timeout states.
    // When: the auto-lock predicate evaluates each state.
    // Then: only an enabled unlocked timeout in the contract range can schedule locking.
    expect(shouldAutoLock(unlockedState)).toBe(true)
    expect(shouldAutoLock({ ...unlockedState, enabled: false })).toBe(false)
    expect(shouldAutoLock({ ...unlockedState, locked: true })).toBe(false)
    expect(shouldAutoLock({ ...unlockedState, timeoutMinutes: 0 })).toBe(false)
    expect(shouldAutoLock({ ...unlockedState, timeoutMinutes: 241 })).toBe(false)
  })

  it("locks when the inactivity deadline expires", async () => {
    // Given: one active auto-lock session using fake timers.
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    const lock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const session = createAutoLockSession({ lock, timeoutMs: 60_000 })

    // When: the inactivity deadline elapses.
    await vi.advanceTimersByTimeAsync(60_000)

    // Then: locking runs exactly once.
    expect(lock).toHaveBeenCalledTimes(1)
    session.cleanup()
  })

  it("genuine activity before the deadline resets last activity and deadline", async () => {
    // Given: one active auto-lock session using fake timers.
    vi.useFakeTimers()
    vi.setSystemTime(20_000)
    const lock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const session = createAutoLockSession({ lock, timeoutMs: 60_000 })

    // When: activity occurs before the first deadline.
    await vi.advanceTimersByTimeAsync(30_000)
    session.activity()
    await vi.advanceTimersByTimeAsync(30_000)

    // Then: the session records a new deadline and remains unlocked until it elapses.
    expect(session.current()).toEqual({ lastActivityAt: 50_000, deadline: 110_000 })
    expect(lock).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(lock).toHaveBeenCalledTimes(1)
    session.cleanup()
  })

  it("locks immediately when focus returns after an elapsed deadline", () => {
    // Given: a suspended session whose wall clock passed its deadline.
    vi.useFakeTimers()
    vi.setSystemTime(30_000)
    const lock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const session = createAutoLockSession({ lock, timeoutMs: 60_000 })
    vi.setSystemTime(100_000)

    // When: focus restoration is reported.
    session.restore()

    // Then: restoration locks instead of resetting activity.
    expect(lock).toHaveBeenCalledTimes(1)
    session.cleanup()
  })

  it("locks immediately when visibility returns after an elapsed deadline", () => {
    // Given: a suspended session whose wall clock passed its deadline.
    vi.useFakeTimers()
    vi.setSystemTime(40_000)
    const lock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const session = createAutoLockSession({ lock, timeoutMs: 60_000 })
    vi.setSystemTime(110_000)

    // When: visibility restoration is reported.
    session.restore()

    // Then: restoration locks immediately.
    expect(lock).toHaveBeenCalledTimes(1)
    session.cleanup()
  })

  it("cleanup cancels the pending inactivity timer", async () => {
    // Given: an active session with a pending timer.
    vi.useFakeTimers()
    const lock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const session = createAutoLockSession({ lock, timeoutMs: 60_000 })

    // When: the owning component cleans up before expiry.
    session.cleanup()
    await vi.advanceTimersByTimeAsync(60_000)

    // Then: stale timers cannot lock the next renderer lifecycle.
    expect(lock).not.toHaveBeenCalled()
  })

  it("refreshes renderer lock state for the existing lock menu action", () => {
    // Given: a renderer refresh callback attached to the existing action dispatcher.
    const refreshAppLock = vi.fn<() => void>()

    // When: main reports that Prompter was locked through the menu.
    handleMenuAction("lockPrompter", { refreshAppLock })

    // Then: the renderer synchronizes without invoking another lock operation.
    expect(refreshAppLock).toHaveBeenCalledTimes(1)
  })

  it("fully removes the sensitive workspace DOM across protected phases", () => {
    // Given: the app-level and shell-level renderer sources.
    const appSource = readFileSync("renderer/src/app.tsx", "utf8")
    const shellSource = readFileSync("renderer/src/components/shell/app-shell.tsx", "utf8")

    // When: the locked conditional structure is characterized.
    // Then: AppShell renders only in the unlocked branch and has no CSS hiding contract.
    expect(appSource).toContain('appLock.phase.kind === "unlocked"')
    expect(appSource).not.toContain("workspaceMounted")
    expect(shellSource).not.toContain('hidden ? "hidden" : "block"')
    expect(shellSource).not.toContain("aria-hidden={hidden}")
    expect(appSource).not.toMatch(/autosave|autoAnalyze|autoCompile|autoReview|autoExport/i)
  })

  it("preserves byte-exact compiler memory across unmount and remount", () => {
    // Given: an unsaved draft containing meaningful surrounding whitespace.
    const memory = createCompilerMemory()
    const draft = { ...memory.current().draft, originalInput: "  exact unsaved draft  \n" }

    // When: the mounted compiler writes memory and a later compiler reads it after remount.
    memory.update({ ...memory.current(), draft })
    const restored = memory.current()

    // Then: no persistence, trimming, or content mutation occurs.
    expect(restored.draft.originalInput).toBe("  exact unsaved draft  \n")
    expect(restored.editablePrompt).toBe("")
    expect(restored.compiled).toBeNull()
  })

  it("rejects stale async settings responses and all responses after unmount", () => {
    // Given: two ordered requests and a mounted guard.
    const guard = createLatestRequestGuard()
    const first = guard.begin()
    const second = guard.begin()

    // When: the newer request exists and then the component unmounts.
    expect(first.isCurrent()).toBe(false)
    expect(second.isCurrent()).toBe(true)
    guard.unmount()

    // Then: neither request may update state after unmount.
    expect(first.isCurrent()).toBe(false)
    expect(second.isCurrent()).toBe(false)

    guard.mount()
    const remounted = guard.begin()
    expect(remounted.isCurrent()).toBe(true)
  })

  it("restores the ready phase when an app-lock operation rejects", async () => {
    // Given: a current settings request whose bridge operation rejects.
    const phases: string[] = []

    // When: the guarded operation runs.
    const result = runAsyncPhaseOperation({
      isCurrent: () => true,
      operation: () => Promise.reject(new TypeError("lock failed")),
      setPhase: (phase) => phases.push(phase),
    })

    // Then: rejection propagates but the working phase cannot stick.
    await expect(result).rejects.toThrow("lock failed")
    expect(phases).toEqual(["working", "ready"])
  })
})
