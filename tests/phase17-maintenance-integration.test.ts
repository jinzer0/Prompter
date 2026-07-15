import { readFile } from "node:fs/promises"

import { afterEach, describe, expect, it } from "vitest"

import { MaintenanceActionPreparationError } from "../electron/maintenance/maintenance-action-preparation"
import { createSearchTestDatabase, removeSearchTestDatabases } from "./electron-search-test-helpers"
import {
  createMaintenanceIntegrationHandlers,
  seedMaintenanceIntegrationScan,
  wholeLibraryMaintenanceInput,
} from "./phase17-maintenance-integration-helpers"

afterEach(async () => {
  await removeSearchTestDatabases()
})

describe("Phase 17 maintenance persistence and IPC integration", () => {
  it("scans whole-library and project findings, then executes only an eligible empty asset", async () => {
    // Given: every scan category, including a protected and an eligible empty asset.
    const database = await createSearchTestDatabase()
    try {
      const fixture = seedMaintenanceIntegrationScan(database)
      const handlers = createMaintenanceIntegrationHandlers(database, async () => "confirmed")

      // When: scan requests cross IPC for the whole library and current project.
      const wholeLibrary = handlers.scanMaintenanceLibrary(wholeLibraryMaintenanceInput)
      const currentProject = handlers.scanMaintenanceLibrary({
        ...wholeLibraryMaintenanceInput,
        projectId: fixture.project.id,
      })

      // Then: all categories are represented and finding-only classes expose no action.
      expect(wholeLibrary.summary.categoryCounts).toMatchObject({
        duplicate_prompts: expect.any(Number),
        duplicate_tags: 1,
        unused_tags: expect.any(Number),
        empty_prompt_assets: 2,
        current_version_issues: 1,
        search_index_health: 1,
        prompt_template_issues: expect.any(Number),
        harness_template_issues: expect.any(Number),
        quality_review_findings: expect.any(Number),
      })
      for (const category of [
        "duplicate_prompts",
        "prompt_template_issues",
        "harness_template_issues",
        "quality_review_findings",
      ] as const) {
        expect(
          wholeLibrary.findings.filter((finding) => finding.category === category).length,
        ).toBeGreaterThan(0)
        expect(
          wholeLibrary.findings
            .filter((finding) => finding.category === category)
            .every((finding) => finding.safeAutoFixAvailable === false),
        ).toBe(true)
      }
      expect(wholeLibrary.recommendedActions.map(({ actionType }) => actionType).sort()).toEqual([
        "delete_empty_prompt_assets",
        "delete_unused_tags",
        "merge_duplicate_tags",
        "rebuild_search_index",
        "repair_current_versions",
      ])
      expect(
        currentProject.findings
          .filter(({ category }) => category === "duplicate_prompts")
          .every(
            ({ affectedEntityIds }) => !affectedEntityIds.includes(fixture.foreignPrompt.asset.id),
          ),
      ).toBe(true)

      // When: main rejects the protected selection, then prepares and executes the eligible one.
      expect(() =>
        handlers.prepareMaintenanceAction({
          actionType: "delete_empty_prompt_assets",
          promptAssetIds: [fixture.protectedEmpty.id],
        }),
      ).toThrow(MaintenanceActionPreparationError)
      const prepared = handlers.prepareMaintenanceAction({
        actionType: "delete_empty_prompt_assets",
        promptAssetIds: [fixture.eligibleEmpty.id],
      })
      const result = await handlers.executeMaintenanceAction({
        actionSessionId: prepared.actionSessionId,
        actionType: prepared.actionType,
      })

      // Then: the confirmed action deletes only the eligible row.
      expect(result).toMatchObject({ status: "succeeded", changedCount: 1, skippedCount: 0 })
      expect(database.services.getPromptAsset(fixture.eligibleEmpty.id)).toBeNull()
      expect(database.services.getPromptAsset(fixture.protectedEmpty.id)?.id).toBe(
        fixture.protectedEmpty.id,
      )
    } finally {
      database.close()
    }
  })

  it("registers every focused Phase 17 integration suite in Vitest", async () => {
    // Given: the checked-in Vitest configuration.
    const source = await readFile("vitest.config.ts", "utf8")

    // When: Phase 17 focused suite paths are inspected.
    const requiredSuites = [
      "tests/phase17-maintenance-scan.test.ts",
      "tests/phase17-maintenance-actions.test.ts",
      "tests/phase17-maintenance-integration.test.ts",
      "tests/phase17-maintenance-integration-sessions.test.ts",
    ] as const

    // Then: each suite participates in default Vitest runs.
    for (const suite of requiredSuites) {
      expect(source).toContain(`"${suite}"`)
    }
  })
})
