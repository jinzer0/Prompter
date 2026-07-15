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

export function handleMenuAction(action: MenuAction): void {
  switch (action) {
    case "newPrompt":
      clickMenuTarget("new-prompt")
      return
    case "newProject":
      clickMenuTarget("new-project")
      return
    case "quickCaptureFromClipboard":
      clickMenuTarget("quick-capture-from-clipboard")
      return
    case "focusSearch":
      focusMenuTarget("search-prompts")
      return
    case "savePrompt":
      clickMenuTarget("save-compiled-prompt")
      return
    case "copyCompiledPrompt":
      clickMenuTarget("copy-compiled-prompt")
      return
    case "exportPrompt":
      clickMenuTarget("save-compiled-export")
      return
    case "exportFullBackup":
      clickMenuTarget("backup-export-full")
      return
    case "importBackup":
      clickMenuTarget("backup-import-open")
      return
    case "openSettings":
      focusMenuTarget("settings-panel")
      return
    case "openLibraryMaintenance":
      focusMenuTarget("settings-maintenance")
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
