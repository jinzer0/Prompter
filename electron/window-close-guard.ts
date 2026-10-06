import { randomUUID } from "node:crypto"
import type {
  WindowCloseConfirmationInput,
  WindowCloseConfirmationResult,
  WindowCloseRequest,
} from "./ipc-types.js"

export type CloseSender = {
  readonly mainFrame: object
  readonly isDestroyed: () => boolean
}
export type CloseEvent = { readonly preventDefault: () => void }
export type CloseIdentity = { readonly sender: CloseSender; readonly senderFrame: object | null }
export type WindowCloseGuardDependencies = {
  readonly sender: CloseSender
  readonly isWindowDestroyed: () => boolean
  readonly closeWindow: () => void
  readonly sendRequest: (request: WindowCloseRequest) => void
  readonly getLockState: () => { readonly locked: boolean }
  readonly getLockRevision: () => number
  readonly cancelQuit: () => void
  readonly createId?: () => string
}

type Pending = {
  readonly requestId: string
  reason: WindowCloseRequest["reason"]
  readonly frame: object
  readonly generation: number
  readonly lockRevision: number
  sawDirty: boolean
}

export function createWindowCloseGuard(dependencies: WindowCloseGuardDependencies) {
  let dirty: boolean | null = null
  let generation = 0
  let pending: Pending | null = null
  let permit: { request: Pending; outcome: WindowCloseConfirmationInput["outcome"] } | null = null
  let disposed = false
  let consumedPermit = false

  function alive() {
    return !disposed && !dependencies.isWindowDestroyed() && !dependencies.sender.isDestroyed()
  }
  function matches(identity: CloseIdentity) {
    return (
      alive() &&
      identity.sender === dependencies.sender &&
      identity.senderFrame === dependencies.sender.mainFrame
    )
  }
  function current(request: Pending) {
    return (
      alive() &&
      request.generation === generation &&
      request.frame === dependencies.sender.mainFrame
    )
  }
  function authorized(request: Pending, outcome: WindowCloseConfirmationInput["outcome"]) {
    if (!current(request)) return false
    if (request.lockRevision !== dependencies.getLockRevision()) return false
    if (outcome === "clean") return dirty === false && !request.sawDirty
    if (dependencies.getLockState().locked) return false
    return outcome === "discard" || (outcome === "saved" && dirty === false)
  }
  function requestClose(reason: WindowCloseRequest["reason"]) {
    if (!alive()) return
    if (pending !== null) {
      // Upgrade the native intent without replacing the dialog's nonce.
      if (reason === "app_quit") pending.reason = reason
      return
    }
    const request: Pending = {
      requestId: (dependencies.createId ?? randomUUID)(),
      reason,
      frame: dependencies.sender.mainFrame,
      generation,
      lockRevision: dependencies.getLockRevision(),
      sawDirty: dirty === true,
    }
    pending = request
    try {
      dependencies.sendRequest({ requestId: request.requestId, reason })
    } catch {
      pending = null
      dependencies.cancelQuit()
    }
  }
  function onClose(event: CloseEvent) {
    const approved = permit
    permit = null
    if (approved !== null && authorized(approved.request, approved.outcome)) {
      consumedPermit = true
      return
    }
    event.preventDefault()
    requestClose("window_close")
  }
  function updateState(identity: CloseIdentity, value: { readonly dirty: boolean }) {
    if (!matches(identity)) return
    if (!value.dirty && dirty === true && dependencies.getLockState().locked) return
    dirty = value.dirty
    if (value.dirty && pending !== null) pending.sawDirty = true
    if (value.dirty && permit !== null) permit.request.sawDirty = true
  }
  function confirm(
    identity: CloseIdentity,
    input: WindowCloseConfirmationInput,
  ): WindowCloseConfirmationResult {
    const request = pending
    if (
      !matches(identity) ||
      request === null ||
      input.requestId !== request.requestId ||
      !current(request)
    )
      return { status: "stale" }
    if (input.outcome === "cancel") {
      pending = null
      permit = null
      dependencies.cancelQuit()
      return { status: "cancelled" }
    }
    if (dependencies.getLockState().locked && input.outcome !== "clean") {
      return { status: "locked" }
    }
    if (!authorized(request, input.outcome)) return { status: "stale" }
    pending = null
    consumedPermit = false
    permit = { request, outcome: input.outcome }
    try {
      dependencies.closeWindow()
    } catch {
      permit = null
      dependencies.cancelQuit()
      return { status: "stale" }
    }
    // Electron emits close synchronously; a missing close event must not leave a permit behind.
    permit = null
    return { status: consumedPermit ? "accepted" : "stale" }
  }
  function invalidate() {
    const interruptedRequest = pending !== null || permit !== null
    generation += 1
    dirty = null
    pending = null
    permit = null
    if (interruptedRequest) dependencies.cancelQuit()
  }
  function dispose() {
    generation += 1
    dirty = null
    pending = null
    permit = null
    disposed = true
  }
  return { onClose, requestClose, updateState, confirm, invalidate, dispose }
}

export type WindowCloseGuard = ReturnType<typeof createWindowCloseGuard>

export function createWindowCloseCoordinator(dependencies: { readonly quit: () => void }) {
  const guards = new Set<WindowCloseGuard>()
  let quitIntent = false
  let quitPermit = false
  function cancelQuit() {
    quitIntent = false
  }
  function add(guard: WindowCloseGuard) {
    guards.add(guard)
  }
  function remove(guard: WindowCloseGuard) {
    guards.delete(guard)
    if (quitIntent && guards.size === 0) {
      quitPermit = true
      dependencies.quit()
    }
  }
  function beforeQuit(event: CloseEvent) {
    if (quitPermit) {
      quitPermit = false
      return
    }
    if (guards.size === 0) return
    event.preventDefault()
    quitIntent = true
    for (const guard of guards) guard.requestClose("app_quit")
  }
  return { add, remove, cancelQuit, beforeQuit }
}
