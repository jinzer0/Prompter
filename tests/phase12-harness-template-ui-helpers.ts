import { access, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ElectronApplication, Page } from "@playwright/test"
import { expect } from "@playwright/test"

import type { HarnessTemplate } from "../electron/ipc-types"
import { launchPrompter, type RunningApp } from "./electron-playwright-helpers"

type HarnessCallback = (run: RunningApp) => Promise<void>
type PersistentHarnessCallback = (userDataDirectory: string) => Promise<void>
type CreateHarnessTemplateUiInput = {
  readonly name: string
  readonly scenario: string
  readonly targetAgent: string
  readonly templateBody: string
  readonly requiredFields: string
  readonly clarificationPolicy: string
}

export const exactHarnessQuickCaptureText = [
  "  leading spaces stay  ",
  "",
  "```ts",
  "const value = `code fence`;",
  "```",
  "diff --git a/file.ts b/file.ts",
  "+added line",
  "-removed line",
  "control-like: ^C ^D \\u0000 \\x1b[31m",
  "  trailing spaces stay  ",
].join("\n")

export const defaultHarnessTemplateNames = [
  "Feature Implementation",
  "Bug Fix",
  "Refactor",
  "Code Review",
  "Documentation",
  "Research / Planning",
] as const

export async function withHarnessManager(
  projectName: string,
  callback: HarnessCallback,
): Promise<void> {
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), `${projectName}-`))
  let run: RunningApp | null = null

  try {
    run = await launchPrompter(userDataDirectory)
    await callback(run)
  } finally {
    await run?.app.close()
    await rm(userDataDirectory, { recursive: true, force: true })
  }
}

export async function withPersistentHarnessManager(
  projectName: string,
  callback: PersistentHarnessCallback,
): Promise<void> {
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), `${projectName}-`))

  try {
    await callback(userDataDirectory)
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
}

export async function launchWithUserData(
  userDataDirectory: string,
  callback: HarnessCallback,
): Promise<void> {
  const run = await launchPrompter(userDataDirectory)

  try {
    await callback(run)
  } finally {
    await run.app.close()
  }
}

export async function listHarnessTemplates(page: Page): Promise<readonly HarnessTemplate[]> {
  return page.evaluate(() => window.prompter.harnessTemplates.list({}))
}

export async function harnessTemplateCountByName(page: Page, name: string): Promise<number> {
  return page.evaluate(async (templateName) => {
    const templates = await window.prompter.harnessTemplates.list({ query: templateName })
    return templates.filter((template) => template.name === templateName).length
  }, name)
}

export async function createHarnessTemplateViaUi(
  page: Page,
  input: CreateHarnessTemplateUiInput,
): Promise<void> {
  await page.getByRole("button", { name: "New Harness" }).click()
  await page.getByRole("textbox", { name: "Harness name" }).fill(input.name)
  await page.getByRole("combobox", { exact: true, name: "Scenario" }).selectOption(input.scenario)
  await page
    .getByRole("combobox", { exact: true, name: "Target agent" })
    .selectOption(input.targetAgent)
  await page.getByRole("textbox", { name: "Template body" }).fill(input.templateBody)
  await page.getByRole("textbox", { name: "Required fields JSON" }).fill(input.requiredFields)
  await page
    .getByRole("textbox", { name: "Clarification policy JSON" })
    .fill(input.clarificationPolicy)
  await page.getByRole("button", { name: "Save Harness" }).click()
}

export async function fillNewHarnessNameAndBody(
  page: Page,
  name: string,
  templateBody: string,
): Promise<void> {
  await page.getByRole("button", { name: "New Harness" }).click()
  await page.getByRole("textbox", { name: "Harness name" }).fill(name)
  await page.getByRole("textbox", { name: "Template body" }).fill(templateBody)
}

export async function expectHarnessAbsent(page: Page, name: string): Promise<void> {
  await expect(page.getByRole("button", { name: new RegExp(name) })).toHaveCount(0)
  expect(await harnessTemplateCountByName(page, name)).toBe(0)
}

export async function expectStaticCompileUsesSelectedHarness(
  page: Page,
  originalInput: string,
): Promise<void> {
  await page.getByRole("textbox", { name: "Original request" }).fill(originalInput)
  await page
    .getByRole("combobox", { name: "Harness template" })
    .selectOption({ label: "Feature Implementation" })
  await expect(page.getByRole("textbox", { name: "Generated prompt preview" })).toHaveValue("")

  await page.getByRole("button", { name: "프롬프트 컴파일" }).click()
  await expect(page.getByRole("textbox", { name: "Generated prompt preview" })).toHaveValue(
    /# Feature Implementation/,
  )
  await expect(page.getByRole("textbox", { name: "Generated prompt preview" })).toHaveValue(
    new RegExp(originalInput),
  )
}

export async function expectDeletedSelectedHarnessFallsBackAfterReload(
  page: Page,
  originalInput: string,
): Promise<void> {
  await page.getByRole("textbox", { name: "Original request" }).fill(originalInput)
  await page
    .getByRole("combobox", { name: "Harness template" })
    .selectOption({ label: "Documentation" })
  const deletedHarnessId = await selectedHarnessTemplateId(page)

  await page.evaluate(async (templateId) => {
    await window.prompter.harnessTemplates.delete(templateId)
  }, deletedHarnessId)
  await page.reload()
  await expect(page.locator('[data-testid="app-shell"]')).toBeVisible()
  await expect(page.getByRole("combobox", { name: "Harness template" })).toHaveValue("")

  await page.getByRole("textbox", { name: "Original request" }).fill(originalInput)
  await page.getByRole("button", { name: "프롬프트 컴파일" }).click()
  await expect(page.getByRole("textbox", { name: "Generated prompt preview" })).toHaveValue(
    /# Objective/,
  )
  await expect(page.getByRole("textbox", { name: "Generated prompt preview" })).toHaveValue(
    new RegExp(originalInput),
  )
}

export async function expectSameSessionDeletedHarnessClearsBeforeStaticCompile(
  page: Page,
  originalInput: string,
): Promise<void> {
  const selector = page.getByRole("combobox", { name: "Harness template" })
  const preview = page.getByRole("textbox", { name: "Generated prompt preview" })

  await page.getByRole("textbox", { name: "Original request" }).fill(originalInput)
  await selector.selectOption({ label: "Documentation" })
  await page.getByRole("button", { name: /Documentation/ }).click()
  await confirmSelectedHarnessDelete(page)

  await expect(selector).toHaveValue("")
  await page.getByRole("button", { name: "프롬프트 컴파일" }).click()
  await expect(preview).toHaveValue(/# Objective/)
  await expect(preview).toHaveValue(new RegExp(originalInput))
  await expect(preview).not.toHaveValue(/# Documentation/)
}

export async function confirmSelectedHarnessDelete(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Delete Harness" }).click()
  await expect(page.getByText(/Seeded default templates can return after restart/)).toBeVisible()
  await page.getByRole("button", { name: "Confirm Delete Harness" }).click()
}

export async function expectDefaultHarnessTemplatesVisible(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: "Harnesses" })).toBeVisible()
  for (const templateName of defaultHarnessTemplateNames) {
    await expect(page.getByRole("button", { name: new RegExp(templateName) })).toBeVisible()
  }
  await expect(page.getByText(/Updated/).first()).toBeVisible()
  await expect(
    page.getByRole("button", { name: /Feature Implementation, Feature, Generic agent/ }),
  ).toBeVisible()
}

export async function expectDefaultHarnessTemplateCounts(page: Page): Promise<void> {
  const templates = await listHarnessTemplates(page)

  expect(templates).toHaveLength(defaultHarnessTemplateNames.length)
  for (const templateName of defaultHarnessTemplateNames) {
    expect(templates.filter((template) => template.name === templateName)).toHaveLength(1)
  }
}

export async function selectedHarnessTemplateId(page: Page): Promise<string> {
  return page.getByRole("combobox", { name: "Harness template" }).evaluate((element) => {
    if (!(element instanceof HTMLSelectElement)) {
      throw new TypeError("Harness template control must be a select element")
    }

    return element.value
  })
}

export async function setClipboardText(app: ElectronApplication, text: string): Promise<void> {
  await app.evaluate(({ clipboard }, value) => {
    clipboard.writeText(value)
  }, text)
}
