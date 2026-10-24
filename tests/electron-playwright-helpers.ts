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

export async function closePrompter(app: ElectronApplication): Promise<void> {
  const closed = app.waitForEvent("close")
  await app.close()
  await closed
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

export async function openEditorAction(page: Page, name: string): Promise<void> {
  const trigger = page.getByTestId("prompt-editor").locator('button[aria-haspopup="menu"]')
  const menu = page.locator('[role="menu"][aria-label="프롬프트 보조 동작"]')
  if (!(await menu.isVisible())) await trigger.click()
  await menu.getByRole("menuitem", { name, exact: true }).click()
  await expect(menu).toBeHidden()
  await expect(trigger).toHaveAttribute("aria-expanded", "false")
}

export async function openPromptDetails(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: "프롬프트 버전 · 내보내기 · 품질", exact: true })
  if (!(await dialog.isVisible())) await openEditorAction(page, "버전 이력 · 비교")
  await expect(dialog).toBeVisible()
}

async function revealCompilerDisclosure(page: Page, pattern: RegExp): Promise<void> {
  const summary = page
    .getByTestId("prompt-compiler")
    .locator("summary")
    .filter({ hasText: pattern })
  const open = await summary.evaluate(
    (node) => node.parentElement instanceof HTMLDetailsElement && node.parentElement.open,
  )
  if (!open) await summary.click()
}

export async function openCompilerTools(page: Page): Promise<void> {
  await revealCompilerDisclosure(page, /^LLM · 저장 · 클립보드$/)
}

export async function openCompilerResult(page: Page): Promise<void> {
  await revealCompilerDisclosure(page, /결과 · 분석 · 개인정보 검사$/)
}

async function revealLibraryDisclosure(page: Page, pattern: RegExp): Promise<void> {
  const summary = page.getByTestId("prompt-library").locator("summary").filter({ hasText: pattern })
  const open = await summary.evaluate(
    (node) => node.parentElement instanceof HTMLDetailsElement && node.parentElement.open,
  )
  if (!open) await summary.click()
}

export async function openLibraryFilters(page: Page): Promise<void> {
  await revealLibraryDisclosure(page, /^필터/)
}

export async function openPromptTags(page: Page): Promise<void> {
  await revealLibraryDisclosure(page, /^태그 편집$/)
}
