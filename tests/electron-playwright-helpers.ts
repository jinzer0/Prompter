import { createRequire } from "node:module"
import type { ElectronApplication, Page } from "@playwright/test"
import { _electron as electron, expect } from "@playwright/test"

const requireElectron = createRequire(import.meta.url)
const electronExecutable: unknown = requireElectron("electron")

if (typeof electronExecutable !== "string") {
  throw new TypeError("Electron executable path must resolve to a string")
}

const electronExecutablePath = electronExecutable

export type RunningApp = {
  readonly app: ElectronApplication
  readonly page: Page
}

export async function launchPrompter(
  userDataDirectory: string,
  extraEnv: Readonly<Record<string, string>> = {},
): Promise<RunningApp> {
  const app = await electron.launch({
    executablePath: electronExecutablePath,
    args: ["."],
    env: {
      ...process.env,
      ...extraEnv,
      NODE_ENV: "test",
      PROMPTER_USER_DATA_DIR: userDataDirectory,
    },
  })
  const page = await app.firstWindow()
  await expect(page.locator('[data-testid="app-shell"]')).toBeVisible()
  return { app, page }
}

export async function createNamedProject(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "New Project" }).click()
  await page.getByRole("textbox", { name: "Project name" }).fill(name)
  await page.getByRole("button", { name: "Save Project" }).click()
  await expect(page.getByRole("button", { name: new RegExp(name) })).toBeVisible()
}
