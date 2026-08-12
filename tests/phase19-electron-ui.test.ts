import { access, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ElectronApplication, Page, TestInfo } from "@playwright/test"
import { expect, test } from "@playwright/test"

import { PERSISTENCE_CHANNELS } from "../electron/ipc-contract"
import { launchPrompter } from "./electron-playwright-helpers"
import {
  installPromptCompilerIpcRecorder,
  promptCompilerIpcSnapshot,
} from "./phase13-project-context-profiles-ui-helpers"

const viewports = [
  { width: 900, height: 720 },
  { width: 1280, height: 800 },
] as const
const testOnlyCandidate = "sk-proj-abcdefghijklmnopqrstuvwx"
const originalRequestText = `Review the test-only candidate ${testOnlyCandidate} without using it.`

type Phase19IpcCounts = {
  readonly prepareEncryptedBackup: number
  readonly savePreparedEncryptedBackup: number
  readonly scanLibrary: number
  readonly updatePrivacySettings: number
}

async function attachPng(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const path = testInfo.outputPath(name)
  await page.screenshot({ path })
  await testInfo.attach(name, { path, contentType: "image/png" })
}

async function installPhase19IpcRecorder(app: ElectronApplication): Promise<void> {
  await app.evaluate(
    ({ ipcMain }, channels) => {
      const handlers = Reflect.get(ipcMain, "_invokeHandlers")
      if (!(handlers instanceof Map)) {
        throw new TypeError("Electron IPC invoke handler map is required for Phase 19 recording")
      }

      const counts = {
        prepareEncryptedBackup: 0,
        savePreparedEncryptedBackup: 0,
        scanLibrary: 0,
        updatePrivacySettings: 0,
      }
      Reflect.set(globalThis, "__prompterPhase19IpcCounts", counts)

      function wrap(channel: string, key: keyof typeof counts): void {
        const handler = handlers.get(channel)
        if (typeof handler !== "function") {
          throw new TypeError(`Phase 19 IPC handler for ${channel} was not registered`)
        }
        ipcMain.removeHandler(channel)
        ipcMain.handle(channel, (event, payload: unknown) => {
          counts[key] += 1
          return Reflect.apply(handler, undefined, [event, payload])
        })
      }

      wrap(channels.prepareEncryptedBackup, "prepareEncryptedBackup")
      wrap(channels.savePreparedEncryptedBackup, "savePreparedEncryptedBackup")
      wrap(channels.scanLibrary, "scanLibrary")
      wrap(channels.updatePrivacySettings, "updatePrivacySettings")
    },
    {
      prepareEncryptedBackup: PERSISTENCE_CHANNELS.prepareEncryptedBackup,
      savePreparedEncryptedBackup: PERSISTENCE_CHANNELS.savePreparedEncryptedBackup,
      scanLibrary: PERSISTENCE_CHANNELS.scanLibraryPrivacy,
      updatePrivacySettings: PERSISTENCE_CHANNELS.updatePrivacySettings,
    },
  )
}

async function phase19IpcCounts(app: ElectronApplication): Promise<Phase19IpcCounts> {
  return app.evaluate(() => {
    const value = Reflect.get(globalThis, "__prompterPhase19IpcCounts")
    if (typeof value !== "object" || value === null) {
      throw new TypeError("Phase 19 IPC recorder was not installed")
    }
    const counts = {
      prepareEncryptedBackup: Reflect.get(value, "prepareEncryptedBackup"),
      savePreparedEncryptedBackup: Reflect.get(value, "savePreparedEncryptedBackup"),
      scanLibrary: Reflect.get(value, "scanLibrary"),
      updatePrivacySettings: Reflect.get(value, "updatePrivacySettings"),
    }
    if (Object.values(counts).some((count) => typeof count !== "number")) {
      throw new TypeError("Phase 19 IPC recorder has an invalid shape")
    }
    return counts
  })
}

test("Phase 19 privacy and encrypted-backup user flow stays manual and masked", async ({
  browserName: _browserName,
}, testInfo) => {
  test.setTimeout(120_000)
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-phase19-electron-ui-"))
  const run = await launchPrompter(userDataDirectory)
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  run.page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  run.page.on("pageerror", (error) => pageErrors.push(error.message))

  try {
    // Given: a fresh production app with recorders around every downstream action under test.
    await installPromptCompilerIpcRecorder(run.app)
    await installPhase19IpcRecorder(run.app)

    // When: Privacy Center opens and renders at both supported smoke viewports.
    const sidebar = run.page.getByTestId("left-sidebar")
    await sidebar.getByRole("button", { name: "Privacy Center" }).click()
    const privacyWorkspace = run.page.getByTestId("privacy-workspace")
    await expect(run.page.getByRole("heading", { name: "Privacy Center" })).toBeVisible()
    await expect(sidebar.getByRole("button", { name: "Privacy Center" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(await phase19IpcCounts(run.app)).toEqual({
      prepareEncryptedBackup: 0,
      savePreparedEncryptedBackup: 0,
      scanLibrary: 0,
      updatePrivacySettings: 0,
    })

    // Then: the workspace spans both content columns while the sidebar itself never overflows.
    for (const viewport of viewports) {
      await run.page.setViewportSize(viewport)
      await expect(sidebar).toBeVisible()
      await expect(privacyWorkspace).toBeVisible()
      const layout = await run.page.evaluate(() => {
        const grid = document.querySelector<HTMLElement>(".prompter-shell-grid")
        const sidebarElement = document.querySelector<HTMLElement>('[data-testid="left-sidebar"]')
        const workspace = document.querySelector<HTMLElement>('[data-testid="privacy-workspace"]')
        if (grid === null || sidebarElement === null || workspace === null) {
          throw new TypeError(
            "Phase 19 workspace geometry requires the shell, sidebar, and workspace",
          )
        }
        return {
          gridWidth: grid.getBoundingClientRect().width,
          sidebarClientWidth: sidebarElement.clientWidth,
          sidebarScrollWidth: sidebarElement.scrollWidth,
          sidebarWidth: sidebarElement.getBoundingClientRect().width,
          workspaceWidth: workspace.getBoundingClientRect().width,
        }
      })
      expect(layout.sidebarScrollWidth).toBeLessThanOrEqual(layout.sidebarClientWidth)
      expect(layout.workspaceWidth).toBeGreaterThan(layout.sidebarWidth * 3)
      expect(
        Math.abs(layout.gridWidth - layout.sidebarWidth - 16 - layout.workspaceWidth),
      ).toBeLessThanOrEqual(1)
      await attachPng(
        run.page,
        testInfo,
        `phase19-privacy-center-${viewport.width}x${viewport.height}.png`,
      )
    }

    // When: the local library scan and one settings mutation are explicitly requested.
    await run.page.setViewportSize({ width: 1280, height: 800 })
    const libraryScan = run.page
      .getByRole("heading", { name: "Library privacy scan" })
      .locator('xpath=ancestor::*[@data-testid="ui-card"]')
    await expect(libraryScan).toContainText("No scan has run")
    await libraryScan.getByRole("button", { name: "Scan library now" }).click()
    await expect(libraryScan.getByRole("status")).toContainText("0 finding(s)")
    await expect.poll(async () => (await phase19IpcCounts(run.app)).scanLibrary).toBe(1)

    const exportWarning = run.page.getByRole("checkbox", { name: "Warn before exports" })
    await expect(exportWarning).toBeChecked()
    await exportWarning.uncheck()
    expect((await phase19IpcCounts(run.app)).updatePrivacySettings).toBe(0)
    await run.page.getByRole("button", { name: "Save privacy settings" }).click()
    await expect(run.page.getByText("Privacy settings saved.")).toBeVisible()
    await expect.poll(async () => (await phase19IpcCounts(run.app)).updatePrivacySettings).toBe(1)
    expect(await run.page.evaluate(() => window.prompter.privacy.getSettings())).toMatchObject({
      warnBeforeExport: false,
    })
    await run.page.getByRole("button", { name: "Back to library" }).click()
    await sidebar.getByRole("button", { name: "Privacy Center" }).click()
    await expect(run.page.getByRole("checkbox", { name: "Warn before exports" })).not.toBeChecked()
    await run.page.getByRole("button", { name: "Back to library" }).click()

    // When: a test-only key-shaped draft is scanned from the Library compiler.
    const originalRequest = run.page.getByRole("textbox", { name: "Original request" })
    await originalRequest.fill(originalRequestText)
    const draftScan = run.page
      .getByRole("heading", { name: "Sensitive information scan" })
      .locator('xpath=ancestor::*[@data-testid="ui-card"]')
    await expect(draftScan).toContainText("No scan has run")
    await expect(draftScan).not.toContainText("OpenAI API key candidate")
    await draftScan.getByRole("button", { name: "Run privacy scan" }).click()
    await expect(draftScan).toContainText("OpenAI API key candidate")
    await expect(draftScan).toContainText("sk-proj-...uvwx")
    await expect(draftScan).not.toContainText(testOnlyCandidate)
    await expect(originalRequest).toHaveValue(originalRequestText)
    await draftScan.scrollIntoViewIfNeeded()
    await attachPng(run.page, testInfo, "phase19-draft-masked-finding.png")

    // When: Analyze reaches the privacy gate, then the user cancels the safe modal path.
    expect(await promptCompilerIpcSnapshot(run.app)).toMatchObject({ analyze: 0, compile: 0 })
    await run.page.getByRole("button", { name: /^(?:Analyze with LLM|분석하기)$/ }).click()
    const warningDialog = run.page.getByRole("alertdialog", {
      name: "Sensitive content needs review",
    })
    await expect(warningDialog).toBeVisible()
    await expect(warningDialog.getByRole("button", { name: "Cancel and review" })).toBeFocused()
    await expect(warningDialog).toContainText("sk-proj-...uvwx")
    await expect(warningDialog).not.toContainText(testOnlyCandidate)
    expect(await promptCompilerIpcSnapshot(run.app)).toMatchObject({ analyze: 1, compile: 0 })
    await attachPng(run.page, testInfo, "phase19-llm-warning-dialog.png")
    await warningDialog.getByRole("button", { name: "Cancel and review" }).click()
    await expect(warningDialog).toBeHidden()
    expect(await promptCompilerIpcSnapshot(run.app)).toMatchObject({ analyze: 1, compile: 0 })

    // When: encrypted full-backup preparation opens, mismatched confirmation blocks saving.
    const encryptedBackupButton = sidebar.getByRole("button", {
      name: "Export encrypted full backup",
    })
    await encryptedBackupButton.scrollIntoViewIfNeeded()
    await encryptedBackupButton.click()
    const backupDialog = run.page.getByRole("alertdialog", { name: "Encrypted full backup" })
    await expect(backupDialog).toBeVisible()
    await expect(backupDialog.getByRole("button", { name: "Cancel export" })).toBeFocused()
    const recoveryWarning = backupDialog.getByText(
      "Prompter cannot recover this passphrase. Store it somewhere safe before saving.",
      { exact: true },
    )
    await expect(recoveryWarning).toBeVisible()
    await expect(backupDialog).toContainText("No sensitive findings were detected")
    for (const viewport of viewports) {
      await run.page.setViewportSize(viewport)
      await expect(recoveryWarning).toBeInViewport()
      const warningLayout = await recoveryWarning.evaluate((element) => ({
        clientHeight: element.clientHeight,
        clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight,
        scrollWidth: element.scrollWidth,
      }))
      expect(warningLayout.scrollHeight).toBeLessThanOrEqual(warningLayout.clientHeight)
      expect(warningLayout.scrollWidth).toBeLessThanOrEqual(warningLayout.clientWidth)
      await attachPng(
        run.page,
        testInfo,
        `phase19-encrypted-backup-dialog-${viewport.width}x${viewport.height}.png`,
      )
    }
    await run.page.setViewportSize({ width: 1280, height: 800 })
    await backupDialog.getByLabel("passphrase", { exact: true }).fill("phase19-test-only-a")
    await backupDialog.getByLabel("confirm passphrase", { exact: true }).fill("phase19-test-only-b")
    await backupDialog.getByRole("button", { name: "Save encrypted backup" }).click()
    await expect(backupDialog.getByRole("alert")).toContainText("must match exactly")
    expect(await phase19IpcCounts(run.app)).toMatchObject({
      prepareEncryptedBackup: 1,
      savePreparedEncryptedBackup: 0,
    })
    await attachPng(run.page, testInfo, "phase19-encrypted-backup-dialog-error.png")
    await run.page.keyboard.press("Escape")
    await expect(backupDialog).toBeHidden()
    expect(await phase19IpcCounts(run.app)).toMatchObject({ savePreparedEncryptedBackup: 0 })
    expect(consoleErrors).toEqual([])
    expect(pageErrors).toEqual([])
  } finally {
    await run.app.close()
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
