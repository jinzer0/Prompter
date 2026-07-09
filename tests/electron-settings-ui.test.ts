import { test } from "@playwright/test"

import { runSettingsScenario } from "./electron-settings-scenario"

test("saves settings defaults and OpenAI key status through the UI", async ({
  browserName: _browserName,
}, testInfo) => {
  await runSettingsScenario(testInfo)
})
