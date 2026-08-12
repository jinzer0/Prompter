import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  createApplicationMenuTemplate,
  MENU_ACTION_CHANNEL,
  MENU_ACTIONS,
  menuActionSchema,
} from "../electron/app-menu"

type MenuItem = ReturnType<typeof createApplicationMenuTemplate>[number]

function findMenuItem(items: readonly MenuItem[], label: string): MenuItem {
  for (const item of items) {
    if (item.label === label) return item
    if (Array.isArray(item.submenu)) {
      const nested = item.submenu.find((entry) => entry.label === label)
      if (nested !== undefined) return nested
    }
  }
  throw new TypeError(`Menu item not found: ${label}`)
}

function findMenuRole(items: readonly MenuItem[], role: string): MenuItem {
  for (const item of items) {
    if (item.role === role) return item
    if (Array.isArray(item.submenu)) {
      const nested = item.submenu.find((entry) => entry.role === role)
      if (nested !== undefined) return nested
    }
  }
  throw new TypeError(`Menu role not found: ${role}`)
}

function clickMenuItem(item: MenuItem): void {
  if (item.click === undefined) throw new TypeError(`Menu item has no click: ${item.label}`)
  Reflect.apply(item.click, undefined, [])
}

describe("Electron menu contract", () => {
  it("adds Library Insights to the existing narrow menu action channel", () => {
    // Given: the shared menu action schema.
    // When: Library Insights is parsed.
    const action = menuActionSchema.parse("openLibraryInsights")
    // Then: no new channel or shortcut surface is introduced.
    expect(MENU_ACTION_CHANNEL).toBe("prompter:menu-action")
    expect(MENU_ACTIONS).toContain("openLibraryInsights")
    expect(action).toBe("openLibraryInsights")
  })

  it("routes Tools Library Insights through its renderer sidebar target", () => {
    // Given: the production menu and renderer menu-action source.
    const actions: string[] = []
    const template = createApplicationMenuTemplate({
      isDevelopment: false,
      isMac: true,
      sendAction: (action) => actions.push(action),
    })
    const rendererSource = readFileSync("renderer/src/lib/menu-actions.ts", "utf8")
    // When: the Tools item is invoked.
    const item = findMenuItem(template, "Library Insights")
    clickMenuItem(item)
    // Then: it emits the typed action and clicks the stable sidebar target.
    expect(item.accelerator).toBeUndefined()
    expect(actions).toEqual(["openLibraryInsights"])
    expect(rendererSource).toContain('case "openLibraryInsights"')
    expect(rendererSource).toContain('clickMenuTarget("library-insights")')
  })

  it("uses the existing menu channel for focused lock and disables sensitive actions while locked", () => {
    // Given: menu templates for an unlocked and locked Prompter window.
    const actions: string[] = []
    const unlocked = createApplicationMenuTemplate({
      isDevelopment: true,
      isMac: true,
      sendAction: (action) => actions.push(action),
    })
    const locked = createApplicationMenuTemplate({
      isDevelopment: true,
      isMac: true,
      locked: true,
      sendAction: (action) => actions.push(action),
    })

    // When: the focused lock menu item is invoked.
    const lockItem = findMenuItem(unlocked, "Lock Prompter")
    clickMenuItem(lockItem)

    // Then: it sends only the existing typed event and sensitive menu entries are unavailable.
    expect(lockItem.accelerator).toBe("CmdOrCtrl+Shift+L")
    expect(actions).toEqual(["lockPrompter"])
    expect(findMenuItem(locked, "Save Prompt").enabled).toBe(false)
    expect(findMenuItem(locked, "Copy Compiled Prompt").enabled).toBe(false)
    expect(findMenuItem(locked, "Export Full Backup...").enabled).toBe(false)
    expect(findMenuItem(locked, "Settings...").enabled).toBe(false)
    expect(findMenuRole(locked, "reload").enabled).toBe(false)
    expect(findMenuRole(locked, "toggleDevTools").enabled).toBe(false)
  })
})
