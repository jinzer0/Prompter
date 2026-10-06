import { useSyncExternalStore } from "react"

import type { EditorSaveResult } from "../lib/prompt-editor"

export type GuardOutcome = "clean" | "saved" | "discard"
export type UnsavedGuardSnapshot = {
  readonly pending: boolean
  readonly busy: boolean
  readonly message: string | null
}

type GuardDependencies = {
  readonly getSnapshot: () => { readonly dirty: boolean; readonly isSaving: boolean }
  readonly subscribe: (listener: () => void) => () => void
  readonly isUnlocked: () => boolean
  readonly save: () => Promise<EditorSaveResult>
  readonly discard: () => void
}

type PendingTransition = {
  readonly action: (outcome: GuardOutcome) => void | boolean | Promise<void> | Promise<boolean>
  readonly onCancel?: () => void | Promise<void>
  readonly allowLockedClean: boolean
  readonly resolve: (accepted: boolean) => void
}

const lockedMessage = "앱이 잠겨 있습니다. 취소한 뒤 잠금을 해제해 편집 내용을 확인하세요."
const followUpMessage = "저장 중 추가로 편집한 내용이 남아 있습니다. 다시 저장하거나 취소하세요."

/** One pending intent, shared by selection changes and native close requests. */
export function createUnsavedChangesGuard(dependencies: GuardDependencies) {
  let snapshot: UnsavedGuardSnapshot = { pending: false, busy: false, message: null }
  let pending: PendingTransition | null = null
  const listeners = new Set<() => void>()
  const publish = (fields: Partial<UnsavedGuardSnapshot>) => {
    snapshot = { ...snapshot, ...fields }
    for (const listener of listeners) listener()
  }
  const finish = (request: PendingTransition, accepted: boolean) => {
    if (pending !== request) return
    pending = null
    publish({ pending: false, busy: false, message: null })
    request.resolve(accepted)
  }
  const run = async (request: PendingTransition, outcome: GuardOutcome) => {
    if (pending !== request || snapshot.busy) return
    if (!dependencies.isUnlocked() && !(outcome === "clean" && request.allowLockedClean)) {
      publish({ message: lockedMessage })
      return
    }
    if (dependencies.getSnapshot().dirty || dependencies.getSnapshot().isSaving) return
    publish({ busy: true, message: null })
    try {
      const accepted = await request.action(outcome)
      if (accepted === false) {
        if (pending === request)
          publish({
            pending: true,
            busy: false,
            message: "요청을 진행하지 못했습니다. 취소한 뒤 다시 시도하세요.",
          })
      } else {
        finish(request, true)
      }
    } catch {
      if (pending === request)
        publish({
          pending: true,
          busy: false,
          message: "요청을 진행하지 못했습니다. 다시 시도하거나 취소하세요.",
        })
    }
  }
  const reconcile = () => {
    if (!pending || snapshot.busy) return
    const current = dependencies.getSnapshot()
    if (!current.isSaving && !current.dirty) void run(pending, "clean")
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    connect: () => dependencies.subscribe(reconcile),
    request(
      action: PendingTransition["action"],
      options: { onCancel?: PendingTransition["onCancel"]; allowLockedClean?: boolean } = {},
    ): Promise<boolean> {
      if (pending) return Promise.resolve(false)
      if (!dependencies.isUnlocked() && !options.allowLockedClean) return Promise.resolve(false)
      return new Promise((resolve) => {
        const request: PendingTransition = {
          action,
          resolve,
          ...(options.onCancel === undefined ? {} : { onCancel: options.onCancel }),
          allowLockedClean: options.allowLockedClean === true,
        }
        pending = request
        const current = dependencies.getSnapshot()
        publish({ pending: current.dirty || current.isSaving, busy: false, message: null })
        if (!current.dirty && !current.isSaving) void run(request, "clean")
      })
    },
    async save() {
      const request = pending
      if (!request || snapshot.busy) return
      if (!dependencies.isUnlocked()) {
        publish({ message: lockedMessage })
        return
      }
      if (dependencies.getSnapshot().isSaving) return
      publish({ busy: true, message: null })
      try {
        const result = await dependencies.save()
        if (pending !== request) return
        publish({ busy: false })
        if (result.status === "failed" || result.status === "blocked") {
          publish({ message: result.message })
          return
        }
        if (dependencies.getSnapshot().dirty || dependencies.getSnapshot().isSaving) {
          publish({ message: followUpMessage })
          return
        }
        await run(request, result.status === "saved" ? "saved" : "clean")
      } catch {
        if (pending === request)
          publish({
            busy: false,
            message:
              "저장하지 못했습니다. 편집 내용은 그대로 남아 있습니다. 다시 시도하거나 취소하세요.",
          })
      }
    },
    async discard() {
      const request = pending
      if (!request || snapshot.busy || dependencies.getSnapshot().isSaving) return
      if (!dependencies.isUnlocked()) {
        publish({ message: lockedMessage })
        return
      }
      // Suppress the store subscription until the explicit discard outcome is delivered.
      publish({ busy: true, message: null })
      try {
        dependencies.discard()
        publish({ busy: false })
        await run(request, "discard")
      } catch {
        if (pending === request)
          publish({ busy: false, message: "변경을 버리지 못했습니다. 취소한 뒤 다시 시도하세요." })
      }
    },
    async cancel() {
      const request = pending
      if (!request) return
      finish(request, false)
      try {
        await request.onCancel?.()
      } catch {
        /* Cancellation never approves an intent. */
      }
    },
  }
}

export type UnsavedChangesGuard = ReturnType<typeof createUnsavedChangesGuard>

export function useUnsavedChangesGuard(guard: UnsavedChangesGuard) {
  return useSyncExternalStore(guard.subscribe, guard.getSnapshot, guard.getSnapshot)
}
