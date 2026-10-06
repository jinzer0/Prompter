import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import type { CreateNextPromptVersionResult } from "../../../electron/ipc-types"
import { usePromptEditor } from "../hooks/use-prompt-editor"
import {
  createUnsavedChangesGuard,
  type GuardOutcome,
  useUnsavedChangesGuard,
} from "../hooks/use-unsaved-changes-guard"
import {
  createPromptEditorStore,
  type EditorVersionFields,
  type PromptEditorSnapshot,
  type PromptEditorStore,
} from "../lib/prompt-editor"
import { Button } from "./ui/button"
import { DialogShell, focusDialog } from "./ui/dialog"
import { Input } from "./ui/input"

type RefreshCallback = (
  result: CreateNextPromptVersionResult,
  kind: "version" | "duplicate",
) => Promise<void>
type PromptEditorContextValue = {
  readonly store: PromptEditorStore
  readonly snapshot: PromptEditorSnapshot
  readonly requestTransition: (action: () => void | Promise<void>) => Promise<boolean>
  readonly requestApply: (fields: EditorVersionFields, projectId: string) => void
  readonly requestDuplicate: () => void
  readonly registerRefresh: (callback: RefreshCallback) => () => void
}

type EditorDialog =
  | { readonly kind: "apply"; readonly fields: EditorVersionFields; readonly projectId: string }
  | { readonly kind: "duplicate"; readonly assetId: string; readonly projectId: string }

const PromptEditorContext = createContext<PromptEditorContextValue | null>(null)

export function usePromptEditorContext(): PromptEditorContextValue {
  const context = useContext(PromptEditorContext)
  if (!context) throw new Error("PromptEditorProvider is required")
  return context
}

function EditorDialogShell({
  children,
  title,
  description,
  onCancel,
}: {
  readonly children: ReactNode
  readonly title: string
  readonly description: string
  readonly onCancel: () => void | Promise<void>
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    const cancel = element?.querySelector<HTMLButtonElement>("[data-editor-dialog-cancel]")
    if (!element || !cancel) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    element.showModal()
    const restore = focusDialog({ initialFocus: cancel, restoreFocus: previous })
    return () => {
      element.close()
      restore()
    }
  }, [])
  return (
    <DialogShell
      ref={dialog}
      title={title}
      description={description}
      titleId="editor-dialog-title"
      descriptionId="editor-dialog-description"
      role="alertdialog"
      onCancel={onCancel}
    >
      {children}
    </DialogShell>
  )
}

export function PromptEditorProvider({
  children,
  isUnlocked,
}: {
  readonly children?: ReactNode
  readonly isUnlocked: boolean
}) {
  const unlocked = useRef(isUnlocked)
  unlocked.current = isUnlocked
  const refreshCallbacks = useRef(new Set<RefreshCallback>())
  const registerRefresh = useCallback((callback: RefreshCallback) => {
    refreshCallbacks.current.add(callback)
    return () => {
      refreshCallbacks.current.delete(callback)
    }
  }, [])
  const [store] = useState(() =>
    createPromptEditorStore({
      createNextVersion: (input) => window.prompter.prompts.createNextVersion(input),
      duplicateAsset: (input) => window.prompter.prompts.duplicateAsset(input),
      copyText: async (text) => {
        await window.prompter.clipboard.copyText({ text })
      },
      afterPersisted: async (result, kind) => {
        for (const callback of [...refreshCallbacks.current]) await callback(result, kind)
      },
      isUnlocked: () => unlocked.current,
    }),
  )
  const snapshot = usePromptEditor(store)
  const [guard] = useState(() =>
    createUnsavedChangesGuard({
      getSnapshot: store.getSnapshot,
      subscribe: store.subscribe,
      save: store.save,
      discard: store.discard,
      isUnlocked: () => unlocked.current,
    }),
  )
  const guardSnapshot = useUnsavedChangesGuard(guard)
  const [dialog, setDialog] = useState<EditorDialog | null>(null)
  const dialogRef = useRef<EditorDialog | null>(null)
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const duplicateBusy = useRef(false)
  const [duplicatePersisted, setDuplicatePersisted] = useState(false)
  const closeRequest = useRef<string | null>(null)
  const setEditorDialog = (next: EditorDialog | null) => {
    dialogRef.current = next
    setDialog(next)
    setMessage(null)
  }

  useEffect(() => guard.connect(), [guard])

  // This subscription stays mounted through lock and never reports a fabricated clean state.
  useEffect(() => {
    const report = () => {
      if (!isUnlocked && !store.getSnapshot().dirty) return
      void window.prompter.windowClose
        .updateState({ dirty: store.getSnapshot().dirty })
        .catch(() => {
          // A close handshake independently requires a successful current-state report.
        })
    }
    report()
    return store.subscribe(report)
  }, [store, isUnlocked])

  useEffect(
    () =>
      window.prompter.windowClose.onRequested((request) => {
        if (
          dialogRef.current ||
          guard.getSnapshot().pending ||
          guard.getSnapshot().busy ||
          closeRequest.current
        ) {
          void window.prompter.windowClose
            .confirm({ requestId: request.requestId, outcome: "cancel" })
            .catch(() => {})
          return
        }
        closeRequest.current = request.requestId
        const approve = async (outcome: GuardOutcome) => {
          const current = store.getSnapshot()
          await window.prompter.windowClose.updateState({ dirty: current.dirty })
          if (
            closeRequest.current !== request.requestId ||
            store.getSnapshot().dirty ||
            store.getSnapshot().isSaving
          )
            return false
          if (!unlocked.current && outcome !== "clean") return false
          const confirmedOutcome =
            outcome === "clean" &&
            unlocked.current &&
            current.lastSaved !== null &&
            current.selection !== null &&
            current.lastSaved.version.id === current.selection.version.id
              ? "saved"
              : outcome
          const result = await window.prompter.windowClose.confirm({
            requestId: request.requestId,
            outcome: confirmedOutcome,
          })
          return result.status === "accepted"
        }
        void guard
          .request(approve, {
            allowLockedClean: true,
            onCancel: async () => {
              closeRequest.current = null
              await window.prompter.windowClose.confirm({
                requestId: request.requestId,
                outcome: "cancel",
              })
            },
          })
          .then(() => {
            if (closeRequest.current === request.requestId) closeRequest.current = null
          })
      }),
    [guard, store],
  )

  const available = () =>
    unlocked.current &&
    !store.getSnapshot().isSaving &&
    !dialogRef.current &&
    !guard.getSnapshot().pending &&
    !guard.getSnapshot().busy
  const requestApply = (fields: EditorVersionFields, projectId: string) => {
    if (!available() || store.getSnapshot().selection?.project.id !== projectId) return
    if (store.getSnapshot().dirty) setEditorDialog({ kind: "apply", fields, projectId })
    else store.apply(fields)
  }
  const requestDuplicate = () => {
    const selection = store.getSnapshot().selection
    if (!available() || !selection) return
    setDuplicatePersisted(false)
    setTitle(`Copy of ${selection.asset.title}`)
    setEditorDialog({
      kind: "duplicate",
      assetId: selection.asset.id,
      projectId: selection.project.id,
    })
  }
  const confirmEditorDialog = async () => {
    const request = dialogRef.current
    const current = store.getSnapshot()
    if (
      !request ||
      duplicateBusy.current ||
      current.isSaving ||
      (request.kind === "duplicate" && duplicatePersisted)
    )
      return
    if (!unlocked.current) {
      setMessage("취소한 뒤 잠금을 해제하세요.")
      return
    }
    if (
      current.selection?.project.id !== request.projectId ||
      (request.kind === "duplicate" && current.selection.asset.id !== request.assetId)
    ) {
      setMessage("선택한 프로젝트나 프롬프트가 변경되었습니다. 취소한 뒤 다시 시도하세요.")
      return
    }
    if (request.kind === "apply") {
      if (store.apply(request.fields)) setEditorDialog(null)
      return
    }
    if (!title.trim()) {
      setMessage("복제본의 제목을 입력하세요.")
      return
    }
    duplicateBusy.current = true
    setMessage(null)
    try {
      const result = await store.duplicate(title)
      if (dialogRef.current !== request) return
      if (result.status === "failed" || result.status === "blocked") setMessage(result.message)
      else if (store.getSnapshot().dirty) {
        setDuplicatePersisted(true)
        setMessage(
          "복제본은 저장됐습니다. 저장 중 추가한 편집 내용이 남아 있으므로 취소한 뒤 확인하세요.",
        )
      } else setEditorDialog(null)
    } catch {
      if (dialogRef.current === request)
        setMessage("복제하지 못했습니다. 편집 내용과 제목은 그대로 남아 있습니다. 다시 시도하세요.")
    } finally {
      duplicateBusy.current = false
    }
  }
  const modal = guardSnapshot.pending || dialog !== null
  return (
    <PromptEditorContext.Provider
      value={{
        store,
        snapshot,
        requestApply,
        requestDuplicate,
        requestTransition: (action) =>
          dialogRef.current ? Promise.resolve(false) : guard.request(action),
        registerRefresh,
      }}
    >
      <div className="h-full min-h-0" inert={modal || guardSnapshot.busy}>
        {children}
      </div>
      {guardSnapshot.pending && (
        <EditorDialogShell
          title="저장하지 않은 변경"
          description={
            isUnlocked
              ? "현재 편집 내용을 저장하거나 버린 뒤 요청을 진행할 수 있습니다."
              : "앱이 잠겨 있습니다. 취소한 뒤 잠금을 해제해 편집 내용을 확인하세요."
          }
          onCancel={() => guard.cancel()}
        >
          {guardSnapshot.message && (
            <p role="alert">
              {isUnlocked ? guardSnapshot.message : "취소한 뒤 잠금을 해제하세요."}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              data-editor-dialog-cancel
              variant="secondary"
              onClick={() => void guard.cancel()}
            >
              취소
            </Button>
            <Button
              variant="secondary"
              disabled={!isUnlocked || guardSnapshot.busy || snapshot.isSaving}
              onClick={() => void guard.discard()}
            >
              변경 버리기
            </Button>
            <Button
              disabled={!isUnlocked || guardSnapshot.busy || snapshot.isSaving}
              onClick={() => void guard.save()}
            >
              {snapshot.isSaving
                ? "저장 중…"
                : guardSnapshot.busy
                  ? "처리 중…"
                  : guardSnapshot.message
                    ? snapshot.dirty
                      ? "다시 저장"
                      : "다시 시도"
                    : "새 버전 저장"}
            </Button>
          </div>
        </EditorDialogShell>
      )}
      {dialog && (
        <EditorDialogShell
          title={
            isUnlocked
              ? dialog.kind === "apply"
                ? "편집 내용 교체"
                : "복제하여 저장"
              : "앱이 잠겨 있습니다"
          }
          description={
            !isUnlocked
              ? "취소한 뒤 잠금을 해제해 편집 내용을 확인하세요."
              : dialog.kind === "apply"
                ? "현재 미저장 편집 내용을 컴파일 결과로 교체합니다. 저장은 별도로 실행해야 합니다."
                : "현재 편집 본문과 선택한 프롬프트의 시나리오·대상·메타데이터로 독립된 복제본을 만듭니다. 원본 버전은 변경하지 않습니다."
          }
          onCancel={() => setEditorDialog(null)}
        >
          {isUnlocked && dialog.kind === "duplicate" && (
            <div className="space-y-3">
              <label htmlFor="editor-duplicate-title" className="block space-y-2">
                복제본 제목 (필수)
                <Input
                  id="editor-duplicate-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={snapshot.isSaving || duplicatePersisted}
                />
              </label>
              <dl className="space-y-1 text-sm">
                <div>
                  <dt className="inline">프로젝트: </dt>
                  <dd className="inline">{snapshot.selection?.project.name}</dd>
                </div>
                <div>
                  <dt className="inline">시나리오: </dt>
                  <dd className="inline">{snapshot.selection?.asset.scenario}</dd>
                </div>
                <div>
                  <dt className="inline">대상 에이전트: </dt>
                  <dd className="inline">{snapshot.selection?.asset.targetAgent}</dd>
                </div>
              </dl>
              <p className="text-sm">
                원래 요청과 필수 버전 정보는 현재 편집 내용에서 함께 복제합니다. 필수 정보가 없으면
                저장하지 않습니다.
              </p>
            </div>
          )}
          {message && <p role="alert">{isUnlocked ? message : "취소한 뒤 잠금을 해제하세요."}</p>}
          <div className="flex justify-end gap-2">
            <Button
              data-editor-dialog-cancel
              variant="secondary"
              onClick={() => setEditorDialog(null)}
            >
              취소
            </Button>
            <Button
              disabled={
                !isUnlocked ||
                snapshot.isSaving ||
                (dialog.kind === "duplicate" && duplicatePersisted)
              }
              onClick={() => void confirmEditorDialog()}
            >
              {snapshot.isSaving
                ? "저장 중…"
                : dialog.kind === "apply"
                  ? "교체하여 적용"
                  : message && !duplicatePersisted
                    ? "다시 복제"
                    : "복제하여 저장"}
            </Button>
          </div>
        </EditorDialogShell>
      )}
    </PromptEditorContext.Provider>
  )
}
