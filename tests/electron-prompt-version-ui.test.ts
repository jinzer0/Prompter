import { access, mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

import { createNamedProject, launchPrompter } from "./electron-playwright-helpers"

const phase6ScreenshotPath = "test-results/phase6-prompt-version-ui.png"
const phase6ActionTimeoutMs = 5_000
const initialCompiledPrompt = "Compiled phase 6 initial instructions."
const revisedCompiledPrompt = "Phase 6 revised compiled prompt."
const forbiddenExecutionUiText = [
  "prompt_runs",
  "agent_runs",
  "execution_results",
  "validation_results",
  "run_logs",
] as const

async function assertNoExecutionUi(page: Page): Promise<void> {
  for (const text of forbiddenExecutionUiText) {
    await expect(page.getByText(text)).toHaveCount(0)
  }
}

async function createInitialPrompt(page: Page): Promise<void> {
  await page.getByTestId("prompt-library").getByRole("button", { name: "New Prompt" }).click()
  await page.getByRole("textbox", { name: "Prompt title" }).fill("Phase 6 Prompt")
  await page.getByRole("combobox", { exact: true, name: "Scenario" }).selectOption("feature")
  await page.getByRole("combobox", { exact: true, name: "Target agent" }).selectOption("codex")
  await page
    .getByRole("textbox", { name: "Original input" })
    .fill("Create the first version for a prompt asset.")
  await page.getByRole("textbox", { name: "Compiled prompt" }).fill(initialCompiledPrompt)
  await page.getByRole("button", { name: "Save Prompt" }).click()

  await expect(page.getByRole("button", { name: /Phase 6 Prompt/ })).toBeVisible()
  await expect(page.getByText("Version 1")).toBeVisible()
  await expect(page.getByText(initialCompiledPrompt)).toBeVisible()
}

test("saves compiler output as a new version on the selected prompt without creating run UI", async ({
  browserName: _browserName,
}, testInfo) => {
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-phase6-version-ui-"))
  let run: Awaited<ReturnType<typeof launchPrompter>> | null = null

  try {
    run = await launchPrompter(userDataDirectory)
    await run.page.setViewportSize({ width: 1280, height: 800 })
    await createNamedProject(run.page, "Phase 6 Version Project")
    await createInitialPrompt(run.page)
    await assertNoExecutionUi(run.page)

    await run.page
      .getByRole("textbox", { name: "Original request" })
      .fill("Revise the selected prompt without creating another PromptAsset.", {
        timeout: phase6ActionTimeoutMs,
      })
    await run.page
      .getByRole("combobox", { name: "Compile mode" })
      .selectOption("feature", { timeout: phase6ActionTimeoutMs })
    await run.page
      .getByRole("combobox", { name: "Compile runner" })
      .selectOption("codex", { timeout: phase6ActionTimeoutMs })
    await run.page
      .getByRole("textbox", { name: "Project context" })
      .fill("Phase 6 versions", { timeout: phase6ActionTimeoutMs })
    await run.page
      .getByRole("button", { name: "프롬프트 컴파일" })
      .click({ timeout: phase6ActionTimeoutMs })

    const preview = run.page.getByRole("textbox", { name: "Generated prompt preview" })
    await expect(preview).toContainText("# Objective")
    await preview.fill(
      ["# Objective", revisedCompiledPrompt, "", "# Validation", "npm run test:smoke"].join("\n"),
      { timeout: phase6ActionTimeoutMs },
    )
    await expect(
      run.page.getByRole("combobox", { name: "Compiled preview export format" }),
    ).toBeVisible()
    await run.page
      .getByRole("combobox", { name: "Compiled preview export format" })
      .selectOption("codex")
    await run.page.getByRole("button", { name: "Copy compiled export" }).click()
    await expect(run.page.getByText("Copied Codex Prompt.")).toBeVisible()

    await expect(run.page.getByRole("button", { name: "Save as new version" })).toBeVisible({
      timeout: phase6ActionTimeoutMs,
    })
    await run.page.getByRole("button", { name: "Save as new version" }).click()

    await expect(run.page.getByRole("heading", { name: "Version history" })).toBeVisible()
    await expect(run.page.getByText("Version 2")).toBeVisible()
    await expect(run.page.getByText(revisedCompiledPrompt)).toBeVisible()
    await expect(run.page.getByRole("combobox", { name: "Version export format" })).toBeVisible()
    await expect(run.page.getByRole("button", { name: "Save version export" })).toBeVisible()
    await run.page
      .getByRole("combobox", { name: "Version export format" })
      .selectOption("claude_code")
    await run.page.getByRole("button", { name: "Copy version export" }).click()
    await expect(run.page.getByText("Copied Claude Code Prompt.")).toBeVisible()
    await run.page.getByRole("button", { name: /Version 1/ }).click()
    await expect(run.page.getByText(initialCompiledPrompt)).toBeVisible()
    await run.page.getByRole("button", { name: "현재 버전으로 지정" }).click()

    await run.page.getByRole("tab", { name: "Version compare" }).click()
    await expect(run.page.getByRole("combobox", { name: "Base version" })).toBeVisible()
    await expect(run.page.getByRole("combobox", { name: "Compare version" })).toBeVisible()
    await expect(run.page.getByText(initialCompiledPrompt)).toBeVisible()
    await expect(run.page.getByText(revisedCompiledPrompt)).toBeVisible()
    await assertNoExecutionUi(run.page)

    const stored = await run.page.evaluate(async () => {
      const projects = await window.prompter.projects.list()
      const project = projects.find((item) => item.name === "Phase 6 Version Project") ?? null
      const prompts = await window.prompter.prompts.listAssets({ projectId: project?.id })
      const prompt = prompts.find((item) => item.title === "Phase 6 Prompt") ?? null
      const versions = prompt ? await window.prompter.prompts.listVersions(prompt.id) : []
      const currentVersion = versions.find((item) => item.id === prompt?.currentVersionId) ?? null

      return {
        currentVersionBody: currentVersion?.compiledPrompt ?? null,
        currentVersionNumber: currentVersion?.versionNumber ?? null,
        promptCount: prompts.length,
        versionNumbers: versions.map((version) => version.versionNumber),
      }
    })

    expect(stored).toEqual({
      currentVersionBody: initialCompiledPrompt,
      currentVersionNumber: 1,
      promptCount: 1,
      versionNumbers: [2, 1],
    })

    await mkdir("test-results", { recursive: true })
    await run.page.screenshot({ path: phase6ScreenshotPath, fullPage: true })
    await testInfo.attach("phase6-prompt-version-ui", {
      path: phase6ScreenshotPath,
      contentType: "image/png",
    })
  } finally {
    if (run !== null) {
      await Promise.race([
        run.app.close(),
        new Promise<void>((resolve) => {
          setTimeout(resolve, 1_000)
        }),
      ])
    }
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
