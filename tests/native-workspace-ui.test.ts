import type { ElectronApplication, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

import { PERSISTENCE_CHANNELS } from "../electron/ipc-contract"
import { withPhase13Prompter } from "./phase13-project-context-profiles-ui-helpers"

const passiveEntryChannels = [
  PERSISTENCE_CHANNELS.promptCompilerAnalyze,
  PERSISTENCE_CHANNELS.promptCompilerCompile,
  PERSISTENCE_CHANNELS.reviewPromptQualityWithLLM,
  PERSISTENCE_CHANNELS.scanMaintenanceLibrary,
  PERSISTENCE_CHANNELS.prepareMaintenanceAction,
  PERSISTENCE_CHANNELS.executeMaintenanceAction,
  PERSISTENCE_CHANNELS.scanSensitiveText,
  PERSISTENCE_CHANNELS.scanDraftPrivacy,
  PERSISTENCE_CHANNELS.scanLibraryPrivacy,
  PERSISTENCE_CHANNELS.scanExportContent,
  PERSISTENCE_CHANNELS.exportFullBackup,
  PERSISTENCE_CHANNELS.exportProjectBackup,
  PERSISTENCE_CHANNELS.exportPromptAssetsBackup,
  PERSISTENCE_CHANNELS.exportPromptTemplatesPack,
  PERSISTENCE_CHANNELS.exportHarnessTemplatesPack,
  PERSISTENCE_CHANNELS.savePreparedPlaintextBackup,
  PERSISTENCE_CHANNELS.validateBackupFile,
  PERSISTENCE_CHANNELS.importBackup,
  PERSISTENCE_CHANNELS.prepareEncryptedBackup,
  PERSISTENCE_CHANNELS.savePreparedEncryptedBackup,
  PERSISTENCE_CHANNELS.validateEncryptedBackupFile,
  PERSISTENCE_CHANNELS.unlockEncryptedBackup,
  PERSISTENCE_CHANNELS.saveOpenAIKey,
  PERSISTENCE_CHANNELS.deleteOpenAIKey,
  PERSISTENCE_CHANNELS.setSetting,
  PERSISTENCE_CHANNELS.updateSettingsDefaults,
  PERSISTENCE_CHANNELS.updatePrivacySettings,
] as const

async function recordPassiveEntryActions(app: ElectronApplication): Promise<void> {
  await app.evaluate(
    ({ ipcMain }, channels) => {
      const handlers = Reflect.get(ipcMain, "_invokeHandlers")
      if (!(handlers instanceof Map)) throw new Error("Expected Electron IPC handlers")
      const calls: string[] = []
      Reflect.set(globalThis, "__nativeWorkspaceActionCalls", calls)
      for (const channel of channels) {
        const handler = handlers.get(channel)
        if (typeof handler !== "function") throw new Error(`Missing IPC handler: ${channel}`)
        ipcMain.removeHandler(channel)
        ipcMain.handle(channel, (event, ...args) => {
          calls.push(channel)
          return handler(event, ...args)
        })
      }
    },
    [...passiveEntryChannels],
  )
}

async function expectPassiveEntry(app: ElectronApplication): Promise<void> {
  expect(
    await app.evaluate(() => {
      const calls = Reflect.get(globalThis, "__nativeWorkspaceActionCalls")
      if (!Array.isArray(calls)) throw new Error("Workspace action recorder not installed")
      return calls
    }),
  ).toEqual([])
}

async function clickMenu(app: ElectronApplication, label: string): Promise<void> {
  await app.evaluate(({ BrowserWindow, Menu }, itemLabel) => {
    const item = Menu.getApplicationMenu()
      ?.items.flatMap((entry) => entry.submenu?.items ?? [])
      .find((entry) => entry.label === itemLabel)
    if (item?.click === undefined) throw new Error(`Missing menu item: ${itemLabel}`)
    item.click(item, BrowserWindow.getAllWindows()[0], {})
  }, label)
}

async function seedWorkspace(page: Page) {
  const ids = await page.evaluate(async () => {
    const project = await window.prompter.projects.create({
      name: "Native workspace project",
      techStack: "TypeScript",
      defaultAgent: "codex",
    })
    await window.prompter.prompts.createWithInitialVersion({
      projectId: project.id,
      title: "Workspace retained prompt",
      scenario: "feature",
      targetAgent: "codex",
      originalInput: "Saved source request",
      compiledPrompt: "Saved workspace body",
    })
    const harness = await window.prompter.harnessTemplates.create({
      name: "Workspace harness",
      scenario: "bugfix",
      targetAgent: "claude_code",
      templateBody: "{{originalInput}}",
    })
    const template = await window.prompter.promptTemplates.create({
      name: "Workspace template",
      scenario: "bugfix",
      targetAgent: "claude_code",
      templateBody: "{{objective}}",
    })
    const profile = await window.prompter.projectContextProfiles.create({
      projectId: project.id,
      name: "Workspace context",
      techStack: "TypeScript",
    })
    return { harnessId: harness.id, templateId: template.id, profileId: profile.id }
  })
  await page.reload()
  await page
    .getByTestId("left-sidebar")
    .getByRole("button", {
      name: /Native workspace project/,
    })
    .click()
  await page
    .getByTestId("prompt-library")
    .getByRole("button", {
      name: /Workspace retained prompt/,
    })
    .click()
  await expect(
    page.getByTestId("prompt-compiler").getByRole("textbox", { name: "Prompt editor body" }),
  ).toHaveValue("Saved workspace body")
  await expect(
    page
      .getByTestId("prompt-editor")
      .getByRole("heading", { name: "Workspace retained prompt", exact: true }),
  ).toBeVisible()
  return ids
}

test("Settings sidebar, native menu and Cmd+, return to the same mounted Library draft without actions", async () => {
  test.setTimeout(90_000)
  await withPhase13Prompter("prompter-native-settings", async ({ app, page }) => {
    await recordPassiveEntryActions(app)
    await seedWorkspace(page)
    const library = page.getByTestId("prompt-library")
    const compiler = page.getByTestId("prompt-compiler")
    const settings = page.getByTestId("settings-workspace")
    const search = page.getByRole("textbox", { name: "Search prompts" })
    const request = page.getByRole("textbox", { name: "Original request" })
    await search.fill("Workspace retained")
    await expect(
      library.getByRole("button", { name: /Workspace retained prompt/ }),
    ).toHaveAttribute("aria-pressed", "true")
    await request.fill("Unsaved compiler request preserved through Settings")
    const requestNode = await request.elementHandle()
    const settingsNode = await settings.elementHandle()
    if (requestNode === null || settingsNode === null) throw new Error("Missing mounted workspace")

    for (const entry of ["sidebar", "menu", "shortcut"] as const) {
      if (entry === "sidebar")
        await page.locator('[data-menu-action-target="open-settings"]').click()
      if (entry === "menu") await clickMenu(app, "Settings...")
      if (entry === "shortcut") await page.keyboard.press("Meta+,")
      await expect(settings).toBeVisible()
      await expect(library).toBeHidden()
      await expect(compiler).toBeHidden()
      await expect(page.getByTestId("left-sidebar")).toBeVisible()
      await expect(settings.getByRole("heading", { name: "Settings", exact: true })).toBeVisible()
      if (entry !== "sidebar")
        await expect(page.locator('[data-menu-action-target="settings-panel"]')).toBeFocused()
      await expect(page.getByRole("dialog")).toHaveCount(0)
      await expect(page.getByRole("alertdialog")).toHaveCount(0)
      const model = settings.getByRole("textbox", { name: "Default model" })
      await expect(settings.getByText("Default model", { exact: true })).toBeVisible()
      expect(
        await model.evaluate(
          (element) =>
            element instanceof HTMLInputElement &&
            Array.from(element.labels ?? []).some((label) =>
              label.textContent?.includes("Default model"),
            ),
        ),
      ).toBe(true)
      if (entry === "sidebar") await model.fill("unsaved-workspace-model")
      await expect(model).toHaveValue("unsaved-workspace-model")
      await settings.getByRole("button", { name: "라이브러리로 돌아가기" }).click()
      await expect(library).toBeVisible()
      await expect(settings).toBeHidden()
      await expect(search).toHaveValue("Workspace retained")
      await expect(request).toHaveValue("Unsaved compiler request preserved through Settings")
      await expect(
        page.getByTestId("left-sidebar").getByRole("button", { name: /Native workspace project/ }),
      ).toHaveAttribute("aria-current", "page")
      await expect(
        library.getByRole("button", { name: /Workspace retained prompt/ }),
      ).toHaveAttribute("aria-pressed", "true")
      await expect(compiler.getByRole("textbox", { name: "Prompt editor body" })).toHaveValue(
        "Saved workspace body",
      )
      expect(
        await requestNode.evaluate(
          (node) => node === document.querySelector('[aria-label="Original request"]'),
        ),
      ).toBe(true)
      expect(
        await settingsNode.evaluate(
          (node) => node === document.querySelector('[data-testid="settings-workspace"]'),
        ),
      ).toBe(true)
      await expectPassiveEntry(app)
    }
    await clickMenu(app, "Library Maintenance")
    await expect(settings).toBeVisible()
    await expect(page.locator('[data-menu-action-target="settings-maintenance"]')).toBeFocused()
    await expectPassiveEntry(app)
    await clickMenu(app, "Search")
    await expect(library).toBeVisible()
    await expect(settings).toBeHidden()
    await expect(search).toBeFocused()
    await expect(search).toHaveValue("Workspace retained")
    await expect(request).toHaveValue("Unsaved compiler request preserved through Settings")
    await expectPassiveEntry(app)
  })
})

test("manager destinations and Settings Privacy link remain reachable without consuming the compiler draft", async () => {
  test.setTimeout(90_000)
  await withPhase13Prompter("prompter-native-managers", async ({ app, page }) => {
    await recordPassiveEntryActions(app)
    await seedWorkspace(page)
    const request = page.getByRole("textbox", { name: "Original request" })
    await request.fill("Manager navigation draft")
    for (const [label, destination, target] of [
      ["컨텍스트 관리", "context-workspace", "project-context"],
      ["템플릿 관리", "templates-workspace", "prompt-templates"],
      ["하네스 관리", "harnesses-workspace", "harness-templates"],
    ] as const) {
      await page
        .getByTestId("left-sidebar")
        .getByRole("button", { name: label, exact: true })
        .click()
      const workspace = page.getByTestId(destination)
      await expect(workspace).toBeVisible()
      await expect(workspace.locator(`[data-insights-target="${target}"]`)).toBeVisible()
      await expect(page.getByTestId("prompt-library")).toBeHidden()
      await workspace.getByRole("button", { name: "라이브러리로 돌아가기" }).click()
      await expect(request).toHaveValue("Manager navigation draft")
      await expect(
        page.getByTestId("prompt-compiler").getByRole("textbox", { name: "Prompt editor body" }),
      ).toHaveValue("Saved workspace body")
      await expectPassiveEntry(app)
    }
    const compiler = page.getByTestId("prompt-compiler")
    await compiler.locator("summary").filter({ hasText: "추가 옵션" }).click()
    for (const [label, destination] of [
      ["프로파일 편집", "context-workspace"],
      ["템플릿 관리", "templates-workspace"],
      ["하네스 관리", "harnesses-workspace"],
    ] as const) {
      await compiler.getByRole("button", { name: label, exact: true }).click()
      const workspace = page.getByTestId(destination)
      await expect(workspace).toBeVisible()
      await workspace.getByRole("button", { name: "라이브러리로 돌아가기" }).click()
      await expect(request).toHaveValue("Manager navigation draft")
      await expectPassiveEntry(app)
    }
    await page.locator('[data-menu-action-target="open-settings"]').click()
    await page
      .getByTestId("settings-workspace")
      .getByRole("button", { name: "Privacy Center 열기", exact: true })
      .click()
    await expect(page.getByTestId("privacy-workspace")).toBeVisible()
    await page
      .getByTestId("left-sidebar")
      .getByRole("button", { name: "Library", exact: true })
      .click()
    await expect(request).toHaveValue("Manager navigation draft")
    await expectPassiveEntry(app)
  })
})

test("three Library panels fit both supported widths and additional options retain mounted values", async () => {
  test.setTimeout(90_000)
  await withPhase13Prompter("prompter-native-options", async ({ app, page }) => {
    const ids = await seedWorkspace(page)
    await recordPassiveEntryActions(app)
    const compiler = page.getByTestId("prompt-compiler")
    const summary = compiler.locator("summary").filter({ hasText: "추가 옵션" })
    await expect(compiler.getByRole("textbox", { name: "Original request" })).toBeVisible()
    await expect(compiler.locator('[aria-label="Compiler title"]')).toBeHidden()
    await summary.click()
    const fields = [
      ["Compiler title", "Retained option title"],
      ["Project context", "Retained manual context"],
      ["Compiler stack", "TypeScript and Electron"],
      ["Constraints", "Do not run automatically"],
      ["Acceptance criteria", "Keep every option"],
      ["Validation commands", "npm test"],
      ["Additional notes", "Retained notes"],
    ] as const
    for (const [label, value] of fields)
      await compiler.getByRole("textbox", { name: label, exact: true }).fill(value)
    const selections = [
      ["Compile mode", "bugfix"],
      ["Compile runner", "claude_code"],
      ["Harness template", ids.harnessId],
      ["Project context profile", ids.profileId],
    ] as const
    for (const [label, value] of selections)
      await compiler.getByRole("combobox", { name: label, exact: true }).selectOption(value)
    await compiler.getByRole("checkbox", { name: "Include project context profile" }).check()
    await compiler
      .getByRole("combobox", { name: "Prompt template", exact: true })
      .selectOption(ids.templateId)
    await compiler
      .getByRole("textbox", { name: "Template variable objective" })
      .fill("Retained template variable")
    await expect(
      compiler.getByRole("combobox", { name: "Prompt template", exact: true }),
    ).toHaveValue(ids.templateId)
    const titleNode = await compiler.locator('[aria-label="Compiler title"]').elementHandle()
    if (titleNode === null) throw new Error("Missing options input")
    await summary.click()
    await expect(compiler.locator('[aria-label="Compiler title"]')).toBeHidden()
    for (const [label, value] of [...fields, ...selections]) {
      await expect(compiler.locator(`[aria-label="${label}"]`)).toHaveValue(value)
    }
    await expect(compiler.locator('[aria-label="Prompt template"]')).toHaveValue(ids.templateId)
    await expect(compiler.locator('[aria-label="Template variable objective"]')).toHaveValue(
      "Retained template variable",
    )
    await expect(compiler.locator('[aria-label="Include project context profile"]')).toBeChecked()
    expect(await titleNode.evaluate((node) => node.isConnected)).toBe(true)
    await summary.click()
    for (const [label, value] of [...fields, ...selections]) {
      await expect(compiler.locator(`[aria-label="${label}"]`)).toHaveValue(value)
    }
    await expect(
      compiler.getByRole("combobox", { name: "Prompt template", exact: true }),
    ).toHaveValue(ids.templateId)
    await expect(
      compiler.getByRole("textbox", { name: "Template variable objective" }),
    ).toHaveValue("Retained template variable")
    await expect(
      compiler.getByRole("checkbox", { name: "Include project context profile" }),
    ).toBeChecked()
    expect(
      await titleNode.evaluate(
        (node) => node === document.querySelector('[aria-label="Compiler title"]'),
      ),
    ).toBe(true)
    await expectPassiveEntry(app)
    for (const viewport of [
      { width: 1180, height: 760 },
      { width: 1024, height: 720 },
    ]) {
      await page.setViewportSize(viewport)
      for (const id of ["left-sidebar", "prompt-library", "prompt-compiler"])
        await expect(page.getByTestId(id)).toBeVisible()
      await expect(
        page
          .getByTestId("prompt-library")
          .getByRole("button", { name: /Workspace retained prompt/ }),
      ).toBeInViewport({ ratio: 1 })
      const projectRow = await page
        .getByTestId("left-sidebar")
        .getByRole("button", { name: /^Native workspace project/ })
        .evaluate((row) => {
          const [name, agent] = row.querySelectorAll("span")
          if (!name || !agent) throw new Error("Missing project row labels")
          return {
            width: row.clientWidth,
            nameWidth: name.getBoundingClientRect().width,
            nameBottom: name.getBoundingClientRect().bottom,
            agentTop: agent.getBoundingClientRect().top,
          }
        })
      expect(projectRow.nameWidth).toBeGreaterThan(projectRow.width * 0.8)
      expect(projectRow.agentTop).toBeGreaterThanOrEqual(projectRow.nameBottom)
      const geometry = await page.evaluate(() => {
        const shell = document.querySelector<HTMLElement>('[data-testid="app-shell"]')
        if (shell === null) throw new Error("Missing shell")
        const panels = ["left-sidebar", "prompt-library", "prompt-compiler"].map((id) => {
          const panel = document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
          if (panel === null) throw new Error(`Missing panel: ${id}`)
          const bounds = panel.getBoundingClientRect()
          return {
            left: bounds.left,
            right: bounds.right,
            width: bounds.width,
            scrollWidth: panel.scrollWidth,
            clientWidth: panel.clientWidth,
          }
        })
        const filters = ["Search prompts", "Scenario filter", "Target agent filter"].map(
          (label) => {
            const control = document.querySelector<HTMLElement>(`[aria-label="${label}"]`)
            if (control === null) throw new Error(`Missing filter: ${label}`)
            const bounds = control.getBoundingClientRect()
            return { width: bounds.width, top: bounds.top, bottom: bounds.bottom }
          },
        )
        return {
          panels,
          filters,
          scrollWidth: shell.scrollWidth,
          clientWidth: shell.clientWidth,
          width: window.innerWidth,
        }
      })
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1)
      for (const panel of geometry.panels) {
        expect(panel.width).toBeGreaterThan(0)
        expect(panel.left).toBeGreaterThanOrEqual(0)
        expect(panel.right).toBeLessThanOrEqual(geometry.width + 1)
        expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth + 1)
      }
      expect(geometry.panels[0]?.right).toBeLessThanOrEqual(geometry.panels[1]?.left ?? 0)
      expect(geometry.panels[1]?.right).toBeLessThanOrEqual(geometry.panels[2]?.left ?? 0)
      const [searchFilter, scenarioFilter, agentFilter] = geometry.filters
      if (!searchFilter || !scenarioFilter || !agentFilter)
        throw new Error("Missing filter geometry")
      expect(Math.abs(searchFilter.width - scenarioFilter.width)).toBeLessThanOrEqual(1)
      expect(Math.abs(searchFilter.width - agentFilter.width)).toBeLessThanOrEqual(1)
      expect(scenarioFilter.top).toBeGreaterThanOrEqual(searchFilter.bottom)
      expect(agentFilter.top).toBeGreaterThanOrEqual(scenarioFilter.bottom)
    }
  })
})
