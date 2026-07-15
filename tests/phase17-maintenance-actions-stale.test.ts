import { afterEach, describe, expect, it } from "vitest"

import { MaintenanceActionStaleError } from "../electron/maintenance/maintenance-action-repository"
import {
  createSearchTestDatabase,
  removeSearchTestDatabases,
  type TestDatabase,
} from "./electron-search-test-helpers"
import {
  readEmptyAssetSnapshot,
  readRepairSnapshot,
  readTagSnapshot,
  snapshotTables,
} from "./phase17-maintenance-action-test-helpers"

const protectedTables = ["prompt_assets", "prompt_versions", "tags", "prompt_tags"] as const
const emptyAssetStaleFixtures = [
  {
    name: "version",
    install(database: TestDatabase, promptAssetId: string) {
      database.services.createNextPromptVersion({
        promptAssetId,
        originalInput: "late version input",
        compiledPrompt: "late version output",
        makeCurrent: false,
      })
    },
  },
  {
    name: "child",
    install(database: TestDatabase, promptAssetId: string) {
      database.sqlite
        .prepare(
          `INSERT INTO prompt_assets (
            id, project_id, title, scenario, target_agent, current_version_id,
            parent_prompt_id, parent_prompt_version_id, derivation_type, created_at, updated_at
          ) VALUES (?, NULL, ?, ?, ?, NULL, ?, NULL, ?, ?, ?)`,
        )
        .run("stale-child", "Child", "feature", "codex", promptAssetId, "derived", 1, 1)
    },
  },
  {
    name: "template source",
    install(database: TestDatabase, promptAssetId: string) {
      database.sqlite
        .prepare(
          `INSERT INTO prompt_templates (
            id, name, description, source_prompt_asset_id, source_prompt_version_id,
            scenario, target_agent, template_body, created_at, updated_at
          ) VALUES (?, ?, NULL, ?, NULL, ?, ?, ?, ?, ?)`,
        )
        .run(
          "stale-template-source",
          "Source reference",
          promptAssetId,
          "feature",
          "codex",
          "Template body",
          1,
          1,
        )
    },
  },
] satisfies readonly {
  readonly name: string
  readonly install: (database: TestDatabase, promptAssetId: string) => void
}[]

afterEach(async () => {
  await removeSearchTestDatabases()
})

describe("Phase 17 maintenance stale-plan revalidation", () => {
  it("rejects a duplicate tag whose name changed after preparation", async () => {
    // Given: a prepared duplicate merge whose duplicate row is renamed before execution.
    const database = await createSearchTestDatabase()
    try {
      const canonical = database.services.createTag({ name: "build tools" })
      const duplicate = database.services.createTag({ name: "Build-Tools" })
      const plan = {
        canonicalTag: readTagSnapshot(database, canonical.id),
        duplicateTags: [readTagSnapshot(database, duplicate.id)],
      }
      database.services.updateTag(duplicate.id, { name: "unrelated" })
      const before = snapshotTables(database, protectedTables)

      // When: execution revalidates the stored snapshots.
      const execute = () => database.services.mergeDuplicateTags(plan)

      // Then: stale normalization aborts without touching links or tags.
      expect(execute).toThrow(MaintenanceActionStaleError)
      expect(snapshotTables(database, protectedTables)).toEqual(before)
    } finally {
      database.close()
    }
  })

  it("rejects an unused tag that gained a prompt link after preparation", async () => {
    // Given: an unused-tag snapshot followed by a new prompt link.
    const database = await createSearchTestDatabase()
    try {
      const prompt = database.services.createPromptWithInitialVersion({
        projectId: null,
        title: "New tag user",
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "input",
        compiledPrompt: "output",
      })
      const tag = database.services.createTag({ name: "was unused" })
      const plan = { tags: [readTagSnapshot(database, tag.id)] }
      database.services.attachTagToPrompt(prompt.asset.id, tag.id)
      const before = snapshotTables(database, protectedTables)

      // When: deletion checks current link count inside its transaction.
      const execute = () => database.services.deleteUnusedTags(plan)

      // Then: the now-used tag and its new relationship remain intact.
      expect(execute).toThrow(MaintenanceActionStaleError)
      expect(snapshotTables(database, protectedTables)).toEqual(before)
    } finally {
      database.close()
    }
  })

  it("rejects a current-version repair when a newer version appears", async () => {
    // Given: a broken-pointer plan followed by a new highest owned version.
    const database = await createSearchTestDatabase()
    try {
      const prompt = database.services.createPromptWithInitialVersion({
        projectId: null,
        title: "Stale repair",
        scenario: "bugfix",
        targetAgent: "codex",
        originalInput: "first",
        compiledPrompt: "first",
      })
      database.sqlite
        .prepare("UPDATE prompt_assets SET current_version_id = NULL WHERE id = ?")
        .run(prompt.asset.id)
      const plan = { repairs: [readRepairSnapshot(database, prompt.asset.id)] }
      database.services.createNextPromptVersion({
        promptAssetId: prompt.asset.id,
        originalInput: "new",
        compiledPrompt: "new",
        makeCurrent: false,
      })
      const before = snapshotTables(database, [...protectedTables, "prompt_search_fts"])

      // When: execution compares current pointer, count, and highest version.
      const execute = () => database.services.repairCurrentVersions(plan)

      // Then: no pointer or FTS row is rewritten from the stale plan.
      expect(execute).toThrow(MaintenanceActionStaleError)
      expect(snapshotTables(database, [...protectedTables, "prompt_search_fts"])).toEqual(before)
    } finally {
      database.close()
    }
  })

  it.each(emptyAssetStaleFixtures)("rejects an empty asset that gained a $name reference", async ({
    install,
  }) => {
    // Given: an empty-asset snapshot followed by a protected reference.
    const database = await createSearchTestDatabase()
    try {
      const asset = database.services.createPromptAsset({
        projectId: null,
        title: "Referenced empty asset",
        scenario: "feature",
        targetAgent: "codex",
      })
      const plan = { assets: [readEmptyAssetSnapshot(database, asset.id)] }
      install(database, asset.id)
      const before = snapshotTables(database, [
        ...protectedTables,
        "prompt_templates",
        "prompt_search_fts",
      ])

      // When: deletion rechecks lineage and template source references.
      const execute = () => database.services.deleteEmptyPromptAssets(plan)

      // Then: the selected asset and every reference remain unchanged.
      expect(execute).toThrow(MaintenanceActionStaleError)
      expect(
        snapshotTables(database, [...protectedTables, "prompt_templates", "prompt_search_fts"]),
      ).toEqual(before)
    } finally {
      database.close()
    }
  })
})
