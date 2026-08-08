import { access, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ElectronApplication, Locator, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

import { launchPrompter } from "./electron-playwright-helpers"
import {
  exactTemplateName,
  insightsProjectName,
  insightsTagName,
  lowQualityPromptTitle,
  readInsightsSnapshot,
  seedPopulatedInsights,
} from "./phase18-insights-electron-fixtures"
import { readInsightsLayout, scrollInsightsSurfaces } from "./phase18-insights-electron-layout"

const panelHeadings = [
  "Library summary",
  "Project health",
  "Scenario distribution",
  "Target agents",
  "Quality",
  "Version activity",
  "Tags",
  "Templates",
  "Project context",
  "Maintenance snapshot",
] as const
const viewports = [
  { width: 1280, height: 800 },
  { width: 900, height: 720 },
] as const

async function clickApplicationMenuItem(app: ElectronApplication, label: string): Promise<void> {
  await app.evaluate(({ BrowserWindow, Menu }, itemLabel) => {
    const menuItem = Menu.getApplicationMenu()
      ?.items.flatMap((item) => item.submenu?.items ?? [])
      .find((item) => item.label === itemLabel)
    if (menuItem?.click === undefined) {
      throw new TypeError(`Expected application menu item: ${itemLabel}`)
    }
    menuItem.click(menuItem, BrowserWindow.getAllWindows()[0], {})
  }, label)
}

async function expectMetric(panel: Locator, label: string, value: string): Promise<void> {
  const metricValue = panel.locator("dt").filter({ hasText: label }).locator("..").locator("dd")
  await expect(metricValue).toHaveText(value)
}

async function openInsights(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Library Insights" }).click()
  await expect(page.getByRole("heading", { name: "Insights Dashboard" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Library summary" })).toBeVisible()
}

async function expectDraftPreserved(page: Page): Promise<void> {
  await expect(page.getByRole("textbox", { name: "Compiler title" })).toHaveValue(
    "Phase 18 preserved draft",
  )
  await expect(page.getByRole("textbox", { name: "Original request" })).toHaveValue(
    "Keep this compiler draft through every Insights navigation.",
  )
}

test("populated Insights stays read-only while filters and navigation reach exact records", async ({
  browserName: _browserName,
}, testInfo) => {
  test.setTimeout(120_000)
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-phase18-insights-ui-"))
  const run = await launchPrompter(userDataDirectory)
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  run.page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  run.page.on("pageerror", (error) => pageErrors.push(error.message))

  try {
    // Given: a populated library whose exact template is beyond the default 100-item list.
    const seed = await seedPopulatedInsights(run.page)
    await run.page.reload()
    await expect(run.page.locator('[data-testid="app-shell"]')).toBeVisible()
    const before = await readInsightsSnapshot(run.page, seed)
    expect(before).toMatchObject({
      maintenanceStatus: "unavailable",
      reviewCount: 0,
      templateTotal: 102,
      versionQualityScore: 25,
    })
    await run.page.getByRole("textbox", { name: "Compiler title" }).fill("Phase 18 preserved draft")
    await run.page
      .getByRole("textbox", { name: "Original request" })
      .fill("Keep this compiler draft through every Insights navigation.")

    // When: the populated dashboard is opened and every dashboard-local filter is exercised.
    await openInsights(run.page)
    const summary = run.page.getByRole("region", { name: "Library summary" })
    await expectMetric(summary, "Projects", "2")
    await expectMetric(summary, "Prompt assets", "2")
    await expectMetric(summary, "Prompt versions", "6")
    await expectMetric(summary, "Tags", "2")
    await expectMetric(summary, "Prompt templates", "102")
    await expectMetric(summary, "Context profiles", "3")
    const insightsWorkspace = run.page.getByTestId("insights-workspace")
    for (const heading of panelHeadings) {
      await expect(
        insightsWorkspace.getByRole("heading", { name: heading, exact: true }),
      ).toBeVisible()
    }
    for (const content of [
      "Bugfix",
      "Feature",
      "Codex",
      "Claude Code",
      "Lowest quality current prompts",
      "Most-versioned prompts",
      insightsTagName,
      exactTemplateName,
      "Maintenance reports are not persisted",
    ]) {
      await expect(insightsWorkspace.getByText(content, { exact: false }).first()).toBeVisible()
    }
    await expect(
      insightsWorkspace.getByRole("button", { name: new RegExp(insightsProjectName) }).first(),
    ).toBeVisible()
    const projectFilter = run.page.getByRole("combobox", { name: "Project filter" })
    const dateFilter = run.page.getByRole("combobox", { name: "Date range" })
    await projectFilter.selectOption({ label: insightsProjectName })
    await expect(projectFilter).toHaveValue(seed.projectId)
    for (const value of ["7d", "30d", "90d", "year", "all"]) {
      await dateFilter.selectOption(value)
      await expect(dateFilter).toHaveValue(value)
      await expect(run.page.getByRole("heading", { name: "Library summary" })).toBeVisible()
    }
    await projectFilter.selectOption("all")
    await expect(projectFilter).toHaveValue("all")
    const mostUsedTags = run.page
      .getByRole("region", { name: "Tags" })
      .getByRole("region", { name: "Most used" })
    await expect(mostUsedTags.getByText(insightsTagName, { exact: true })).toBeVisible()
    await expect(
      mostUsedTags.getByRole("button", { name: new RegExp(insightsTagName) }),
    ).toHaveCount(0)
    for (const viewport of viewports) {
      await run.page.setViewportSize(viewport)
      const layout = await readInsightsLayout(run.page)
      expect(layout.documentHeight).toBeLessThanOrEqual(layout.viewportHeight + 2)
      expect(layout.gridHeight).toBe(layout.viewportHeight - 48)
      expect(Math.abs(layout.sidebarHeight - layout.gridHeight)).toBeLessThanOrEqual(2)
      expect(layout.sidebarScrollHeight).toBeGreaterThan(layout.sidebarClientHeight)
      expect(layout.workspaceHeight).toBe(layout.gridHeight)
      expect(layout.workspaceWidth).toBeGreaterThan(780)
      expect(Math.abs(layout.dashboardClientHeight - layout.workspaceHeight)).toBeLessThanOrEqual(2)
      expect(layout.dashboardScrollHeight).toBeGreaterThan(layout.dashboardClientHeight)
      expect(layout.dashboardScrollWidth).toBeLessThanOrEqual(layout.dashboardClientWidth + 1)
      if (viewport.width === 900) {
        expect(layout.shellScrollWidth).toBeGreaterThan(layout.shellClientWidth)
        expect(layout.gridWidth).toBeGreaterThanOrEqual(1040)
      }
      const layoutName = `phase18-layout-${viewport.width}x${viewport.height}.json`
      const layoutPath = testInfo.outputPath(layoutName)
      await writeFile(layoutPath, JSON.stringify(layout, null, 2), "utf8")
      await testInfo.attach(layoutName, {
        path: layoutPath,
        contentType: "application/json",
      })
      for (const position of ["top", "bottom"] as const) {
        await scrollInsightsSurfaces(run.page, position)
        const name = `phase18-insights-${viewport.width}x${viewport.height}-${position}.png`
        const path = testInfo.outputPath(name)
        await run.page.screenshot({ path })
        await testInfo.attach(name, { path, contentType: "image/png" })
      }
    }

    // Then: read-only navigation preserves the draft and persisted side-effect snapshot.
    await run.page
      .getByRole("region", { name: "Quality" })
      .getByRole("region", { name: "Lowest quality current prompts" })
      .getByRole("button", { name: new RegExp(lowQualityPromptTitle) })
      .click()
    await expect(run.page.locator('[data-insights-target="prompt-quality"]')).toBeFocused()
    await expectDraftPreserved(run.page)
    expect(await readInsightsSnapshot(run.page, seed)).toMatchObject({
      reviewCount: 0,
      versionQualityScore: 25,
    })

    await openInsights(run.page)
    await projectFilter.selectOption({ label: insightsProjectName })
    await expect(projectFilter).toHaveValue(seed.projectId)
    await mostUsedTags.getByRole("button", { name: new RegExp(insightsTagName) }).click()
    await expect(
      run.page
        .getByTestId("prompt-library")
        .getByRole("button", { name: `Filter tag ${insightsTagName}`, exact: true }),
    ).toHaveAttribute("aria-pressed", "true")
    await expectDraftPreserved(run.page)

    await openInsights(run.page)
    await run.page
      .getByRole("region", { name: "Templates" })
      .getByRole("region", { name: "Placeholder-heavy prompt templates" })
      .getByRole("button", { name: new RegExp(exactTemplateName) })
      .click()
    await expect(run.page.locator('[data-insights-target="prompt-templates"]')).toBeFocused()
    await expect(run.page.getByRole("textbox", { name: "Prompt template name" })).toHaveValue(
      exactTemplateName,
    )
    await expectDraftPreserved(run.page)

    await openInsights(run.page)
    await run.page
      .getByRole("region", { name: "Project context" })
      .getByRole("button", { name: new RegExp(insightsProjectName) })
      .click()
    await expect(run.page.locator('[data-insights-target="project-context"]')).toBeFocused()
    await expectDraftPreserved(run.page)

    await openInsights(run.page)
    await run.page.getByRole("button", { name: "Open Maintenance" }).click()
    await expect(run.page.locator('[data-insights-target="settings-maintenance"]')).toBeFocused()
    await expect(run.page.getByText("Run a scan to populate finding counts")).toBeVisible()
    await expectDraftPreserved(run.page)

    await clickApplicationMenuItem(run.app, "Library Insights")
    await expect(run.page.getByRole("heading", { name: "Insights Dashboard" })).toBeVisible()
    await run.page.getByRole("button", { name: "Back to library" }).click()
    await expectDraftPreserved(run.page)
    expect(await readInsightsSnapshot(run.page, seed)).toEqual(before)
    expect(consoleErrors).toEqual([])
    expect(pageErrors).toEqual([])
  } finally {
    await run.app.close()
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
