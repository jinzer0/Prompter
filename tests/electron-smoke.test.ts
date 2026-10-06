import { access, mkdtemp, rm } from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { type ElectronApplication, _electron as electron, expect, test } from "@playwright/test"

const requireElectron = createRequire(import.meta.url)
const electronExecutable: unknown = requireElectron("electron")
const desktopSmokeViewports = [
  { width: 1180, height: 760 },
  { width: 1024, height: 720 },
] as const

if (typeof electronExecutable !== "string") {
  throw new TypeError("Electron executable path must resolve to a string")
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
    const consoleErrors: string[] = []
    const pageErrors: string[] = []
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text())
    })
    page.on("pageerror", (error) => pageErrors.push(error.message))
    await access(join(userDataDirectory, "prompter.sqlite"))

    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible()
    expect(await page.evaluate(() => window.prompter.ping())).toBe("pong")
    await expect(page.locator('[data-testid="left-sidebar"]')).toBeVisible()
    await expect(page.locator('[data-testid="prompt-library"]')).toBeVisible()
    await expect(page.locator('[data-testid="prompt-compiler"]')).toBeVisible()

    await expect(page.locator(".prompter-window")).toHaveCSS("-webkit-app-region", "none")
    await expect(page.locator(".prompter-window-chrome")).toHaveCSS("-webkit-app-region", "drag")
    await expect(page.locator(".prompter-window-content")).toHaveCSS(
      "-webkit-app-region",
      "no-drag",
    )
    await expect(page.locator(".prompter-window-traffic-light-inset")).toHaveCSS(
      "-webkit-app-region",
      "no-drag",
    )

    for (const theme of ["light", "dark"] as const) {
      await page.evaluate(async (appTheme) => {
        await window.prompter.settings.updateDefaults({ appTheme })
      }, theme)
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
      expect(await app.evaluate(({ nativeTheme }) => nativeTheme.themeSource)).toBe(theme)
      await page.reload()
      await expect(page.getByTestId("app-shell")).toBeVisible()
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
    }
    await page.evaluate(async () => {
      await window.prompter.settings.updateDefaults({ appTheme: "system" })
    })
    const effectiveTheme = await app.evaluate(({ nativeTheme }) =>
      nativeTheme.shouldUseDarkColors ? "dark" : "light",
    )
    await expect(page.locator("html")).toHaveAttribute("data-theme", effectiveTheme)

    await expect(page.getByText("No projects yet")).toBeVisible()
    await expect(
      page.getByTestId("left-sidebar").getByRole("button", { name: "컨텍스트 관리" }),
    ).toBeVisible()
    await expect(
      page.getByTestId("left-sidebar").getByRole("button", { name: "템플릿 관리" }),
    ).toBeVisible()
    await expect(
      page.getByTestId("left-sidebar").getByRole("button", { name: "하네스 관리" }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Select a project to view prompts", exact: true }),
    ).toBeVisible()
    await expect(page.getByText("Select a project first")).toBeVisible()
    await expect(page.getByRole("button", { name: "New Project" })).toBeVisible()
    await expect(page.getByTestId("settings-workspace")).toBeHidden()
    const additionalOptions = page
      .getByTestId("prompt-compiler")
      .locator("summary")
      .filter({ hasText: "추가 옵션" })
    await additionalOptions.click()
    await expect(page.getByRole("combobox", { name: "Compile mode" })).toBeVisible()
    await expect(page.getByRole("combobox", { name: "Compile runner" })).toBeVisible()
    await expect(
      page.getByTestId("prompt-library").getByRole("button", { name: "New Prompt" }),
    ).toBeDisabled()
    await expect(page.getByRole("button", { name: "Add Tags" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Add Harnesses" })).toHaveCount(0)

    await expect(page.locator('[data-testid="ui-button"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="ui-card"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="ui-empty-state"]').first()).toBeVisible()

    // Given: an in-progress compiler draft in the mounted library workspace.
    const originalRequest = page.getByRole("textbox", { name: "Original request" })
    await originalRequest.fill("Preserve this compiler draft while viewing insights.")
    // When: Insights is opened and the user returns to the library.
    await page.getByRole("button", { name: "Library Insights" }).click()
    await expect(page.getByTestId("insights-workspace")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Insights Dashboard" })).toBeVisible()
    await expect(page.getByText("No project or prompt inventory")).toBeVisible()
    for (const viewport of desktopSmokeViewports) {
      await page.setViewportSize(viewport)
      const screenshotName = `insights-workspace-${viewport.width}x${viewport.height}.png`
      const insightsScreenshot = testInfo.outputPath(screenshotName)
      await page.screenshot({ path: insightsScreenshot })
      await testInfo.attach(screenshotName, {
        path: insightsScreenshot,
        contentType: "image/png",
      })
    }
    await page.getByRole("button", { name: "Back to library" }).click()
    // Then: both original columns return with the compiler draft unchanged.
    await expect(page.getByTestId("prompt-library")).toBeVisible()
    await expect(page.getByTestId("prompt-compiler")).toBeVisible()
    await expect(originalRequest).toHaveValue(
      "Preserve this compiler draft while viewing insights.",
    )
    await clickApplicationMenuItem(app, "Library Insights")
    await expect(page.getByTestId("insights-workspace")).toBeVisible()
    await page.getByRole("button", { name: "Back to library" }).click()
    await expect(originalRequest).toHaveValue(
      "Preserve this compiler draft while viewing insights.",
    )

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
      await expect(page.getByRole("heading", { name: "Prompt Library" })).toBeVisible()
      await expect(page.getByRole("heading", { name: "프롬프트 상세" })).toBeVisible()
      await expect(page.getByRole("heading", { name: "프롬프트 컴파일러" })).toBeVisible()
      const geometry = await page.evaluate(() => {
        const shell = document.querySelector<HTMLElement>('[data-testid="app-shell"]')
        const panels = ["left-sidebar", "prompt-library", "prompt-compiler"].map((id) => {
          const panel = document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
          if (panel === null) throw new Error(`Missing panel ${id}`)
          const bounds = panel.getBoundingClientRect()
          return { left: bounds.left, right: bounds.right, width: bounds.width }
        })
        if (shell === null) throw new Error("Missing shell")
        return {
          panels,
          scrollWidth: shell.scrollWidth,
          clientWidth: shell.clientWidth,
          viewportWidth: window.innerWidth,
        }
      })
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1)
      for (const panel of geometry.panels) {
        expect(panel.width).toBeGreaterThan(0)
        expect(panel.left).toBeGreaterThanOrEqual(0)
        expect(panel.right).toBeLessThanOrEqual(geometry.viewportWidth + 1)
      }
      expect(geometry.panels[0]?.right).toBeLessThanOrEqual(geometry.panels[1]?.left ?? 0)
      expect(geometry.panels[1]?.right).toBeLessThanOrEqual(geometry.panels[2]?.left ?? 0)
    }
    expect(consoleErrors).toEqual([])
    expect(pageErrors).toEqual([])
    await testInfo.attach("electron-window-title", {
      body: await page.title(),
      contentType: "text/plain",
    })
  } finally {
    await app.close()
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
