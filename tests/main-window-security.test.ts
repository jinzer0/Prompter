import { describe, expect, it } from "vitest"

import { secureMainWindowNavigation } from "../electron/main-window-security.js"

describe("main window navigation security", () => {
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
