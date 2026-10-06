import type { BrowserWindowConstructorOptions } from "electron"
import type { AppearanceState } from "./ipc-types.js"

export function windowBackground(theme: AppearanceState["effectiveTheme"]): string {
  return theme === "dark" ? "#08090a" : "#f7f8f8"
}

export function createWindowOptions(
  preloadPath: string,
  effectiveTheme: AppearanceState["effectiveTheme"],
): BrowserWindowConstructorOptions {
  return {
    width: 1180,
    height: 760,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: windowBackground(effectiveTheme),
    show: false,
    title: "Prompter",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  }
}
