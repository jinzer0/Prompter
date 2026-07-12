import { access, mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

import { createNamedProject, launchPrompter } from "./electron-playwright-helpers"

const phase3ScreenshotPath = "test-results/phase3-ui.png"
const phase4ScreenshotPath = "test-results/phase4-compiler-ui.png"

async function createProject(page: Page): Promise<void> {
  await page.getByRole("button", { name: "New Project" }).click()
  await page.getByRole("button", { name: "Save Project" }).click()
  await expect(page.getByText("Project name is required")).toBeVisible()

  await page.getByRole("textbox", { name: "Project name" }).fill("Phase 3 Project")
  await page.getByRole("textbox", { name: "Project description" }).fill("DB-backed library")
  await page.getByRole("textbox", { name: "Tech stack" }).fill("Electron React SQLite")
  await page.getByRole("combobox", { name: "Default agent" }).selectOption("codex")
  await page.getByRole("button", { name: "Save Project" }).click()

  await expect(page.getByRole("button", { name: /Phase 3 Project/ })).toBeVisible()
  await expect(page.getByText("No prompts yet")).toBeVisible()
}

async function createPrompt(page: Page): Promise<void> {
  const promptLibrary = page.getByTestId("prompt-library")

  await promptLibrary.getByRole("button", { name: /^New Prompt$/ }).click()
  await promptLibrary.getByRole("button", { name: /^Save Prompt$/ }).click()
  await expect(page.getByText("Prompt title is required")).toBeVisible()

  await page.getByRole("textbox", { name: "Prompt title" }).fill("Phase 3 Prompt")
  await promptLibrary.getByRole("button", { name: /^Save Prompt$/ }).click()
  await expect(page.getByText("Original input is required")).toBeVisible()

  await page.getByRole("combobox", { exact: true, name: "Scenario" }).selectOption("feature")
  await page.getByRole("combobox", { exact: true, name: "Target agent" }).selectOption("codex")
  await page
    .getByRole("textbox", { name: "Original input" })
    .fill("Turn a vague feature request into implementation steps.")
  await promptLibrary.getByRole("button", { name: /^Save Prompt$/ }).click()
  await expect(page.getByText("Compiled prompt is required")).toBeVisible()

  await page
    .getByRole("textbox", { name: "Compiled prompt" })
    .fill("Compiled phase 3 instructions for the selected project.")
  await promptLibrary.getByRole("button", { name: /^Save Prompt$/ }).click()

  const promptCard = promptLibrary.getByRole("button", { name: /Phase 3 Prompt/ })
  await expect(promptCard).toBeVisible()
  await expect(promptCard).toContainText("Updated")
  await expect(
    page.getByText("Compiled phase 3 instructions for the selected project."),
  ).toBeVisible()
  await expect(page.getByText("Version 1")).toBeVisible()
}

test("supports project and prompt library CRUD through the UI", async ({
  browserName: _browserName,
}, testInfo) => {
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-phase3-"))

  try {
    const firstRun = await launchPrompter(userDataDirectory)
    await access(join(userDataDirectory, "prompter.sqlite"))

    await expect(firstRun.page.getByText("No projects yet")).toBeVisible()
    await expect(firstRun.page.getByText("Select a project to view prompts")).toBeVisible()
    await expect(firstRun.page.getByText("prompt_runs")).toHaveCount(0)
    await expect(firstRun.page.getByText("execution_results")).toHaveCount(0)

    await createProject(firstRun.page)
    await createPrompt(firstRun.page)

    const stored = await firstRun.page.evaluate(async () => {
      const projects = await window.prompter.projects.list()
      const project = projects.find((item) => item.name === "Phase 3 Project") ?? null
      const prompts = await window.prompter.prompts.listAssets({ projectId: project?.id })
      const prompt = prompts.find((item) => item.title === "Phase 3 Prompt") ?? null
      const versions = prompt ? await window.prompter.prompts.listVersions(prompt.id) : []
      const currentVersion = versions.find((item) => item.id === prompt?.currentVersionId) ?? null

      return {
        currentVersionNumber: currentVersion?.versionNumber ?? null,
        promptCount: prompts.length,
        promptTitle: prompt?.title ?? null,
        projectName: project?.name ?? null,
        versionBody: currentVersion?.compiledPrompt ?? null,
      }
    })

    expect(stored).toEqual({
      currentVersionNumber: 1,
      promptCount: 1,
      promptTitle: "Phase 3 Prompt",
      projectName: "Phase 3 Project",
      versionBody: "Compiled phase 3 instructions for the selected project.",
    })

    await testInfo.attach("phase3-created-title", {
      body: await firstRun.page.title(),
      contentType: "text/plain",
    })
    await firstRun.app.close()

    const secondRun = await launchPrompter(userDataDirectory)
    await expect(secondRun.page.getByRole("button", { name: /Phase 3 Project/ })).toBeVisible()
    await expect(secondRun.page.getByRole("button", { name: /Phase 3 Prompt/ })).toBeVisible()
    await expect(
      secondRun.page.getByText("Compiled phase 3 instructions for the selected project."),
    ).toBeVisible()
    await mkdir("test-results", { recursive: true })
    await secondRun.page.screenshot({ path: phase3ScreenshotPath, fullPage: true })
    await testInfo.attach("phase3-ui", {
      path: phase3ScreenshotPath,
      contentType: "image/png",
    })
    await secondRun.app.close()
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})

test("clears project-scoped prompts while a new project loads", async () => {
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-phase3-isolation-"))

  try {
    const run = await launchPrompter(userDataDirectory)

    await createNamedProject(run.page, "Project Alpha")
    await createPrompt(run.page)

    await createNamedProject(run.page, "Project Beta")
    await expect(run.page.getByRole("button", { name: /Phase 3 Prompt/ })).toHaveCount(0)
    await expect(
      run.page.getByText("Compiled phase 3 instructions for the selected project."),
    ).toHaveCount(0)
    await expect(run.page.getByText("No prompts yet")).toBeVisible()

    await run.app.close()
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})

test("compiles and saves a static prompt through the compiler panel", async ({
  browserName: _browserName,
}, testInfo) => {
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-phase4-"))

  try {
    const firstRun = await launchPrompter(userDataDirectory)
    await createNamedProject(firstRun.page, "Phase 4 Project")

    await expect(firstRun.page.getByRole("button", { name: "프롬프트 컴파일" })).toBeVisible()
    await firstRun.page.getByRole("button", { name: "프롬프트 컴파일" }).click()
    await expect(firstRun.page.getByText("Original request is required")).toBeVisible()

    await firstRun.page
      .getByRole("textbox", { name: "Original request" })
      .fill("Add a settings screen for local prompt preferences.")
    await firstRun.page.getByRole("combobox", { name: "Compile mode" }).selectOption("feature")
    await firstRun.page.getByRole("combobox", { name: "Compile runner" }).selectOption("codex")
    await firstRun.page.getByRole("textbox", { name: "Project context" }).fill("Prompter Phase 4")
    await firstRun.page
      .getByRole("textbox", { name: "Compiler stack" })
      .fill("Electron React TypeScript")
    await firstRun.page
      .getByRole("textbox", { name: "Constraints" })
      .fill("Do not add API key handling.")
    await firstRun.page
      .getByRole("textbox", { name: "Acceptance criteria" })
      .fill("Settings can be opened from the shell.")
    const validationCommands = firstRun.page.getByRole("textbox", { name: "Validation commands" })
    await validationCommands.fill("npm run typecheck")
    await expect(validationCommands).toHaveValue("npm run typecheck")
    await firstRun.page.getByRole("button", { name: "프롬프트 컴파일" }).click()

    const preview = firstRun.page.getByRole("textbox", { name: "Generated prompt preview" })
    await expect(preview).toContainText("# Objective")
    await expect(preview).toContainText("# Final Response Format")
    await preview.fill("# Objective\nManual preview edit before save.")
    await expect(preview).toHaveValue("# Objective\nManual preview edit before save.")
    await firstRun.page.getByRole("button", { name: "Copy", exact: true }).click()
    await expect(firstRun.page.getByText("Compiled prompt copied.")).toBeVisible()

    await firstRun.page.getByRole("button", { name: "Save compiled prompt" }).click()
    await expect(firstRun.page.getByText("Compiled prompt saved.")).toBeVisible()
    await expect(
      firstRun.page.getByRole("button", {
        name: /Add a settings screen for local prompt preferences/,
      }),
    ).toBeVisible()
    await expect(firstRun.page.getByText("Version 1")).toBeVisible()

    const stored = await firstRun.page.evaluate(async () => {
      const projects = await window.prompter.projects.list()
      const project = projects.find((item) => item.name === "Phase 4 Project") ?? null
      const prompts = await window.prompter.prompts.listAssets({ projectId: project?.id })
      const prompt = prompts.find((item) => item.title.startsWith("Add a settings screen")) ?? null
      const versions = prompt ? await window.prompter.prompts.listVersions(prompt.id) : []
      const currentVersion = versions.find((item) => item.id === prompt?.currentVersionId) ?? null

      return {
        acceptanceCriteria: currentVersion?.acceptanceCriteria ?? null,
        compiledPrompt: currentVersion?.compiledPrompt ?? null,
        promptCount: prompts.length,
        promptTitle: prompt?.title ?? null,
        projectName: project?.name ?? null,
        validationCommands: currentVersion?.validationCommands ?? null,
      }
    })

    expect(stored).toEqual({
      acceptanceCriteria: "Settings can be opened from the shell.",
      compiledPrompt: "# Objective\nManual preview edit before save.",
      promptCount: 1,
      promptTitle: "Add a settings screen for local prompt preferences.",
      projectName: "Phase 4 Project",
      validationCommands: "npm run typecheck",
    })

    await mkdir("test-results", { recursive: true })
    await firstRun.page.screenshot({ path: phase4ScreenshotPath, fullPage: true })
    await testInfo.attach("phase4-compiler-ui", {
      path: phase4ScreenshotPath,
      contentType: "image/png",
    })
    await firstRun.app.close()

    const secondRun = await launchPrompter(userDataDirectory)
    await expect(secondRun.page.getByRole("button", { name: /Phase 4 Project/ })).toBeVisible()
    await expect(
      secondRun.page.getByRole("button", {
        name: /Add a settings screen for local prompt preferences/,
      }),
    ).toBeVisible()
    await expect(secondRun.page.getByText("# Objective")).toBeVisible()
    await secondRun.app.close()
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
