import { useEffect, useId, useRef, useState } from "react"

import { CLOSE_ACTIVE_PANEL_EVENT } from "../lib/menu-actions"

import { usePromptEditorContext } from "./prompt-editor-provider"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"

export type PromptEditorDetailTarget = "versions" | "export" | "quality"

type PromptEditorProps = {
  readonly onShowDetails: (target: PromptEditorDetailTarget) => void
}

export function PromptEditor({ onShowDetails }: PromptEditorProps) {
  const { store, snapshot, requestDuplicate } = usePromptEditorContext()
  const menuId = useId()
  const menuRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLSpanElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const selection = snapshot.selection

  useEffect(() => {
    const cancelMenu = (event: Event) => {
      if (
        !menuRef.current?.matches(":popover-open") ||
        !menuRef.current.contains(document.activeElement)
      )
        return
      event.preventDefault()
      menuRef.current.hidePopover()
      moreRef.current?.querySelector("button")?.focus()
    }
    window.addEventListener(CLOSE_ACTIVE_PANEL_EVENT, cancelMenu)
    return () => window.removeEventListener(CLOSE_ACTIVE_PANEL_EVENT, cancelMenu)
  }, [])

  if (selection === null) return null

  function closeMenu() {
    menuRef.current?.hidePopover()
  }

  function showDetails(target: PromptEditorDetailTarget) {
    closeMenu()
    onShowDetails(target)
  }

  return (
    <section
      data-testid="prompt-editor"
      aria-labelledby="prompt-editor-heading"
      className="prompter-editor"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="prompt-editor-heading" className="text-[21px] font-semibold tracking-tight">
          {selection.asset.title}
        </h3>
        <Badge variant="accent">v{selection.version.versionNumber}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => void store.copy()}
          disabled={snapshot.text.trim().length === 0}
        >
          복사
        </Button>
        <Button
          data-menu-action-target="save-editor-version"
          onClick={() => void store.save()}
          disabled={snapshot.isSaving || !snapshot.dirty || snapshot.text.trim().length === 0}
        >
          {snapshot.isSaving ? "저장 중…" : "새 버전 저장"}
        </Button>
        <span ref={moreRef}>
          <Button
            variant="secondary"
            className="prompter-editor-more"
            popoverTarget={menuId}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
          >
            더보기 ···
          </Button>
        </span>
        <div
          id={menuId}
          ref={menuRef}
          popover="auto"
          role="menu"
          aria-label="프롬프트 보조 동작"
          className="prompter-editor-menu"
          onToggle={(event) => {
            const open = event.newState === "open"
            setMenuOpen(open)
            if (open)
              menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus()
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) closeMenu()
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault()
              closeMenu()
              moreRef.current?.querySelector("button")?.focus()
              return
            }
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
            const items = [
              ...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
            ]
            if (items.length === 0) return
            event.preventDefault()
            const focused = document.activeElement
            const current = focused instanceof HTMLButtonElement ? items.indexOf(focused) : -1
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : (current + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length
            items[next]?.focus()
          }}
        >
          <Button
            role="menuitem"
            tabIndex={-1}
            variant="ghost"
            disabled={snapshot.isSaving || snapshot.text.trim().length === 0}
            onClick={() => {
              closeMenu()
              requestDuplicate()
            }}
          >
            복제하여 저장
          </Button>
          <Button
            role="menuitem"
            tabIndex={-1}
            variant="ghost"
            onClick={() => showDetails("versions")}
          >
            버전 이력 · 비교
          </Button>
          <Button
            role="menuitem"
            tabIndex={-1}
            variant="ghost"
            onClick={() => {
              closeMenu()
              const input = document.querySelector<HTMLInputElement>(
                '[aria-label="Prompt tag name"]',
              )
              for (
                let ancestor = input?.parentElement;
                ancestor;
                ancestor = ancestor.parentElement
              ) {
                if (ancestor instanceof HTMLDetailsElement) ancestor.open = true
              }
              input?.scrollIntoView({ block: "nearest" })
              input?.focus()
            }}
          >
            태그 편집
          </Button>
          <Button
            role="menuitem"
            tabIndex={-1}
            variant="ghost"
            onClick={() => showDetails("export")}
          >
            내보내기
          </Button>
          <Button
            role="menuitem"
            tabIndex={-1}
            variant="ghost"
            onClick={() => showDetails("quality")}
          >
            품질 검토
          </Button>
        </div>
      </div>
      <label htmlFor="prompt-editor-body" className="sr-only">
        프롬프트 본문
      </label>
      <Textarea
        id="prompt-editor-body"
        aria-label="Prompt editor body"
        className="prompter-editor-body text-[14px]"
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
