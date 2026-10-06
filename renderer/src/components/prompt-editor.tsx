import { usePromptEditorContext } from "./prompt-editor-provider"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"

export function PromptEditor() {
  const { store, snapshot, requestDuplicate } = usePromptEditorContext()
  const selection = snapshot.selection
  if (selection === null) return null

  return (
    <section
      data-testid="prompt-editor"
      aria-labelledby="prompt-editor-heading"
      className="mt-3 space-y-3 border-b border-border-subtle pb-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="prompt-editor-heading" className="text-[16px] font-medium">
          {selection.asset.title}
        </h3>
        <Badge variant="accent">v{selection.version.versionNumber}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void store.copy()} disabled={snapshot.text.trim().length === 0}>
          복사
        </Button>
        <Button
          data-menu-action-target="save-editor-version"
          onClick={() => void store.save()}
          disabled={snapshot.isSaving || !snapshot.dirty || snapshot.text.trim().length === 0}
        >
          {snapshot.isSaving ? "저장 중…" : "새 버전 저장"}
        </Button>
        <Button
          variant="secondary"
          onClick={requestDuplicate}
          disabled={snapshot.isSaving || snapshot.text.trim().length === 0}
        >
          복제하여 저장
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            const input = document.querySelector<HTMLInputElement>('[aria-label="Prompt tag name"]')
            input?.scrollIntoView({ block: "nearest" })
            input?.focus()
          }}
        >
          태그 편집
        </Button>
      </div>
      <label htmlFor="prompt-editor-body" className="block text-[14px] font-medium">
        프롬프트 본문
      </label>
      <Textarea
        id="prompt-editor-body"
        aria-label="Prompt editor body"
        className="min-h-48 font-mono text-[14px] leading-5"
        value={snapshot.text}
        onChange={(event) => store.edit(event.currentTarget.value)}
      />
      <p aria-live="polite" className="text-[12px] text-muted-strong">
        {snapshot.dirty ? "저장하지 않은 변경 있음" : "저장된 내용과 같습니다."}
      </p>
      {snapshot.message !== null && (
        <p role="status" className="text-[14px] text-muted-strong">
          {snapshot.message}
        </p>
      )}
      {snapshot.refreshWarning !== null && (
        <Button
          variant="ghost"
          size="sm"
          disabled={snapshot.isSaving}
          onClick={() => void store.retryRefresh()}
        >
          저장 후 목록 갱신 재시도
        </Button>
      )}
    </section>
  )
}
