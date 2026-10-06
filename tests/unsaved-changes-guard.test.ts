import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import {
  PromptEditorProvider,
  usePromptEditorContext,
} from "../renderer/src/components/prompt-editor-provider"
import { createUnsavedChangesGuard } from "../renderer/src/hooks/use-unsaved-changes-guard"
import type { EditorSaveResult } from "../renderer/src/lib/prompt-editor"

const saved: EditorSaveResult = {
  status: "saved",
  warning: null,
  result: {
    asset: {
      id: "asset",
      projectId: "project",
      title: "Prompt",
      scenario: "feature",
      targetAgent: "codex",
      currentVersionId: "version",
      parentPromptId: null,
      parentPromptVersionId: null,
      derivationType: null,
      createdAt: 1,
      updatedAt: 2,
    },
    version: {
      id: "version",
      promptAssetId: "asset",
      versionNumber: 2,
      originalInput: "Request",
      compiledPrompt: "Edited",
      assumptions: null,
      questions: null,
      answers: null,
      acceptanceCriteria: null,
      validationCommands: null,
      qualityScore: null,
      createdAt: 2,
    },
  },
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept
    reject = fail
  })
  return { promise, resolve, reject }
}

function fixture(dirty = true) {
  let current = { dirty, isSaving: false }
  let unlocked = true
  const listeners = new Set<() => void>()
  const update = (patch: Partial<typeof current>) => {
    current = { ...current, ...patch }
    for (const listener of listeners) listener()
  }
  const save = vi.fn(async (): Promise<EditorSaveResult> => {
    update({ dirty: false })
    return saved
  })
  const discard = vi.fn(() => update({ dirty: false }))
  const guard = createUnsavedChangesGuard({
    getSnapshot: () => current,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    isUnlocked: () => unlocked,
    save,
    discard,
  })
  guard.connect()
  return {
    guard,
    save,
    discard,
    update,
    lock: () => {
      unlocked = false
    },
    current: () => current,
  }
}

// Deferred ticks are microtasks, not timers or real persistence.
const settle = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe("prompt editor provider initialization", () => {
  it("renders its children without touching native APIs during server initialization", () => {
    vi.stubGlobal("window", undefined)
    try {
      const markup = renderToStaticMarkup(
        createElement(
          PromptEditorProvider,
          { isUnlocked: false },
          createElement("span", null, "잠금 화면"),
        ),
      )
      expect(markup).toContain("잠금 화면")
      expect(markup).not.toContain("<dialog")
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("rejects consumers outside the provider instead of offering a fake editable context", () => {
    function Consumer() {
      usePromptEditorContext()
      return null
    }
    expect(() => renderToStaticMarkup(createElement(Consumer))).toThrow(
      "PromptEditorProvider is required",
    )
  })
})

describe("unsaved changes guard", () => {
  it("does not save or discard on request, and runs a clean transition once", async () => {
    const dirty = fixture()
    const action = vi.fn()
    const pending = dirty.guard.request(action)
    expect(dirty.guard.getSnapshot().pending).toBe(true)
    expect(action).not.toHaveBeenCalled()
    expect(dirty.save).not.toHaveBeenCalled()
    expect(dirty.discard).not.toHaveBeenCalled()
    await dirty.guard.cancel()
    expect(await pending).toBe(false)

    const clean = fixture(false)
    expect(await clean.guard.request(action)).toBe(true)
    expect(action).toHaveBeenCalledExactlyOnceWith("clean")
    expect(clean.save).not.toHaveBeenCalled()
    expect(clean.discard).not.toHaveBeenCalled()
  })

  it("saves once before continuing and treats refresh warnings as persisted success", async () => {
    const f = fixture()
    f.save.mockImplementation(async () => {
      f.update({ dirty: false })
      return { ...saved, warning: "목록 갱신 실패" }
    })
    const action = vi.fn()
    const pending = f.guard.request(action)
    await f.guard.save()
    expect(await pending).toBe(true)
    expect(f.save).toHaveBeenCalledTimes(1)
    expect(action).toHaveBeenCalledExactlyOnceWith("saved")
    expect(f.discard).not.toHaveBeenCalled()
  })

  it("discards only explicitly, while cancel clears intent without changing the draft", async () => {
    const f = fixture()
    const action = vi.fn()
    const pending = f.guard.request(action)
    await f.guard.discard()
    expect(await pending).toBe(true)
    expect(f.discard).toHaveBeenCalledTimes(1)
    expect(action).toHaveBeenCalledExactlyOnceWith("discard")
    expect(f.save).not.toHaveBeenCalled()

    f.update({ dirty: true })
    const cancel = vi.fn()
    const cancelled = f.guard.request(action, { onCancel: cancel })
    await f.guard.cancel()
    expect(await cancelled).toBe(false)
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(f.current().dirty).toBe(true)
    expect(action).toHaveBeenCalledTimes(1)
  })

  it.each([
    "failed",
    "blocked",
    "reject",
  ] as const)("keeps the draft and intent for %s save, then allows explicit retry", async (failure) => {
    const f = fixture()
    f.save.mockImplementationOnce(async () => {
      if (failure === "reject") throw new Error("IPC unavailable")
      return { status: failure, message: "저장 실패" }
    })
    const action = vi.fn()
    const pending = f.guard.request(action)
    await f.guard.save()
    expect(f.guard.getSnapshot().pending).toBe(true)
    expect(f.guard.getSnapshot().message).not.toBeNull()
    expect(f.current().dirty).toBe(true)
    expect(action).not.toHaveBeenCalled()
    await f.guard.save()
    expect(await pending).toBe(true)
    expect(f.save).toHaveBeenCalledTimes(2)
  })

  it("blocks duplicate submission and does not proceed after follow-up editing during save", async () => {
    const f = fixture()
    const write = deferred<EditorSaveResult>()
    f.save.mockImplementationOnce(() => write.promise)
    const action = vi.fn()
    const pending = f.guard.request(action)
    const saving = f.guard.save()
    await f.guard.save()
    expect(f.save).toHaveBeenCalledTimes(1)
    // A persisted snapshot is not proof that the current edited snapshot is clean.
    f.update({ dirty: true })
    write.resolve(saved)
    await saving
    expect(action).not.toHaveBeenCalled()
    expect(f.guard.getSnapshot().pending).toBe(true)
    expect(f.guard.getSnapshot().message).not.toBeNull()
    await f.guard.save()
    expect(await pending).toBe(true)
    expect(action).toHaveBeenCalledTimes(1)
  })

  it("defers a transition behind an existing save without making another write", async () => {
    const f = fixture()
    f.update({ isSaving: true })
    const action = vi.fn()
    const pending = f.guard.request(action)
    await f.guard.save()
    expect(f.save).not.toHaveBeenCalled()
    expect(action).not.toHaveBeenCalled()
    f.update({ isSaving: false, dirty: false })
    expect(await pending).toBe(true)
    expect(action).toHaveBeenCalledExactlyOnceWith("clean")
  })

  it("keeps a deferred-save dialog when that save leaves new dirty edits", async () => {
    const f = fixture()
    f.update({ isSaving: true })
    const action = vi.fn()
    const pending = f.guard.request(action)
    f.update({ isSaving: false, dirty: true })
    await settle()
    expect(action).not.toHaveBeenCalled()
    expect(f.guard.getSnapshot().pending).toBe(true)
    expect(f.save).not.toHaveBeenCalled()
    await f.guard.cancel()
    expect(await pending).toBe(false)
  })

  it("rejects repeated requests and cancellation during a save prevents later navigation", async () => {
    const f = fixture()
    const write = deferred<EditorSaveResult>()
    f.save.mockImplementationOnce(() => write.promise)
    const first = vi.fn()
    const second = vi.fn()
    const pending = f.guard.request(first)
    expect(await f.guard.request(second)).toBe(false)
    const saving = f.guard.save()
    await f.guard.cancel()
    f.update({ dirty: false })
    write.resolve(saved)
    await saving
    expect(await pending).toBe(false)
    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()
  })

  it("retains failed or stale transition intents instead of finally approving", async () => {
    const f = fixture(false)
    const action = vi.fn(async () => {
      throw new Error("navigation failed")
    })
    const pending = f.guard.request(action)
    await settle()
    expect(f.guard.getSnapshot().pending).toBe(true)
    expect(f.guard.getSnapshot().busy).toBe(false)
    await f.guard.cancel()
    expect(await pending).toBe(false)

    const stale = f.guard.request(async () => false)
    await settle()
    expect(f.guard.getSnapshot().pending).toBe(true)
    await f.guard.cancel()
    expect(await stale).toBe(false)
  })

  it("never writes or discards while locked, but permits an explicitly allowed clean close", async () => {
    const f = fixture()
    f.lock()
    const action = vi.fn()
    expect(await f.guard.request(action)).toBe(false)
    const pending = f.guard.request(action, { allowLockedClean: true })
    await f.guard.save()
    await f.guard.discard()
    expect(f.save).not.toHaveBeenCalled()
    expect(f.discard).not.toHaveBeenCalled()
    expect(action).not.toHaveBeenCalled()
    expect(f.current().dirty).toBe(true)
    expect(f.guard.getSnapshot().message).not.toBeNull()
    await f.guard.cancel()
    expect(await pending).toBe(false)

    const clean = fixture(false)
    clean.lock()
    expect(await clean.guard.request(action, { allowLockedClean: true })).toBe(true)
    expect(action).toHaveBeenCalledExactlyOnceWith("clean")
  })

  it("cannot approve a save that completes after locking", async () => {
    const f = fixture()
    const write = deferred<EditorSaveResult>()
    f.save.mockImplementationOnce(() => write.promise)
    const action = vi.fn()
    const pending = f.guard.request(action)
    const saving = f.guard.save()
    f.lock()
    f.update({ dirty: false })
    write.resolve(saved)
    await saving
    expect(action).not.toHaveBeenCalled()
    expect(f.guard.getSnapshot().pending).toBe(true)
    await f.guard.cancel()
    expect(await pending).toBe(false)
  })
})
