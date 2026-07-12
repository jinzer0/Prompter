import { access, mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

import { createNamedProject, launchPrompter } from "./electron-playwright-helpers"
import {
  phase5AnalyzeResponse,
  phase5CompileResponse,
  phase5PlaintextKey,
} from "./phase5-llm-compiler-fixtures"

const phase7ScreenshotPath = "test-results/phase7-search-ui.png"

type PromptSeed = {
  readonly title: string
  readonly scenario: string
  readonly targetAgent: string
  readonly originalInput: string
  readonly compiledPrompt: string
}

async function createPrompt(page: Page, seed: PromptSeed): Promise<void> {
  const promptLibrary = page.getByTestId("prompt-library")

  await promptLibrary.getByRole("button", { name: /^New Prompt$/ }).click()
  await page.getByRole("textbox", { name: "Prompt title" }).fill(seed.title)
  await page.getByRole("combobox", { exact: true, name: "Scenario" }).selectOption(seed.scenario)
  await page
    .getByRole("combobox", { exact: true, name: "Target agent" })
    .selectOption(seed.targetAgent)
  await page.getByRole("textbox", { name: "Original input" }).fill(seed.originalInput)
  await page.getByRole("textbox", { name: "Compiled prompt" }).fill(seed.compiledPrompt)
  await promptLibrary.getByRole("button", { name: /^Save Prompt$/ }).click()
  await expect(promptLibrary.getByRole("button", { name: new RegExp(seed.title) })).toBeVisible()
}

test("searches prompts with filters and saves LLM suggested tags", async ({
  browserName: _browserName,
}, testInfo) => {
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-phase7-ui-"))

  try {
    const run = await launchPrompter(userDataDirectory, {
      PROMPTER_TEST_LLM_ANALYZE_RESPONSE: phase5AnalyzeResponse,
      PROMPTER_TEST_LLM_COMPILE_RESPONSE: phase5CompileResponse,
    })
    const page = run.page

    await createNamedProject(page, "Phase 7 Project")
    await createPrompt(page, {
      title: "Command Palette Builder",
      scenario: "feature",
      targetAgent: "codex",
      originalInput: "Build a React command palette prompt.",
      compiledPrompt: "Ship the React command palette with keyboard navigation and tests.",
    })
    await createPrompt(page, {
      title: "Docs Summarizer",
      scenario: "docs",
      targetAgent: "claude_code",
      originalInput: "Summarize onboarding docs.",
      compiledPrompt: "Summarize documentation for onboarding reviewers.",
    })
    const promptLibrary = page.getByTestId("prompt-library")

    await promptLibrary.getByRole("button", { name: /Command Palette Builder/ }).click()
    await promptLibrary.getByRole("textbox", { name: "Prompt tag name" }).fill("frontend")
    await promptLibrary.getByRole("button", { name: "Add tag to prompt" }).click()
    await expect(promptLibrary.getByRole("button", { name: "Filter tag frontend" })).toBeVisible()

    await promptLibrary.getByRole("textbox", { name: "Search prompts" }).fill("React command")
    await promptLibrary.getByRole("combobox", { name: "Scenario filter" }).selectOption("feature")
    await promptLibrary.getByRole("combobox", { name: "Target agent filter" }).selectOption("codex")
    await promptLibrary.getByRole("button", { name: "Filter tag frontend" }).click()
    await expect(
      promptLibrary.getByRole("button", { name: /Command Palette Builder/ }),
    ).toBeVisible()
    await expect(promptLibrary.getByRole("button", { name: /Docs Summarizer/ })).toHaveCount(0)

    await promptLibrary.getByRole("textbox", { name: "Search prompts" }).fill('" OR * : ( ) - + ?')
    await expect(promptLibrary.getByText("No prompts match your filters")).toBeVisible()
    await promptLibrary.getByRole("button", { name: "Clear search filters" }).click()

    await page.getByRole("textbox", { name: "OpenAI API key" }).fill(phase5PlaintextKey)
    await page.getByRole("button", { name: "Save API key" }).click()
    await page.getByRole("textbox", { name: "Original request" }).fill("Build Phase 7 search UX.")
    await page.getByRole("button", { name: "분석하기" }).click()
    await expect(
      page.getByText("The request needs one clarification before compiling."),
    ).toBeVisible()
    await page.getByRole("textbox", { name: "Answer for focus" }).fill("Search, filters, and tags.")
    await page.getByRole("button", { name: "최종 프롬프트 생성" }).click()
    await expect(page.getByRole("checkbox", { name: "Save tag phase5" })).toBeVisible()
    await page.getByRole("checkbox", { name: "Save tag phase5" }).check()
    await page.getByRole("checkbox", { name: "Save tag compiler" }).check()
    await page.getByRole("button", { name: "Save compiled prompt" }).click()
    await expect(page.getByText("Compiled prompt saved.")).toBeVisible()

    const stored = await page.evaluate(async () => {
      const prompts = await window.prompter.prompts.listAssets()
      const prompt = prompts.find((item) => item.title === "Generate Phase 5 compiler prompt")
      const tags = prompt === undefined ? [] : await window.prompter.tags.listForPrompt(prompt.id)

      return tags.map((tag) => tag.name).sort()
    })

    expect(stored).toEqual(["compiler", "phase5"])
    await mkdir("test-results", { recursive: true })
    await page.screenshot({ path: phase7ScreenshotPath, fullPage: true })
    await testInfo.attach("phase7-search-ui", {
      path: phase7ScreenshotPath,
      contentType: "image/png",
    })
    await run.app.close()
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
