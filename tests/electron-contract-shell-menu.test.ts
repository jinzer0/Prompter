import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

import {
  createApplicationMenuTemplate,
  MENU_ACTION_CHANNEL,
  MENU_ACTIONS,
  menuActionSchema,
} from "../electron/app-menu"
import { createWindowOptions } from "../electron/window-options"

type MenuTemplateItem = ReturnType<typeof createApplicationMenuTemplate>[number]
function findMenuItem(items: readonly MenuTemplateItem[], label: string): MenuTemplateItem {
  for (const item of items) {
    if (item.label === label) {
      return item
    }

    if (Array.isArray(item.submenu)) {
      const nested = item.submenu.find((submenuItem) => submenuItem.label === label)
      if (nested !== undefined) {
        return nested
      }
    }
  }

  throw new Error(`Menu item not found: ${label}`)
}

function findMenuRole(items: readonly MenuTemplateItem[], role: string): MenuTemplateItem {
  for (const item of items) {
    if (item.role === role) {
      return item
    }

    if (Array.isArray(item.submenu)) {
      const nested = item.submenu.find((submenuItem) => submenuItem.role === role)
      if (nested !== undefined) {
        return nested
      }
    }
  }

  throw new Error(`Menu role not found: ${role}`)
}

function clickMenuItem(item: MenuTemplateItem): void {
  const click = item.click

  if (click === undefined) {
    throw new Error(`Menu item has no click handler: ${item.label ?? item.role ?? "unknown"}`)
  }

  Reflect.apply(click, undefined, [])
}

function findButtonBlock(source: string, text: string, handler: string): string {
  const buttonBlocks = source.match(/<Button[\s\S]*?<\/Button>/g) ?? []
  const buttonBlock = buttonBlocks.find((block) => block.includes(text) && block.includes(handler))

  if (buttonBlock === undefined) {
    throw new Error(`Button block not found for ${text}`)
  }

  return buttonBlock
}

describe("Electron shell contract", () => {
  it("maps menu shortcuts to the intended renderer targets", async () => {
    const appSource = await readFile("renderer/src/app.tsx", "utf8")
    const menuActionSource = await readFile("renderer/src/lib/menu-actions.ts", "utf8")
    const maintenanceWorkbenchSource = await readFile(
      "renderer/src/components/maintenance/maintenance-workbench.tsx",
      "utf8",
    )
    const compilerSource = await readFile(
      "renderer/src/components/prompt-compiler-panel.tsx",
      "utf8",
    )
    const compilerActionsSource = await readFile(
      "renderer/src/components/prompt-compiler-actions.tsx",
      "utf8",
    )
    const saveTargetIndex = compilerActionsSource.indexOf(
      'data-menu-action-target="save-compiled-prompt"',
    )
    const quickCaptureTargetIndex = compilerActionsSource.indexOf(
      'data-menu-action-target="quick-capture-from-clipboard"',
    )
    const llmCompileButton = findButtonBlock(
      compilerActionsSource,
      "최종 프롬프트 생성",
      "onClick={onCompileWithLLM}",
    )
    const saveCompiledPromptButton = findButtonBlock(
      compilerActionsSource,
      "Save compiled prompt",
      "onClick={() => void onSavePrompt()}",
    )

    expect(quickCaptureTargetIndex).toBeGreaterThan(-1)
    expect(saveTargetIndex).toBeGreaterThan(-1)
    expect(saveCompiledPromptButton).toContain('data-menu-action-target="save-compiled-prompt"')
    expect(llmCompileButton).not.toContain('data-menu-action-target="save-compiled-prompt"')
    expect(compilerSource).toContain("onAnalyzeWithLLM={compiler.analyzeWithLLM}")
    expect(compilerSource).toContain("onSavePrompt={compiler.savePrompt}")
    expect(menuActionSource).toContain('case "quickCaptureFromClipboard"')
    expect(menuActionSource).toContain('clickMenuTarget("quick-capture-from-clipboard")')
    expect(menuActionSource).toContain('case "exportFullBackup"')
    expect(menuActionSource).toContain('clickMenuTarget("backup-export-full")')
    expect(menuActionSource).toContain('case "importBackup"')
    expect(menuActionSource).toContain('clickMenuTarget("backup-import-open")')
    expect(menuActionSource).toContain('case "openLibraryMaintenance"')
    expect(menuActionSource).toContain('focusMenuTarget("settings-maintenance")')
    expect(maintenanceWorkbenchSource).toContain('data-menu-action-target="settings-maintenance"')
    expect(menuActionSource).toContain('event.key !== "Escape"')
    expect(menuActionSource).toContain('handleMenuAction("closeActivePanel")')
    expect(appSource).toContain('window.addEventListener("keydown", handleMenuKeyDown)')
  })

  it("uses secure BrowserWindow defaults for the main window", () => {
    const preloadPath = "/tmp/prompter-preload.js"

    const options = createWindowOptions(preloadPath)

    expect(options.webPreferences).toMatchObject({
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    })
  })

  it("defines the narrow main-to-renderer menu action channel", () => {
    expect(MENU_ACTION_CHANNEL).toBe("prompter:menu-action")
    expect(MENU_ACTIONS).toEqual([
      "newPrompt",
      "newProject",
      "quickCaptureFromClipboard",
      "focusSearch",
      "savePrompt",
      "copyCompiledPrompt",
      "exportPrompt",
      "exportFullBackup",
      "importBackup",
      "openSettings",
      "openLibraryInsights",
      "openLibraryMaintenance",
      "lockPrompter",
      "closeActivePanel",
    ])
    expect(menuActionSchema.parse("focusSearch")).toBe("focusSearch")
    expect(menuActionSchema.parse("quickCaptureFromClipboard")).toBe("quickCaptureFromClipboard")
    expect(menuActionSchema.parse("exportFullBackup")).toBe("exportFullBackup")
    expect(menuActionSchema.parse("importBackup")).toBe("importBackup")
    expect(menuActionSchema.parse("openLibraryMaintenance")).toBe("openLibraryMaintenance")
    expect(() => menuActionSchema.parse("runPrompt")).toThrow()
  })

  it("routes macOS menu accelerators through narrow renderer actions", () => {
    const actions: string[] = []
    const template = createApplicationMenuTemplate({
      isDevelopment: false,
      isMac: true,
      sendAction: (action) => actions.push(action),
    })

    expect(template.map((item) => item.label)).toEqual([
      "Prompter",
      "File",
      "Edit",
      "View",
      "Tools",
      "Window",
      "Help",
    ])
    expect(findMenuItem(template, "New Prompt").accelerator).toBe("CmdOrCtrl+N")
    expect(findMenuItem(template, "New Project").accelerator).toBe("CmdOrCtrl+Shift+N")
    expect(findMenuItem(template, "Quick Capture from Clipboard").accelerator).toBe(
      "CmdOrCtrl+Shift+V",
    )
    expect(findMenuItem(template, "Search").accelerator).toBe("CmdOrCtrl+F")
    expect(findMenuItem(template, "Save Prompt").accelerator).toBe("CmdOrCtrl+S")
    expect(findMenuItem(template, "Copy Compiled Prompt").accelerator).toBe("CmdOrCtrl+Shift+C")
    expect(findMenuItem(template, "Close Active Panel").accelerator).toBe("Esc")
    expect(findMenuItem(template, "Settings...").accelerator).toBe("CmdOrCtrl+,")
    expect(findMenuItem(template, "Export Full Backup...").label).toBe("Export Full Backup...")
    expect(findMenuItem(template, "Import Backup...").label).toBe("Import Backup...")
    expect(findMenuItem(template, "Lock Prompter").accelerator).toBe("CmdOrCtrl+Shift+L")
    expect(findMenuItem(template, "Library Maintenance").accelerator).toBeUndefined()

    clickMenuItem(findMenuItem(template, "New Prompt"))
    clickMenuItem(findMenuItem(template, "New Project"))
    clickMenuItem(findMenuItem(template, "Quick Capture from Clipboard"))
    clickMenuItem(findMenuItem(template, "Export Full Backup..."))
    clickMenuItem(findMenuItem(template, "Import Backup..."))
    clickMenuItem(findMenuItem(template, "Search"))
    clickMenuItem(findMenuItem(template, "Copy Compiled Prompt"))
    clickMenuItem(findMenuItem(template, "Library Maintenance"))
    clickMenuItem(findMenuItem(template, "Lock Prompter"))
    clickMenuItem(findMenuItem(template, "Close Active Panel"))

    expect(actions).toEqual([
      "newPrompt",
      "newProject",
      "quickCaptureFromClipboard",
      "exportFullBackup",
      "importBackup",
      "focusSearch",
      "copyCompiledPrompt",
      "openLibraryMaintenance",
      "lockPrompter",
      "closeActivePanel",
    ])
    expect(() => findMenuItem(template, "Toggle Developer Tools")).toThrow()
  })

  it("keeps development-only menu items out of production templates", () => {
    const productionTemplate = createApplicationMenuTemplate({
      isDevelopment: false,
      isMac: true,
      sendAction: () => undefined,
    })
    const developmentTemplate = createApplicationMenuTemplate({
      isDevelopment: true,
      isMac: true,
      sendAction: () => undefined,
    })

    expect(() => findMenuRole(productionTemplate, "reload")).toThrow()
    expect(findMenuRole(developmentTemplate, "reload").role).toBe("reload")
    expect(findMenuRole(developmentTemplate, "toggleDevTools").role).toBe("toggleDevTools")
  })
})
