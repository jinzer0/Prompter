import { describe, expect, it } from "vitest"

import { secureMainWindowNavigation } from "../electron/main-window-security.js"
import { createWindowOptions, windowBackground } from "../electron/window-options.js"

describe("main window navigation security", () => {
  it.each([
    "light",
    "dark",
  ] as const)("opens a secure native %s window at approved sizes", (theme) => {
    const options = createWindowOptions("/app/preload.cjs", theme)

    expect(options).toMatchObject({
      width: 1180,
      height: 760,
      minWidth: 1024,
      minHeight: 720,
      show: false,
      titleBarStyle: "hiddenInset",
      backgroundColor: windowBackground(theme),
      webPreferences: {
        preload: "/app/preload.cjs",
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })
    expect(options.backgroundColor).toBe(theme === "dark" ? "#08090a" : "#f7f8f8")
    expect(options.frame).not.toBe(false)
    expect(options.webPreferences?.webSecurity).not.toBe(false)
  })

  it("prevents unexpected navigation and denies every new window", () => {
    const registered = {
      navigationListener: null as
        | ((event: { readonly preventDefault: () => void }, url: string) => void)
        | null,
      openHandler: null as (() => { readonly action: "deny" }) | null,
    }
    const surface = {
      on: (
        _event: "will-navigate",
        listener: (event: { readonly preventDefault: () => void }, url: string) => void,
      ) => {
        registered.navigationListener = listener
      },
      setWindowOpenHandler: (handler: () => { readonly action: "deny" }) => {
        registered.openHandler = handler
      },
    }
    secureMainWindowNavigation(surface, "app://prompter/index.html")
    if (registered.navigationListener === null || registered.openHandler === null) {
      throw new TypeError("Expected main window security handlers")
    }
    let prevented = false

    registered.navigationListener(
      {
        preventDefault: () => {
          prevented = true
        },
      },
      "https://untrusted.example/",
    )

    expect(prevented).toBe(true)
    prevented = false
    registered.navigationListener(
      {
        preventDefault: () => {
          prevented = true
        },
      },
      "app://prompter/index.html",
    )
    expect(prevented).toBe(false)
    expect(registered.openHandler()).toEqual({ action: "deny" })
  })
})
