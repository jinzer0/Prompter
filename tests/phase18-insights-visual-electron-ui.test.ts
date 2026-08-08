import { access, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Locator, Page, TestInfo } from "@playwright/test"
import { expect, test } from "@playwright/test"

import { launchPrompter } from "./electron-playwright-helpers"
import {
  expectNoPromptCompilerIpcCalls,
  installPromptCompilerIpcRecorder,
} from "./phase13-project-context-profiles-ui-helpers"
import {
  expectCompilerBindingNoticeGeometry,
  expectProfileSelectChevronGeometry,
} from "./phase18-compiler-binding-geometry"
import { readInsightsLayout, scrollInsightsSurfaces } from "./phase18-insights-electron-layout"
import {
  seedMixedCjkInsights,
  visualProfileName,
  visualProjectAName,
  visualProjectBName,
  visualPromptTitle,
  visualTagName,
  visualTemplateName,
  visualUnusedTagName,
} from "./phase18-insights-visual-electron-fixtures"
import { expectTagDistributionRowsContained } from "./phase18-insights-visual-geometry"

const viewports = [
  { width: 1280, height: 800 },
  { width: 900, height: 720 },
] as const
const focusableSelector = [
  "button:not([disabled])",
  "select:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
].join(",")

async function attachPng(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const path = testInfo.outputPath(name)
  await page.screenshot({ path })
  await testInfo.attach(name, { path, contentType: "image/png" })
}

async function focusWithKeyboard(page: Page, target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded()
  const originAttribute = "data-phase18-keyboard-origin"
  const hasOrigin = await target.evaluate((element, selector) => {
    if (!(element instanceof HTMLElement)) return false
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
      (candidate) => candidate.tabIndex >= 0 && candidate.getClientRects().length > 0,
    )
    for (const candidate of candidates) {
      candidate.removeAttribute("data-phase18-keyboard-origin")
    }
    const targetIndex = candidates.indexOf(element)
    const origin = candidates[targetIndex - 1]
    if (origin === undefined) return false
    origin.setAttribute("data-phase18-keyboard-origin", "true")
    return true
  }, focusableSelector)
  expect(hasOrigin).toBe(true)
  await page.locator(`[${originAttribute}="true"]`).press("Tab")
  await expect(target).toBeFocused()
  const hasVisibleRing = await target.evaluate((element) => {
    const style = getComputedStyle(element)
    const outlineVisible =
      style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0
    const shadowVisible =
      style.boxShadow !== "none" && /(?:^|\s)[1-9]\d*(?:\.\d+)?px/.test(style.boxShadow)
    return outlineVisible || shadowVisible
  })
  expect(hasVisibleRing).toBe(true)
}

test("mixed-CJK Insights visual evidence preserves keyboard focus and unavailable context", async ({
  browserName: _browserName,
}, testInfo) => {
  test.setTimeout(120_000)
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-phase18-insights-visual-"))
  const run = await launchPrompter(userDataDirectory)
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  run.page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  run.page.on("pageerror", (error) => pageErrors.push(error.message))

  try {
    // Given: deterministic mixed-CJK Insights data and an included project-A compiler profile.
    const seed = await seedMixedCjkInsights(run.page)
    await run.page.reload()
    await expect(run.page.getByTestId("app-shell")).toBeVisible()
    await run.page
      .getByTestId("left-sidebar")
      .getByRole("button", { name: new RegExp(visualProjectAName) })
      .click()
    const compilerTitle = run.page.getByRole("textbox", { name: "Compiler title" })
    const originalRequest = run.page.getByRole("textbox", { name: "Original request" })
    const profileSelector = run.page.getByRole("combobox", { name: "Project context profile" })
    const includeProfile = run.page.getByRole("checkbox", {
      name: "Include project context profile",
    })
    await expect(profileSelector).toHaveValue(seed.profileAId)
    await compilerTitle.fill("Phase 18 다국어 compiler draft title remains exact")
    await originalRequest.fill(
      "한국어 original request and Latin title must survive Insights navigation.",
    )
    await includeProfile.check()
    await installPromptCompilerIpcRecorder(run.app)

    // When: the complete dashboard is captured at both desktop targets and scroll extents.
    await run.page.getByRole("button", { name: "Library Insights" }).click()
    await expect(run.page.getByRole("heading", { name: "Insights Dashboard" })).toBeVisible()
    const leftSidebar = run.page.getByTestId("left-sidebar")
    const longProjectRow = leftSidebar.getByRole("button", {
      name: new RegExp(visualProjectBName),
    })
    const longProjectLabel = longProjectRow.getByText(visualProjectBName, { exact: true })
    const projectMetadata = longProjectRow.locator(":scope > span").last()
    await expect(longProjectLabel).toHaveCSS("word-break", "keep-all")
    await expect(longProjectLabel).toHaveCSS("overflow-wrap", "anywhere")
    await expect(longProjectLabel).toHaveCSS("min-width", "0px")
    await expect(projectMetadata).toHaveCSS("flex-shrink", "0")
    for (const text of [
      visualProjectAName,
      visualProjectBName,
      visualPromptTitle,
      visualTagName,
      visualUnusedTagName,
      visualTemplateName,
      visualProfileName,
    ]) {
      await expect(run.page.getByText(text, { exact: false }).first()).toBeAttached()
    }
    for (const viewport of viewports) {
      await run.page.setViewportSize(viewport)
      const layout = await readInsightsLayout(run.page)
      expect(layout.sidebarScrollWidth).toBeLessThanOrEqual(layout.sidebarClientWidth)
      if (viewport.width === 900) {
        expect(layout.shellScrollWidth).toBeGreaterThan(layout.shellClientWidth)
      }
      for (const position of ["top", "bottom"] as const) {
        await scrollInsightsSurfaces(run.page, position)
        await attachPng(
          run.page,
          testInfo,
          `phase18-visual-dashboard-${viewport.width}x${viewport.height}-${position}.png`,
        )
      }
    }

    // Then: each required action receives a visible focus ring through a final keyboard Tab.
    await run.page.setViewportSize({ width: 1280, height: 800 })
    await scrollInsightsSurfaces(run.page, "top")
    const projectContextAction = run.page.getByRole("button", {
      name: `Open ${visualProjectAName} project context`,
    })
    await focusWithKeyboard(run.page, projectContextAction)
    await attachPng(run.page, testInfo, "phase18-focus-project-health-context.png")

    const unusedTagsAction = run.page.getByRole("button", {
      name: "Open unused tags in Maintenance",
    })
    await focusWithKeyboard(run.page, unusedTagsAction)
    await attachPng(run.page, testInfo, "phase18-focus-open-unused-tags.png")

    const projectFilter = run.page.getByRole("combobox", { name: "Project filter" })
    await projectFilter.selectOption(seed.projectAId)
    for (const viewport of viewports) {
      await run.page.setViewportSize(viewport)
      await expectTagDistributionRowsContained(run.page)
    }
    await run.page.setViewportSize({ width: 1280, height: 800 })
    const scopedTagAction = run.page
      .getByRole("region", { name: "Tags" })
      .getByRole("region", { name: "Most used" })
      .getByRole("button", { name: new RegExp(visualTagName) })
    await expect(scopedTagAction).toBeVisible()
    await focusWithKeyboard(run.page, scopedTagAction)
    await attachPng(run.page, testInfo, "phase18-focus-project-scoped-most-used-tag.png")

    // And: explicit project-B context navigation retains the unavailable project-A selection.
    await projectFilter.selectOption("all")
    const projectBContextAction = run.page.getByRole("button", {
      name: `Open ${visualProjectBName} project context`,
    })
    await expect(projectBContextAction).toBeVisible()
    await projectBContextAction.click()
    await expect(run.page.locator('[data-insights-target="project-context"]')).toBeFocused()
    await expect(profileSelector).toHaveValue(seed.profileAId)
    await expect(profileSelector.locator("option:checked")).toHaveText(
      "Unavailable Context Profile",
    )
    await expect(profileSelector.locator("option:checked")).toBeDisabled()
    await expect(includeProfile).toBeChecked()
    await expect(includeProfile).toBeDisabled()
    const bindingNotice = run.page.getByTestId("prompt-compiler").getByRole("status")
    await expect(bindingNotice).toContainText(visualProjectBName)
    await expectProfileSelectChevronGeometry(profileSelector)
    await expectCompilerBindingNoticeGeometry(bindingNotice, visualProjectBName)
    await expect(compilerTitle).toHaveValue("Phase 18 다국어 compiler draft title remains exact")
    await expect(originalRequest).toHaveValue(
      "한국어 original request and Latin title must survive Insights navigation.",
    )
    await expectNoPromptCompilerIpcCalls(run.app)
    await attachPng(run.page, testInfo, "phase18-unavailable-context-profile-retained.png")
    expect(consoleErrors).toEqual([])
    expect(pageErrors).toEqual([])
  } finally {
    await run.app.close()
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
