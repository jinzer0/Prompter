import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ElectronApplication, Page, TestInfo } from "@playwright/test"
import { _electron as electron, expect } from "@playwright/test"

const requireElectron = createRequire(import.meta.url)
const electronExecutable: unknown = requireElectron("electron")

if (typeof electronExecutable !== "string") {
  throw new TypeError("Electron executable path must resolve to a string")
}

const electronExecutablePath = electronExecutable
const phase9ScreenshotPath = "test-results/phase9-settings-ui.png"
const plaintextKey = "sk-proj-phase9-secret-value-7890"

type RunningApp = {
  readonly app: ElectronApplication
  readonly page: Page
}

async function launchPrompter(userDataDirectory: string): Promise<RunningApp> {
  const app = await electron.launch({
    executablePath: electronExecutablePath,
    args: ["."],
    env: {
      ...process.env,
      NODE_ENV: "test",
      PROMPTER_USER_DATA_DIR: userDataDirectory,
    },
  })
  const page = await app.firstWindow()
  await expect(page.locator('[data-testid="app-shell"]')).toBeVisible()
  return { app, page }
}

export async function runSettingsScenario(testInfo: TestInfo): Promise<void> {
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-phase9-"))

  try {
    const firstRun = await launchPrompter(userDataDirectory)

    await expect(firstRun.page.getByRole("heading", { name: "Settings" })).toBeVisible()
    await expect(firstRun.page.getByText("OpenAI key not stored")).toBeVisible()

    await firstRun.page.getByRole("textbox", { name: "Default model" }).fill("gpt-4.1-mini")
    await firstRun.page
      .getByRole("combobox", { name: "Default target agent" })
      .selectOption("claude_code")
    await firstRun.page.getByRole("combobox", { name: "Default scenario" }).selectOption("research")
    await firstRun.page.getByRole("combobox", { name: "App theme" }).selectOption("dark")
    await firstRun.page.getByRole("textbox", { name: "Compiler default language" }).fill("en")
    await firstRun.page.getByRole("button", { name: "Save defaults" }).click()
    await expect(firstRun.page.getByText("Settings defaults saved.")).toBeVisible()

    await firstRun.page.getByRole("textbox", { name: "OpenAI API key" }).fill(plaintextKey)
    await firstRun.page.getByRole("button", { name: "Save API key" }).click()
    await expect(firstRun.page.getByText("OpenAI key saved.")).toBeVisible()
    await expect(firstRun.page.getByRole("textbox", { name: "OpenAI API key" })).toHaveValue("")
    await expect(firstRun.page.getByText("sk-proj-••••••••••••••••7890")).toBeVisible()
    await expect(firstRun.page.getByText(plaintextKey)).toHaveCount(0)

    const stored = await firstRun.page.evaluate(async () => {
      const defaults = await window.prompter.settings.getDefaults()
      const keyStatus = await window.prompter.secrets.getOpenAIKeyStatus()
      const settings = await window.prompter.settings.list()

      return {
        defaults,
        keyStatus,
        rendererHasPlaintextGetter: "getOpenAIKey" in window.prompter.secrets,
        settingsDump: JSON.stringify(settings),
      }
    })

    expect(stored.defaults).toEqual({
      defaultModel: "gpt-4.1-mini",
      defaultTargetAgent: "claude_code",
      defaultProjectId: null,
      defaultScenario: "research",
      appTheme: "dark",
      compilerDefaultLanguage: "en",
    })
    expect(stored.keyStatus).toMatchObject({
      hasKey: true,
      maskedKey: "sk-proj-••••••••••••••••7890",
    })
    expect(stored.rendererHasPlaintextGetter).toBe(false)
    expect(stored.settingsDump).not.toContain(plaintextKey)
    expect(stored.settingsDump).not.toContain("openai")
    expect(stored.settingsDump).not.toContain("api_key")

    const secretFile = await readFile(
      join(userDataDirectory, "secrets", "open-ai-key.json"),
      "utf8",
    )
    expect(secretFile).not.toContain(plaintextKey)

    await mkdir("test-results", { recursive: true })
    await firstRun.page.screenshot({ path: phase9ScreenshotPath, fullPage: true })
    await testInfo.attach("phase9-settings-ui", {
      path: phase9ScreenshotPath,
      contentType: "image/png",
    })
    await firstRun.app.close()

    const secondRun = await launchPrompter(userDataDirectory)
    await expect(secondRun.page.getByRole("textbox", { name: "Default model" })).toHaveValue(
      "gpt-4.1-mini",
    )
    await expect(
      secondRun.page.getByRole("combobox", { name: "Default target agent" }),
    ).toHaveValue("claude_code")
    await expect(secondRun.page.getByRole("combobox", { name: "Default scenario" })).toHaveValue(
      "research",
    )
    await expect(
      secondRun.page.getByRole("textbox", { name: "Compiler default language" }),
    ).toHaveValue("en")
    await expect(secondRun.page.getByText("sk-proj-••••••••••••••••7890")).toBeVisible()

    await secondRun.page.getByRole("button", { name: "Delete API key" }).click()
    await expect(secondRun.page.getByText("OpenAI key removed.")).toBeVisible()
    await expect(secondRun.page.getByText("OpenAI key not stored")).toBeVisible()
    await secondRun.app.close()
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
}
