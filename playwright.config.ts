import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  testMatch: ["electron-smoke.test.ts", "electron-ui-db.test.ts"],
  timeout: 30_000,
  reporter: "line",
  use: {
    trace: "off",
  },
})
