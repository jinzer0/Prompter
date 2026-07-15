import { mkdir } from "node:fs/promises"
import { expect, type Page, test } from "@playwright/test"

import { createNamedProject } from "./electron-playwright-helpers"
import {
  generatedPreview,
  withPhase13Prompter,
} from "./phase13-project-context-profiles-ui-helpers"

const savedPromptTitle = "Phase 14 Saved Review Prompt"
const draftScreenshotPath = ".omo/evidence/phase14-draft-quality-stale.png"
const savedScreenshotPath = ".omo/evidence/phase14-saved-quality-reloaded.png"

const reviewablePrompt = [
  "# Objective",
  "Ship integrated prompt quality review coverage.",
  "",
  "# Context",
  "Phase 14 verifies saved and draft prompt review lifecycles.",
  "",
  "# Task",
  "Review the prompt locally and persist only through explicit actions.",
  "",
  "# Scope",
  "Cover UI persistence without prompt execution.",
  "",
  "# Constraints",
  "Do not call external services or expose prompt text in errors.",
  "",
  "# Acceptance Criteria",
  "Saved reviews reload and stale draft reviews disable unsafe actions.",
  "",
  "# Validation",
  "npx playwright test tests/phase14-prompt-quality-ui.test.ts",
  "",
  "# Working Instructions",
  "Use local review only unless the user clicks the LLM affordance.",
  "",
  "# Final Response Format",
  "Report changed files and verification evidence.",
].join("\n")

type SavedReviewSnapshot = {
  readonly promptVersionId: string
  readonly reviewId: string
  readonly reviewCount: number
  readonly reviewScore: number
  readonly versionQualityScore: number | null
}

async function createSavedPromptViaUi(page: Page): Promise<void> {
  await page.getByTestId("prompt-library").getByRole("button", { name: "New Prompt" }).click()
  await page.getByRole("textbox", { name: "Prompt title" }).fill(savedPromptTitle)
  await page.getByRole("combobox", { exact: true, name: "Scenario" }).selectOption("feature")
  await page.getByRole("combobox", { exact: true, name: "Target agent" }).selectOption("codex")
  await page
    .getByRole("textbox", { name: "Original input" })
    .fill("Review a saved prompt version through Phase 14.")
  await page.getByRole("textbox", { name: "Compiled prompt" }).fill(reviewablePrompt)
  await page.getByRole("button", { name: "Save Prompt" }).click()

  await expect(page.getByRole("button", { name: new RegExp(savedPromptTitle) })).toBeVisible()
  await expect(page.getByText("Version 1")).toBeVisible()
}

async function selectSavedPrompt(page: Page, projectName: string): Promise<void> {
  await expect(page.locator('[data-testid="app-shell"]')).toBeVisible()
  await page.getByRole("button", { name: new RegExp(projectName) }).click()
  await page.getByRole("button", { name: new RegExp(savedPromptTitle) }).click()
  await expect(page.getByRole("heading", { name: savedPromptTitle })).toBeVisible()
}

async function readSavedReviewSnapshot(page: Page): Promise<SavedReviewSnapshot> {
  return page.evaluate(async (title) => {
    const prompts = await window.prompter.prompts.listAssets({})
    const prompt = prompts.find((item) => item.title === title)
    if (prompt === undefined || prompt.currentVersionId === null) {
      throw new Error("Phase 14 prompt with a current version was not found")
    }

    const review = await window.prompter.promptQuality.getLatestReview({
      promptVersionId: prompt.currentVersionId,
    })
    if (review === null || review.id === null) {
      throw new Error("Saved prompt quality review was not found")
    }

    const reviews = await window.prompter.promptQuality.listReviewsForVersion({
      promptVersionId: prompt.currentVersionId,
    })
    const version = await window.prompter.prompts.getVersion(prompt.currentVersionId)

    return {
      promptVersionId: prompt.currentVersionId,
      reviewId: review.id,
      reviewCount: reviews.length,
      reviewScore: review.overallScore,
      versionQualityScore: version?.qualityScore ?? null,
    }
  }, savedPromptTitle)
}

test.describe("Phase 14 prompt quality integrated UI coverage", () => {
  test("saved version review is explicit, persisted, applied, and reloaded", async ({
    browserName: _browserName,
  }, testInfo) => {
    test.setTimeout(60_000)
    const projectName = "Phase 14 Saved Review Project"

    await withPhase13Prompter("prompter-phase14-saved-review", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await createNamedProject(page, projectName)
      await createSavedPromptViaUi(page)

      await expect(page.getByText("Review result score: No review")).toBeVisible()
      await expect(page.getByText("Applied quality review score: Not applied")).toBeVisible()

      await page.getByRole("button", { name: "Review saved version locally" }).click()
      const savedReviewPanel = page.locator('[aria-labelledby="prompt-quality-review-heading"]')
      await expect(
        savedReviewPanel.getByText("Unsaved local review", { exact: true }),
      ).toBeVisible()
      await expect(savedReviewPanel.getByText("Local review", { exact: true })).toBeVisible()

      await page.getByRole("button", { name: "Save prompt quality review" }).click()
      await expect(savedReviewPanel.getByText("Saved review", { exact: true })).toBeVisible()

      await page.getByRole("button", { name: "Apply prompt quality review score" }).click()
      await expect(page.getByText(/Applied quality review score: \d+/)).toBeVisible()
      const applied = await readSavedReviewSnapshot(page)
      expect(applied.reviewCount).toBe(1)
      expect(applied.versionQualityScore).toBe(applied.reviewScore)

      await page
        .locator('[aria-labelledby="prompt-quality-review-heading"]')
        .getByRole("button", { name: "Review instructions with LLM" })
        .click()
      await expect(page.getByText("OpenAI key required")).toBeVisible()
      await expect(page.getByText("Local review remains available")).toBeVisible()

      await page.reload()
      await selectSavedPrompt(page, projectName)
      await expect(
        page
          .locator('[aria-labelledby="prompt-quality-review-heading"]')
          .getByText("Saved review", { exact: true }),
      ).toBeVisible()
      await expect(page.getByText(`Review result score: ${applied.reviewScore}`)).toBeVisible()
      await expect(
        page.getByText(`Applied quality review score: ${applied.reviewScore}`),
      ).toBeVisible()
      expect((await readSavedReviewSnapshot(page)).reviewId).toBe(applied.reviewId)

      await mkdir(".omo/evidence", { recursive: true })
      await page.screenshot({ path: savedScreenshotPath, fullPage: true })
      await testInfo.attach("phase14-saved-quality-reloaded", {
        path: savedScreenshotPath,
        contentType: "image/png",
      })
    })
  })

  test("draft review stays unsaved and becomes stale after editable prompt changes", async ({
    browserName: _browserName,
  }, testInfo) => {
    test.setTimeout(60_000)

    await withPhase13Prompter("prompter-phase14-draft-review", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.getByRole("textbox", { name: "Original request" }).fill("Review a draft prompt.")
      await page.getByRole("button", { name: "프롬프트 컴파일" }).click()
      await expect(generatedPreview(page)).toHaveValue(/# Objective/)

      await page.getByRole("button", { name: "Review draft locally" }).click()
      await expect(page.getByText("Current review")).toBeVisible()
      await expect(page.getByText(/Score \d+\/100/)).toBeVisible()
      await expect(page.getByRole("button", { name: "Save review" })).toBeDisabled()
      await expect(page.getByRole("button", { name: "Apply score" })).toBeDisabled()

      await generatedPreview(page).fill(`${await generatedPreview(page).inputValue()} `)
      await expect(page.getByText("Stale review")).toBeVisible()
      await expect(page.getByText("Run a new review after prompt inputs change.")).toBeVisible()
      await expect(page.getByRole("button", { name: "Save review" })).toBeDisabled()
      await expect(page.getByRole("button", { name: "Apply score" })).toBeDisabled()
      await expect(page.getByRole("button", { name: "Use improved prompt" })).toBeDisabled()

      const reviewRows = await page.evaluate(async () => {
        const prompts = await window.prompter.prompts.listAssets({})
        const versions = await Promise.all(
          prompts.map((prompt) => window.prompter.prompts.listVersions(prompt.id)),
        )
        const reviews = await Promise.all(
          versions
            .flat()
            .map((version) =>
              window.prompter.promptQuality.listReviewsForVersion({ promptVersionId: version.id }),
            ),
        )

        return reviews.flat().length
      })
      expect(reviewRows).toBe(0)

      await mkdir(".omo/evidence", { recursive: true })
      await page.screenshot({ path: draftScreenshotPath, fullPage: true })
      await testInfo.attach("phase14-draft-quality-stale", {
        path: draftScreenshotPath,
        contentType: "image/png",
      })
    })
  })
})
