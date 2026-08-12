type NavigationEvent = { readonly preventDefault: () => void }

export type MainWindowSecuritySurface = {
  readonly on: (
    event: "will-navigate",
    listener: (event: NavigationEvent, url: string) => void,
  ) => void
  readonly setWindowOpenHandler: (handler: () => { readonly action: "deny" }) => void
}

export function secureMainWindowNavigation(
  webContents: MainWindowSecuritySurface,
  trustedUrl: string,
): void {
  webContents.on("will-navigate", (event, url) => {
    if (url !== trustedUrl) event.preventDefault()
  })
  webContents.setWindowOpenHandler(() => ({ action: "deny" }))
}
