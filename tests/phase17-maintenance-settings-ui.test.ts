import { access, mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ElectronApplication, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

import { closePrompter, createNamedProject, launchPrompter } from "./electron-playwright-helpers"

const phase17ScreenshotPath = "test-results/phase17-maintenance-settings.png"
const projectName = "Phase 17 Maintenance Project"
const compilerTitle = "Phase 17 maintenance draft"
const compilerOriginalRequest = "Keep this draft untouched while Maintenance scans and executes."

type SeededPrompt = {
  readonly projectId: string
  readonly promptAssetId: string
  readonly compiledPrompt: string
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

async function installMaintenanceDialogResponse(
  app: ElectronApplication,
  response: number,
): Promise<void> {
  await app.evaluate(({ dialog }, selectedResponse) => {
    const installed = Reflect.set(dialog, "showMessageBox", async () => ({
      checkboxChecked: false,
      response: selectedResponse,
    }))

    if (!installed) {
      throw new TypeError("Expected maintenance confirmation dialog result to install")
    }
  }, response)
}

async function seedPromptWithoutMaintenanceIssues(page: Page): Promise<SeededPrompt> {
  return page.evaluate(async (selectedProjectName) => {
    const projects = await window.prompter.projects.list()
    const project = projects.find((item) => item.name === selectedProjectName)

    if (project === undefined) {
      throw new TypeError(`Expected project to exist: ${selectedProjectName}`)
    }

    const created = await window.prompter.prompts.createWithInitialVersion({
      projectId: project.id,
      title: "Stable maintenance seed prompt",
      scenario: "feature",
      targetAgent: "codex",
      originalInput: "Build a stable seeded prompt for Maintenance smoke coverage.",
      compiledPrompt: "Use this stable prompt as a clean baseline for Maintenance scanning.",
    })

    return {
      projectId: project.id,
      promptAssetId: created.asset.id,
      compiledPrompt: created.version.compiledPrompt,
    }
  }, projectName)
}

async function seedDuplicateTags(page: Page): Promise<readonly string[]> {
  return page.evaluate(async () => {
    const canonical = await window.prompter.tags.create({ name: "phase17 cleanup" })
    const duplicate = await window.prompter.tags.create({ name: "Phase17 Cleanup" })

    return [canonical.id, duplicate.id]
  })
}

async function expectCompilerDraftUnchanged(page: Page): Promise<void> {
  await expect(page.getByRole("textbox", { name: "Compiler title" })).toHaveValue(compilerTitle)
  await expect(page.getByRole("textbox", { name: "Original request" })).toHaveValue(
    compilerOriginalRequest,
  )
}

test("opens Settings Maintenance and exercises scan, preview, cancel, stale retry", async ({
  browserName: _browserName,
}, testInfo) => {
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-phase17-maintenance-ui-"))

  try {
    const run = await launchPrompter(userDataDirectory)
    const page = run.page

    await createNamedProject(page, projectName)
    const seededPrompt = await seedPromptWithoutMaintenanceIssues(page)

    await page.getByRole("textbox", { name: "Compiler title" }).fill(compilerTitle)
    await page.getByRole("textbox", { name: "Original request" }).fill(compilerOriginalRequest)

    await clickApplicationMenuItem(run.app, "Library Maintenance")
    const maintenance = page.locator('[data-menu-action-target="settings-maintenance"]')
    await expect(maintenance).toBeFocused()
    await expect(page.getByRole("heading", { name: "Maintenance" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Run maintenance scan" })).toBeVisible()

    await page.getByRole("button", { name: "Run maintenance scan" }).click()
    await expect(page.getByText("Total findings")).toBeVisible()
    await expect(page.getByText("No action previews are available")).toBeVisible()
    await expect(page.getByText("Run a scan to populate finding counts")).toHaveCount(0)

    await seedDuplicateTags(page)
    await page.getByRole("button", { name: "Run maintenance scan" }).click()
    const duplicateTagAction = page.locator("li").filter({ hasText: "Merge duplicate tags" })
    await expect(duplicateTagAction).toBeVisible()
    await expect(
      duplicateTagAction.getByText("Backup recommended: Export a backup before merging tags."),
    ).toBeVisible()
    await duplicateTagAction.getByRole("button", { name: "Select for preview" }).click()

    await page.getByRole("button", { name: "Prepare selected action" }).click()
    await expect(page.getByText("Backup recommended before execute")).toBeVisible()
    await expect(page.getByRole("button", { name: "Execute prepared action" })).toBeEnabled()

    await installMaintenanceDialogResponse(run.app, 0)
    await page.getByRole("button", { name: "Execute prepared action" }).click()
    await expect(page.getByText("Result: confirmation_cancelled")).toBeVisible()
    await expect(page.getByRole("button", { name: "Execute prepared action" })).toBeEnabled()
    await expectCompilerDraftUnchanged(page)

    const tagCountAfterCancel = await page.evaluate(
      async () => (await window.prompter.tags.list()).length,
    )
    expect(tagCountAfterCancel).toBe(2)

    await installMaintenanceDialogResponse(run.app, 1)
    await page.getByRole("button", { name: "Execute prepared action" }).click()
    await expect(page.getByText("Result: succeeded")).toBeVisible()
    await expect(page.getByText("Scan data is stale after the last action")).toBeVisible()
    await expect(page.getByRole("button", { name: "Rescan library" })).toBeEnabled()
    await expectCompilerDraftUnchanged(page)

    const persistedPrompt = await page.evaluate(async (promptAssetId) => {
      return window.prompter.prompts.getCurrentVersion(promptAssetId)
    }, seededPrompt.promptAssetId)
    expect(persistedPrompt?.compiledPrompt).toBe(seededPrompt.compiledPrompt)

    await mkdir("test-results", { recursive: true })
    await page.screenshot({ path: phase17ScreenshotPath, fullPage: true })
    await testInfo.attach("phase17-maintenance-settings", {
      path: phase17ScreenshotPath,
      contentType: "image/png",
    })
    await closePrompter(run.app)
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
