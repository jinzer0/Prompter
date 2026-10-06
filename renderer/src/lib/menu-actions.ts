import type { MenuAction } from "../../../electron/ipc-types"

function assertNever(value: never): never {
  throw new Error(`Unhandled menu action: ${value}`)
}

function clickMenuTarget(target: string): void {
  const element = document.querySelector<HTMLElement>(`[data-menu-action-target="${target}"]`)

  if (element instanceof HTMLButtonElement && element.disabled) {
    return
  }

  element?.click()
}

function focusMenuTarget(target: string): void {
  const element = document.querySelector<HTMLElement>(`[data-menu-action-target="${target}"]`)
  element?.focus()
  element?.scrollIntoView({ block: "nearest" })
}

type MenuActionHandlers = {
  readonly refreshAppLock?: () => void
}

export const OPEN_SETTINGS_EVENT = "prompter:open-settings"
export const OPEN_LIBRARY_EVENT = "prompter:open-library"

function revealSettings(action: () => void): void {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))
  window.requestAnimationFrame(action)
}

function revealLibrary(action: () => void): void {
  window.dispatchEvent(new Event(OPEN_LIBRARY_EVENT))
  window.requestAnimationFrame(action)
}

export function handleMenuAction(action: MenuAction, handlers: MenuActionHandlers = {}): void {
  switch (action) {
    case "newPrompt":
      revealLibrary(() => clickMenuTarget("new-prompt"))
      return
    case "newProject":
      clickMenuTarget("new-project")
      return
    case "quickCaptureFromClipboard":
      revealLibrary(() => clickMenuTarget("quick-capture-from-clipboard"))
      return
    case "focusSearch":
      revealLibrary(() => focusMenuTarget("search-prompts"))
      return
    case "savePrompt":
      revealLibrary(() => clickMenuTarget("save-editor-version"))
      return
    case "copyCompiledPrompt":
      revealLibrary(() => clickMenuTarget("copy-compiled-prompt"))
      return
    case "exportPrompt":
      revealLibrary(() => clickMenuTarget("save-compiled-export"))
      return
    case "exportFullBackup":
      revealSettings(() => {
        focusMenuTarget("backup-export-full")
        clickMenuTarget("backup-export-full")
      })
      return
    case "importBackup":
      revealSettings(() => {
        focusMenuTarget("backup-import-open")
        clickMenuTarget("backup-import-open")
      })
      return
    case "openSettings":
      revealSettings(() => focusMenuTarget("settings-panel"))
      return
    case "openLibraryInsights":
      clickMenuTarget("library-insights")
      return
    case "openLibraryMaintenance":
      revealSettings(() => focusMenuTarget("settings-maintenance"))
      return
    case "lockPrompter":
      handlers.refreshAppLock?.()
      return
    case "closeActivePanel":
      document.activeElement instanceof HTMLElement && document.activeElement.blur()
      return
    default:
      assertNever(action)
  }
}

export function handleMenuKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented) {
    return
  }

  if (
    event.key.toLowerCase() === "s" &&
    (event.metaKey || event.ctrlKey) &&
    !event.shiftKey &&
    !event.altKey
  ) {
    event.preventDefault()
    handleMenuAction("savePrompt")
    return
  }

  if (event.key === "," && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    handleMenuAction("openSettings")
    return
  }

  if (event.key.toLowerCase() === "v" && event.shiftKey && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    handleMenuAction("quickCaptureFromClipboard")
    return
  }

  if (event.key !== "Escape") {
    return
  }

  handleMenuAction("closeActivePanel")
}
