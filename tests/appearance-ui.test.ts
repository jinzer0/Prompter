import { readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { AppearanceState, ElectronBridge } from "../electron/ipc-types"
import { SettingsDefaultsForm } from "../renderer/src/components/settings-defaults-form"
import { useAppearance } from "../renderer/src/hooks/use-appearance"
import type { DefaultsForm } from "../renderer/src/hooks/use-settings-panel"
import { initializeAppearance, subscribeToAppearance } from "../renderer/src/lib/appearance"

function createAppearanceBridge(initialState: AppearanceState) {
  let state = initialState
  const listeners = new Set<(state: AppearanceState) => void>()
  const bridge = {
    getState: vi.fn(() => state),
    onChanged: vi.fn((callback: (state: AppearanceState) => void) => {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    }),
  } satisfies ElectronBridge["appearance"]

  return {
    bridge,
    listeners,
    update(nextState: AppearanceState) {
      state = nextState
      for (const listener of listeners) listener(state)
    },
  }
}

const defaultsForm: DefaultsForm = {
  defaultModel: "gpt-4.1-mini",
  defaultTargetAgent: "codex",
  defaultProjectId: "",
  defaultScenario: "feature",
  appTheme: "system",
  compilerDefaultLanguage: "en",
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("renderer appearance", () => {
  it("applies the native snapshot synchronously before any React render", () => {
    const { bridge, listeners } = createAppearanceBridge({
      preference: "system",
      effectiveTheme: "light",
    })
    const root = { dataset: { theme: undefined as string | undefined }, style: { colorScheme: "" } }
    bridge.getState.mockImplementation(() => {
      expect(listeners.size).toBe(1)
      return { preference: "system", effectiveTheme: "light" }
    })

    const cleanup = initializeAppearance(bridge, root)

    expect(root.dataset.theme).toBe("light")
    expect(root.style.colorScheme).toBe("light")
    expect(bridge.getState).toHaveBeenCalledOnce()
    cleanup()
    expect(listeners.size).toBe(0)
  })

  it("initializes before createRoot even when the app is locked and registers unload cleanup", () => {
    const source = readFileSync("renderer/src/main.tsx", "utf8")
    const initialization = source.indexOf("const cleanupAppearance = initializeAppearance(")
    expect(initialization).toBeGreaterThan(-1)
    expect(initialization).toBeLessThan(source.indexOf("createRoot(rootElement).render("))
    expect(source).toContain("document.documentElement")
    expect(source).toContain('window.addEventListener("unload", cleanupAppearance, { once: true })')
  })

  it("applies system updates and saved explicit themes using native effective state", () => {
    const controller = createAppearanceBridge({ preference: "system", effectiveTheme: "dark" })
    const root = { dataset: { theme: "" }, style: { colorScheme: "" } }
    const cleanup = initializeAppearance(controller.bridge, root)
    expect(root.dataset.theme).toBe("dark")

    for (const state of [
      { preference: "system", effectiveTheme: "light" },
      { preference: "dark", effectiveTheme: "dark" },
      { preference: "light", effectiveTheme: "light" },
      { preference: "system", effectiveTheme: "dark" },
    ] satisfies AppearanceState[]) {
      controller.update(state)
      expect(root.dataset.theme).toBe(state.effectiveTheme)
      expect(root.style.colorScheme).toBe(state.effectiveTheme)
    }

    cleanup()
    expect(controller.listeners.size).toBe(0)
    controller.update({ preference: "light", effectiveTheme: "light" })
    expect(root.dataset.theme).toBe("dark")
    expect(root.style.colorScheme).toBe("dark")
  })

  it("refreshes after subscribing to close the render/effect gap and cleans up remounts", () => {
    const controller = createAppearanceBridge({ preference: "system", effectiveTheme: "light" })
    const renderSnapshot = controller.bridge.getState()
    controller.update({ preference: "system", effectiveTheme: "dark" })
    const receive = vi.fn<(state: AppearanceState) => void>()
    const cleanup = subscribeToAppearance(controller.bridge, receive)

    expect(renderSnapshot.effectiveTheme).toBe("light")
    expect(receive).toHaveBeenLastCalledWith({ preference: "system", effectiveTheme: "dark" })
    cleanup()
    controller.update({ preference: "light", effectiveTheme: "light" })
    expect(receive).toHaveBeenCalledTimes(1)

    const cleanupRemount = subscribeToAppearance(controller.bridge, receive)
    expect(controller.listeners.size).toBe(1)
    expect(receive).toHaveBeenLastCalledWith({ preference: "light", effectiveTheme: "light" })
    cleanupRemount()
    expect(controller.listeners.size).toBe(0)
  })

  it("removes the subscription if the initial snapshot cannot be read", () => {
    const controller = createAppearanceBridge({ preference: "system", effectiveTheme: "light" })
    controller.bridge.getState.mockImplementation(() => {
      throw new Error("Invalid appearance snapshot")
    })
    expect(() => subscribeToAppearance(controller.bridge, vi.fn())).toThrow(
      "Invalid appearance snapshot",
    )
    expect(controller.listeners.size).toBe(0)
  })

  it("initializes the hook from an injected synchronous snapshot without browser globals", () => {
    const { bridge } = createAppearanceBridge({ preference: "system", effectiveTheme: "dark" })
    function AppearanceReadout() {
      const state = useAppearance(bridge)
      return createElement("p", null, `${state.preference}: ${state.effectiveTheme}`)
    }

    expect(renderToStaticMarkup(createElement(AppearanceReadout))).toBe("<p>system: dark</p>")
    expect(bridge.getState).toHaveBeenCalledOnce()
  })

  it("keeps saved preference, actual theme, and the unsaved draft distinct after save failure", () => {
    const { bridge } = createAppearanceBridge({ preference: "system", effectiveTheme: "dark" })
    vi.stubGlobal("window", { prompter: { appearance: bridge } })
    const draft = { ...defaultsForm, appTheme: "light" } satisfies DefaultsForm
    const onSave = vi.fn<() => Promise<void>>()
    const onChange = vi.fn()
    const markup = renderToStaticMarkup(
      createElement(SettingsDefaultsForm, {
        form: draft,
        isSaving: false,
        message: "Settings defaults could not be saved.",
        onChange,
        onSave,
      }),
    )

    expect(markup).toContain("Saved appearance: System. Current theme: Dark.")
    expect(markup).toContain('<option value="light" selected="">Light</option>')
    expect(markup).toContain("Unsaved appearance selection.")
    expect(markup).toContain("remains active until saving succeeds.")
    expect(markup).toContain("Settings defaults could not be saved.")
    expect(markup).not.toContain('disabled=""')
    expect(draft.appTheme).toBe("light")
    expect(onChange).not.toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it("disables all defaults controls during persistence without mislabeling the saved theme", () => {
    const { bridge } = createAppearanceBridge({ preference: "dark", effectiveTheme: "dark" })
    vi.stubGlobal("window", { prompter: { appearance: bridge } })
    const markup = renderToStaticMarkup(
      createElement(SettingsDefaultsForm, {
        form: { ...defaultsForm, appTheme: "dark" },
        isSaving: true,
        message: null,
        onChange: vi.fn(),
        onSave: vi.fn<() => Promise<void>>(),
      }),
    )

    expect(markup).toContain('<fieldset class="space-y-3" disabled="">')
    expect(markup).toContain("Saved appearance: Dark. Current theme: Dark.")
    expect(markup).toContain("Saving...")
    expect(markup).not.toContain("Unsaved appearance selection.")
  })
})
