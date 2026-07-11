import { access, mkdtemp, rm } from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { _electron as electron, expect, test } from "@playwright/test"

const requireElectron = createRequire(import.meta.url)
const electronExecutable: unknown = requireElectron("electron")
const desktopSmokeViewports = [
  { width: 1280, height: 800 },
  { width: 900, height: 720 },
] as const

if (typeof electronExecutable !== "string") {
  throw new TypeError("Electron executable path must resolve to a string")
}

test("opens the main window and resolves the preload ping bridge", async ({
  browserName: _browserName,
}, testInfo) => {
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-smoke-"))

  const app = await electron.launch({
    executablePath: electronExecutable,
    args: ["."],
    env: {
      ...process.env,
      NODE_ENV: "test",
      PROMPTER_USER_DATA_DIR: userDataDirectory,
    },
  })

  try {
    const page = await app.firstWindow()
    await access(join(userDataDirectory, "prompter.sqlite"))

    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible()
    await expect(page.locator('[data-testid="ping-result"]')).toHaveText("pong")
    await expect(page.locator('[data-testid="left-sidebar"]')).toBeVisible()
    await expect(page.locator('[data-testid="prompt-library"]')).toBeVisible()
    await expect(page.locator('[data-testid="prompt-compiler"]')).toBeVisible()

    await expect(page.getByText("No projects yet")).toBeVisible()
    await expect(page.getByText("No tags yet")).toBeVisible()
    await expect(page.getByRole("button", { name: /Feature Implementation/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /Bug Fix/ })).toBeVisible()
    await expect(page.getByText("Select a project to view prompts")).toBeVisible()
    await expect(page.getByText("Select a project first")).toBeVisible()
    await expect(page.getByRole("button", { name: "New Project" })).toBeVisible()
    await expect(page.getByRole("button", { name: "New Prompt" })).toBeDisabled()
    await expect(page.getByRole("button", { name: "Add Tags" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Add Harnesses" })).toHaveCount(0)

    await expect(page.locator('[data-testid="ui-button"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="ui-card"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="ui-empty-state"]').first()).toBeVisible()

    await page.getByRole("button", { name: "New Project" }).click()
    await expect(page.getByRole("textbox", { name: "Project name" })).toBeVisible()
    await expect(page.getByRole("textbox", { name: "Project description" })).toBeVisible()
    await expect(page.getByRole("textbox", { name: "Tech stack" })).toBeVisible()
    await expect(page.getByRole("combobox", { name: "Default agent" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Save Project" })).toBeVisible()
    await page.getByRole("button", { name: "New Project" }).click()

    const persistenceResult = await page.evaluate(async () => {
      const project = await window.prompter.projects.create({
        name: "Smoke Project",
        techStack: "Electron",
        defaultAgent: "codex",
      })
      const projects = await window.prompter.projects.list()
      const asset = await window.prompter.prompts.createAsset({
        projectId: project.id,
        title: "Smoke Prompt",
        scenario: "feature",
        targetAgent: "codex",
      })
      const version = await window.prompter.prompts.createVersion({
        promptAssetId: asset.id,
        originalInput: "Compile this smoke prompt.",
        compiledPrompt: "Compile this smoke prompt with a version.",
      })
      const currentAsset = await window.prompter.prompts.setCurrentVersion(asset.id, version.id)
      const versions = await window.prompter.prompts.listVersions(asset.id)
      const tag = await window.prompter.tags.create({ name: "smoke" })
      const tagLink = await window.prompter.tags.attachToPrompt(asset.id, tag.id)
      const harness = await window.prompter.harnessTemplates.create({
        name: "Smoke Harness",
        scenario: "feature",
        targetAgent: "generic_agent",
        templateBody: "Build {{feature}}.",
      })
      const setting = await window.prompter.settings.set("smoke-theme", "dark")
      const loadedSetting = await window.prompter.settings.get("smoke-theme")

      return {
        projectCount: projects.length,
        projectName: projects[0]?.name,
        projectCreatedAtType: typeof project.createdAt,
        assetTitle: asset.title,
        assetScenario: asset.scenario,
        currentVersionId: currentAsset.currentVersionId,
        versionBody: versions[0]?.compiledPrompt,
        versionNumber: version.versionNumber,
        tagLink,
        harnessName: harness.name,
        settingValue: loadedSetting?.value,
        settingUpdatedAtType: typeof setting.updatedAt,
      }
    })

    expect(persistenceResult).toEqual({
      projectCount: 1,
      projectName: "Smoke Project",
      projectCreatedAtType: "number",
      assetTitle: "Smoke Prompt",
      assetScenario: "feature",
      currentVersionId: expect.any(String),
      versionBody: "Compile this smoke prompt with a version.",
      versionNumber: 1,
      tagLink: { promptAssetId: expect.any(String), tagId: expect.any(String) },
      harnessName: "Smoke Harness",
      settingValue: "dark",
      settingUpdatedAtType: "number",
    })

    for (const viewport of desktopSmokeViewports) {
      await page.setViewportSize(viewport)
      await expect(page.locator('[data-testid="left-sidebar"]')).toBeVisible()
      await expect(page.locator('[data-testid="prompt-library"]')).toBeVisible()
      await expect(page.locator('[data-testid="prompt-compiler"]')).toBeVisible()
      await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible()
      await expect(page.getByRole("heading", { name: "Tags" })).toBeVisible()
      await expect(page.getByRole("heading", { name: "Harnesses" })).toBeVisible()
      await expect(page.getByRole("heading", { name: "Prompt Library" })).toBeVisible()
      await expect(page.getByRole("heading", { name: "Prompt Compiler" })).toBeVisible()
      await expect(page.getByRole("button", { name: "New Prompt" })).toHaveCSS(
        "white-space",
        "nowrap",
      )
    }
    await testInfo.attach("electron-window-title", {
      body: await page.title(),
      contentType: "text/plain",
    })
  } finally {
    await app.close()
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
