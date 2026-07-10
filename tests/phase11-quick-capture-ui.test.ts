import { access, mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ElectronApplication, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

import { createNamedProject, launchPrompter, type RunningApp } from "./electron-playwright-helpers"

type ProjectCallback = (run: RunningApp) => Promise<void>

const quickCaptureActionName = "Import from Clipboard"
const originalRequestName = "Original request"

async function withPrompterProject(
  projectName: string,
  callback: ProjectCallback,
  extraEnv: Readonly<Record<string, string>> = {},
): Promise<void> {
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), `${projectName}-`))
  let run: RunningApp | null = null

  try {
    run = await launchPrompter(userDataDirectory, extraEnv)
    await createNamedProject(run.page, projectName)
    await callback(run)
  } finally {
    await run?.app.close()
    await rm(userDataDirectory, { recursive: true, force: true })
  }
}

async function setClipboardText(app: ElectronApplication, text: string): Promise<void> {
  await app.evaluate(({ clipboard }, value) => {
    clipboard.writeText(value)
  }, text)
}

function importButton(page: Page) {
  return page.getByRole("button", { name: quickCaptureActionName })
}

async function clickImportButton(page: Page): Promise<void> {
  await expect(importButton(page)).toBeVisible()
  await importButton(page).click()
}

function originalRequest(page: Page) {
  return page.getByRole("textbox", { name: originalRequestName })
}

async function storedPromptCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const prompts = await window.prompter.prompts.listAssets()

    return prompts.length
  })
}

test("imports exact clipboard text from the button without LLM or persistence", async () => {
  await withPrompterProject("prompter-phase11-button", async ({ app, page }) => {
    const clipboardText = "Line one\n\nKeep    spacing and symbols <> 그대로."

    await setClipboardText(app, clipboardText)
    await clickImportButton(page)

    await expect(originalRequest(page)).toHaveValue(clipboardText)
    await expect(originalRequest(page)).toBeFocused()
    await expect(page.getByText("Clipboard text imported.")).toBeVisible()
    await expect(
      page.getByText("Add an OpenAI API key in Settings before using LLM prompt compilation."),
    ).toHaveCount(0)
    await expect(page.getByRole("textbox", { name: "Generated prompt preview" })).toHaveValue("")
    expect(await storedPromptCount(page)).toBe(0)
  })
})

test("leaves draft unchanged when clipboard is empty", async () => {
  await withPrompterProject("prompter-phase11-empty", async ({ app, page }) => {
    const existingDraft = "Keep this draft when clipboard text is empty."

    await originalRequest(page).fill(existingDraft)
    await setClipboardText(app, "")
    await clickImportButton(page)

    await expect(originalRequest(page)).toHaveValue(existingDraft)
    await expect(page.getByText("Clipboard does not contain text to import.")).toBeVisible()
    expect(await storedPromptCount(page)).toBe(0)
  })
})

test("requires overwrite confirmation and supports cancel and replace", async () => {
  await withPrompterProject("prompter-phase11-overwrite", async ({ app, page }) => {
    const existingDraft = "Existing original request stays until replacement is confirmed."
    const replacementDraft = "Clipboard replacement request with exact contents."

    await originalRequest(page).fill(existingDraft)
    await setClipboardText(app, replacementDraft)
    await clickImportButton(page)

    await expect(
      page.getByText("Replace the current original request with clipboard text?"),
    ).toBeVisible()
    await expect(originalRequest(page)).toHaveValue(existingDraft)

    await page.getByRole("button", { name: "Cancel import" }).click()
    await expect(originalRequest(page)).toHaveValue(existingDraft)
    await expect(
      page.getByText("Replace the current original request with clipboard text?"),
    ).toHaveCount(0)

    await clickImportButton(page)
    await page.getByRole("button", { name: "Replace original request" }).click()

    await expect(originalRequest(page)).toHaveValue(replacementDraft)
    await expect(originalRequest(page)).toBeFocused()
    await expect(page.getByText("Clipboard text imported.")).toBeVisible()
  })
})

test("reports already-imported clipboard text without changing the draft", async () => {
  await withPrompterProject("prompter-phase11-same-text", async ({ app, page }) => {
    const existingDraft = "Clipboard text already matches the original request."

    await originalRequest(page).fill(existingDraft)
    await setClipboardText(app, existingDraft)
    await clickImportButton(page)

    await expect(originalRequest(page)).toHaveValue(existingDraft)
    await expect(page.getByText("Clipboard text is already in the original request.")).toBeVisible()
    await expect(originalRequest(page)).toBeFocused()
  })
})

test("resets stale compiled preview and copy and save state after import", async () => {
  await withPrompterProject("prompter-phase11-stale", async ({ app, page }) => {
    const importedDraft = "Replace the compiled draft with clipboard text only."
    const preview = page.getByRole("textbox", { name: "Generated prompt preview" })

    await originalRequest(page).fill("Compile this stale draft first.")
    await page.getByRole("button", { name: "프롬프트 컴파일" }).click()
    await expect(preview).toContainText("# Objective")
    await expect(page.getByRole("button", { exact: true, name: "Copy" })).toBeEnabled()
    await expect(page.getByRole("button", { name: "Save compiled prompt" })).toBeEnabled()

    await setClipboardText(app, importedDraft)
    await clickImportButton(page)
    await page.getByRole("button", { name: "Replace original request" }).click()

    await expect(originalRequest(page)).toHaveValue(importedDraft)
    await expect(preview).toHaveValue("")
    await expect(page.getByRole("button", { exact: true, name: "Copy" })).toBeDisabled()
    await expect(page.getByRole("button", { name: "Save compiled prompt" })).toBeDisabled()
  })
})

test("imports very long clipboard text in full and shows the review warning", async () => {
  await withPrompterProject("prompter-phase11-long", async ({ app, page }) => {
    const longClipboardText = `${"A".repeat(20_000)}\nEND`

    await setClipboardText(app, longClipboardText)
    await clickImportButton(page)

    await expect(originalRequest(page)).toHaveValue(longClipboardText)
    await expect(
      page.getByText("Imported clipboard text is very long; review it before analysis or compile."),
    ).toBeVisible()
  })
})

test("imports from the app-focused quick capture accelerator", async () => {
  await withPrompterProject("prompter-phase11-accelerator", async ({ app, page }) => {
    const clipboardText = "Accelerator path imports the same clipboard text."
    const shortcut = process.platform === "darwin" ? "Meta+Shift+V" : "Control+Shift+V"

    await setClipboardText(app, clipboardText)
    await page.keyboard.press(shortcut)

    await expect(originalRequest(page)).toHaveValue(clipboardText)
    await expect(page.getByText("Clipboard text imported.")).toBeVisible()
  })
})

test("keeps forbidden quick capture surfaces and run-result storage out of production source", async () => {
  const productionFiles = (
    await Promise.all(["electron", "renderer/src", "drizzle"].map(listFiles))
  ).flat()
  const productionSource = (
    await Promise.all(productionFiles.map((filePath) => readFile(filePath, "utf8")))
  ).join("\n")

  expect(productionSource).not.toContain("globalShortcut")
  expect(productionSource).not.toContain("appEvents")
  expect(productionSource).not.toContain("window.prompter.shortcuts")
  expect(productionSource).not.toContain("navigator.clipboard")
  expect(productionSource).not.toContain("quick_capture_")
  expect(productionSource).not.toContain("prompt_runs")
  expect(productionSource).not.toContain("agent_runs")
  expect(productionSource).not.toContain("execution_results")
  expect(productionSource).not.toContain("validation_results")
  expect(productionSource).not.toContain("run_logs")
})

async function listFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const filePath = join(directory, entry.name)

      if (entry.isDirectory()) {
        return listFiles(filePath)
      }

      return /\.(sql|ts|tsx)$/.test(entry.name) ? [filePath] : []
    }),
  )

  return files.flat()
}
