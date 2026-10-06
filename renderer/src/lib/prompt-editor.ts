import type {
  CreateNextPromptVersionInput,
  CreateNextPromptVersionResult,
  CreatePromptVersionInput,
  CreatePromptWithInitialVersionResult,
  DuplicatePromptAssetInput,
  Project,
  PromptAsset,
  PromptVersion,
} from "../../../electron/ipc-types"

export type EditorSelection = { project: Project; asset: PromptAsset; version: PromptVersion }
export type EditorVersionFields = Omit<CreatePromptVersionInput, "promptAssetId">
export type EditorSaveResult =
  | { status: "saved"; result: CreateNextPromptVersionResult; warning: string | null }
  | { status: "unchanged" }
  | { status: "failed"; message: string }
  | { status: "blocked"; message: string }

export type PromptEditorSnapshot = {
  selection: EditorSelection | null
  text: string
  baselineText: string
  dirty: boolean
  isSaving: boolean
  message: string | null
  refreshWarning: string | null
  lastSaved: CreateNextPromptVersionResult | null
  lastSaveKind: "version" | "duplicate" | null
}

export type PromptEditorActions = {
  createNextVersion(input: CreateNextPromptVersionInput): Promise<CreateNextPromptVersionResult>
  duplicateAsset(input: DuplicatePromptAssetInput): Promise<CreatePromptWithInitialVersionResult>
  copyText(text: string): Promise<void>
  afterPersisted(
    result: CreateNextPromptVersionResult,
    kind: "version" | "duplicate",
  ): Promise<void>
  isUnlocked(): boolean
}

export type PromptEditorStore = {
  getSnapshot(): PromptEditorSnapshot
  subscribe(listener: () => void): () => void
  select(selection: EditorSelection | null): boolean
  edit(text: string): void
  discard(): void
  save(): Promise<EditorSaveResult>
  duplicate(title: string): Promise<EditorSaveResult>
  copy(): Promise<boolean>
  apply(fields: EditorVersionFields): boolean
  retryRefresh(): Promise<boolean>
}

const contextKeys = [
  "originalInput",
  "assumptions",
  "questions",
  "answers",
  "acceptanceCriteria",
  "validationCommands",
] as const
const refreshWarning =
  "저장은 완료됐지만 목록을 새로고침하지 못했습니다. 새로고침을 다시 시도해 주세요."

function versionFields(version: PromptVersion): EditorVersionFields {
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

function equalDraft(left: EditorVersionFields, right: EditorVersionFields): boolean {
  return (
    left.compiledPrompt === right.compiledPrompt &&
    contextKeys.every((key) => (left[key] ?? null) === (right[key] ?? null))
  )
}

export function createPromptEditorStore(actions: PromptEditorActions): PromptEditorStore {
  let snapshot: PromptEditorSnapshot = {
    selection: null,
    text: "",
    baselineText: "",
    dirty: false,
    isSaving: false,
    message: null,
    refreshWarning: null,
    lastSaved: null,
    lastSaveKind: null,
  }
  let baseline: EditorVersionFields | null = null
  let draft: EditorVersionFields | null = null
  let revision = 0
  let pendingRefresh: {
    result: CreateNextPromptVersionResult
    kind: "version" | "duplicate"
  } | null = null
  const listeners = new Set<() => void>()

  function update(patch: Partial<PromptEditorSnapshot>): void {
    snapshot = { ...snapshot, ...patch }
    for (const listener of listeners) listener()
  }

  function replaceDraft(fields: EditorVersionFields): void {
    if (draft === null || baseline === null) return
    if (!equalDraft(fields, draft)) revision += 1
    const dirty = !equalDraft(fields, baseline)
    draft = { ...fields, qualityScore: dirty ? null : baseline.qualityScore }
    update({ text: draft.compiledPrompt, dirty, message: null })
  }

  function blocked(message: string): EditorSaveResult {
    update({ message })
    return { status: "blocked", message }
  }

  async function refresh(
    result: CreateNextPromptVersionResult,
    kind: "version" | "duplicate",
  ): Promise<string | null> {
    pendingRefresh = { result, kind }
    try {
      await actions.afterPersisted(result, kind)
      pendingRefresh = null
      return null
    } catch {
      return refreshWarning
    }
  }

  async function persist(kind: "version" | "duplicate", title?: string): Promise<EditorSaveResult> {
    if (snapshot.isSaving) return blocked("저장이 진행 중입니다.")
    if (!actions.isUnlocked())
      return blocked("잠금을 해제한 뒤 저장해 주세요. 편집 내용은 그대로 남아 있습니다.")
    const selection = snapshot.selection
    if (selection === null || draft === null) return blocked("저장할 프롬프트를 선택해 주세요.")
    if (draft.compiledPrompt.trim().length === 0) return blocked("본문을 입력한 뒤 저장해 주세요.")
    if (draft.originalInput.trim().length === 0)
      return blocked("원래 요청을 입력한 뒤 저장해 주세요.")
    if (kind === "version" && !snapshot.dirty) return { status: "unchanged" }
    if (kind === "duplicate" && !title?.trim())
      return blocked("복제할 프롬프트의 제목을 입력해 주세요.")
    const captured = { ...draft }
    const capturedRevision = revision
    update({ isSaving: true, message: null })
    let result: CreateNextPromptVersionResult
    try {
      result =
        kind === "version"
          ? await actions.createNextVersion({
              ...captured,
              promptAssetId: selection.asset.id,
              makeCurrent: true,
            })
          : await actions.duplicateAsset({
              sourcePromptAssetId: selection.asset.id,
              sourcePromptVersionId: selection.version.id,
              title,
              copyTags: true,
              editedVersion: captured,
            })
    } catch {
      const message = "저장하지 못했습니다. 편집 내용은 그대로 남아 있습니다."
      update({ isSaving: false, message })
      return { status: "failed", message }
    }

    if (kind === "version" || revision === capturedRevision) {
      baseline = versionFields(result.version)
      if (revision === capturedRevision) draft = { ...baseline }
      draft = {
        ...draft,
        qualityScore: equalDraft(draft, baseline) ? baseline.qualityScore : null,
      }
      update({
        selection: { project: selection.project, asset: result.asset, version: result.version },
        baselineText: baseline.compiledPrompt,
        text: draft.compiledPrompt,
        dirty: !equalDraft(draft, baseline),
        lastSaved: result,
        lastSaveKind: kind,
      })
    } else {
      update({ lastSaved: result, lastSaveKind: kind })
    }
    const warning = await refresh(result, kind)
    update({ isSaving: false, refreshWarning: warning, message: warning ?? "저장했습니다." })
    return { status: "saved", result, warning }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    select(selection) {
      if (selection !== null && snapshot.selection?.version.id === selection.version.id) return true
      if (snapshot.dirty || snapshot.isSaving) return false
      baseline = selection === null ? null : versionFields(selection.version)
      draft = baseline === null ? null : { ...baseline }
      revision += 1
      update({
        selection,
        text: draft?.compiledPrompt ?? "",
        baselineText: draft?.compiledPrompt ?? "",
        dirty: false,
        message: null,
        refreshWarning: null,
        lastSaved: null,
        lastSaveKind: null,
      })
      return true
    },
    edit(text) {
      if (draft !== null) replaceDraft({ ...draft, compiledPrompt: text })
    },
    discard() {
      if (baseline !== null && !snapshot.isSaving) replaceDraft({ ...baseline })
    },
    save: () => persist("version"),
    duplicate: (title) => persist("duplicate", title),
    async copy() {
      if (!actions.isUnlocked() || snapshot.selection === null) return false
      try {
        await actions.copyText(snapshot.text)
        update({ message: "복사했습니다." })
        return true
      } catch {
        update({ message: "복사하지 못했습니다. 편집 내용은 그대로 남아 있습니다." })
        return false
      }
    },
    apply(fields) {
      if (snapshot.isSaving || snapshot.selection === null) return false
      replaceDraft({ ...fields })
      return true
    },
    async retryRefresh() {
      if (snapshot.isSaving || pendingRefresh === null || !actions.isUnlocked()) return false
      const { result, kind } = pendingRefresh
      update({ isSaving: true, message: null })
      const warning = await refresh(result, kind)
      update({ isSaving: false, refreshWarning: warning, message: warning ?? "새로고침했습니다." })
      return warning === null
    },
  }
}
