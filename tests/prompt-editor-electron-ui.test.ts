import { access, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ElectronApplication, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

import { PERSISTENCE_CHANNELS } from "../electron/ipc-contract"
import { launchPrompter, type RunningApp } from "./electron-playwright-helpers"

const originalBody = "Saved current editor body"
const historicalBody = "Saved historical editor body"
const editedBody = "  Edited directly, not compiled.\n\n\tKeep this indentation.  \n"
const projectName = "Editor fixture project"
const promptName = "Editor fixture prompt"
const otherProjectName = "Other editor project"
const otherPromptName = "Other editor prompt"

type EditorFixture = RunningApp & { readonly relaunch: () => Promise<RunningApp> }

// Every launch, including persistence inspection after native close, uses the same owned temp DB.
async function withEditorFixture(callback: (fixture: EditorFixture) => Promise<void>) {
  await access("dist-electron/main.cjs")
  const directory = await mkdtemp(join(tmpdir(), "prompter-prompt-editor-"))
  let running: RunningApp | null = null
  const dispose = async () => {
    if (running === null || running.app.process().exitCode !== null) return
    // Teardown must not wait for an unsaved-change dialog when an assertion fails.
    await running.app.evaluate(({ BrowserWindow }) => {
      for (const window of BrowserWindow.getAllWindows()) window.destroy()
    })
    await running.app.close()
  }
  try {
    running = await launchPrompter(directory)
    await callback({
      ...running,
      relaunch: async () => {
        await dispose()
        running = await launchPrompter(directory)
        return running
      },
    })
  } finally {
    try {
      await dispose()
    } finally {
      await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
    }
  }
}

function editor(page: Page) {
  return page.getByTestId("prompt-editor")
}

function body(page: Page) {
  return page.getByRole("textbox", { name: "Prompt editor body", exact: true })
}

function guard(page: Page) {
  return page.getByRole("alertdialog", { name: "저장하지 않은 변경", exact: true })
}

async function selectOriginal(page: Page) {
  await page
    .getByTestId("left-sidebar")
    .getByRole("button", { name: new RegExp(projectName) })
    .click()
  await page
    .getByTestId("prompt-library")
    .getByRole("button", { name: new RegExp(promptName) })
    .click()
  await expect(editor(page).getByRole("heading", { name: promptName, exact: true })).toBeVisible()
  await expect(body(page)).toHaveValue(originalBody)
}

async function seedEditor(page: Page) {
  const ids = await page.evaluate(
    async ({
      projectName,
      promptName,
      otherProjectName,
      otherPromptName,
      originalBody,
      historicalBody,
    }) => {
      const project = await window.prompter.projects.create({
        name: projectName,
        techStack: "TypeScript",
        defaultAgent: "codex",
      })
      const first = await window.prompter.prompts.createWithInitialVersion({
        projectId: project.id,
        title: promptName,
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "Keep the source request unchanged",
        compiledPrompt: historicalBody,
        acceptanceCriteria: "Preserve editor whitespace",
        validationCommands: "manual verification",
      })
      await window.prompter.prompts.createNextVersion({
        promptAssetId: first.asset.id,
        originalInput: first.version.originalInput,
        compiledPrompt: originalBody,
        acceptanceCriteria: first.version.acceptanceCriteria,
        validationCommands: first.version.validationCommands,
        makeCurrent: true,
      })
      await window.prompter.prompts.createWithInitialVersion({
        projectId: project.id,
        title: otherPromptName,
        scenario: "bugfix",
        targetAgent: "codex",
        originalInput: "Other source request",
        compiledPrompt: "Other prompt body",
      })
      const otherProject = await window.prompter.projects.create({
        name: otherProjectName,
        techStack: "TypeScript",
        defaultAgent: "codex",
      })
      await window.prompter.prompts.createWithInitialVersion({
        projectId: otherProject.id,
        title: "Other project prompt",
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "Other project request",
        compiledPrompt: "Other project body",
      })
      return { projectId: project.id, assetId: first.asset.id }
    },
    { projectName, promptName, otherProjectName, otherPromptName, originalBody, historicalBody },
  )
  await page.reload()
  await selectOriginal(page)
  return ids
}

async function storedPrompt(page: Page, assetId: string) {
  return page.evaluate(async (id) => {
    const asset = await window.prompter.prompts.getAsset(id)
    const versions = await window.prompter.prompts.listVersions(id)
    const current = await window.prompter.prompts.getCurrentVersion(id)
    return { asset, versions, current }
  }, assetId)
}

// ContextBridge methods are immutable. Inject at the existing main-process IPC harness boundary,
// retaining the real handlers for every successful call and explicitly restoring them afterward.
async function interceptEditorIpc(app: ElectronApplication, failSave = false) {
  await app.evaluate(
    ({ ipcMain }, { channels, failSave }) => {
      const handlers = Reflect.get(ipcMain, "_invokeHandlers")
      if (!(handlers instanceof Map)) throw new Error("Expected Electron IPC handlers")
      const originals = new Map()
      const calls: string[] = []
      Reflect.set(globalThis, "__promptEditorOriginalHandlers", originals)
      Reflect.set(globalThis, "__promptEditorCalls", calls)
      for (const channel of channels) {
        const handler = handlers.get(channel)
        if (typeof handler !== "function") throw new Error(`Missing IPC handler: ${channel}`)
        originals.set(channel, handler)
        ipcMain.removeHandler(channel)
        ipcMain.handle(channel, (event, ...args) => {
          calls.push(channel)
          if (failSave && channel === channels[0]) throw new Error("Injected editor save failure")
          return handler(event, ...args)
        })
      }
    },
    {
      channels: [
        PERSISTENCE_CHANNELS.createNextPromptVersion,
        PERSISTENCE_CHANNELS.promptCompilerAnalyze,
        PERSISTENCE_CHANNELS.promptCompilerCompile,
      ],
      failSave,
    },
  )
}

async function restoreEditorIpc(app: ElectronApplication) {
  await app.evaluate(({ ipcMain }) => {
    const originals = Reflect.get(globalThis, "__promptEditorOriginalHandlers")
    if (!(originals instanceof Map)) throw new Error("Editor IPC injection was not installed")
    for (const [channel, handler] of originals) {
      ipcMain.removeHandler(channel)
      ipcMain.handle(channel, handler)
    }
    Reflect.deleteProperty(globalThis, "__promptEditorOriginalHandlers")
    Reflect.deleteProperty(globalThis, "__promptEditorCalls")
  })
}

async function editorIpcCalls(app: ElectronApplication): Promise<string[]> {
  return app.evaluate(() => {
    const calls = Reflect.get(globalThis, "__promptEditorCalls")
    if (!Array.isArray(calls)) throw new Error("Editor IPC recorder was not installed")
    return calls
  })
}

async function expectGuardChoices(page: Page) {
  await expect(guard(page)).toBeVisible()
  await expect(guard(page).getByRole("button", { name: "취소", exact: true })).toBeFocused()
  for (const name of ["취소", "변경 버리기", "새 버전 저장"]) {
    await expect(guard(page).getByRole("button", { name, exact: true })).toBeEnabled()
  }
}

test("direct copy preserves edited whitespace without compilation; Cmd+S saves once", async () => {
  await withEditorFixture(async ({ app, page }) => {
    const { assetId } = await seedEditor(page)
    const before = await storedPrompt(page, assetId)
    const clipboardBefore = await app.evaluate(({ clipboard }) => clipboard.readText())
    await interceptEditorIpc(app)
    try {
      await body(page).fill(editedBody)
      await editor(page).getByRole("button", { name: "복사", exact: true }).click()
      await expect(editor(page).getByRole("status")).toHaveText("복사했습니다.")
      expect(
        await page.evaluate(async () => (await window.prompter.clipboard.readText()).text),
      ).toBe(editedBody)
      expect(await storedPrompt(page, assetId)).toEqual(before)
      expect(await editorIpcCalls(app)).toEqual([])

      await body(page).press("Meta+s")
      await expect(editor(page).getByRole("status")).toHaveText("저장했습니다.")
      const saved = await storedPrompt(page, assetId)
      expect(saved.versions).toHaveLength(3)
      expect(saved.current?.compiledPrompt).toBe(editedBody)
      expect(saved.current?.versionNumber).toBe(3)
      expect(saved.asset?.currentVersionId).toBe(saved.current?.id)
      expect(saved.current?.originalInput).toBe(before.current?.originalInput)
      expect(saved.current?.acceptanceCriteria).toBe(before.current?.acceptanceCriteria)
      expect(saved.current?.validationCommands).toBe(before.current?.validationCommands)
      await expect(
        editor(page).getByRole("button", { name: "새 버전 저장", exact: true }),
      ).toBeDisabled()
      await body(page).press("Meta+s")
      // A following bridge read observes the unchanged database after the repeated shortcut.
      expect(await storedPrompt(page, assetId)).toEqual(saved)
      expect(await editorIpcCalls(app)).toEqual([PERSISTENCE_CHANNELS.createNextPromptVersion])
    } finally {
      await restoreEditorIpc(app)
      await app.evaluate(({ clipboard }, text) => clipboard.writeText(text), clipboardBefore)
    }
  })
})

test("compiler application explicitly replaces dirty editing but never auto-saves", async () => {
  await withEditorFixture(async ({ page }) => {
    const { assetId } = await seedEditor(page)
    const before = await storedPrompt(page, assetId)
    await page
      .getByRole("textbox", { name: "Original request", exact: true })
      .fill("Explicit compiler application request")
    await page.getByRole("button", { name: "프롬프트 컴파일", exact: true }).click()
    const preview = page.getByRole("textbox", { name: "Generated prompt preview", exact: true })
    await expect(preview).toContainText("# Objective")
    const appliedBody = "  Explicitly applied preview.\n\nKeep exact whitespace.  \n"
    await preview.fill(appliedBody)
    await body(page).fill(editedBody)
    await page.getByRole("button", { name: "편집에 적용", exact: true }).click()
    const replacement = page.getByRole("alertdialog", { name: "편집 내용 교체", exact: true })
    await expect(replacement.getByRole("button", { name: "취소", exact: true })).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(body(page)).toHaveValue(editedBody)
    expect(await storedPrompt(page, assetId)).toEqual(before)
    await page.getByRole("button", { name: "편집에 적용", exact: true }).click()
    await replacement.getByRole("button", { name: "교체하여 적용", exact: true }).click()
    await expect(body(page)).toHaveValue(appliedBody)
    expect(await storedPrompt(page, assetId)).toEqual(before)
    await editor(page).getByRole("button", { name: "새 버전 저장", exact: true }).click()
    await expect(editor(page).getByRole("status")).toHaveText("저장했습니다.")
    const saved = await storedPrompt(page, assetId)
    expect(saved.current?.compiledPrompt).toBe(appliedBody)
    expect(saved.current?.originalInput).toBe("Explicit compiler application request")
    expect(saved.versions).toHaveLength(before.versions.length + 1)
  })
})

test("edited duplicate requires a title, copies the draft, and leaves the original unchanged", async () => {
  await withEditorFixture(async ({ page }) => {
    const { assetId, projectId } = await seedEditor(page)
    const before = await storedPrompt(page, assetId)
    await editor(page).getByRole("button", { name: "태그 편집", exact: true }).click()
    await expect(page.getByRole("textbox", { name: "Prompt tag name", exact: true })).toBeFocused()
    await body(page).fill(editedBody)
    await editor(page).getByRole("button", { name: "복제하여 저장", exact: true }).click()
    const dialog = page.getByRole("alertdialog", { name: "복제하여 저장", exact: true })
    await dialog.getByLabel("복제본 제목 (필수)").fill("  ")
    await dialog.getByRole("button", { name: "복제하여 저장", exact: true }).click()
    await expect(dialog.getByRole("alert")).toHaveText("복제본의 제목을 입력하세요.")
    expect(await storedPrompt(page, assetId)).toEqual(before)
    expect(
      await page.evaluate((id) => window.prompter.prompts.listAssets({ projectId: id }), projectId),
    ).toHaveLength(2)
    await dialog.getByLabel("복제본 제목 (필수)").fill("Edited independent duplicate")
    await dialog.getByRole("button", { name: "다시 복제", exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(
      editor(page).getByRole("heading", { name: "Edited independent duplicate" }),
    ).toBeVisible()
    await expect(body(page)).toHaveValue(editedBody)
    const duplicate = await page.evaluate(async (id) => {
      const assets = await window.prompter.prompts.listAssets({ projectId: id })
      const asset = assets.find((item) => item.title === "Edited independent duplicate")
      if (asset === undefined) throw new Error("Missing persisted duplicate")
      return { asset, versions: await window.prompter.prompts.listVersions(asset.id) }
    }, projectId)
    expect(duplicate.asset.id).not.toBe(assetId)
    expect(duplicate.asset.scenario).toBe(before.asset?.scenario)
    expect(duplicate.asset.targetAgent).toBe(before.asset?.targetAgent)
    expect(duplicate.versions).toHaveLength(1)
    expect(duplicate.versions[0]?.compiledPrompt).toBe(editedBody)
    expect(duplicate.versions[0]?.originalInput).toBe(before.current?.originalInput)
    expect(duplicate.versions[0]?.acceptanceCriteria).toBe(before.current?.acceptanceCriteria)
    expect(await storedPrompt(page, assetId)).toEqual(before)
  })
})

for (const destination of ["prompt", "project", "history"] as const) {
  test(`${destination} switching offers Save/Discard/Cancel; Escape retains the draft`, async () => {
    await withEditorFixture(async ({ page }) => {
      const { assetId } = await seedEditor(page)
      const before = await storedPrompt(page, assetId)
      const switchSelection = async () => {
        if (destination === "prompt") {
          await page
            .getByTestId("prompt-library")
            .getByRole("button", {
              name: new RegExp(otherPromptName),
            })
            .click()
        } else if (destination === "project") {
          await page
            .getByTestId("left-sidebar")
            .getByRole("button", {
              name: new RegExp(otherProjectName),
            })
            .click()
        } else {
          await page.getByRole("button", { name: "Version 1", exact: true }).click()
        }
      }
      const expectDestination = async () => {
        await expect(guard(page)).toHaveCount(0)
        await expect(body(page)).toHaveValue(
          destination === "history"
            ? historicalBody
            : destination === "prompt"
              ? "Other prompt body"
              : "Other project body",
        )
      }
      await body(page).fill(editedBody)
      for (const cancel of ["escape", "button"] as const) {
        await switchSelection()
        await expectGuardChoices(page)
        if (cancel === "escape") await page.keyboard.press("Escape")
        else await guard(page).getByRole("button", { name: "취소", exact: true }).click()
        await expect(guard(page)).toHaveCount(0)
        await expect(body(page)).toHaveValue(editedBody)
        await expect(
          editor(page).getByRole("heading", { name: promptName, exact: true }),
        ).toBeVisible()
        expect(await storedPrompt(page, assetId)).toEqual(before)
      }
      await switchSelection()
      await expectGuardChoices(page)
      await guard(page).getByRole("button", { name: "변경 버리기", exact: true }).click()
      await expectDestination()
      expect(await storedPrompt(page, assetId)).toEqual(before)
      await selectOriginal(page)
      await body(page).fill(editedBody)
      await switchSelection()
      await expectGuardChoices(page)
      await guard(page).getByRole("button", { name: "새 버전 저장", exact: true }).click()
      await expectDestination()
      const saved = await storedPrompt(page, assetId)
      expect(saved.versions).toHaveLength(3)
      expect(saved.current?.compiledPrompt).toBe(editedBody)
      expect(saved.asset?.currentVersionId).toBe(saved.current?.id)
      expect(saved.versions.find((version) => version.versionNumber === 1)?.compiledPrompt).toBe(
        historicalBody,
      )
      expect(saved.versions.find((version) => version.versionNumber === 2)?.compiledPrompt).toBe(
        originalBody,
      )
    })
  })
}

test("injected bridge save failure retains selection and draft; restored bridge saves on retry", async () => {
  await withEditorFixture(async ({ app, page }) => {
    const { assetId } = await seedEditor(page)
    const before = await storedPrompt(page, assetId)
    await body(page).fill(editedBody)
    await interceptEditorIpc(app, true)
    try {
      await page
        .getByTestId("prompt-library")
        .getByRole("button", {
          name: new RegExp(otherPromptName),
        })
        .click()
      await expectGuardChoices(page)
      await guard(page).getByRole("button", { name: "새 버전 저장", exact: true }).click()
      await expect(guard(page).getByRole("alert")).toContainText("저장하지 못했습니다.")
      await expect(
        guard(page).getByRole("button", { name: "다시 저장", exact: true }),
      ).toBeEnabled()
      // The editor is inert behind the modal; inspect its value rather than bypassing the guard.
      await expect(page.locator('[aria-label="Prompt editor body"]')).toHaveValue(editedBody)
      await expect(
        editor(page).getByRole("heading", { name: promptName, exact: true, includeHidden: true }),
      ).toHaveCount(1)
      expect(await storedPrompt(page, assetId)).toEqual(before)
      expect(await editorIpcCalls(app)).toEqual([PERSISTENCE_CHANNELS.createNextPromptVersion])
    } finally {
      await restoreEditorIpc(app)
    }
    await guard(page).getByRole("button", { name: "다시 저장", exact: true }).click()
    await expect(guard(page)).toHaveCount(0)
    await expect(body(page)).toHaveValue("Other prompt body")
    const saved = await storedPrompt(page, assetId)
    expect(saved.versions).toHaveLength(3)
    expect(saved.current?.compiledPrompt).toBe(editedBody)
  })
})

for (const destination of ["same prompt", "other prompt"] as const) {
  test(`compiler saves ${destination} output while earlier refreshes remain pending`, async () => {
    await withEditorFixture(async ({ app, page }) => {
      const { assetId } = await seedEditor(page)
      await interceptEditorIpc(app)
      await app.evaluate(({ ipcMain }, channel) => {
        const handlers = Reflect.get(ipcMain, "_invokeHandlers")
        if (!(handlers instanceof Map)) throw new Error("Expected Electron IPC handlers")
        const original = handlers.get(channel)
        if (typeof original !== "function") throw new Error("Missing rebuild handler")
        Reflect.set(globalThis, "__compilerRefreshHandler", original)
        Reflect.set(globalThis, "__compilerRefreshCalls", 0)
        ipcMain.removeHandler(channel)
        ipcMain.handle(channel, (event, ...args) => {
          const calls = Number(Reflect.get(globalThis, "__compilerRefreshCalls")) + 1
          Reflect.set(globalThis, "__compilerRefreshCalls", calls)
          if (calls <= 2) throw new Error("Injected post-save refresh failure")
          return original(event, ...args)
        })
      }, PERSISTENCE_CHANNELS.rebuildSearchIndex)
      try {
        const compiler = page.getByTestId("prompt-compiler")
        const compileAndSave = async (text: string) => {
          await compiler.getByRole("textbox", { name: "Original request" }).fill(text)
          await compiler.getByRole("button", { name: "프롬프트 컴파일", exact: true }).click()
          const preview = compiler.getByRole("textbox", { name: "Generated prompt preview" })
          await expect(preview).toContainText(text)
          await preview.fill(`# Objective\n${text}`)
          await compiler.getByRole("button", { name: "Save as new version", exact: true }).click()
          await expect(compiler.getByText(/버전은 저장됐지만 목록·태그 갱신/)).toBeVisible()
        }
        await compileAndSave("First committed output")
        expect((await storedPrompt(page, assetId)).versions).toHaveLength(3)
        let targetId = assetId
        if (destination === "other prompt") {
          await page
            .getByTestId("prompt-library")
            .getByRole("button", { name: new RegExp(otherPromptName) })
            .click()
          targetId = await page.evaluate(async () => {
            const projects = await window.prompter.projects.list()
            const project = projects.find((item) => item.name === "Editor fixture project")
            if (!project) throw new Error("Missing fixture project")
            const assets = await window.prompter.prompts.listAssets({ projectId: project.id })
            const target = assets.find((item) => item.title === "Other editor prompt")
            if (!target) throw new Error("Missing target prompt")
            return target.id
          })
        }
        await compileAndSave("Second committed output")
        const saved = await storedPrompt(page, targetId)
        expect(saved.current?.compiledPrompt).toBe("# Objective\nSecond committed output")
        expect(saved.versions).toHaveLength(destination === "same prompt" ? 4 : 2)
        const retry = compiler.getByRole("button", {
          name: "저장 후 목록·태그 갱신 재시도",
          exact: true,
        })
        await expect(retry).toBeVisible()
        await retry.click()
        await expect(retry).toHaveCount(0)
        expect(await storedPrompt(page, targetId)).toEqual(saved)
        expect(
          (await editorIpcCalls(app)).filter(
            (channel) => channel === PERSISTENCE_CHANNELS.createNextPromptVersion,
          ),
        ).toHaveLength(2)
        expect(await app.evaluate(() => Reflect.get(globalThis, "__compilerRefreshCalls"))).toBe(4)
      } finally {
        await app.evaluate(({ ipcMain }, channel) => {
          const original = Reflect.get(globalThis, "__compilerRefreshHandler")
          if (typeof original !== "function") throw new Error("Missing original rebuild handler")
          ipcMain.removeHandler(channel)
          ipcMain.handle(channel, original)
          Reflect.deleteProperty(globalThis, "__compilerRefreshHandler")
          Reflect.deleteProperty(globalThis, "__compilerRefreshCalls")
        }, PERSISTENCE_CHANNELS.rebuildSearchIndex)
        await restoreEditorIpc(app)
      }
    })
  })
}

test("native BrowserWindow.close cancellation retains a live dirty editor; save closes and persists", async () => {
  await withEditorFixture(async ({ app, page, relaunch }) => {
    const { assetId } = await seedEditor(page)
    const before = await storedPrompt(page, assetId)
    await body(page).fill(editedBody)
    const requestNativeClose = () =>
      app.evaluate(({ BrowserWindow }) => {
        const window = BrowserWindow.getAllWindows()[0]
        if (window === undefined) throw new Error("Missing native editor window")
        window.close()
      })
    await requestNativeClose()
    await expectGuardChoices(page)
    await guard(page).getByRole("button", { name: "취소", exact: true }).click()
    await expect(guard(page)).toHaveCount(0)
    expect(page.isClosed()).toBe(false)
    expect(
      await app.evaluate(
        ({ BrowserWindow }) =>
          BrowserWindow.getAllWindows().filter((window) => !window.isDestroyed()).length,
      ),
    ).toBe(1)
    await expect(body(page)).toHaveValue(editedBody)
    expect(await storedPrompt(page, assetId)).toEqual(before)

    await requestNativeClose()
    await expectGuardChoices(page)
    const closed = page.waitForEvent("close")
    await guard(page).getByRole("button", { name: "새 버전 저장", exact: true }).click()
    await closed
    expect(page.isClosed()).toBe(true)
    const reopened = await relaunch()
    const saved = await storedPrompt(reopened.page, assetId)
    expect(saved.versions).toHaveLength(3)
    expect(saved.current?.compiledPrompt).toBe(editedBody)
    expect(saved.asset?.currentVersionId).toBe(saved.current?.id)
  })
})

test("root editor provider preserves dirty text through app lock and unlock", async () => {
  await withEditorFixture(async ({ app, page }) => {
    const { assetId } = await seedEditor(page)
    const before = await storedPrompt(page, assetId)
    await body(page).fill(editedBody)
    await page.locator('[data-menu-action-target="open-settings"]').click()
    await page.getByRole("button", { name: "Enable app lock", exact: true }).click()
    await page
      .getByRole("textbox", { name: "New passphrase", exact: true })
      .fill("editor fixture lock passphrase")
    await page
      .getByRole("textbox", { name: "Confirm new passphrase", exact: true })
      .fill("editor fixture lock passphrase")
    await page.getByRole("button", { name: "Enable app lock", exact: true }).click()
    await page.getByRole("button", { name: "Lock Prompter now", exact: true }).click()
    await expect(page.getByRole("main", { name: "Prompter locked" })).toBeVisible()
    await expect(page.getByTestId("app-shell")).toHaveCount(0)
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close())
    const lockedClose = page.getByRole("alertdialog", { name: "저장하지 않은 변경" })
    await expect(
      lockedClose.getByRole("button", { name: "새 버전 저장", exact: true }),
    ).toBeDisabled()
    await expect(
      lockedClose.getByRole("button", { name: "변경 버리기", exact: true }),
    ).toBeDisabled()
    await lockedClose.getByRole("button", { name: "취소", exact: true }).click()
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1)
    await page.getByLabel("App-lock passphrase").fill("editor fixture lock passphrase")
    await page.getByRole("button", { name: "Unlock Prompter", exact: true }).click()
    await expect(page.getByTestId("app-shell")).toBeVisible()
    await expect(body(page)).toHaveValue(editedBody)
    await expect(editor(page).getByText("저장하지 않은 변경 있음", { exact: true })).toBeVisible()
    expect(await storedPrompt(page, assetId)).toEqual(before)
    await editor(page).getByRole("button", { name: "새 버전 저장", exact: true }).click()
    await expect(editor(page).getByRole("status")).toHaveText("저장했습니다.")
    expect((await storedPrompt(page, assetId)).current?.compiledPrompt).toBe(editedBody)
  })
})
