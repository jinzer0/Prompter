import { describe, expect, it, vi } from "vitest"
import type { WindowCloseRequest } from "../electron/ipc-types.js"
import {
  createWindowCloseCoordinator,
  createWindowCloseGuard,
} from "../electron/window-close-guard.js"

function fixture() {
  let locked = false
  let revision = 0
  let destroyed = false
  const sender = { mainFrame: {}, isDestroyed: () => destroyed }
  const requests: WindowCloseRequest[] = []
  const cancelQuit = vi.fn()
  const preventDefault = vi.fn()
  let closeHook = () => {}
  const closeWindow = vi.fn(() => {
    closeHook()
    guard.onClose({ preventDefault })
  })
  const sendRequest = vi.fn((request: WindowCloseRequest) => requests.push(request))
  const guard = createWindowCloseGuard({
    sender,
    isWindowDestroyed: () => destroyed,
    closeWindow,
    sendRequest,
    getLockState: () => ({ locked }),
    getLockRevision: () => revision,
    cancelQuit,
    createId: () => `00000000-0000-4000-8000-${String(requests.length + 1).padStart(12, "0")}`,
  })
  const identity = () => ({ sender, senderFrame: sender.mainFrame })
  const report = (dirty: boolean) => guard.updateState(identity(), { dirty })
  const confirm = (outcome: "clean" | "saved" | "discard" | "cancel") => {
    const request = requests.at(-1)
    if (request === undefined) throw new Error("Missing request")
    return guard.confirm(identity(), { requestId: request.requestId, outcome })
  }
  return {
    guard,
    sender,
    requests,
    report,
    confirm,
    identity,
    closeWindow,
    sendRequest,
    cancelQuit,
    preventDefault,
    lock: (value: boolean, changeEpoch = true) => {
      locked = value
      if (changeEpoch) revision += 1
    },
    destroy: () => {
      destroyed = true
    },
    beforeClose: (hook: () => void) => {
      closeHook = hook
    },
  }
}

describe("native window close handshake", () => {
  it("always handshakes even previously clean, and consumes a permit only once", () => {
    const f = fixture()
    f.report(false)
    f.guard.onClose({ preventDefault: f.preventDefault })
    expect(f.preventDefault).toHaveBeenCalledOnce()
    expect(f.confirm("clean")).toEqual({ status: "accepted" })
    expect(f.preventDefault).toHaveBeenCalledOnce()
    f.guard.onClose({ preventDefault: f.preventDefault })
    expect(f.preventDefault).toHaveBeenCalledTimes(2)
    expect(f.requests).toHaveLength(2)
  })

  it("fails closed for unknown state and failed save, and allows cancel", () => {
    const f = fixture()
    f.guard.requestClose("window_close")
    expect(f.confirm("clean").status).toBe("stale")
    f.report(true)
    expect(f.confirm("saved").status).toBe("stale")
    expect(f.closeWindow).not.toHaveBeenCalled()
    expect(f.confirm("cancel").status).toBe("cancelled")
    expect(f.cancelQuit).toHaveBeenCalledOnce()
    expect(f.confirm("discard").status).toBe("stale")
  })

  it.each([
    "saved",
    "discard",
  ] as const)("accepts unlocked %s after authoritative clean report", (outcome) => {
    const f = fixture()
    f.report(true)
    f.guard.requestClose("window_close")
    if (outcome === "saved") f.report(false)
    expect(f.confirm(outcome).status).toBe("accepted")
    expect(f.closeWindow).toHaveBeenCalledOnce()
  })

  it("keeps pending dirty sticky even when a later false report arrives", () => {
    const f = fixture()
    f.report(false)
    f.guard.requestClose("window_close")
    f.report(true)
    f.report(false)
    expect(f.confirm("clean").status).toBe("stale")
    expect(f.confirm("saved").status).toBe("accepted")
  })

  it("does not duplicate requests on repeated close or upgraded quit intent", () => {
    const f = fixture()
    f.guard.requestClose("window_close")
    f.guard.requestClose("window_close")
    f.guard.requestClose("app_quit")
    expect(f.requests).toHaveLength(1)
    expect(f.confirm("cancel").status).toBe("cancelled")
    f.guard.requestClose("app_quit")
    expect(f.requests.at(-1)?.reason).toBe("app_quit")
  })

  it("rejects wrong nonce, window, or subframe without consuming the valid request", () => {
    const f = fixture()
    f.report(false)
    f.guard.requestClose("window_close")
    const requestId = f.requests[0]?.requestId ?? "missing"
    expect(f.guard.confirm(f.identity(), { requestId: "wrong", outcome: "clean" }).status).toBe(
      "stale",
    )
    const other = { mainFrame: {}, isDestroyed: () => false }
    expect(
      f.guard.confirm(
        { sender: other, senderFrame: other.mainFrame },
        { requestId, outcome: "clean" },
      ).status,
    ).toBe("stale")
    expect(
      f.guard.confirm({ sender: f.sender, senderFrame: {} }, { requestId, outcome: "clean" })
        .status,
    ).toBe("stale")
    f.guard.updateState({ sender: f.sender, senderFrame: {} }, { dirty: true })
    expect(f.confirm("clean").status).toBe("accepted")
  })

  it("rejects a replaced mainFrame until a new document handshake", () => {
    const f = fixture()
    f.report(false)
    f.guard.requestClose("window_close")
    f.sender.mainFrame = {}
    expect(f.confirm("clean").status).toBe("stale")
    f.guard.invalidate()
    f.report(false)
    f.guard.requestClose("window_close")
    expect(f.confirm("clean").status).toBe("accepted")
  })

  it("rejects lock epoch changes even after unlocking without consuming cancellation", () => {
    const f = fixture()
    f.report(true)
    f.guard.requestClose("window_close")
    f.lock(true)
    expect(f.confirm("saved").status).toBe("locked")
    f.lock(false)
    f.report(false)
    expect(f.confirm("saved").status).toBe("stale")
    expect(f.confirm("discard").status).toBe("stale")
    expect(f.confirm("cancel").status).toBe("cancelled")
  })

  it("allows genuinely clean locked documents but not locked dirty clearing", () => {
    const clean = fixture()
    clean.lock(true)
    clean.report(false)
    clean.guard.requestClose("window_close")
    expect(clean.confirm("clean").status).toBe("accepted")
    const dirty = fixture()
    dirty.report(true)
    dirty.lock(true)
    dirty.guard.requestClose("window_close")
    dirty.report(false)
    expect(dirty.confirm("clean").status).toBe("stale")
    expect(dirty.confirm("saved").status).toBe("locked")
    expect(dirty.confirm("discard").status).toBe("locked")
    expect(dirty.confirm("cancel").status).toBe("cancelled")
  })

  it("invalidates document state and nonces, then accepts a recovered renderer", () => {
    const f = fixture()
    f.report(false)
    f.guard.requestClose("app_quit")
    const old = f.requests[0]?.requestId ?? "missing"
    f.guard.invalidate()
    f.guard.requestClose("window_close")
    expect(f.guard.confirm(f.identity(), { requestId: old, outcome: "clean" }).status).toBe("stale")
    expect(f.confirm("clean").status).toBe("stale")
    f.report(false)
    expect(f.confirm("clean").status).toBe("accepted")
  })

  it("recovers from send failure without auto-closing", () => {
    const f = fixture()
    f.sendRequest.mockImplementationOnce(() => {
      throw new Error("renderer unavailable")
    })
    f.guard.requestClose("app_quit")
    expect(f.cancelQuit).toHaveBeenCalledOnce()
    expect(f.closeWindow).not.toHaveBeenCalled()
    f.report(false)
    f.guard.requestClose("window_close")
    expect(f.confirm("clean").status).toBe("accepted")
  })

  it("revalidates lock, dirty state, and liveness at close permit consumption", () => {
    for (const mutation of ["lock", "dirty", "destroy"] as const) {
      const f = fixture()
      f.report(false)
      f.guard.requestClose("window_close")
      f.beforeClose(() => {
        if (mutation === "lock") f.lock(true)
        if (mutation === "dirty") f.report(true)
        if (mutation === "destroy") f.destroy()
      })
      expect(f.confirm("clean").status).toBe("stale")
      expect(f.preventDefault).toHaveBeenCalledOnce()
    }
  })

  it("does not leave a permit if closeWindow throws or emits no close event", () => {
    for (const throws of [false, true]) {
      const f = fixture()
      f.report(false)
      f.guard.requestClose("window_close")
      f.closeWindow.mockImplementationOnce(() => {
        if (throws) throw new Error("close failed")
      })
      expect(f.confirm("clean").status).toBe("stale")
      f.guard.onClose({ preventDefault: f.preventDefault })
      expect(f.preventDefault).toHaveBeenCalledOnce()
    }
  })
})

describe("app quit coordinator boundary", () => {
  it("cancelled quit keeps shutdown unapproved, while ordinary close never invokes quit", () => {
    const quit = vi.fn()
    const coordinator = createWindowCloseCoordinator({ quit })
    const f = fixture()
    f.cancelQuit.mockImplementation(coordinator.cancelQuit)
    coordinator.add(f.guard)
    const preventDefault = vi.fn()
    coordinator.beforeQuit({ preventDefault })
    coordinator.beforeQuit({ preventDefault })
    expect(f.requests).toHaveLength(1)
    expect(f.requests[0]?.reason).toBe("app_quit")
    expect(f.confirm("cancel").status).toBe("cancelled")
    coordinator.remove(f.guard)
    expect(quit).not.toHaveBeenCalled()
  })

  it("approves app.quit once only after all guarded windows close", () => {
    const quit = vi.fn()
    const coordinator = createWindowCloseCoordinator({ quit })
    const f = fixture()
    const second = fixture()
    f.cancelQuit.mockImplementation(coordinator.cancelQuit)
    second.cancelQuit.mockImplementation(coordinator.cancelQuit)
    coordinator.add(f.guard)
    coordinator.add(second.guard)
    const preventDefault = vi.fn()
    coordinator.beforeQuit({ preventDefault })
    f.report(false)
    expect(f.confirm("clean").status).toBe("accepted")
    f.guard.invalidate() // destroyed after approval must not revoke quit intent
    f.guard.dispose()
    coordinator.remove(f.guard)
    expect(quit).not.toHaveBeenCalled()
    second.report(false)
    expect(second.confirm("clean").status).toBe("accepted")
    second.guard.dispose()
    coordinator.remove(second.guard)
    expect(quit).toHaveBeenCalledOnce()
    preventDefault.mockClear()
    coordinator.beforeQuit({ preventDefault })
    expect(preventDefault).not.toHaveBeenCalled()
  })

  it("ordinary close removes the guard without granting application quit", () => {
    const quit = vi.fn()
    const coordinator = createWindowCloseCoordinator({ quit })
    const f = fixture()
    coordinator.add(f.guard)
    f.report(false)
    f.guard.requestClose("window_close")
    expect(f.confirm("clean").status).toBe("accepted")
    coordinator.remove(f.guard)
    expect(quit).not.toHaveBeenCalled()
  })
})
