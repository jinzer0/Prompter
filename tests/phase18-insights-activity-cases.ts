import { afterEach, describe, expect, it } from "vitest"

import { createInsightsService } from "../electron/insights/service.js"
import {
  cleanupTestDatabases,
  createTestDatabase,
  DAY,
  ids,
  NOW,
  seedInsightsFixture,
} from "./phase18-insights-test-helpers.js"

afterEach(cleanupTestDatabases)

describe("Phase 18 Insights activity persistence", () => {
  it("returns stale current prompts even when newer version-heavy prompts fill the top-ten list", async () => {
    // Given: one stale current version and eleven newer prompts with more versions.
    const database = await createTestDatabase()
    seedInsightsFixture(database)
    const additions = Array.from({ length: 11 }, (_, index) => {
      const suffix = String(index + 1).padStart(12, "0")
      const assetId = `81000000-0000-4000-8000-${suffix}`
      const currentVersionId = `83000000-0000-4000-8000-${String(index + 1).padStart(6, "0")}000001`
      const versions = Array.from({ length: 6 }, (_, versionIndex) => {
        const versionSuffix = `${String(index + 1).padStart(6, "0")}${String(versionIndex + 1).padStart(6, "0")}`
        return `('83000000-0000-4000-8000-${versionSuffix}', '${assetId}', ${versionIndex + 1}, 'Input', 'Compiled', 80, ${NOW - (versionIndex + 1) * DAY})`
      }).join(",")
      return `
        INSERT INTO prompt_assets (id, project_id, title, scenario, target_agent, current_version_id, created_at, updated_at)
        VALUES ('${assetId}', '${ids.projectA}', 'New heavy ${String(index + 1).padStart(2, "0")}', 'feature', 'codex', '${currentVersionId}', ${NOW - DAY}, ${NOW - DAY});
        INSERT INTO prompt_versions (id, prompt_asset_id, version_number, original_input, compiled_prompt, quality_score, created_at) VALUES ${versions};
      `
    }).join("\n")
    database.sqlite.exec(additions)
    const service = createInsightsService({ sqlite: database.sqlite, now: () => NOW })

    // When: version activity is requested for Alpha.
    const activity = service.getVersionActivity({ projectId: ids.projectA, dateRange: "all" })

    // Then: the stale prompt remains visible despite being outside the top-ten version ranking.
    expect(activity.mostVersionedPrompts).toHaveLength(10)
    expect(activity.staleCurrentPrompts.map((prompt) => prompt.promptAssetId)).toEqual([
      ids.assetA4,
    ])
  })

  it("uses the newest scoped metadata for dashboard and project-health timestamps", async () => {
    // Given: project, context, template, harness, and empty-project metadata newer than every asset.
    const database = await createTestDatabase()
    seedInsightsFixture(database)
    const emptyProjectId = "10000000-0000-4000-8000-000000000003"
    database.sqlite.exec(`
      UPDATE projects SET updated_at = ${NOW + DAY} WHERE id = '${ids.projectA}';
      UPDATE project_context_profiles SET updated_at = ${NOW + 2 * DAY} WHERE id = '${ids.profileA}';
      UPDATE prompt_templates SET updated_at = ${NOW + 3 * DAY} WHERE id = '${ids.templateA}';
      UPDATE harness_templates SET updated_at = ${NOW + 4 * DAY} WHERE id = '${ids.invalidHarness}';
      INSERT INTO projects (id, name, description, tech_stack, default_agent, created_at, updated_at)
      VALUES ('${emptyProjectId}', 'Empty', null, null, null, ${NOW}, ${NOW + 5 * DAY});
    `)
    const service = createInsightsService({ sqlite: database.sqlite, now: () => NOW })

    // When: global and project-scoped summaries and health are queried.
    const summary = service.getDashboardSummary({ projectId: ids.projectA, dateRange: "all" })
    const health = service.getProjectHealth({ projectId: null, dateRange: "all" })

    // Then: global harnesses affect the dashboard, while health preserves scoped metadata timestamps.
    expect(summary.lastUpdatedAt).toBe(NOW + 4 * DAY)
    expect(
      health.projects.find((project) => project.projectId === ids.projectA)?.lastUpdatedAt,
    ).toBe(NOW + 2 * DAY)
    expect(
      health.projects.find((project) => project.projectId === emptyProjectId)?.lastUpdatedAt,
    ).toBe(NOW + 5 * DAY)
  })
})
