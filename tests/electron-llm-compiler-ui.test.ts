import { access, mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

import { createNamedProject, launchPrompter } from "./electron-playwright-helpers"
import {
  phase5AnalyzeResponse,
  phase5CompiledPrompt,
  phase5CompileResponse,
  phase5PlaintextKey,
  phase5ScreenshotPath,
} from "./phase5-llm-compiler-fixtures"

test("analyzes, compiles, and saves an LLM prompt through the compiler panel", async ({
  browserName: _browserName,
}, testInfo) => {
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-phase5-"))

  try {
    const run = await launchPrompter(userDataDirectory, {
      PROMPTER_TEST_LLM_ANALYZE_RESPONSE: phase5AnalyzeResponse,
      PROMPTER_TEST_LLM_COMPILE_RESPONSE: phase5CompileResponse,
    })
    await createNamedProject(run.page, "Phase 5 Project")

    await run.page
      .getByRole("textbox", { name: "Original request" })
      .fill("Build the Phase 5 LLM compiler flow.")
    await run.page.getByRole("button", { name: "분석하기" }).click()
    await expect(
      run.page.getByText("Add an OpenAI API key in Settings before using LLM prompt compilation."),
    ).toBeVisible()

    await run.page.getByRole("textbox", { name: "OpenAI API key" }).fill(phase5PlaintextKey)
    await run.page.getByRole("button", { name: "Save API key" }).click()
    await expect(run.page.getByText("OpenAI key saved.")).toBeVisible()
    await expect(run.page.getByText(phase5PlaintextKey)).toHaveCount(0)

    await run.page.getByRole("button", { name: "분석하기" }).click()
    await expect(
      run.page.getByText("The request needs one clarification before compiling."),
    ).toBeVisible()
    await expect(
      run.page.getByText("Which project behavior should the agent focus on?"),
    ).toBeVisible()
    await run.page
      .getByRole("textbox", { name: "Answer for focus" })
      .fill("Compiler UI with prompt library refresh after save.")

    await run.page.getByRole("button", { name: "최종 프롬프트 생성" }).click()
    const preview = run.page.getByRole("textbox", { name: "Generated prompt preview" })
    await expect(preview).toContainText("# Objective")
    await expect(preview).toContainText("# Final Response Format")
    await expect(run.page.getByText("Compiler quality score: 91")).toBeVisible()
    await expect(run.page.getByText("Confirm OpenAI key exists before compiling.")).toBeVisible()

    await run.page.getByRole("button", { name: "Save compiled prompt" }).click()
    await expect(run.page.getByText("Compiled prompt saved.")).toBeVisible()
    await expect(
      run.page.getByRole("button", { name: /Generate Phase 5 compiler prompt/ }),
    ).toBeVisible()
    await expect(run.page.getByText("Version 1")).toBeVisible()

    const stored = await run.page.evaluate(async () => {
      const projects = await window.prompter.projects.list()
      const project = projects.find((item) => item.name === "Phase 5 Project") ?? null
      const prompts = await window.prompter.prompts.listAssets({ projectId: project?.id })
      const prompt =
        prompts.find((item) => item.title === "Generate Phase 5 compiler prompt") ?? null
      const versions = prompt ? await window.prompter.prompts.listVersions(prompt.id) : []
      const currentVersion = versions.find((item) => item.id === prompt?.currentVersionId) ?? null
      const settings = await window.prompter.settings.list()

      return {
        answers: currentVersion?.answers ?? null,
        bridgeKeys: Object.keys(window.prompter.promptCompiler),
        compiledPrompt: currentVersion?.compiledPrompt ?? null,
        promptCount: prompts.length,
        promptTitle: prompt?.title ?? null,
        qualityScore: currentVersion?.qualityScore ?? null,
        rendererHasPlaintextGetter: "getOpenAIKey" in window.prompter.secrets,
        settingsDump: JSON.stringify(settings),
      }
    })

    expect(stored).toMatchObject({
      bridgeKeys: ["analyze", "compile"],
      compiledPrompt: phase5CompiledPrompt,
      promptCount: 1,
      promptTitle: "Generate Phase 5 compiler prompt",
      qualityScore: 91,
      rendererHasPlaintextGetter: false,
    })
    expect(stored.answers).toContain("Compiler UI with prompt library refresh after save.")
    expect(stored.settingsDump).not.toContain(phase5PlaintextKey)

    await mkdir("test-results", { recursive: true })
    await run.page.screenshot({ path: phase5ScreenshotPath, fullPage: true })
    await testInfo.attach("phase5-llm-compiler-ui", {
      path: phase5ScreenshotPath,
      contentType: "image/png",
    })
    await run.app.close()
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
