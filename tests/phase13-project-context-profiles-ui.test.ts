import { mkdir } from "node:fs/promises"
import { expect, test } from "@playwright/test"

import { createNamedProject } from "./electron-playwright-helpers"
import {
  phase5AnalyzeResponse,
  phase5CompileResponse,
  phase5PlaintextKey,
} from "./phase5-llm-compiler-fixtures"
import {
  exactHarnessQuickCaptureText,
  setClipboardText,
} from "./phase12-harness-template-ui-helpers"
import {
  defaultProfileForProject,
  expectNoPromptCompilerIpcCalls,
  generatedPreview,
  includeProfileToggle,
  installPromptCompilerIpcRecorder,
  originalRequest,
  profileByName,
  profileCountByProjectName,
  profileSelector,
  promptCompilerIpcSnapshot,
  updateDefaultProfile,
  withPhase13Project,
  withPhase13Prompter,
} from "./phase13-project-context-profiles-ui-helpers"

const unavailableProfileWarning =
  "Selected project context profile is unavailable; profile context was excluded."

test.describe("project context profile management", () => {
  test("profile management creates, edits, duplicates, deletes, and clears defaults", async () => {
    test.setTimeout(60_000)

    await withPhase13Prompter("prompter-phase13-profiles", async ({ page }) => {
      const projectName = "Phase 13 Project"

      await expect(page.getByText("프로젝트를 선택하세요")).toBeVisible()
      await createNamedProject(page, projectName)
      await expect(page.getByRole("button", { name: /^Default Context, Updated/ })).toBeVisible()

      await page.getByRole("button", { name: /^Default Context, Updated/ }).click()
      await page.getByRole("button", { name: "Delete Context Profile" }).click()
      await page.getByRole("button", { name: "Confirm Delete Context Profile" }).click()
      await expect(page.getByText("컨텍스트 프로파일이 없습니다")).toBeVisible()

      await page.getByRole("button", { name: "Default Context 만들기" }).click()
      await expect(page.getByRole("button", { name: /^Default Context, Updated/ })).toBeVisible()
      await page.getByRole("button", { name: /^Default Context, Updated/ }).click()
      await page.getByRole("button", { name: "Delete Context Profile" }).click()
      await page.getByRole("button", { name: "Confirm Delete Context Profile" }).click()
      await expect(page.getByText("컨텍스트 프로파일이 없습니다")).toBeVisible()

      await page.getByRole("button", { name: "New Context Profile" }).click()
      await page.getByRole("button", { name: "Save Context Profile" }).click()
      await expect(page.getByText("Profile name is required.")).toBeVisible()
      expect(await profileCountByProjectName(page, projectName)).toBe(0)

      await page.getByRole("textbox", { name: "Context profile name" }).fill("  Alpha  ")
      await page.getByRole("textbox", { name: "Summary" }).fill("\n  Summary body  \n")
      await page.getByRole("textbox", { name: "Tech stack" }).fill("  Electron\nReact  ")
      await page.getByRole("textbox", { name: "Package manager" }).fill(" npm ")
      await page.getByRole("textbox", { name: "Repo path" }).fill(" /tmp/Prompter ")
      await page.getByRole("button", { name: "Save Context Profile" }).click()
      await expect(page.getByRole("button", { name: /Alpha/ })).toBeVisible()

      const storedProfile = await profileByName(page, projectName, "Alpha")
      expect(storedProfile?.summary).toBe("\n  Summary body  \n")
      expect(storedProfile?.techStack).toBe("  Electron\nReact  ")
      expect(storedProfile?.packageManager).toBe(" npm ")
      expect(storedProfile?.repoPath).toBe(" /tmp/Prompter ")

      await page.getByRole("textbox", { name: "Context profile name" }).fill("Alpha Edited")
      await page.getByRole("button", { name: "Save Context Profile" }).click()
      await expect(page.getByRole("button", { name: /Alpha Edited/ })).toBeVisible()
      await page.getByRole("button", { name: "Set Default Context Profile" }).click()
      await expect(page.getByTestId("ui-badge").filter({ hasText: /^Default$/ })).toBeVisible()
      await page.getByRole("button", { name: "Duplicate Context Profile" }).click()
      await expect(page.getByRole("button", { name: /Alpha Edited Copy/ })).toBeVisible()
      await page.getByRole("button", { name: "Delete Context Profile" }).click()
      await page.getByRole("button", { name: "Confirm Delete Context Profile" }).click()
      await expect(page.getByRole("button", { name: /Alpha Edited Copy/ })).toHaveCount(0)
      await page.getByRole("button", { name: /Alpha Edited/ }).click()
      await page.getByRole("button", { name: "Delete Context Profile" }).click()
      await page.getByRole("button", { name: "Confirm Delete Context Profile" }).click()
      await expect(page.getByText("컨텍스트 프로파일이 없습니다")).toBeVisible()
    })
  })

  test("compiler selector requires explicit include and static compile uses bridge context", async () => {
    test.setTimeout(60_000)

    await withPhase13Project("Phase 13 Static Project", async ({ app, page }) => {
      const ids = await defaultProfileForProject(page, "Phase 13 Static Project")
      const profileEditor = page.getByTestId("left-sidebar")
      await page.getByRole("button", { name: /^Default Context, Updated/ }).click()
      await profileEditor
        .getByRole("textbox", { name: "Summary" })
        .fill("Compiler selector bridge preview")
      await profileEditor
        .getByRole("textbox", { name: "Validation commands" })
        .fill("npm run typecheck")
      await page.getByRole("button", { name: "Save Context Profile" }).click()
      await expect(
        page.locator("pre", { hasText: "Compiler selector bridge preview" }),
      ).toBeVisible()
      const selector = profileSelector(page)
      const includeToggle = includeProfileToggle(page)
      const preview = generatedPreview(page)

      await expect(selector).toHaveValue(ids.profileId)
      await expect(page.getByText("Recommended default")).toBeVisible()
      await expect(includeToggle).not.toBeChecked()
      await expect(
        page.locator("pre", { hasText: "Compiler selector bridge preview" }),
      ).toBeVisible()
      await installPromptCompilerIpcRecorder(app)

      await originalRequest(page).fill("Static include behavior stays explicit.")
      await page.getByRole("button", { name: "프롬프트 컴파일" }).click()
      await expect(preview).toHaveValue(/Static include behavior stays explicit/)
      await expect(preview).not.toHaveValue(/## Project Context Profile/)
      await expectNoPromptCompilerIpcCalls(app)

      await includeToggle.check()
      await expectNoPromptCompilerIpcCalls(app)
      await page.getByRole("button", { name: "프롬프트 컴파일" }).click()
      await expect(preview).toHaveValue(/# Context\n## Project Context Profile/)
      await expect(preview).toHaveValue(/Compiler selector bridge preview/)
      await expect(preview).toHaveValue(/npm run typecheck/)

      await page.getByRole("combobox", { name: "Harness template" }).selectOption({
        label: "Feature Implementation",
      })
      await page.getByRole("button", { name: "프롬프트 컴파일" }).click()
      await expect(preview).toHaveValue(/# Feature Implementation/)
      await expect(preview).not.toHaveValue(/## Project Context Profile/)
      await expect(preview).not.toHaveValue(/Compiler selector bridge preview/)

      await createNamedProject(page, "Phase 13 Cross Project")
      await expect(includeToggle).not.toBeChecked()
      await expectNoPromptCompilerIpcCalls(app)
      const crossProject = await defaultProfileForProject(page, "Phase 13 Cross Project")
      const crossProjectResult = await page.evaluate(
        async ({ projectId, profileId }) =>
          window.prompter.projectContextProfiles.buildCompilerContext(projectId, profileId),
        { projectId: crossProject.projectId, profileId: ids.profileId },
      )
      expect(crossProjectResult).toMatchObject({
        context: null,
        warnings: [unavailableProfileWarning],
      })
    })
  })

  test("profile edit and delete clear stale output without auto LLM calls", async () => {
    test.setTimeout(60_000)

    await withPhase13Project("Phase 13 Deletion Project", async ({ app, page }) => {
      const ids = await defaultProfileForProject(page, "Phase 13 Deletion Project")
      const selector = profileSelector(page)
      const includeToggle = includeProfileToggle(page)
      const preview = generatedPreview(page)

      await installPromptCompilerIpcRecorder(app)
      await includeToggle.check()
      await originalRequest(page).fill("Keep deletion input exact")
      await page.getByRole("button", { name: "프롬프트 컴파일" }).click()
      await expect(preview).toHaveValue(/Keep deletion input exact/)
      await expect(page.getByRole("button", { exact: true, name: "Copy" })).toBeEnabled()

      await page.getByRole("button", { name: /^Default Context, Updated/ }).click()
      await page.getByRole("textbox", { name: "Summary" }).fill("Edited included profile preview")
      await page.getByRole("button", { name: "Save Context Profile" }).click()
      await expect(
        page.locator("pre", { hasText: "Edited included profile preview" }),
      ).toBeVisible()
      await expect(preview).toHaveValue("")
      await expect(page.getByRole("button", { exact: true, name: "Copy" })).toBeDisabled()
      await expect(page.getByRole("button", { name: "Save compiled prompt" })).toBeDisabled()
      await expectNoPromptCompilerIpcCalls(app)

      await page.getByRole("button", { name: "Delete Context Profile" }).click()
      await page.getByRole("button", { name: "Confirm Delete Context Profile" }).click()
      await expect(selector).toHaveValue("")
      await expect(includeToggle).toBeDisabled()
      const deletedResult = await page.evaluate(
        async ({ projectId, profileId }) =>
          window.prompter.projectContextProfiles.buildCompilerContext(projectId, profileId),
        ids,
      )
      expect(deletedResult).toMatchObject({ context: null, warnings: [unavailableProfileWarning] })
      await page.getByRole("button", { name: "프롬프트 컴파일" }).click()
      await expect(preview).toHaveValue(/Keep deletion input exact/)
      await expect(preview).not.toHaveValue(/Edited included profile preview/)
      await expectNoPromptCompilerIpcCalls(app)

      await mkdir(".omo/evidence", { recursive: true })
      await page.screenshot({
        path: ".omo/evidence/phase13-project-context-deleted-profile-cleared.png",
        fullPage: true,
      })
    })
  })

  test("LLM test client receives explicit include payload without real OpenAI", async () => {
    test.setTimeout(60_000)

    await withPhase13Project(
      "Phase 13 LLM Project",
      async ({ app, page }) => {
        const ids = await updateDefaultProfile(page, "Phase 13 LLM Project", {
          summary: "LLM included profile context",
          constraints: "Never scan repoPath during UI tests.",
        })

        await page.getByRole("textbox", { name: "OpenAI API key" }).fill(phase5PlaintextKey)
        await page.getByRole("button", { name: "Save API key" }).click()
        await expect(page.getByText("OpenAI key saved.")).toBeVisible()
        await installPromptCompilerIpcRecorder(app)
        await includeProfileToggle(page).check()
        await originalRequest(page).fill("Build the Phase 13 LLM profile include flow.")

        await page.getByRole("button", { name: "분석하기" }).click()
        await expect(
          page.getByText("The request needs one clarification before compiling."),
        ).toBeVisible()
        await page
          .getByRole("textbox", { name: "Answer for focus" })
          .fill("Profile include payloads.")
        await page.getByRole("button", { name: "최종 프롬프트 생성" }).click()
        await expect(generatedPreview(page)).toContainText("# Objective")
        await expect(page.getByText("Quality score: 91")).toBeVisible()

        const snapshot = await promptCompilerIpcSnapshot(app)
        expect(snapshot.analyze).toBe(1)
        expect(snapshot.compile).toBe(1)
        expect(snapshot.lastAnalyzeInput).toMatchObject({
          includeProjectContextProfile: true,
          projectContextProfileId: ids.profileId,
          projectId: ids.projectId,
        })
        expect(snapshot.lastCompileInput).toMatchObject({
          includeProjectContextProfile: true,
          projectContextProfileId: ids.profileId,
          projectId: ids.projectId,
        })
        await expect(page.getByText(phase5PlaintextKey)).toHaveCount(0)
      },
      {
        PROMPTER_TEST_LLM_ANALYZE_RESPONSE: phase5AnalyzeResponse,
        PROMPTER_TEST_LLM_COMPILE_RESPONSE: phase5CompileResponse,
      },
    )
  })

  test("quick capture whitespace survives profile and harness selector changes", async () => {
    await withPhase13Project("Phase 13 Quick Capture Project", async ({ app, page }) => {
      await setClipboardText(app, exactHarnessQuickCaptureText)
      await page.getByRole("button", { name: "Import from Clipboard" }).click()
      await expect(originalRequest(page)).toHaveValue(exactHarnessQuickCaptureText)

      await includeProfileToggle(page).check()
      await profileSelector(page).selectOption("")
      await profileSelector(page).selectOption(
        (await defaultProfileForProject(page, "Phase 13 Quick Capture Project")).profileId,
      )
      await page.getByRole("combobox", { name: "Harness template" }).selectOption({
        label: "Feature Implementation",
      })

      await expect(originalRequest(page)).toHaveValue(exactHarnessQuickCaptureText)
      await expect(generatedPreview(page)).toHaveValue("")
    })
  })
})
