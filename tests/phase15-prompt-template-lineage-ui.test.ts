import { access, mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

import { createNamedProject, launchPrompter } from "./electron-playwright-helpers"
import {
  expectNoPromptCompilerIpcCalls,
  installPromptCompilerIpcRecorder,
} from "./phase13-project-context-profiles-ui-helpers"

const phase15ScreenshotPath = "test-results/phase15-template-lineage-panel.png"

async function createInitialPrompt(page: Awaited<ReturnType<typeof launchPrompter>>["page"]) {
  await page.getByTestId("prompt-library").getByRole("button", { name: "New Prompt" }).click()
  await page.getByRole("textbox", { name: "Prompt title" }).fill("Phase 15 Source Prompt")
  await page.getByRole("combobox", { exact: true, name: "Scenario" }).selectOption("feature")
  await page.getByRole("combobox", { exact: true, name: "Target agent" }).selectOption("codex")
  await page.getByRole("textbox", { name: "Original input" }).fill("Original source request")
  await page.getByRole("textbox", { name: "Compiled prompt" }).fill("Compiled source body")
  await page.getByRole("button", { name: "Save Prompt" }).click()
  await expect(page.getByRole("button", { name: /Phase 15 Source Prompt/ })).toBeVisible()
  await expect(page.getByRole("button", { name: /Version 1/ })).toBeVisible()
}

async function promptAssetCount(page: Awaited<ReturnType<typeof launchPrompter>>["page"]) {
  return page.evaluate(async () => (await window.prompter.prompts.listAssets()).length)
}

test("phase15 prompt template and lineage controls are usable", async ({
  browserName: _browserName,
}, testInfo) => {
  test.setTimeout(60_000)
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-phase15-ui-"))
  let run: Awaited<ReturnType<typeof launchPrompter>> | null = null

  try {
    run = await launchPrompter(userDataDirectory)
    await run.page.setViewportSize({ width: 1280, height: 800 })
    await createNamedProject(run.page, "Phase 15 UI Project")
    await createInitialPrompt(run.page)
    await installPromptCompilerIpcRecorder(run.app)

    await run.page.getByRole("button", { name: "Save as template" }).click()
    await run.page
      .getByRole("textbox", { name: "Version prompt template name" })
      .fill("Phase 15 Version Template")
    await run.page
      .getByRole("textbox", { name: "Version prompt template body" })
      .fill("Rendered {{feature}} template body")
    await run.page.getByRole("button", { name: "Create Prompt Template From Version" }).click()
    await expect(run.page.getByRole("button", { name: /Phase 15 Version Template/ })).toBeVisible()

    await run.page.getByRole("combobox", { exact: true, name: "Prompt template" }).selectOption({
      label: "Phase 15 Version Template",
    })
    await run.page.getByRole("textbox", { name: "Template variable feature" }).fill("lineage")
    await run.page.getByRole("button", { name: "Preview Prompt Template" }).click()
    await expect(run.page.getByText("Rendered lineage template body")).toBeVisible()
    await expectNoPromptCompilerIpcCalls(run.app)
    await expect(run.page.getByRole("textbox", { name: "Original request" })).toHaveValue("")
    await expect(run.page.getByRole("textbox", { name: "Generated prompt preview" })).toHaveValue(
      "",
    )
    expect(await promptAssetCount(run.page)).toBe(1)
    await run.page.getByRole("button", { name: "Apply Prompt Template" }).click()
    await run.page.getByRole("button", { name: "Confirm Apply Prompt Template" }).click()
    await expect(run.page.getByRole("textbox", { name: "Original request" })).toHaveValue("")
    await expect(run.page.getByRole("textbox", { name: "Generated prompt preview" })).toHaveValue(
      "Rendered lineage template body",
    )
    expect(await promptAssetCount(run.page)).toBe(1)

    await run.page.getByRole("button", { name: /Phase 15 Version Template/ }).click()
    await run.page
      .getByRole("textbox", { name: "Prompt template body" })
      .fill("Updated {{feature}} template body")
    await run.page.getByRole("button", { name: "Save Prompt Template" }).click()
    await expect(run.page.getByRole("textbox", { name: "Generated prompt preview" })).toHaveValue(
      "Rendered lineage template body",
    )
    await run.page.getByRole("button", { name: "Delete Prompt Template" }).click()
    await run.page.getByRole("button", { name: "Confirm Delete Prompt Template" }).click()
    await expect(run.page.getByRole("button", { name: /Phase 15 Version Template/ })).toHaveCount(0)
    await expect(run.page.getByRole("textbox", { name: "Generated prompt preview" })).toHaveValue(
      "Rendered lineage template body",
    )

    await run.page.getByRole("button", { name: "Derive Draft" }).click()
    await expect(
      run.page.getByText("Derived draft seeded from Phase 15 Source Prompt. Save when ready."),
    ).toBeVisible()
    await run.page.getByRole("button", { name: "Save compiled prompt" }).click()
    await expect(
      run.page.getByRole("button", { name: /Phase 15 Source Prompt Derived/ }),
    ).toBeVisible()
    await expect(run.page.getByText("active_source")).toBeVisible()

    await run.page.getByRole("button", { name: /Phase 15 Source Prompt · v1 · Derived/ }).click()
    await run.page.getByRole("button", { exact: true, name: "Duplicate Prompt" }).click()
    await expect(run.page.getByRole("button", { name: /Copy/ }).first()).toBeVisible()
    await expect(run.page.getByRole("heading", { name: "Lineage" })).toBeVisible()
    await expect(run.page.getByText("active_source")).toBeVisible()

    await mkdir("test-results", { recursive: true })
    await run.page.screenshot({ path: phase15ScreenshotPath, fullPage: true })
    await testInfo.attach("phase15-template-lineage-ui", {
      path: phase15ScreenshotPath,
      contentType: "image/png",
    })
  } finally {
    await run?.app.close()
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
