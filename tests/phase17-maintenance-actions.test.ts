import { afterEach, describe, expect, it } from "vitest"

import { createSearchTestDatabase, removeSearchTestDatabases } from "./electron-search-test-helpers"
import {
  readEmptyAssetSnapshot,
  readRepairSnapshot,
  readTagSnapshot,
} from "./phase17-maintenance-action-test-helpers"

afterEach(async () => {
  await removeSearchTestDatabases()
})

describe("Phase 17 maintenance repository actions", () => {
  it("merges duplicate tags without duplicate canonical links", async () => {
    // Given: normalized duplicate tags with disjoint and overlapping prompt links.
    const database = await createSearchTestDatabase()
    try {
      const first = database.services.createPromptWithInitialVersion({
        projectId: null,
        title: "First tagged prompt",
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "first",
        compiledPrompt: "first",
      })
      const second = database.services.createPromptWithInitialVersion({
        projectId: null,
        title: "Second tagged prompt",
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "second",
        compiledPrompt: "second",
      })
      const canonical = database.services.createTag({ name: "build tools" })
      const duplicate = database.services.createTag({ name: "Build-Tools" })
      database.services.attachTagToPrompt(first.asset.id, canonical.id)
      database.services.attachTagToPrompt(first.asset.id, duplicate.id)
      database.services.attachTagToPrompt(second.asset.id, duplicate.id)

      // When: the main-owned duplicate snapshots are merged.
      database.services.mergeDuplicateTags({
        canonicalTag: readTagSnapshot(database, canonical.id),
        duplicateTags: [readTagSnapshot(database, duplicate.id)],
      })

      // Then: both prompts have one canonical link and the duplicate tag is gone.
      expect(database.services.listTagsForPrompt(first.asset.id).map(({ id }) => id)).toEqual([
        canonical.id,
      ])
      expect(database.services.listTagsForPrompt(second.asset.id).map(({ id }) => id)).toEqual([
        canonical.id,
      ])
      expect(database.services.listTags().map(({ id }) => id)).not.toContain(duplicate.id)
    } finally {
      database.close()
    }
  })

  it("deletes only selected tags that remain unused", async () => {
    // Given: two selected unused tags and one unrelated tag.
    const database = await createSearchTestDatabase()
    try {
      const first = database.services.createTag({ name: "unused one" })
      const second = database.services.createTag({ name: "unused two" })
      const retained = database.services.createTag({ name: "retained" })

      // When: the selected zero-link snapshots are deleted.
      database.services.deleteUnusedTags({
        tags: [readTagSnapshot(database, first.id), readTagSnapshot(database, second.id)],
      })

      // Then: no unselected tag is touched.
      expect(database.services.listTags().map(({ id }) => id)).toEqual([retained.id])
    } finally {
      database.close()
    }
  })

  it("repairs a broken pointer to the highest owned version and rebuilds FTS", async () => {
    // Given: an asset with two versions, a null current pointer, and a stale index row.
    const database = await createSearchTestDatabase()
    try {
      const prompt = database.services.createPromptWithInitialVersion({
        projectId: null,
        title: "Repair target",
        scenario: "bugfix",
        targetAgent: "codex",
        originalInput: "first input",
        compiledPrompt: "first output",
      })
      const highest = database.services.createNextPromptVersion({
        promptAssetId: prompt.asset.id,
        originalInput: "highest input",
        compiledPrompt: "highest output",
        makeCurrent: false,
      }).version
      database.sqlite
        .prepare("UPDATE prompt_assets SET current_version_id = NULL WHERE id = ?")
        .run(prompt.asset.id)

      // When: the selected repair snapshot executes.
      database.services.repairCurrentVersions({
        repairs: [readRepairSnapshot(database, prompt.asset.id)],
      })

      // Then: the pointer and searchable text use the highest owned version.
      expect(database.services.getPromptAsset(prompt.asset.id)?.currentVersionId).toBe(highest.id)
      expect(
        database.sqlite
          .prepare("SELECT compiled_prompt FROM prompt_search_fts WHERE prompt_asset_id = ?")
          .pluck()
          .get(prompt.asset.id),
      ).toBe("highest output")
    } finally {
      database.close()
    }
  })

  it("deletes an eligible empty asset with only its tag and stray FTS rows", async () => {
    // Given: a zero-version asset with an allowed tag link and stale FTS row.
    const database = await createSearchTestDatabase()
    try {
      const asset = database.services.createPromptAsset({
        projectId: null,
        title: "Empty target",
        scenario: "feature",
        targetAgent: "codex",
      })
      const tag = database.services.createTag({ name: "empty-linked" })
      database.services.attachTagToPrompt(asset.id, tag.id)
      database.sqlite
        .prepare(
          "INSERT INTO prompt_search_fts (prompt_asset_id, title, original_input, compiled_prompt) VALUES (?, ?, ?, ?)",
        )
        .run(asset.id, asset.title, "stale", "stale")

      // When: the eligible asset snapshot is deleted.
      database.services.deleteEmptyPromptAssets({
        assets: [readEmptyAssetSnapshot(database, asset.id)],
      })

      // Then: only the selected asset and its direct index/link rows are removed.
      expect(database.services.getPromptAsset(asset.id)).toBeNull()
      expect(database.services.listTags().map(({ id }) => id)).toContain(tag.id)
      expect(
        database.sqlite
          .prepare("SELECT COUNT(*) FROM prompt_search_fts WHERE prompt_asset_id = ?")
          .pluck()
          .get(asset.id),
      ).toBe(0)
    } finally {
      database.close()
    }
  })

  it("exposes the shared atomic FTS rebuild for maintenance execution", async () => {
    // Given: a current prompt whose FTS row was removed.
    const database = await createSearchTestDatabase()
    try {
      const prompt = database.services.createPromptWithInitialVersion({
        projectId: null,
        title: "Maintenance rebuild",
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "rebuild input",
        compiledPrompt: "rebuild output",
      })
      database.sqlite
        .prepare("DELETE FROM prompt_search_fts WHERE prompt_asset_id = ?")
        .run(prompt.asset.id)

      // When: the maintenance-specific service helper rebuilds the index.
      database.services.rebuildMaintenanceSearchIndex()

      // Then: it uses the same owned-current-version projection as the direct API.
      expect(
        database.sqlite
          .prepare("SELECT compiled_prompt FROM prompt_search_fts WHERE prompt_asset_id = ?")
          .pluck()
          .get(prompt.asset.id),
      ).toBe("rebuild output")
    } finally {
      database.close()
    }
  })
})
