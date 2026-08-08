import { access, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

import { launchPrompter } from "./electron-playwright-helpers"
import {
  installPromptCompilerIpcRecorder,
  promptCompilerIpcSnapshot,
} from "./phase13-project-context-profiles-ui-helpers"
import { expectCompilerBindingNoticeGeometry } from "./phase18-compiler-binding-geometry"
import { expectPreservedUnboundOutputBoundary } from "./phase18-compiler-unbound-output-actions"
import {
  attachCompilerRebindPng,
  compilerExistingBPromptTitle,
  compilerManualContext,
  compilerOriginalRequest,
  compilerProjectAName,
  compilerProjectBName,
  compilerSavedBPromptTitle,
  compilerTemplateName,
  compilerTemplateOutput,
  readCompilerOwnershipSnapshot,
  resizeCompilerEvidenceWindow,
  seedCompilerRebindFixture,
} from "./phase18-insights-compiler-rebind-electron-fixtures"

test("preserved compiler output requires explicit project rebind before B persistence", async ({
  browserName: _browserName,
}, testInfo) => {
  test.setTimeout(120_000)
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-phase18-compiler-rebind-"))
  const run = await launchPrompter(userDataDirectory)
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  run.page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  run.page.on("pageerror", (error) => pageErrors.push(error.message))

  try {
    // Given: project A owns compiled, templated output and authored draft fields.
    const seed = await seedCompilerRebindFixture(run.page)
    await run.page.reload()
    await run.page
      .getByTestId("left-sidebar")
      .getByRole("button", { name: new RegExp(compilerProjectAName) })
      .click()
    const title = run.page.getByRole("textbox", { name: "Compiler title" })
    const originalRequest = run.page.getByRole("textbox", { name: "Original request" })
    const manualContext = run.page.getByRole("textbox", { name: "Project context" })
    const scenario = run.page.getByRole("combobox", { name: "Compile mode" })
    const targetAgent = run.page.getByRole("combobox", { name: "Compile runner" })
    const harness = run.page.getByRole("combobox", { name: "Harness template" })
    const profile = run.page.getByRole("combobox", { name: "Project context profile" })
    const preview = run.page.getByRole("textbox", { name: "Generated prompt preview" })
    const compilerPanel = run.page.getByTestId("prompt-compiler")
    await expect(profile).toHaveValue(seed.profileAId)
    await title.fill("Phase 18 A authored prompt")
    await originalRequest.fill(compilerOriginalRequest)
    await manualContext.fill(compilerManualContext)
    await scenario.selectOption("bugfix")
    await targetAgent.selectOption("claude_code")
    await harness.selectOption(seed.harnessId)
    await installPromptCompilerIpcRecorder(run.app)
    await run.page.getByRole("button", { name: "프롬프트 컴파일" }).click()
    await expect(preview).toHaveValue(seed.staticOutput)
    const promptTemplate = run.page.getByRole("combobox", {
      name: "Prompt template",
      exact: true,
    })
    await promptTemplate.selectOption(seed.templateId)
    await run.page
      .getByRole("textbox", { name: "Template variable objective" })
      .fill("preserved A artifact")
    await run.page.getByRole("button", { name: "Apply Prompt Template" }).click()
    await run.page.getByRole("button", { name: "Confirm Apply Prompt Template" }).click()
    await expect(preview).toHaveValue(compilerTemplateOutput)
    await expect(
      run.page.getByText(`Applied prompt template: ${compilerTemplateName}`),
    ).toBeVisible()
    const before = await readCompilerOwnershipSnapshot(run.page, seed)

    // When: explicit Insights project-context navigation changes the active project to B.
    await run.page.getByRole("button", { name: "Library Insights" }).click()
    await run.page
      .getByRole("button", { name: `Open ${compilerProjectBName} project context` })
      .click()
    await expect(run.page.locator('[data-insights-target="project-context"]')).toBeFocused()
    await expect(preview).toHaveValue(compilerTemplateOutput)
    await expect(profile).toHaveValue(seed.profileAId)
    await expect(profile.locator("option:checked")).toHaveText("Unavailable Context Profile")
    await expect(profile.locator("option:checked")).toBeDisabled()
    const bindingNotice = compilerPanel.getByRole("status")
    await expect(bindingNotice).toContainText(compilerProjectBName)
    await expectCompilerBindingNoticeGeometry(bindingNotice, compilerProjectBName)
    await run.page.getByRole("button", { name: new RegExp(compilerExistingBPromptTitle) }).click()
    const saveExport = await expectPreservedUnboundOutputBoundary({
      app: run.app,
      compilerPanel,
      page: run.page,
      preview,
    })
    expect(await readCompilerOwnershipSnapshot(run.page, seed)).toEqual(before)
    await profile.selectOption(seed.profileBId)
    await title.fill(compilerSavedBPromptTitle)
    await expect(bindingNotice).toBeVisible()
    await expect(preview).toHaveValue(compilerTemplateOutput)
    await expect(scenario).toHaveValue("bugfix")
    await expect(targetAgent).toHaveValue("claude_code")
    expect(await readCompilerOwnershipSnapshot(run.page, seed)).toEqual(before)
    await resizeCompilerEvidenceWindow(run.app)
    await attachCompilerRebindPng(
      {
        anchor: bindingNotice,
        name: "phase18-compiler-preserved-unbound-controls.png",
        region: compilerPanel,
      },
      testInfo,
    )
    await attachCompilerRebindPng(
      {
        anchor: saveExport,
        name: "phase18-compiler-preserved-unbound-output-export-controls.png",
        region: compilerPanel,
      },
      testInfo,
    )
    await attachCompilerRebindPng(
      {
        anchor: promptTemplate,
        name: "phase18-compiler-preserved-unbound-template-control.png",
        region: compilerPanel,
      },
      testInfo,
    )
    await attachCompilerRebindPng(
      {
        anchor: bindingNotice,
        name: "phase18-compiler-preserved-unbound-notice.png",
        region: bindingNotice,
      },
      testInfo,
    )

    // Then: explicit rebind clears generated ownership and requires B recompilation before save.
    await run.page
      .getByRole("button", { name: `Rebind compiler to ${compilerProjectBName}` })
      .click()
    await expect(bindingNotice).toHaveCount(0)
    await expect(title).toHaveValue(compilerSavedBPromptTitle)
    await expect(originalRequest).toHaveValue(compilerOriginalRequest)
    await expect(manualContext).toHaveValue(compilerManualContext)
    await expect(scenario).toHaveValue("bugfix")
    await expect(targetAgent).toHaveValue("claude_code")
    await expect(harness).toHaveValue(seed.harnessId)
    await expect(profile).toHaveValue("")
    await expect(profile.locator("option:checked")).toHaveText("No context profile")
    const includeProfile = run.page.getByRole("checkbox", {
      name: "Include project context profile",
    })
    await expect(includeProfile).not.toBeChecked()
    await expect(includeProfile).toBeDisabled()
    await expect(preview).toHaveValue("")
    await expect(promptTemplate).toHaveValue("")
    await expect(run.page.getByRole("heading", { name: "LLM analysis" })).toHaveCount(0)
    await expect(run.page.getByRole("heading", { name: "Draft provenance" })).toHaveCount(0)
    await expect(run.page.getByRole("checkbox", { name: /Save tag/ })).toHaveCount(0)
    await expect(run.page.getByRole("button", { name: "Save compiled prompt" })).toBeDisabled()
    await expect(run.page.getByRole("button", { name: "Save as new version" })).toHaveCount(0)
    await attachCompilerRebindPng(
      {
        anchor: title,
        name: "phase18-compiler-rebound-cleared.png",
        region: compilerPanel,
      },
      testInfo,
    )
    await attachCompilerRebindPng(
      {
        anchor: profile,
        name: "phase18-compiler-rebound-cleared-profile-output.png",
        region: compilerPanel,
      },
      testInfo,
    )
    await attachCompilerRebindPng(
      {
        anchor: preview,
        name: "phase18-compiler-rebound-cleared-empty-output.png",
        region: compilerPanel,
      },
      testInfo,
    )
    await run.page.getByRole("button", { name: "프롬프트 컴파일" }).click()
    await expect(preview).toHaveValue(
      [
        "STATIC",
        compilerSavedBPromptTitle,
        compilerOriginalRequest,
        compilerManualContext,
        "bugfix",
        "claude_code",
      ].join("\n"),
    )
    await expect(run.page.getByRole("button", { name: "Save compiled prompt" })).toBeEnabled()
    await expect(run.page.getByRole("button", { name: "Save as new version" })).toBeEnabled()
    await expect(preview).toHaveJSProperty("readOnly", false)
    const reboundEditedOutput = `${await preview.inputValue()}\nRebound output edit.`
    await preview.fill(reboundEditedOutput)
    await expect(preview).toHaveValue(reboundEditedOutput)
    await expect(saveExport).toBeEnabled()
    await saveExport.click()
    await expect(run.page.getByText("Save cancelled.")).toBeVisible()
    await expect.poll(async () => (await promptCompilerIpcSnapshot(run.app)).saveExport).toBe(1)
    await attachCompilerRebindPng(
      {
        anchor: preview,
        name: "phase18-compiler-rebound-ready.png",
        region: compilerPanel,
      },
      testInfo,
    )
    await attachCompilerRebindPng(
      {
        anchor: run.page.getByRole("button", { name: "Save compiled prompt" }),
        name: "phase18-compiler-rebound-ready-save-controls.png",
        region: compilerPanel,
      },
      testInfo,
    )
    await run.page.getByRole("button", { name: "Save compiled prompt" }).click()
    await expect(run.page.getByText("Compiled prompt saved.")).toBeVisible()
    const after = await readCompilerOwnershipSnapshot(run.page, seed)
    expect(after.projectA).toEqual(before.projectA)
    expect(after.projectB).toHaveLength(before.projectB.length + 1)
    expect(
      after.projectB.filter((entry) => entry.title === compilerSavedBPromptTitle),
    ).toHaveLength(1)
    expect(after.projectA.some((entry) => entry.title === compilerSavedBPromptTitle)).toBe(false)
    expect(await promptCompilerIpcSnapshot(run.app)).toMatchObject({
      analyze: 0,
      compile: 0,
      saveExport: 1,
    })
    expect(consoleErrors).toEqual([])
    expect(pageErrors).toEqual([])
  } finally {
    await run.app.close()
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
