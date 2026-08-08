import { access, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

import { launchPrompter } from "./electron-playwright-helpers"

test("fresh library Insights shows the empty state without side effects", async ({
  browserName: _browserName,
}) => {
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-phase18-insights-empty-"))
  const run = await launchPrompter(userDataDirectory)
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  run.page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  run.page.on("pageerror", (error) => pageErrors.push(error.message))

  try {
    // Given: a fresh user-data database and an in-progress compiler draft.
    await access(join(userDataDirectory, "prompter.sqlite"))
    const compilerTitle = run.page.getByRole("textbox", {
      name: "Compiler title",
      includeHidden: true,
    })
    const originalRequest = run.page.getByRole("textbox", {
      name: "Original request",
      includeHidden: true,
    })
    await compilerTitle.fill("Phase 18 empty Insights draft")
    await originalRequest.fill("Keep this draft unchanged while empty Insights opens.")
    const inventoryBefore = await run.page.evaluate(async () => {
      const [projects, prompts] = await Promise.all([
        window.prompter.projects.list(),
        window.prompter.prompts.listAssets({}),
      ])
      return { projectCount: projects.length, promptCount: prompts.length }
    })
    expect(inventoryBefore).toEqual({ projectCount: 0, promptCount: 0 })

    // When: Library Insights is opened once from the fresh library.
    await run.page.getByRole("button", { name: "Library Insights" }).click()

    // Then: only the documented empty state appears and no library or draft state changes.
    const insightsWorkspace = run.page.getByTestId("insights-workspace")
    await expect(
      insightsWorkspace.getByRole("heading", { name: "Insights Dashboard" }),
    ).toBeVisible()
    await expect(run.page.getByRole("combobox", { name: "Project filter" })).toHaveValue("all")
    await expect(run.page.getByRole("combobox", { name: "Date range" })).toHaveValue("all")
    await expect(insightsWorkspace.getByText("No project or prompt inventory")).toBeVisible()
    await expect(
      insightsWorkspace.getByText("Create a project or prompt before opening library insights."),
    ).toBeVisible()
    await expect(insightsWorkspace.getByTestId("ui-card")).toHaveCount(0)
    await expect(insightsWorkspace.getByRole("button")).toHaveCount(1)
    await expect(insightsWorkspace.getByRole("button", { name: "Back to library" })).toBeVisible()
    await expect(compilerTitle).toHaveValue("Phase 18 empty Insights draft")
    await expect(originalRequest).toHaveValue(
      "Keep this draft unchanged while empty Insights opens.",
    )
    const inventoryAfter = await run.page.evaluate(async () => {
      const [projects, prompts] = await Promise.all([
        window.prompter.projects.list(),
        window.prompter.prompts.listAssets({}),
      ])
      return { projectCount: projects.length, promptCount: prompts.length }
    })
    expect(inventoryAfter).toEqual(inventoryBefore)
    expect(consoleErrors).toEqual([])
    expect(pageErrors).toEqual([])
  } finally {
    await run.app.close()
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
