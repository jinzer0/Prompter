import { test } from "@playwright/test"

import { runSettingsScenario } from "./electron-settings-scenario"

test("saves settings and drives backup menu import through the UI", async ({
  browserName: _browserName,
}, testInfo) => {
  test.setTimeout(60_000)
  await runSettingsScenario(testInfo)
})
