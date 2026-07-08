import type { BrowserWindowConstructorOptions } from "electron"

export function createWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    width: 1024,
    height: 768,
    show: true,
    title: "Prompter",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  }
}
