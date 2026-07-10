import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  testMatch: [
    "electron-smoke.test.ts",
    "electron-ui-db.test.ts",
    "electron-prompt-version-ui.test.ts",
    "electron-settings-ui.test.ts",
    "electron-llm-compiler-ui.test.ts",
    "electron-prompt-search-ui.test.ts",
    "phase11-quick-capture-ui.test.ts",
  ],
  timeout: 30_000,
  workers: 1,
  reporter: "line",
  use: {
    trace: "off",
  },
})
