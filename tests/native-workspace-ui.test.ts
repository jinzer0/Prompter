import { mkdir, writeFile } from "node:fs/promises"
import type { ElectronApplication, Locator, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

import { PERSISTENCE_CHANNELS } from "../electron/ipc-contract"
import {
  openCompilerResult,
  openEditorAction,
  openPromptDetails,
  type RunningApp,
} from "./electron-playwright-helpers"
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

async function renderedContrast(locator: Locator, pseudo: string | null = null) {
  await expect(locator).toBeVisible()
  await locator.evaluate(async (element) => {
    const animations: Animation[] = []
    for (let current: Element | null = element; current; current = current.parentElement) {
      animations.push(...current.getAnimations())
    }
    await Promise.all(animations.map((animation) => animation.finished))
  })
  const sample = await locator.evaluate((element, pseudo) => {
    if (pseudo === "::placeholder" && !element.matches(":placeholder-shown")) {
      throw new Error("Contrast sampling requires a visible placeholder")
    }
    const canvas = document.createElement("canvas")
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext("2d")
    if (context === null) throw new Error("Canvas contrast sampling unavailable")
    const ancestors: Element[] = []
    for (let current: Element | null = element; current; current = current.parentElement) {
      ancestors.unshift(current)
    }
    for (const ancestor of ancestors) {
      const style = getComputedStyle(ancestor)
      if (style.backgroundImage !== "none" || Number(style.opacity) !== 1) {
        throw new Error("Contrast sample requires flat, fully opaque ancestors")
      }
      context.fillStyle = style.backgroundColor
      context.fillRect(0, 0, 1, 1)
    }
    const background = context.getImageData(0, 0, 1, 1).data
    if (background[3] !== 255) throw new Error("Composed background is not opaque")
    const style = getComputedStyle(element, pseudo)
    context.fillStyle = style.color
    context.globalAlpha = Number(style.opacity)
    context.fillRect(0, 0, 1, 1)
    const foreground = context.getImageData(0, 0, 1, 1).data
    const luminance = (color: Uint8ClampedArray) =>
      Array.from(color)
        .slice(0, 3)
        .reduce((sum, channel, index) => {
          const value = channel / 255
          const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
          const weight = index === 0 ? 0.2126 : index === 1 ? 0.7152 : 0.0722
          return sum + linear * weight
        }, 0)
    const a = luminance(foreground)
    const b = luminance(background)
    return {
      foreground: Array.from(foreground),
      background: Array.from(background),
      ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      fontSize: style.fontSize,
      color: style.color,
      opacity: style.opacity,
      pseudo,
    }
  }, pseudo)
  expect(sample.ratio, JSON.stringify(sample)).toBeGreaterThanOrEqual(4.5)
  return sample
}

async function withDirtyWorkspace(prefix: string, callback: (run: RunningApp) => Promise<void>) {
  await withPhase13Prompter(prefix, async (run) => {
    try {
      await callback(run)
    } finally {
      // Destroy only the owned fixture after assertions; app.close otherwise opens the dirty guard.
      await run.app.evaluate(({ BrowserWindow }) => {
        for (const window of BrowserWindow.getAllWindows()) window.destroy()
      })
    }
  })
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
      const filterSummary = page
        .getByTestId("prompt-library")
        .locator("summary")
        .filter({ hasText: /^필터/ })
      if (
        !(await filterSummary.evaluate(
          (node) => node.parentElement instanceof HTMLDetailsElement && node.parentElement.open,
        ))
      )
        await filterSummary.click()
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

test("native Settings dismisses only auxiliary presentation and retains the mounted editor", async () => {
  await withPhase13Prompter("prompter-redesign-modal-navigation", async ({ app, page }) => {
    await seedWorkspace(page)
    await page
      .getByRole("textbox", { name: "Original request", exact: true })
      .fill("Retained modal navigation draft")
    const body = page.getByRole("textbox", { name: "Prompt editor body", exact: true })
    const bodyNode = await body.elementHandle()
    if (bodyNode === null) throw new Error("Missing editor")
    await openPromptDetails(page)
    await clickMenu(app, "Settings...")
    await expect(page.getByTestId("settings-workspace")).toBeVisible()
    await expect(page.getByRole("dialog", { name: "프롬프트 버전 · 내보내기 · 품질" })).toBeHidden()
    await page
      .getByTestId("settings-workspace")
      .getByRole("button", { name: "라이브러리로 돌아가기", exact: true })
      .click()
    await expect(body).toHaveValue("Saved workspace body")
    expect(
      await bodyNode.evaluate((node) => node === document.querySelector("#prompt-editor-body")),
    ).toBe(true)
    await expect(page.getByRole("textbox", { name: "Original request", exact: true })).toHaveValue(
      "Retained modal navigation draft",
    )
  })
})

test("native Library commands dismiss only auxiliary details and preserve both drafts", async () => {
  await withDirtyWorkspace("prompter-native-auxiliary-commands", async ({ app, page }) => {
    await seedWorkspace(page)
    const body = page.getByRole("textbox", { name: "Prompt editor body", exact: true })
    const request = page.getByRole("textbox", { name: "Original request", exact: true })
    const draft = "  Dirty native-command body\n\tkept exactly  "
    const compilerDraft = "Independent native-command compiler request"
    await body.fill(draft)
    await request.fill(compilerDraft)
    const node = await body.elementHandle()
    if (node === null) throw new Error("Missing mounted editor")
    await recordPassiveEntryActions(app)
    const details = page.getByRole("dialog", { name: "프롬프트 버전 · 내보내기 · 품질" })
    const more = page.locator('button[aria-haspopup="menu"]')

    for (const command of ["Search", "New Prompt", "New Project", "Close Active Panel"]) {
      await openPromptDetails(page)
      await clickMenu(app, command)
      await expect(details).toBeHidden()
      if (command === "Search") {
        await expect(
          page.getByRole("textbox", { name: "Search prompts", exact: true }),
        ).toBeFocused()
      } else if (command === "New Prompt") {
        const title = page.getByRole("textbox", { name: "Prompt title", exact: true })
        await expect(title).toBeVisible()
        await title.fill("Reachable native prompt draft")
        await expect(title).toHaveValue("Reachable native prompt draft")
        await expect(title).toBeFocused()
      } else if (command === "New Project") {
        const name = page.getByRole("textbox", { name: "Project name", exact: true })
        await expect(name).toBeVisible()
        await name.fill("Reachable native project draft")
        await expect(name).toHaveValue("Reachable native project draft")
        await expect(name).toBeFocused()
      } else {
        await expect(more).toBeFocused()
      }
      await expect(body).toHaveValue(draft)
      await expect(request).toHaveValue(compilerDraft)
      expect(
        await node.evaluate((element) => element === document.getElementById("prompt-editor-body")),
      ).toBe(true)
      await expectPassiveEntry(app)
    }
  })
})

test("More skips disabled actions, wraps keys and dismisses through every visible path", async () => {
  await withDirtyWorkspace("prompter-more-keyboard", async ({ app, page }) => {
    await seedWorkspace(page)
    const body = page.getByRole("textbox", { name: "Prompt editor body", exact: true })
    await body.fill(" \t\n")
    const more = page.locator('button[aria-haspopup="menu"]')
    const menu = page.getByRole("menu", { name: "프롬프트 보조 동작" })
    const first = menu.getByRole("menuitem", { name: "버전 이력 · 비교", exact: true })
    const last = menu.getByRole("menuitem", { name: "품질 검토", exact: true })
    await more.click()
    await expect(menu).toBeVisible()
    await expect(menu.getByRole("menuitem", { name: "복제하여 저장", exact: true })).toBeDisabled()
    await expect(first).toBeFocused()
    await page.keyboard.press("ArrowUp")
    await expect(last).toBeFocused()
    await page.keyboard.press("ArrowDown")
    await expect(first).toBeFocused()
    await page.keyboard.press("ArrowDown")
    await expect(menu.getByRole("menuitem", { name: "태그 편집", exact: true })).toBeFocused()
    await page.keyboard.press("End")
    await expect(last).toBeFocused()
    await page.keyboard.press("Home")
    await expect(first).toBeFocused()
    await page.keyboard.press("Tab")
    await expect(menu).toBeHidden()
    await expect(body).toBeFocused()
    await more.click()
    await expect(menu).toBeVisible()
    await body.click()
    await expect(menu).toBeHidden()
    await expect(body).toBeFocused()
    await more.click()
    await expect(first).toBeFocused()
    await clickMenu(app, "Close Active Panel")
    await expect(menu).toBeHidden()
    await expect(more).toBeFocused()
    await more.click()
    await expect(first).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(menu).toBeHidden()
    await expect(more).toBeFocused()
    await expect(body).toHaveValue(" \t\n")
  })
})

test("direct export and quality routes reveal the selected version after comparison", async () => {
  await withDirtyWorkspace("prompter-direct-detail-routes", async ({ page }) => {
    await seedWorkspace(page)
    const details = page.getByRole("dialog", { name: "프롬프트 버전 · 내보내기 · 품질" })
    const more = page.locator('button[aria-haspopup="menu"]')
    for (const route of ["내보내기", "품질 검토"]) {
      await openPromptDetails(page)
      const compare = details.getByRole("tab", { name: "Version compare", exact: true })
      await compare.click()
      await expect(compare).toHaveAttribute("aria-selected", "true")
      await details.getByRole("button", { name: "닫기", exact: true }).click()
      await expect(more).toBeFocused()
      await openEditorAction(page, route)
      await expect(details).toBeVisible()
      await expect(
        details.getByRole("tab", { name: "Selected version", exact: true }),
      ).toHaveAttribute("aria-selected", "true")
      const destination =
        route === "내보내기"
          ? details.getByRole("combobox", { name: "Version export format", exact: true })
          : details.locator('[data-insights-target="prompt-quality"]')
      await expect(destination).toBeVisible()
      await expect(destination).toBeFocused()
      await details.getByRole("button", { name: "닫기", exact: true }).click()
      await expect(details).toBeHidden()
      await expect(more).toBeFocused()
    }
  })
})

test("native auxiliary cancellation preserves a higher privacy warning in both themes", async () => {
  await withDirtyWorkspace("prompter-native-privacy-priority", async ({ app, page }) => {
    await seedWorkspace(page)
    const testOnlyCandidate = `sk-proj-${"a".repeat(24)}`
    const savedBody = `Review the synthetic test-only candidate ${testOnlyCandidate}; never use it.`
    await page.evaluate(async (compiledPrompt) => {
      const project = (await window.prompter.projects.list()).find(
        (item) => item.name === "Native workspace project",
      )
      if (project === undefined) throw new Error("Missing protected-export project")
      await window.prompter.prompts.createWithInitialVersion({
        projectId: project.id,
        title: "Protected native version export",
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "Synthetic privacy fixture only",
        compiledPrompt,
      })
    }, savedBody)
    await page.reload()
    await page
      .getByTestId("prompt-library")
      .getByRole("button", { name: /Protected native version export/ })
      .click()
    const body = page.getByRole("textbox", { name: "Prompt editor body", exact: true })
    await expect(body).toHaveValue(savedBody)
    await body.fill("Independent dirty native privacy draft")
    await app.evaluate(
      ({ ipcMain }, channels) => {
        const handlers = Reflect.get(ipcMain, "_invokeHandlers")
        if (!(handlers instanceof Map)) throw new Error("Missing clipboard IPC map")
        const calls: Array<{ destination: string; confirmed: boolean }> = []
        Reflect.set(globalThis, "__redesignExportConfirmations", calls)
        for (const [destination, channel] of Object.entries(channels)) {
          const original = handlers.get(channel)
          if (typeof original !== "function") throw new Error("Missing export destination handler")
          ipcMain.removeHandler(channel)
          ipcMain.handle(channel, (event, payload: unknown) => {
            calls.push({
              destination,
              confirmed:
                typeof payload === "object" &&
                payload !== null &&
                Reflect.has(payload, "privacyConfirmationSessionId"),
            })
            return original(event, payload)
          })
        }
      },
      { copy: PERSISTENCE_CHANNELS.copyText, save: PERSISTENCE_CHANNELS.savePromptToFile },
    )
    const actions: Array<{ type: string; selector: string; timestamp: string; result: unknown }> =
      []
    const expectedConfirmations: Array<{ destination: string; confirmed: boolean }> = []
    await mkdir(".omo/evidence/redesign", { recursive: true })
    try {
      for (const theme of ["light", "dark"] as const) {
        await page.evaluate(
          async (appTheme) => window.prompter.settings.updateDefaults({ appTheme }),
          theme,
        )
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
        for (const destination of ["copy", "save"] as const) {
          for (const cancellation of ["native", "button", "escape"] as const) {
            await openEditorAction(page, "내보내기")
            const details = page.getByRole("dialog", {
              name: "프롬프트 버전 · 내보내기 · 품질",
              exact: true,
            })
            const trigger = details.getByRole("button", {
              name: destination === "copy" ? "Copy version export" : "Save version export",
              exact: true,
            })
            await trigger.click()
            const warning = page.getByRole("alertdialog", {
              name: "Sensitive content needs review",
              exact: true,
            })
            const cancel = warning.getByRole("button", { name: "Cancel and review", exact: true })
            await expect(cancel).toBeFocused()
            await expect(warning).not.toContainText(testOnlyCandidate)
            await page.keyboard.press("Shift+Tab")
            await expect(warning.getByRole("button").last()).toBeFocused()
            await page.keyboard.press("Tab")
            await expect(cancel).toBeFocused()
            await expect(details).toBeVisible()
            if (destination === "copy" && cancellation === "native") {
              const screenshot = `.omo/evidence/redesign/${theme}-native-privacy-cancel.png`
              await page.screenshot({ path: screenshot })
              actions.push({
                type: "screenshot",
                selector: '[role="alertdialog"]',
                timestamp: new Date().toISOString(),
                result: screenshot,
              })
            }
            if (cancellation === "native") await clickMenu(app, "Close Active Panel")
            else if (cancellation === "button") await cancel.click()
            else await page.keyboard.press("Escape")
            await expect(warning).toBeHidden()
            await expect(details).toBeVisible()
            await expect(trigger).toBeFocused()
            const restoredFocus = await page.evaluate(() => ({
              tag: document.activeElement?.tagName,
              role: document.activeElement?.getAttribute("role"),
              label: document.activeElement?.getAttribute("aria-label"),
            }))
            actions.push({
              type: "observe",
              selector: "privacy cancel focus owner",
              timestamp: new Date().toISOString(),
              result: restoredFocus,
            })
            const confirmations = await app.evaluate(() =>
              Reflect.get(globalThis, "__redesignExportConfirmations"),
            )
            expectedConfirmations.push({ destination, confirmed: false })
            expect(confirmations).toEqual(expectedConfirmations)
            await clickMenu(app, "Close Active Panel")
            await expect(details).toBeHidden()
            await expect(body).toHaveValue("Independent dirty native privacy draft")
            actions.push({
              type: "assert",
              selector: "native Close Active Panel / protected privacy owner",
              timestamp: new Date().toISOString(),
              result: {
                theme,
                destination,
                cancellation,
                onlyWarningCancelled: true,
                masked: true,
                focusTrap: true,
                cancelRestoresTriggerFocus: true,
                confirmedExternalCalls: 0,
                draftRetained: true,
              },
            })
          }
        }
      }
    } finally {
      await writeFile(
        ".omo/evidence/redesign/native-privacy-automation.json",
        JSON.stringify(
          {
            schemaVersion: 1,
            kind: "browser-automation",
            tool: "Playwright Electron",
            surface: "app",
            limitation:
              "Owned synthetic fixture and native content screenshots, not decorated OS frame",
            actions,
          },
          null,
          2,
        ),
      )
    }
  })
})

test("manager validation and failed saves remain readable in both themes", async () => {
  await withDirtyWorkspace("prompter-redesign-validation", async ({ app, page }) => {
    await seedWorkspace(page)
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(1024, 720))
    const body = page.getByRole("textbox", { name: "Prompt editor body", exact: true })
    const request = page.getByRole("textbox", { name: "Original request", exact: true })
    const draft = "Owner validation dirty editor\n  retained whitespace  "
    const compilerDraft = "Independent owner validation compiler draft"
    await body.fill(draft)
    await request.fill(compilerDraft)
    const cases = [
      {
        label: "템플릿 관리",
        workspace: "templates-workspace",
        create: "New Prompt Template",
        name: "Prompt template name",
        save: "Save Prompt Template",
        nameError: "Prompt template name is required.",
        body: "Prompt template body",
        channel: PERSISTENCE_CHANNELS.createPromptTemplate,
      },
      {
        label: "하네스 관리",
        workspace: "harnesses-workspace",
        create: "New Harness",
        name: "Harness name",
        save: "Save Harness",
        nameError: "Harness template name is required.",
        body: "Template body",
        channel: PERSISTENCE_CHANNELS.createHarnessTemplate,
      },
      {
        label: "컨텍스트 관리",
        workspace: "context-workspace",
        create: "New Context Profile",
        name: "Context profile name",
        save: "Save Context Profile",
        nameError: "Profile name is required.",
        body: null,
        channel: PERSISTENCE_CHANNELS.createProjectContextProfile,
      },
    ] as const
    const failure = `Injected manager save failure ${"unbroken-feedback".repeat(12)}`
    await app.evaluate(
      ({ ipcMain }, { channels, message }) => {
        const calls: string[] = []
        Reflect.set(globalThis, "__redesignManagerCreateCalls", calls)
        for (const channel of channels) {
          ipcMain.removeHandler(channel)
          ipcMain.handle(channel, () => {
            calls.push(channel)
            throw new Error(message)
          })
        }
      },
      { channels: cases.map((item) => item.channel), message: failure },
    )
    const actions: Array<{ type: string; selector: string; timestamp: string; result: unknown }> =
      []
    const expectedCalls: string[] = []
    let passed = false
    try {
      for (const theme of ["light", "dark"] as const) {
        await page.evaluate(
          async (appTheme) => window.prompter.settings.updateDefaults({ appTheme }),
          theme,
        )
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
        for (const item of cases) {
          await page
            .getByTestId("left-sidebar")
            .getByRole("button", { name: item.label, exact: true })
            .click()
          const workspace = page.getByTestId(item.workspace)
          await workspace.getByRole("button", { name: item.create, exact: true }).click()
          const form = workspace.locator("form")
          await expect(form).toHaveCount(1)
          const save = form.getByRole("button", { name: item.save, exact: true })
          const checkFeedback = async (text: string) => {
            const feedback = form.getByText(text)
            await expect(feedback).toBeVisible()
            await feedback.scrollIntoViewIfNeeded()
            await expect(feedback).toBeInViewport()
            const sample = await renderedContrast(feedback)
            const geometry = await workspace.evaluate((element) => ({
              scrollWidth: element.scrollWidth,
              clientWidth: element.clientWidth,
            }))
            actions.push({
              type: "observe",
              selector: `${item.workspace} feedback`,
              timestamp: new Date().toISOString(),
              result: { theme, text, sample, geometry },
            })
            expect(sample.fontSize).toBe("14px")
            expect(sample.ratio).toBeGreaterThanOrEqual(4.5)
            expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1)
          }
          const nameInput = form.getByRole("textbox", { name: item.name, exact: true })
          await nameInput.fill("")
          await save.click()
          await checkFeedback(item.nameError)
          const name = `${"긴이름".repeat(12)} validation`
          await nameInput.fill(name)
          if (item.body !== null) {
            const templateBody = form.getByRole("textbox", { name: item.body, exact: true })
            await templateBody.fill("")
            await save.click()
            await checkFeedback("Template body is required.")
            await templateBody.fill("Validation template {{originalInput}}")
          }
          if (item.workspace === "harnesses-workspace") {
            for (const label of ["Required fields JSON", "Clarification policy JSON"]) {
              const json = form.getByRole("textbox", { name: label, exact: true })
              await json.fill("{invalid")
              await save.click()
              await checkFeedback("Enter valid JSON.")
              await json.fill("")
            }
          }
          expect(
            await app.evaluate(() => Reflect.get(globalThis, "__redesignManagerCreateCalls")),
          ).toEqual(expectedCalls)
          await save.click()
          await checkFeedback(failure)
          await expect(save).toBeEnabled()
          await expect(form.getByRole("textbox", { name: item.name, exact: true })).toHaveValue(
            name,
          )
          expectedCalls.push(item.channel)
          expect(
            await app.evaluate(() => Reflect.get(globalThis, "__redesignManagerCreateCalls")),
          ).toEqual(expectedCalls)
          await workspace
            .getByRole("button", { name: /^(라이브러리로 돌아가기|Back to library)$/ })
            .click()
          await expect(body).toHaveValue(draft)
          await expect(request).toHaveValue(compilerDraft)
        }
      }
      passed = true
    } finally {
      await mkdir(".omo/evidence/redesign", { recursive: true })
      await writeFile(
        ".omo/evidence/redesign/validation-automation.json",
        JSON.stringify(
          {
            schemaVersion: 1,
            kind: "app-automation",
            tool: "Playwright Electron",
            surface: "app",
            verdict: passed ? "passed" : "failed",
            limitation:
              "Owned synthetic failure fixture; no native success stubs or OS-frame evidence",
            actions,
          },
          null,
          2,
        ),
      )
    }
  })
})

test("both themes cover supporting workspaces, composed contrast and protected states", async () => {
  test.setTimeout(90_000)
  await withDirtyWorkspace("prompter-redesign-state-matrix", async ({ app, page }) => {
    const actions: Array<{ type: string; selector: string; timestamp: string; result: unknown }> =
      []
    const record = (selector: string, result: unknown) =>
      actions.push({ type: "assert", selector, timestamp: new Date().toISOString(), result })
    await mkdir(".omo/evidence/redesign", { recursive: true })
    try {
      for (const theme of ["light", "dark"] as const) {
        await page.evaluate(
          async (appTheme) => window.prompter.settings.updateDefaults({ appTheme }),
          theme,
        )
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
        await expect(page.getByText("No projects yet", { exact: true })).toBeVisible()
        record("no-project", {
          theme,
          contrast: await renderedContrast(page.getByText("No projects yet", { exact: true })),
        })
      }
      await seedWorkspace(page)
      await page.evaluate(async () => {
        const project = (await window.prompter.projects.list()).find(
          (item) => item.name === "Native workspace project",
        )
        if (project === undefined) throw new Error("Missing matrix project")
        await window.prompter.prompts.createWithInitialVersion({
          projectId: project.id,
          title: "Other matrix prompt",
          scenario: "feature",
          targetAgent: "codex",
          originalInput: "Other source",
          compiledPrompt: "Other saved body",
        })
        await window.prompter.projects.create({ name: "Empty matrix project" })
      })
      await page.reload()
      await page
        .getByTestId("left-sidebar")
        .getByRole("button", { name: /Empty matrix project/ })
        .click()
      for (const theme of ["light", "dark"] as const) {
        await page.evaluate(
          async (appTheme) => window.prompter.settings.updateDefaults({ appTheme }),
          theme,
        )
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
        await expect(page.getByText("No prompts yet", { exact: true })).toBeVisible()
        record("empty-project", {
          theme,
          contrast: await renderedContrast(page.getByText("No prompts yet", { exact: true })),
        })
      }
      await page
        .getByTestId("left-sidebar")
        .getByRole("button", { name: /Native workspace project/ })
        .click()
      await page
        .getByTestId("prompt-library")
        .getByRole("button", { name: /Workspace retained prompt/ })
        .click()
      const body = page.getByRole("textbox", { name: "Prompt editor body", exact: true })
      const request = page.getByRole("textbox", { name: "Original request", exact: true })
      const draft = "State matrix dirty body\n  exact whitespace  "
      const compilerDraft = "Independent state matrix compiler request"
      await request.fill(compilerDraft)
      await page.getByRole("button", { name: "프롬프트 컴파일", exact: true }).click()
      await openCompilerResult(page)
      await expect(
        page.getByRole("textbox", { name: "Generated prompt preview", exact: true }),
      ).not.toHaveValue("")
      await body.fill(draft)
      await page.locator('[data-menu-action-target="open-settings"]').click()
      await page.getByRole("button", { name: "Enable app lock", exact: true }).click()
      await page
        .getByRole("textbox", { name: "New passphrase", exact: true })
        .fill("redesign state passphrase")
      await page
        .getByRole("textbox", { name: "Confirm new passphrase", exact: true })
        .fill("redesign state passphrase")
      await page.getByRole("button", { name: "Enable app lock", exact: true }).click()
      await expect(
        page.getByRole("button", { name: "Lock Prompter now", exact: true }),
      ).toBeVisible()
      await page
        .getByTestId("settings-workspace")
        .getByRole("button", { name: "라이브러리로 돌아가기", exact: true })
        .click()

      for (const theme of ["light", "dark"] as const) {
        await page.evaluate(
          async (appTheme) => window.prompter.settings.updateDefaults({ appTheme }),
          theme,
        )
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
        await app.evaluate(({ BrowserWindow }) => {
          const window = BrowserWindow.getAllWindows()[0]
          if (window === undefined) throw new Error("Missing matrix native window")
          window.setSize(1024, 720)
          window.center()
          window.focus()
        })
        const search = page.getByRole("textbox", { name: "Search prompts", exact: true })
        const save = page.getByRole("button", { name: "새 버전 저장", exact: true })
        const more = page.locator('button[aria-haspopup="menu"]')
        await request.fill("")
        const placeholderContrast = await renderedContrast(request, "::placeholder")
        await request.fill(compilerDraft)
        const contrasts = [
          { state: "editor", sample: await renderedContrast(body) },
          {
            state: "request-placeholder",
            sample: placeholderContrast,
          },
          { state: "search-placeholder", sample: await renderedContrast(search, "::placeholder") },
          {
            state: "selected-project",
            sample: await renderedContrast(
              page
                .getByTestId("left-sidebar")
                .getByRole("button", { name: /Native workspace project/ }),
            ),
          },
          { state: "primary", sample: await renderedContrast(save) },
        ]
        await more.hover()
        contrasts.push({ state: "secondary-hover", sample: await renderedContrast(more) })
        await save.hover()
        contrasts.push({ state: "primary-hover", sample: await renderedContrast(save) })
        record("rendered-contrast", {
          theme,
          contrasts,
          disabledText:
            "Disabled controls are exempt; readable explanations and enabled states sampled instead.",
        })
        await search.fill("no matrix prompt can match this query")
        await expect(page.getByText("No prompts match your filters", { exact: true })).toBeVisible()
        await expect(body).toHaveValue(draft)
        record("zero-results", { theme, draftRetained: true })
        await search.fill("")
        for (const [label, testId] of [
          ["컨텍스트 관리", "context-workspace"],
          ["템플릿 관리", "templates-workspace"],
          ["하네스 관리", "harnesses-workspace"],
          ["Privacy Center", "privacy-workspace"],
        ]) {
          if (label === undefined || testId === undefined) throw new Error("Missing workspace case")
          const node = await body.elementHandle()
          if (node === null) throw new Error("Missing mounted editor")
          await page
            .getByTestId("left-sidebar")
            .getByRole("button", { name: label, exact: true })
            .click()
          const workspace = page.getByTestId(testId)
          await expect(workspace).toBeVisible()
          const geometry = await workspace.evaluate((element) => ({
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            headings: [...element.querySelectorAll("h2,h3")].map((heading) => heading.textContent),
          }))
          expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1)
          record(testId, { theme, geometry })
          await workspace
            .getByRole("button", { name: /^(라이브러리로 돌아가기|Back to library)$/ })
            .click()
          await expect(body).toHaveValue(draft)
          await expect(request).toHaveValue(compilerDraft)
          expect(
            await node.evaluate(
              (element) => element === document.getElementById("prompt-editor-body"),
            ),
          ).toBe(true)
        }

        await app.evaluate(({ ipcMain }, channel) => {
          const handlers = Reflect.get(ipcMain, "_invokeHandlers")
          if (!(handlers instanceof Map)) throw new Error("Missing IPC map")
          const original = handlers.get(channel)
          if (typeof original !== "function") throw new Error("Missing Insights handler")
          Reflect.set(globalThis, "__redesignInsightsOriginal", original)
          let first = true
          ipcMain.removeHandler(channel)
          ipcMain.handle(channel, (event, ...args) => {
            if (!first) return original(event, ...args)
            first = false
            return new Promise((_resolve, reject) =>
              Reflect.set(globalThis, "__redesignInsightsFail", () =>
                reject(new Error("Injected state matrix dashboard failure")),
              ),
            )
          })
        }, PERSISTENCE_CHANNELS.getDashboardSummary)
        try {
          await page.getByRole("button", { name: "Library Insights", exact: true }).click()
          await expect(page.getByText("Loading insights", { exact: true })).toBeVisible()
          record("insights-loading", { theme })
          await app.evaluate(() => {
            const fail = Reflect.get(globalThis, "__redesignInsightsFail")
            if (typeof fail !== "function") throw new Error("Missing pending Insights failure")
            fail()
          })
          await expect(page.getByText("Insights unavailable", { exact: true })).toBeVisible()
          record("insights-error", {
            theme,
            contrast: await renderedContrast(
              page.getByText("Insights unavailable", { exact: true }),
            ),
          })
          await page.getByRole("button", { name: "Retry insights", exact: true }).click()
          await expect(
            page.getByRole("heading", { name: "Library summary", exact: true }),
          ).toBeVisible()
          record("insights-retry", { theme, recovered: true })
        } finally {
          await app.evaluate(({ ipcMain }, channel) => {
            const fail = Reflect.get(globalThis, "__redesignInsightsFail")
            if (typeof fail === "function") fail()
            const original = Reflect.get(globalThis, "__redesignInsightsOriginal")
            if (typeof original !== "function") throw new Error("Missing original Insights handler")
            ipcMain.removeHandler(channel)
            ipcMain.handle(channel, original)
            Reflect.deleteProperty(globalThis, "__redesignInsightsOriginal")
            Reflect.deleteProperty(globalThis, "__redesignInsightsFail")
          }, PERSISTENCE_CHANNELS.getDashboardSummary)
        }
        await page.getByRole("button", { name: "Back to library", exact: true }).click()
        await expect(body).toHaveValue(draft)
        await clickMenu(app, "Lock Prompter")
        await expect(page.getByTestId("lock-screen")).toBeVisible()
        await expect(page.getByTestId("app-shell")).toHaveCount(0)
        await page.getByLabel("App-lock passphrase").fill("incorrect matrix passphrase")
        await page.getByRole("button", { name: "Unlock Prompter", exact: true }).click()
        const authenticationError = page.getByRole("alert").filter({ hasText: "not accepted" })
        await expect(authenticationError).toBeVisible()
        await expect(page.getByLabel("App-lock passphrase")).toBeFocused()
        const lockContrast = await renderedContrast(authenticationError)
        const screenshot = `.omo/evidence/redesign/${theme}-state-lock-error.png`
        await page.screenshot({ path: screenshot })
        actions.push({
          type: "screenshot",
          selector: '[data-testid="lock-screen"]',
          timestamp: new Date().toISOString(),
          result: screenshot,
        })
        record("lock-authentication-error", { theme, concealed: true, lockContrast })
        await page.getByLabel("App-lock passphrase").fill("redesign state passphrase")
        await page.getByRole("button", { name: "Unlock Prompter", exact: true }).click()
        await expect(body).toHaveValue(draft)
        await expect(request).toHaveValue(compilerDraft)

        await page.emulateMedia({ reducedMotion: "reduce" })
        const motion = await more.evaluate((element) => ({
          requested: matchMedia("(prefers-reduced-motion: reduce)").matches,
          transition: getComputedStyle(element).transitionDuration,
        }))
        expect(motion).toEqual({ requested: true, transition: "0s" })
        await app.evaluate(({ BrowserWindow }) => {
          const window = BrowserWindow.getAllWindows()[0]
          if (window === undefined) throw new Error("Missing zoom window")
          window.webContents.setZoomFactor(1.25)
        })
        await more.scrollIntoViewIfNeeded()
        const zoom = await page.getByTestId("app-shell").evaluate((element) => ({
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        }))
        expect(zoom.scrollWidth).toBeLessThanOrEqual(zoom.clientWidth + 1)
        await page
          .getByRole("button", { name: "프롬프트 컴파일", exact: true })
          .scrollIntoViewIfNeeded()
        await expect(
          page.getByRole("button", { name: "프롬프트 컴파일", exact: true }),
        ).toBeInViewport()
        record("zoom-reduced-motion", { theme, requestedZoom: 1.25, zoom, motion })
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0]?.webContents.setZoomFactor(1),
        )
        await page.emulateMedia({ reducedMotion: "no-preference" })

        await page.locator('[data-menu-action-target="open-settings"]').click()
        await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close())
        const confirmation = page.getByRole("alertdialog", {
          name: "저장하지 않은 변경",
          exact: true,
        })
        const cancel = confirmation.getByRole("button", { name: "취소", exact: true })
        await expect(cancel).toBeFocused()
        await page.keyboard.press("Shift+Tab")
        await expect(
          confirmation.getByRole("button", { name: "새 버전 저장", exact: true }),
        ).toBeFocused()
        await page.keyboard.press("Tab")
        await expect(cancel).toBeFocused()
        await clickMenu(app, "Close Active Panel")
        await expect(confirmation).toBeHidden()
        await expect(page.getByTestId("settings-workspace")).toBeVisible()
        await page
          .getByTestId("settings-workspace")
          .getByRole("button", { name: "라이브러리로 돌아가기", exact: true })
          .click()
        await expect(body).toHaveValue(draft)
        await expect(request).toHaveValue(compilerDraft)
        record("hidden-workspace-native-close", {
          theme,
          cancelInitiallyFocused: true,
          focusTrap: true,
          nativeCloseSafelyCancelsOwnedConfirmation: true,
          draftsRetained: true,
        })
      }
    } finally {
      await writeFile(
        ".omo/evidence/redesign/state-automation.json",
        JSON.stringify(
          {
            schemaVersion: 1,
            kind: "browser-automation",
            tool: "Playwright Electron",
            surface: "app",
            limitation:
              "Native content and app-scoped zoom/media checks, not decorated OS frame or OS-wide appearance change",
            actions,
          },
          null,
          2,
        ),
      )
    }
  })
})

test("approved redesign preserves real-window regions, theme contrast, menu keyboard and long drafts", async () => {
  test.setTimeout(90_000)
  await withPhase13Prompter("prompter-redesign-visual", async ({ app, page }) => {
    const actions: Array<{ type: string; selector: string; timestamp: string; result: unknown }> =
      []
    const record = (type: string, selector: string, result: unknown) =>
      actions.push({ type, selector, timestamp: new Date().toISOString(), result })
    await mkdir(".omo/evidence/redesign", { recursive: true })
    try {
      await seedWorkspace(page)
      const body = page.getByRole("textbox", { name: "Prompt editor body", exact: true })
      const longDraft = Array.from(
        { length: 600 },
        (_, index) =>
          `${index}: 긴 본문과 공백을 유지합니다. /projects/very-long-path/without-changing-data`,
      ).join("\n")
      await body.fill(longDraft)
      await page
        .getByRole("textbox", { name: "Original request", exact: true })
        .fill("독립된 컴파일 요청 초안")
      for (const theme of ["light", "dark"] as const) {
        await page.evaluate(
          async (appTheme) => window.prompter.settings.updateDefaults({ appTheme }),
          theme,
        )
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
        for (const size of [
          { width: 1180, height: 760 },
          { width: 1024, height: 720 },
        ]) {
          const frame = await app.evaluate(({ BrowserWindow }, requested) => {
            const window = BrowserWindow.getAllWindows()[0]
            if (window === undefined) throw new Error("Missing native window")
            window.setSize(requested.width, requested.height)
            window.center()
            window.show()
            window.focus()
            return { bounds: window.getBounds(), contentBounds: window.getContentBounds() }
          }, size)
          expect(frame.bounds.width).toBe(size.width)
          expect(frame.bounds.height).toBe(size.height)
          const regions = await page.evaluate(() => {
            const bounds = (selector: string) => {
              const node = document.querySelector<HTMLElement>(selector)
              if (node === null) throw new Error(`Missing ${selector}`)
              const box = node.getBoundingClientRect()
              return {
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
                right: box.right,
                bottom: box.bottom,
                scrollWidth: node.scrollWidth,
                clientWidth: node.clientWidth,
              }
            }
            return {
              shell: bounds('[data-testid="app-shell"]'),
              sidebar: bounds('[data-testid="left-sidebar"]'),
              list: bounds('[data-testid="prompt-library"]'),
              editor: bounds(".prompter-editor-surface"),
              compiler: bounds(".prompter-compiler-surface"),
              body: bounds("#prompt-editor-body"),
              width: innerWidth,
              height: innerHeight,
            }
          })
          for (const region of [
            regions.shell,
            regions.sidebar,
            regions.list,
            regions.editor,
            regions.compiler,
            regions.body,
          ]) {
            expect(region.width).toBeGreaterThan(0)
            expect(region.height).toBeGreaterThan(0)
            expect(region.right).toBeLessThanOrEqual(regions.width + 1)
            expect(region.bottom).toBeLessThanOrEqual(regions.height + 1)
            expect(region.scrollWidth).toBeLessThanOrEqual(region.clientWidth + 1)
          }
          expect(regions.editor.height).toBeGreaterThan(regions.compiler.height)
          expect(regions.editor.bottom).toBeLessThanOrEqual(regions.compiler.y)
          await expect(
            page.getByRole("button", { name: "프롬프트 컴파일", exact: true }),
          ).toBeInViewport({ ratio: 1 })
          await expect(
            page
              .getByTestId("prompt-editor")
              .getByRole("button", { name: "새 버전 저장", exact: true }),
          ).toBeInViewport({ ratio: 1 })
          await expect(body).toHaveValue(longDraft)
          const contrasts = await page.evaluate(() => {
            const root = getComputedStyle(document.documentElement)
            const luminance = (token: string) => {
              const raw = root.getPropertyValue(token).trim().replace("#", "")
              const value =
                raw.length === 3 ? [...raw].map((channel) => channel + channel).join("") : raw
              if (!/^[\da-f]{6}$/i.test(value))
                throw new Error(`Nonopaque sample ${token}: ${value}`)
              const channels = [0, 2, 4].map((offset) => {
                const channel = Number.parseInt(value.substring(offset, offset + 2), 16) / 255
                return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
              })
              return (
                (channels[0] ?? 0) * 0.2126 +
                (channels[1] ?? 0) * 0.7152 +
                (channels[2] ?? 0) * 0.0722
              )
            }
            return [
              ["--color-foreground", "--color-panel"],
              ["--color-muted", "--color-panel"],
              ["--color-on-accent", "--color-accent"],
            ].map(([foreground, background]) => {
              if (!foreground || !background) throw new Error("Missing contrast pair")
              const a = luminance(foreground),
                b = luminance(background)
              return {
                foreground,
                background,
                ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
              }
            })
          })
          for (const sample of contrasts) expect(sample.ratio).toBeGreaterThanOrEqual(4.5)
          record("assert", '[data-testid="app-shell"]', { theme, frame, regions, contrasts })
          const libraryScreenshot = `.omo/evidence/redesign/${theme}-${size.width}-library.png`
          await page.screenshot({ path: libraryScreenshot })
          record("screenshot", '[data-testid="app-shell"]', libraryScreenshot)
          await page.locator('[data-menu-action-target="open-settings"]').click()
          await expect(page.getByTestId("left-sidebar")).toBeVisible()
          const settings = page.getByTestId("settings-workspace")
          await expect(settings).toBeVisible()
          expect(await settings.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(
            true,
          )
          const settingsScreenshot = `.omo/evidence/redesign/${theme}-${size.width}-settings.png`
          await page.screenshot({ path: settingsScreenshot })
          record("screenshot", '[data-testid="settings-workspace"]', settingsScreenshot)
          await settings.getByRole("button", { name: "라이브러리로 돌아가기", exact: true }).click()
          await expect(body).toHaveValue(longDraft)
          await expect(
            page.getByRole("textbox", { name: "Original request", exact: true }),
          ).toHaveValue("독립된 컴파일 요청 초안")
          record(
            "assert",
            "#prompt-editor-body",
            "long editor and independent compiler drafts preserved through Settings",
          )
        }
      }
      const more = page
        .getByTestId("prompt-editor")
        .getByRole("button", { name: "더보기 ···", exact: true })
      await more.click()
      const menu = page.getByRole("menu", { name: "프롬프트 보조 동작" })
      await expect(menu.getByRole("menuitem", { name: "복제하여 저장", exact: true })).toBeFocused()
      await page.keyboard.press("End")
      await expect(menu.getByRole("menuitem", { name: "품질 검토", exact: true })).toBeFocused()
      await page.keyboard.press("Escape")
      await expect(more).toBeFocused()
      await expect(menu).toBeHidden()
      record("assert", '[aria-haspopup="menu"]', "More opens, roving End and Escape restore focus")
      await page.evaluate(async () =>
        window.prompter.settings.updateDefaults({ appTheme: "system" }),
      )
      const effective = await app.evaluate(({ nativeTheme }) =>
        nativeTheme.shouldUseDarkColors ? "dark" : "light",
      )
      await expect(page.locator("html")).toHaveAttribute("data-theme", effective)
      record("assert", "html[data-theme]", { preference: "system", effective })
    } finally {
      await writeFile(
        ".omo/evidence/redesign/native-automation.json",
        JSON.stringify(
          {
            schemaVersion: 1,
            kind: "browser-automation",
            tool: "Playwright Electron",
            surface: "app",
            limitation:
              "PNG captures native BrowserWindow content; window bounds recorded through main process, not a desktop-frame screenshot",
            actions,
          },
          null,
          2,
        ),
      )
      await app.evaluate(({ BrowserWindow }) => {
        for (const window of BrowserWindow.getAllWindows()) window.destroy()
      })
    }
  })
})
