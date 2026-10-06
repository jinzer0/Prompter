import { describe, expect, it, vi } from "vitest"

import type {
  CreateNextPromptVersionInput,
  CreateNextPromptVersionResult,
  CreatePromptWithInitialVersionResult,
  DuplicatePromptAssetInput,
} from "../electron/ipc-types"
import {
  createPromptEditorStore,
  type EditorSelection,
  type EditorVersionFields,
  type PromptEditorActions,
} from "../renderer/src/lib/prompt-editor"

function deferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error("Deferred not initialized")
  }
  let reject: (reason: unknown) => void = () => {
    throw new Error("Deferred not initialized")
  }
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function selection(): EditorSelection {
  return {
    project: {
      id: "project-1",
      name: "Project",
      description: null,
      techStack: null,
      defaultAgent: null,
      createdAt: 1759622400000,
      updatedAt: 1759622400000,
    },
    asset: {
      id: "asset-1",
      projectId: "project-1",
      title: "Original",
      scenario: "feature",
      targetAgent: "claude_code",
      currentVersionId: "version-1",
      parentPromptId: null,
      parentPromptVersionId: null,
      derivationType: null,
      createdAt: 1759622400000,
      updatedAt: 1759622400000,
    },
    version: {
      id: "version-1",
      promptAssetId: "asset-1",
      versionNumber: 1,
      originalInput: "  original request\n",
      compiledPrompt: "  original body\n",
      assumptions: "Assumption",
      questions: "Question",
      answers: "Answer",
      acceptanceCriteria: "Acceptance",
      validationCommands: "npm test",
      qualityScore: 90,
      createdAt: 1759622400000,
    },
  }
}

function fields(source = selection()): EditorVersionFields {
  const { version } = source
  return {
    originalInput: version.originalInput,
    compiledPrompt: version.compiledPrompt,
    assumptions: version.assumptions,
    questions: version.questions,
    answers: version.answers,
    acceptanceCriteria: version.acceptanceCriteria,
    validationCommands: version.validationCommands,
    qualityScore: version.qualityScore,
  }
}

function saved(input: CreateNextPromptVersionInput): CreateNextPromptVersionResult {
  const source = selection()
  return {
    asset: { ...source.asset, currentVersionId: "version-2" },
    version: {
      ...source.version,
      ...input,
      id: "version-2",
      versionNumber: 2,
      assumptions: input.assumptions ?? null,
      questions: input.questions ?? null,
      answers: input.answers ?? null,
      acceptanceCriteria: input.acceptanceCriteria ?? null,
      validationCommands: input.validationCommands ?? null,
      qualityScore: input.qualityScore ?? null,
    },
  }
}

function duplicated(input: DuplicatePromptAssetInput): CreatePromptWithInitialVersionResult {
  const versionFields = input.editedVersion ?? fields()
  const result = saved({ ...versionFields, promptAssetId: "asset-copy", makeCurrent: true })
  return {
    asset: {
      ...result.asset,
      id: "asset-copy",
      title: input.title ?? "Copy",
      currentVersionId: "version-copy",
    },
    version: { ...result.version, id: "version-copy", versionNumber: 1 },
  }
}

function setup() {
  let unlocked = true
  const actions = {
    createNextVersion: vi.fn(async (input: CreateNextPromptVersionInput) => saved(input)),
    duplicateAsset: vi.fn(async (input: DuplicatePromptAssetInput) => duplicated(input)),
    copyText: vi.fn(async (_text: string) => {}),
    afterPersisted: vi.fn(
      async (_result: CreateNextPromptVersionResult, _kind: "version" | "duplicate") => {},
    ),
    isUnlocked: () => unlocked,
  } satisfies PromptEditorActions
  const store = createPromptEditorStore(actions)
  store.select(selection())
  return {
    actions,
    store,
    lock: () => {
      unlocked = false
    },
    unlock: () => {
      unlocked = true
    },
  }
}

describe("external prompt editor actions", () => {
  it("copies current whitespace exactly without saving, including an empty draft", async () => {
    const { store, actions } = setup()
    store.edit(" \n  edited body  \n")
    expect(await store.copy()).toBe(true)
    expect(actions.copyText).toHaveBeenLastCalledWith(" \n  edited body  \n")
    store.edit("")
    expect(await store.copy()).toBe(true)
    expect(actions.copyText).toHaveBeenLastCalledWith("")
    expect(actions.createNextVersion).not.toHaveBeenCalled()
    expect(store.getSnapshot().baselineText).toBe(selection().version.compiledPrompt)
  })

  it("rejects missing selection, unchanged and empty versions without writes", async () => {
    const { store, actions } = setup()
    expect(await store.save()).toEqual({ status: "unchanged" })
    store.edit(" \n ")
    expect((await store.save()).status).toBe("blocked")
    expect((await store.duplicate("Copy")).status).toBe("blocked")
    store.discard()
    store.select(null)
    expect((await store.save()).status).toBe("blocked")
    expect(store.apply(fields())).toBe(false)
    expect(actions.createNextVersion).not.toHaveBeenCalled()
    expect(actions.duplicateAsset).not.toHaveBeenCalled()
  })

  it("saves exact body and contextual metadata against the selected asset with score invalidation", async () => {
    const { store, actions } = setup()
    const applied = {
      ...fields(),
      originalInput: "  applied request\n",
      compiledPrompt: "  applied body\n",
      assumptions: "Changed assumptions",
      questions: "Changed questions",
      answers: "Changed answers",
      acceptanceCriteria: "Changed acceptance",
      validationCommands: "Changed validation",
    }
    expect(store.apply(applied)).toBe(true)
    expect(store.getSnapshot().dirty).toBe(true)
    const result = await store.save()
    expect(result.status).toBe("saved")
    expect(actions.createNextVersion).toHaveBeenCalledExactlyOnceWith({
      ...applied,
      qualityScore: null,
      promptAssetId: "asset-1",
      makeCurrent: true,
    })
    expect(store.getSnapshot()).toMatchObject({
      dirty: false,
      text: applied.compiledPrompt,
      baselineText: applied.compiledPrompt,
      lastSaveKind: "version",
      selection: { version: { id: "version-2" } },
    })
    expect(actions.afterPersisted).toHaveBeenCalledWith(store.getSnapshot().lastSaved, "version")
  })

  it("detects metadata-only edits, restores clean metadata with discard and reapplication", () => {
    const { store } = setup()
    store.apply({ ...fields(), originalInput: "Different request" })
    expect(store.getSnapshot().dirty).toBe(true)
    store.apply(fields())
    expect(store.getSnapshot().dirty).toBe(false)
    store.apply({ ...fields(), validationCommands: "Different command" })
    expect(store.getSnapshot().dirty).toBe(true)
    store.discard()
    expect(store.getSnapshot().dirty).toBe(false)
    expect(store.getSnapshot().text).toBe(selection().version.compiledPrompt)
  })

  it("keeps draft and baseline after atomic save failure and permits a real retry", async () => {
    const { store, actions } = setup()
    actions.createNextVersion.mockRejectedValueOnce(new Error("Database unavailable"))
    store.edit("unsaved body")
    expect((await store.save()).status).toBe("failed")
    expect(store.getSnapshot()).toMatchObject({
      dirty: true,
      isSaving: false,
      text: "unsaved body",
      baselineText: selection().version.compiledPrompt,
      lastSaved: null,
    })
    expect(actions.afterPersisted).not.toHaveBeenCalled()
    expect((await store.save()).status).toBe("saved")
    expect(actions.createNextVersion).toHaveBeenCalledTimes(2)
  })

  it("duplicates an independent edited snapshot without modifying the source", async () => {
    const { store, actions } = setup()
    const source = selection()
    store.apply({ ...fields(), originalInput: "duplicate request", compiledPrompt: "copy body" })
    expect((await store.duplicate("Separate title")).status).toBe("saved")
    expect(actions.duplicateAsset).toHaveBeenCalledExactlyOnceWith({
      sourcePromptAssetId: source.asset.id,
      sourcePromptVersionId: source.version.id,
      title: "Separate title",
      copyTags: true,
      editedVersion: {
        ...fields(),
        originalInput: "duplicate request",
        compiledPrompt: "copy body",
        qualityScore: null,
      },
    })
    expect(actions.createNextVersion).not.toHaveBeenCalled()
    expect(source).toEqual(selection())
    expect(store.getSnapshot()).toMatchObject({
      dirty: false,
      text: "copy body",
      baselineText: "copy body",
      lastSaveKind: "duplicate",
      selection: { asset: { id: "asset-copy" }, version: { id: "version-copy" } },
    })
  })

  it("allows clean duplication but rejects an empty title and keeps drafts on duplicate failure", async () => {
    const { store, actions } = setup()
    expect((await store.duplicate("  ")).status).toBe("blocked")
    expect(actions.duplicateAsset).not.toHaveBeenCalled()
    actions.duplicateAsset.mockRejectedValueOnce(new Error("Duplicate failed"))
    store.edit("copy draft")
    expect((await store.duplicate("Copy")).status).toBe("failed")
    expect(store.getSnapshot()).toMatchObject({
      dirty: true,
      text: "copy draft",
      selection: selection(),
    })
    store.discard()
    expect((await store.duplicate("Clean copy")).status).toBe("saved")
  })

  it("preserves newer typing while adopting the saved version and captured baseline", async () => {
    const { store, actions } = setup()
    const pending = deferred<CreateNextPromptVersionResult>()
    actions.createNextVersion.mockImplementationOnce(() => pending.promise)
    store.edit("captured")
    const saving = store.save()
    expect(store.getSnapshot().isSaving).toBe(true)
    store.edit("latest typing")
    expect(store.apply(fields())).toBe(false)
    store.discard()
    expect(store.getSnapshot().text).toBe("latest typing")
    pending.resolve(
      saved({
        ...fields(),
        compiledPrompt: "captured",
        qualityScore: null,
        promptAssetId: "asset-1",
        makeCurrent: true,
      }),
    )
    await saving
    expect(store.getSnapshot()).toMatchObject({
      text: "latest typing",
      baselineText: "captured",
      dirty: true,
      selection: { asset: { id: "asset-1" }, version: { id: "version-2" } },
    })
    expect(actions.createNextVersion.mock.calls[0]?.[0].compiledPrompt).toBe("captured")
  })

  it("invalidates the old quality score when typing reverts during an in-flight save", async () => {
    const { store, actions } = setup()
    const pending = deferred<CreateNextPromptVersionResult>()
    actions.createNextVersion.mockImplementationOnce(() => pending.promise)
    store.edit("captured")
    const saving = store.save()
    store.edit(selection().version.compiledPrompt)
    expect(store.getSnapshot().dirty).toBe(false)
    pending.resolve(
      saved({
        ...fields(),
        compiledPrompt: "captured",
        qualityScore: null,
        promptAssetId: "asset-1",
        makeCurrent: true,
      }),
    )
    await saving
    expect(store.getSnapshot().dirty).toBe(true)
    await store.save()
    expect(actions.createNextVersion).toHaveBeenLastCalledWith({
      ...fields(),
      qualityScore: null,
      promptAssetId: "asset-1",
      makeCurrent: true,
    })
  })

  it("keeps original selection and newest typing when duplicate finishes after an edit", async () => {
    const { store, actions } = setup()
    const pending = deferred<CreatePromptWithInitialVersionResult>()
    actions.duplicateAsset.mockImplementationOnce(() => pending.promise)
    store.edit("captured copy")
    const saving = store.duplicate("Copy")
    store.edit("latest original draft")
    const input = actions.duplicateAsset.mock.calls[0]?.[0]
    if (input === undefined) throw new Error("Duplicate was not submitted")
    pending.resolve(duplicated(input))
    await saving
    expect(store.getSnapshot()).toMatchObject({
      selection: selection(),
      text: "latest original draft",
      dirty: true,
      baselineText: selection().version.compiledPrompt,
      lastSaveKind: "duplicate",
      lastSaved: { asset: { id: "asset-copy" } },
    })
    expect(input.editedVersion?.compiledPrompt).toBe("captured copy")
  })

  it.each([
    "version",
    "duplicate",
  ] as const)("synchronously blocks all overlapping writes during %s", async (kind) => {
    const { store, actions } = setup()
    const pending = deferred<CreateNextPromptVersionResult>()
    actions.createNextVersion.mockImplementationOnce(() => pending.promise)
    actions.duplicateAsset.mockImplementationOnce(() => pending.promise)
    store.edit("draft")
    const saving = kind === "version" ? store.save() : store.duplicate("Copy")
    expect((await store.save()).status).toBe("blocked")
    expect((await store.duplicate("Copy again")).status).toBe("blocked")
    expect(
      actions.createNextVersion.mock.calls.length + actions.duplicateAsset.mock.calls.length,
    ).toBe(1)
    pending.resolve(
      saved({ ...fields(), compiledPrompt: "draft", promptAssetId: "asset-1", makeCurrent: true }),
    )
    await saving
  })

  it.each([
    "version",
    "duplicate",
  ] as const)("treats %s refresh failure as saved and retries refresh only", async (kind) => {
    const { store, actions } = setup()
    actions.afterPersisted.mockImplementationOnce(async () => {
      expect(store.getSnapshot().dirty).toBe(false)
      expect(store.getSnapshot().baselineText).toBe("persisted")
      expect(store.getSnapshot().lastSaved).not.toBeNull()
      throw new Error("Refresh unavailable")
    })
    store.edit("persisted")
    const result = kind === "version" ? await store.save() : await store.duplicate("Copy")
    expect(result).toMatchObject({ status: "saved", warning: expect.any(String) })
    expect(store.getSnapshot()).toMatchObject({
      dirty: false,
      isSaving: false,
      baselineText: "persisted",
    })
    expect(await store.save()).toEqual({ status: "unchanged" })
    expect(await store.retryRefresh()).toBe(true)
    expect(await store.retryRefresh()).toBe(false)
    expect(actions.afterPersisted).toHaveBeenCalledTimes(2)
    expect(
      actions.createNextVersion.mock.calls.length + actions.duplicateAsset.mock.calls.length,
    ).toBe(1)
  })

  it("rejects selection replacement while dirty or saving and ignores same-version late data", async () => {
    const { store, actions } = setup()
    const other = selection()
    other.version.id = "other-version"
    store.edit("draft")
    expect(store.select(other)).toBe(false)
    expect(store.select(null)).toBe(false)
    const before = store.getSnapshot()
    expect(store.select(selection())).toBe(true)
    expect(store.getSnapshot()).toBe(before)
    const pending = deferred<CreateNextPromptVersionResult>()
    actions.createNextVersion.mockImplementationOnce(() => pending.promise)
    const saving = store.save()
    expect(store.select(other)).toBe(false)
    pending.resolve(
      saved({ ...fields(), compiledPrompt: "draft", promptAssetId: "asset-1", makeCurrent: true }),
    )
    await saving
    const persisted = store.getSnapshot()
    const late = { ...selection(), version: { ...selection().version, id: "version-2" } }
    expect(store.select(late)).toBe(true)
    expect(store.getSnapshot()).toBe(persisted)
    expect(store.select(other)).toBe(true)
  })

  it("retains external drafts across subscriptions and lock while denying writes", async () => {
    const { store, actions, lock, unlock } = setup()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.edit("retained draft")
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    const draft = store.getSnapshot()
    lock()
    expect((await store.save()).status).toBe("blocked")
    expect((await store.duplicate("Copy")).status).toBe("blocked")
    expect(await store.copy()).toBe(false)
    expect(store.getSnapshot()).toMatchObject({
      text: draft.text,
      baselineText: draft.baselineText,
      dirty: true,
    })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(actions.createNextVersion).not.toHaveBeenCalled()
    expect(actions.duplicateAsset).not.toHaveBeenCalled()
    unlock()
    expect((await store.save()).status).toBe("saved")
  })

  it("reports copy failure without losing the draft", async () => {
    const { store, actions } = setup()
    actions.copyText.mockRejectedValueOnce(new Error("Clipboard unavailable"))
    store.edit("draft")
    expect(await store.copy()).toBe(false)
    expect(store.getSnapshot()).toMatchObject({
      text: "draft",
      dirty: true,
      message: expect.any(String),
    })
  })
})
