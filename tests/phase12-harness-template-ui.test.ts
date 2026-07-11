import { expect, test } from "@playwright/test"

import {
  confirmSelectedHarnessDelete,
  createHarnessTemplateViaUi,
  defaultHarnessTemplateNames,
  exactHarnessQuickCaptureText,
  expectDefaultHarnessTemplateCounts,
  expectDefaultHarnessTemplatesVisible,
  expectDeletedSelectedHarnessFallsBackAfterReload,
  expectHarnessAbsent,
  expectSameSessionDeletedHarnessClearsBeforeStaticCompile,
  expectStaticCompileUsesSelectedHarness,
  fillNewHarnessNameAndBody,
  harnessTemplateCountByName,
  launchWithUserData,
  setClipboardText,
  withHarnessManager,
  withPersistentHarnessManager,
} from "./phase12-harness-template-ui-helpers"

test.describe("harness management UI flows", () => {
  test("harness management shows seeded default harness templates after app start", async () => {
    await withHarnessManager("prompter-phase12-defaults", async ({ page }) => {
      await expectDefaultHarnessTemplatesVisible(page)
    })
  })

  test("harness management restart does not duplicate seeded defaults", async () => {
    await withPersistentHarnessManager("prompter-phase12-restart-dedup", async (userData) => {
      await launchWithUserData(userData, async ({ page }) => {
        await expectDefaultHarnessTemplateCounts(page)
      })

      await launchWithUserData(userData, async ({ page }) => {
        await expectDefaultHarnessTemplateCounts(page)
        for (const templateName of defaultHarnessTemplateNames) {
          await expect(page.getByRole("button", { name: new RegExp(templateName) })).toBeVisible()
        }
      })
    })
  })

  test("harness management restart preserves edited seeded defaults", async () => {
    await withPersistentHarnessManager("prompter-phase12-edited-default", async (userData) => {
      const editedBody = "# Edited Default\n\nKeep {{originalInput}} exactly."

      await launchWithUserData(userData, async ({ page }) => {
        await page.getByRole("button", { name: /Feature Implementation/ }).click()
        await page.getByRole("textbox", { name: "Template body" }).fill(editedBody)
        await page.getByRole("button", { name: "Save Harness" }).click()
        await expect(page.getByRole("textbox", { name: "Template body" })).toHaveValue(editedBody)
      })

      await launchWithUserData(userData, async ({ page }) => {
        await page.getByRole("button", { name: /Feature Implementation/ }).click()
        await expect(page.getByRole("textbox", { name: "Template body" })).toHaveValue(editedBody)
        expect(await harnessTemplateCountByName(page, "Feature Implementation")).toBe(1)
      })
    })
  })

  test("harness management creates, edits, duplicates, and deletes a harness template", async () => {
    test.setTimeout(60_000)

    await withHarnessManager("prompter-phase12-crud", async ({ page }) => {
      const originalBody = "Exact {{originalInput}} body\n\nKeep trailing space: "

      await createHarnessTemplateViaUi(page, {
        name: "Phase 12 Harness",
        scenario: "feature",
        targetAgent: "codex",
        templateBody: originalBody,
        requiredFields: '["originalInput"]',
        clarificationPolicy: '{"mode":"ask"}',
      })
      await expect(page.getByRole("button", { name: /Phase 12 Harness/ })).toBeVisible()

      const storedBody = await page.evaluate(async () => {
        const templates = await window.prompter.harnessTemplates.list({ query: "Phase 12 Harness" })
        return (
          templates.find((template) => template.name === "Phase 12 Harness")?.templateBody ?? null
        )
      })
      expect(storedBody).toBe(originalBody)

      await page.getByRole("button", { name: /Phase 12 Harness/ }).click()
      await expect(page.getByRole("button", { name: /Phase 12 Harness/ })).toHaveAttribute(
        "aria-current",
        "page",
      )
      await page.getByRole("textbox", { name: "Harness name" }).fill("Phase 12 Harness Edited")
      await page.getByRole("button", { name: "Save Harness" }).click()
      await expect(page.getByRole("button", { name: /Phase 12 Harness Edited/ })).toBeVisible()

      await page.getByRole("button", { name: "Duplicate Harness" }).click()
      await expect(page.getByRole("button", { name: /Phase 12 Harness Edited Copy/ })).toBeVisible()

      await confirmSelectedHarnessDelete(page)
      await expect(page.getByRole("button", { name: /Phase 12 Harness Edited Copy/ })).toHaveCount(
        0,
      )
    })
  })

  test("harness management filters by name, scenario, and target agent", async () => {
    await withHarnessManager("prompter-phase12-filters", async ({ page }) => {
      await page.getByRole("textbox", { name: "Search harnesses" }).fill("Bug")
      await expect(page.getByRole("button", { name: /Bug Fix/ })).toBeVisible()
      await expect(page.getByRole("button", { name: /Feature Implementation/ })).toHaveCount(0)

      await page.getByRole("button", { name: "Clear harness filters" }).click()
      await page.getByRole("combobox", { name: "Harness scenario filter" }).selectOption("docs")
      await expect(page.getByRole("button", { name: /Documentation/ })).toBeVisible()
      await expect(page.getByRole("button", { name: /Bug Fix/ })).toHaveCount(0)

      await page
        .getByRole("combobox", { name: "Harness target agent filter" })
        .selectOption("codex")
      await expect(page.getByText("No harnesses match your filters")).toBeVisible()
    })
  })

  test("harness management deleting a seeded default allows it to reappear after restart", async () => {
    await withPersistentHarnessManager("prompter-phase12-seeded-return", async (userData) => {
      await launchWithUserData(userData, async ({ page }) => {
        await page.getByRole("button", { name: /Documentation/ }).click()
        await confirmSelectedHarnessDelete(page)
        await expectHarnessAbsent(page, "Documentation")
      })

      await launchWithUserData(userData, async ({ page }) => {
        await expect(page.getByRole("button", { name: /Documentation/ })).toBeVisible()
        expect(await harnessTemplateCountByName(page, "Documentation")).toBe(1)
      })
    })
  })

  test("harness management blocks invalid JSON before saving a harness template", async () => {
    await withHarnessManager("prompter-phase12-invalid-json", async ({ page }) => {
      await fillNewHarnessNameAndBody(page, "Invalid JSON Harness", "Body {{originalInput}}")
      await page.getByRole("textbox", { name: "Required fields JSON" }).fill("not-json")
      await page.getByRole("button", { name: "Save Harness" }).click()

      await expect(page.getByText("Enter valid JSON.")).toBeVisible()
      await expectHarnessAbsent(page, "Invalid JSON Harness")
    })
  })

  test("harness management blocks invalid clarification policy JSON before saving", async () => {
    await withHarnessManager("prompter-phase12-invalid-clarification", async ({ page }) => {
      await fillNewHarnessNameAndBody(page, "Invalid Policy Harness", "Body {{originalInput}}")
      await page.getByRole("textbox", { name: "Clarification policy JSON" }).fill("not-json")
      await page.getByRole("button", { name: "Save Harness" }).click()

      await expect(page.getByText("Enter valid JSON.")).toBeVisible()
      await expectHarnessAbsent(page, "Invalid Policy Harness")
    })
  })

  test("harness management blocks blank templateBody before IPC save", async () => {
    await withHarnessManager("prompter-phase12-blank-body", async ({ page }) => {
      await fillNewHarnessNameAndBody(page, "Blank Body Harness", " \n\t ")
      await page.getByRole("button", { name: "Save Harness" }).click()

      await expect(page.getByText("Template body is required.")).toBeVisible()
      await expectHarnessAbsent(page, "Blank Body Harness")
    })
  })
})

test.describe("Phase 12 harness template selector flows for Todo 7", () => {
  test("harness selector preserves originalInput, scenario, and targetAgent", async () => {
    await withHarnessManager("prompter-phase12-selector-preserve", async ({ page }) => {
      const originalInput = "Keep this exact request before and after harness selection."

      await page.getByRole("textbox", { name: "Original request" }).fill(originalInput)
      await page.getByRole("combobox", { exact: true, name: "Compile mode" }).selectOption("bugfix")
      await page
        .getByRole("combobox", { exact: true, name: "Compile runner" })
        .selectOption("cursor")
      await page
        .getByRole("combobox", { name: "Harness template" })
        .selectOption({ label: "Bug Fix" })

      await expect(page.getByRole("textbox", { name: "Original request" })).toHaveValue(
        originalInput,
      )
      await expect(page.getByRole("combobox", { exact: true, name: "Compile mode" })).toHaveValue(
        "bugfix",
      )
      await expect(page.getByRole("combobox", { exact: true, name: "Compile runner" })).toHaveValue(
        "cursor",
      )
      await expect(
        page.getByText(
          "Selected harness scenario or target agent differs from the current compiler draft.",
        ),
      ).toBeVisible()
    })
  })

  test("harness selector clears stale compiled prompt", async () => {
    await withHarnessManager("prompter-phase12-selector-stale", async ({ page }) => {
      const preview = page.getByRole("textbox", { name: "Generated prompt preview" })

      await page
        .getByRole("textbox", { name: "Original request" })
        .fill("Compile before selecting.")
      await page.getByRole("button", { name: "프롬프트 컴파일" }).click()
      await expect(preview).toHaveValue(/# Objective/)

      await page
        .getByRole("combobox", { name: "Harness template" })
        .selectOption({ label: "Feature Implementation" })
      await expect(preview).toHaveValue("")
      await expect(page.getByRole("button", { exact: true, name: "Copy" })).toBeDisabled()
      await expect(page.getByRole("button", { name: "Save compiled prompt" })).toBeDisabled()
    })
  })

  test("harness selector does not auto-run analyze, compile, or save", async () => {
    await withHarnessManager("prompter-phase12-selector-no-auto", async ({ page }) => {
      await page.getByRole("textbox", { name: "Original request" }).fill("Select only, do not run.")
      await page
        .getByRole("combobox", { name: "Harness template" })
        .selectOption({ label: "Feature Implementation" })

      await expect(page.getByRole("textbox", { name: "Generated prompt preview" })).toHaveValue("")
      await expect(page.getByText("Analysis is ready.")).toHaveCount(0)
      await expect(page.getByText("Compiled prompt saved.")).toHaveCount(0)
      await expect(page.getByRole("button", { name: /Select only, do not run/ })).toHaveCount(0)
    })
  })

  test("harness selector renders selected static harness only when explicitly compiled", async () => {
    await withHarnessManager("prompter-phase12-selector-static", async ({ page }) => {
      const originalInput = "Use the selected harness when I explicitly compile."

      await expectStaticCompileUsesSelectedHarness(page, originalInput)
    })
  })

  test("quick capture followed by harness selector selection preserves exact text", async () => {
    await withHarnessManager("prompter-phase12-selector-quick-capture", async ({ app, page }) => {
      await setClipboardText(app, exactHarnessQuickCaptureText)
      await page.getByRole("button", { name: "Import from Clipboard" }).click()
      await expect(page.getByRole("textbox", { name: "Original request" })).toHaveValue(
        exactHarnessQuickCaptureText,
      )

      await page
        .getByRole("combobox", { name: "Harness template" })
        .selectOption({ label: "Feature Implementation" })
      await expect(page.getByRole("textbox", { name: "Original request" })).toHaveValue(
        exactHarnessQuickCaptureText,
      )
      await expect(page.getByRole("textbox", { name: "Generated prompt preview" })).toHaveValue("")
    })
  })

  test("deleted selected harness falls back without crashing the compiler", async () => {
    await withHarnessManager("prompter-phase12-selector-deleted", async ({ page }) => {
      const originalInput = "Compile after the selected harness disappears."

      await expectDeletedSelectedHarnessFallsBackAfterReload(page, originalInput)
    })
  })

  test("same-session deleted selected harness clears before static compile", async () => {
    await withHarnessManager("prompter-phase12-selector-same-session-deleted", async ({ page }) => {
      const originalInput = "Compile after visible manager deletion without reload."

      await expectSameSessionDeletedHarnessClearsBeforeStaticCompile(page, originalInput)
    })
  })
})
