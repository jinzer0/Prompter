import type { ElectronApplication, Locator, Page } from "@playwright/test"
import { expect } from "@playwright/test"

import { MENU_ACTION_CHANNEL } from "../electron/ipc-types"
import { promptExportOptions } from "../renderer/src/lib/prompt-export"
import { promptCompilerIpcSnapshot } from "./phase13-project-context-profiles-ui-helpers"
import {
  compilerProjectBName,
  compilerTemplateOutput,
} from "./phase18-insights-compiler-rebind-electron-fixtures"

type PreservedUnboundOutputInput = {
  readonly app: ElectronApplication
  readonly compilerPanel: Locator
  readonly page: Page
  readonly preview: Locator
}

async function attemptDisabledButton(button: Locator): Promise<void> {
  await expect(button).toBeDisabled()
  await button.evaluate((element) => {
    if (!(element instanceof HTMLButtonElement)) {
      throw new TypeError("Expected a disabled compiler button")
    }
    element.click()
  })
}

export async function expectPreservedUnboundOutputBoundary({
  app,
  compilerPanel,
  page,
  preview,
}: PreservedUnboundOutputInput): Promise<Locator> {
  const guardedButtons = [
    page.getByRole("button", { name: "프롬프트 컴파일" }),
    page.getByRole("button", { name: "분석하기" }),
    page.getByRole("button", { name: "최종 프롬프트 생성" }),
    page.getByRole("button", { name: "Apply Prompt Template" }),
    page.getByRole("button", { name: "Save compiled prompt" }),
    page.getByRole("button", { name: "Save as new version" }),
  ]
  for (const button of guardedButtons) await attemptDisabledButton(button)

  const copy = page.getByRole("button", { name: "Copy", exact: true })
  await expect(copy).toBeEnabled()
  await copy.click()
  expect(await page.evaluate(() => window.prompter.clipboard.readText())).toEqual({
    isEmpty: false,
    length: compilerTemplateOutput.length,
    text: compilerTemplateOutput,
  })

  await expect(preview).toHaveJSProperty("readOnly", true)
  await expect(preview).toHaveAttribute("aria-describedby", "compiler-project-rebind-description")
  await preview.evaluate((element) => {
    if (!(element instanceof HTMLTextAreaElement)) {
      throw new TypeError("Expected the generated prompt preview textarea")
    }
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set
    if (valueSetter === undefined) {
      throw new TypeError("Expected the native textarea value setter")
    }
    valueSetter.call(element, "Forbidden unbound output mutation")
    element.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await expect(preview).toHaveValue(compilerTemplateOutput)

  await page.getByRole("button", { name: "Review draft locally" }).click()
  await expect(page.getByText("Current review")).toBeVisible()
  const useImprovedPrompt = page.getByRole("button", { name: "Use improved prompt" })
  await expect(useImprovedPrompt).toBeDisabled()
  await expect(useImprovedPrompt).toHaveAttribute(
    "aria-describedby",
    "compiler-project-rebind-description",
  )

  const compiledExportCard = compilerPanel
    .getByRole("heading", { name: "Compiled preview export" })
    .locator("../..")
  const exportFormat = compiledExportCard.getByRole("combobox", {
    name: "Compiled preview export format",
  })
  const previewExport = compiledExportCard.getByRole("button", { name: "Preview export" })
  const copyExport = compiledExportCard.getByRole("button", { name: "Copy compiled export" })
  const saveExport = compiledExportCard.getByRole("button", { name: "Save compiled export" })
  await expect(saveExport).toBeDisabled()
  await expect(saveExport).toHaveAttribute(
    "aria-describedby",
    "compiler-project-rebind-description",
  )
  await saveExport.evaluate((element) => {
    if (!(element instanceof HTMLButtonElement)) {
      throw new TypeError("Expected the native save export button")
    }
    element.click()
  })
  await app.evaluate(({ BrowserWindow }, channel) => {
    const browserWindow = BrowserWindow.getAllWindows()[0]
    if (browserWindow === undefined) {
      throw new TypeError("Expected the compiler window")
    }
    browserWindow.webContents.send(channel, "exportPrompt")
  }, MENU_ACTION_CHANNEL)
  await expect.poll(async () => (await promptCompilerIpcSnapshot(app)).saveExport).toBe(0)

  for (const option of promptExportOptions) {
    await exportFormat.selectOption(option.value)
    await expect(previewExport).toBeEnabled()
    await previewExport.click()
    await expect(page.getByText(`Previewed ${option.label}.`)).toBeVisible()
    await expect(copyExport).toBeEnabled()
    await copyExport.click()
    await expect(page.getByText(`Copied ${option.label}.`)).toBeVisible()
    const copied = await page.evaluate(() => window.prompter.clipboard.readText())
    expect(copied.isEmpty).toBe(false)
    if (option.value === "raw") {
      expect(copied.text).toBe(compilerTemplateOutput)
    } else {
      expect(copied.text).not.toContain(compilerProjectBName)
    }
  }

  return saveExport
}
