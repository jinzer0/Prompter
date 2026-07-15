import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ElectronApplication, Page, TestInfo } from "@playwright/test"
import { _electron as electron, expect } from "@playwright/test"

import { closePrompter, createNamedProject } from "./electron-playwright-helpers"
import { importEnvelope } from "./phase16-backup-import-fixtures"

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

async function installBackupDialogResults(
  app: ElectronApplication,
  backupFilePath: string,
): Promise<void> {
  await app.evaluate(({ dialog }, selectedPath) => {
    const saveInstalled = Reflect.set(dialog, "showSaveDialog", async () => ({ canceled: true }))
    const openInstalled = Reflect.set(dialog, "showOpenDialog", async () => ({
      canceled: false,
      filePaths: [selectedPath],
    }))
    if (!saveInstalled || !openInstalled) {
      throw new TypeError("Expected backup dialog test results to install")
    }
  }, backupFilePath)
}

async function clickApplicationMenuItem(app: ElectronApplication, label: string): Promise<void> {
  await app.evaluate(({ BrowserWindow, Menu }, itemLabel) => {
    const menuItem = Menu.getApplicationMenu()
      ?.items.flatMap((item) => item.submenu?.items ?? [])
      .find((item) => item.label === itemLabel)
    if (menuItem?.click === undefined) {
      throw new TypeError(`Expected application menu item: ${itemLabel}`)
    }
    menuItem.click(menuItem, BrowserWindow.getAllWindows()[0], {})
  }, label)
}

export async function runSettingsScenario(testInfo: TestInfo): Promise<void> {
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-phase9-"))
  const backupFilePath = join(userDataDirectory, "phase16-prompt-pack.json")
  await writeFile(backupFilePath, JSON.stringify(importEnvelope("prompt_assets")), "utf8")

  try {
    const firstRun = await launchPrompter(userDataDirectory)

    await expect(firstRun.page.getByRole("heading", { name: "Settings" })).toBeVisible()
    await expect(firstRun.page.getByText("OpenAI key not stored")).toBeVisible()
    await expect(firstRun.page.getByRole("heading", { name: "Backup & Import" })).toBeVisible()
    await expect(firstRun.page.getByRole("heading", { name: "Maintenance" })).toBeVisible()
    await expect(firstRun.page.getByText("Backup files are plaintext JSON")).toBeVisible()
    await expect(firstRun.page.getByText("Import adds copies and never overwrites")).toBeVisible()
    await expect(
      firstRun.page.locator('[data-menu-action-target="backup-export-full"]'),
    ).toBeVisible()
    await expect(
      firstRun.page.locator('[data-menu-action-target="backup-import-open"]'),
    ).toBeVisible()
    await clickApplicationMenuItem(firstRun.app, "Library Maintenance")
    await expect(
      firstRun.page.locator('[data-menu-action-target="settings-maintenance"]'),
    ).toBeFocused()
    await createNamedProject(firstRun.page, "Phase 16 menu destination")
    await installBackupDialogResults(firstRun.app, backupFilePath)

    await clickApplicationMenuItem(firstRun.app, "Export Full Backup...")
    await expect(firstRun.page.getByText("Backup export cancelled.")).toBeVisible()

    await clickApplicationMenuItem(firstRun.app, "Import Backup...")
    await expect(firstRun.page.getByText("Prompt asset pack preview")).toBeVisible()
    const importButton = firstRun.page.getByRole("button", { name: "Import backup copies" })
    await expect(importButton).toBeDisabled()
    await firstRun.page
      .getByRole("checkbox", { name: /I understand import adds copies only/ })
      .check()
    await expect(importButton).toBeDisabled()
    await firstRun.page
      .getByRole("combobox", { name: "Backup import destination project" })
      .selectOption({ label: "Phase 16 menu destination" })
    await expect(importButton).toBeEnabled()
    await importButton.click()
    await expect(firstRun.page.getByText("Import complete")).toBeVisible()
    await expect(
      firstRun.page.getByRole("status").filter({ hasText: "Backup imported" }),
    ).toBeVisible()

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
    await closePrompter(firstRun.app)

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
    await closePrompter(secondRun.app)
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
}
