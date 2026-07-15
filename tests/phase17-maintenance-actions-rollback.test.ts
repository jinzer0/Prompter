import { afterEach, describe, expect, it } from "vitest"

import { createSearchTestDatabase, removeSearchTestDatabases } from "./electron-search-test-helpers"
import {
  readEmptyAssetSnapshot,
  readRepairSnapshot,
  readTagSnapshot,
  snapshotTables,
} from "./phase17-maintenance-action-test-helpers"

const actionTables = [
  "prompt_assets",
  "prompt_versions",
  "tags",
  "prompt_tags",
  "prompt_search_fts",
] as const

afterEach(async () => {
  await removeSearchTestDatabases()
})

describe("Phase 17 maintenance action rollback", () => {
  it("rolls back canonical link inserts when duplicate tag deletion fails", async () => {
    // Given: a merge where the final duplicate-tag delete is forced to fail.
    const database = await createSearchTestDatabase()
    try {
      const prompt = database.services.createPromptWithInitialVersion({
        projectId: null,
        title: "Merge rollback",
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "input",
        compiledPrompt: "output",
      })
      const canonical = database.services.createTag({ name: "build tools" })
      const duplicate = database.services.createTag({ name: "Build-Tools" })
      database.services.attachTagToPrompt(prompt.asset.id, duplicate.id)
      const plan = {
        canonicalTag: readTagSnapshot(database, canonical.id),
        duplicateTags: [readTagSnapshot(database, duplicate.id)],
      }
      database.sqlite.exec(
        `CREATE TRIGGER maintenance_merge_failure BEFORE DELETE ON tags
         WHEN OLD.id = '${duplicate.id}' BEGIN SELECT RAISE(ABORT, 'merge failure'); END`,
      )
      const before = snapshotTables(database, actionTables)

      // When: the merge fails after creating the canonical link.
      const execute = () => database.services.mergeDuplicateTags(plan)

      // Then: tags and both old/new link states are fully restored.
      expect(execute).toThrow(/merge failure/)
      expect(snapshotTables(database, actionTables)).toEqual(before)
    } finally {
      database.close()
    }
  })

  it("rolls back earlier unused-tag deletes when a later delete fails", async () => {
    // Given: two selected unused tags and a trigger rejecting the second delete.
    const database = await createSearchTestDatabase()
    try {
      const first = database.services.createTag({ name: "unused first" })
      const second = database.services.createTag({ name: "unused second" })
      const plan = {
        tags: [readTagSnapshot(database, first.id), readTagSnapshot(database, second.id)],
      }
      database.sqlite.exec(
        `CREATE TRIGGER maintenance_unused_failure BEFORE DELETE ON tags
         WHEN OLD.id = '${second.id}' BEGIN SELECT RAISE(ABORT, 'unused failure'); END`,
      )
      const before = snapshotTables(database, actionTables)

      // When: execution reaches the forced second-row failure.
      const execute = () => database.services.deleteUnusedTags(plan)

      // Then: the first delete is rolled back with the second.
      expect(execute).toThrow(/unused failure/)
      expect(snapshotTables(database, actionTables)).toEqual(before)
    } finally {
      database.close()
    }
  })

  it("rolls back repaired pointers when FTS rebuilding fails", async () => {
    // Given: a valid repair plan and an index table that rejects the replacement row.
    const database = await createSearchTestDatabase()
    try {
      const prompt = database.services.createPromptWithInitialVersion({
        projectId: null,
        title: "Repair rollback",
        scenario: "bugfix",
        targetAgent: "codex",
        originalInput: "input",
        compiledPrompt: "output",
      })
      database.sqlite
        .prepare("UPDATE prompt_assets SET current_version_id = NULL WHERE id = ?")
        .run(prompt.asset.id)
      const plan = { repairs: [readRepairSnapshot(database, prompt.asset.id)] }
      database.sqlite.exec(`
        DROP TABLE prompt_search_fts;
        CREATE TABLE prompt_search_fts (
          prompt_asset_id TEXT, title TEXT CHECK (title <> 'Repair rollback'),
          original_input TEXT, compiled_prompt TEXT
        );
        INSERT INTO prompt_search_fts VALUES ('preserved', 'Preserved', 'input', 'output');
      `)
      const before = snapshotTables(database, actionTables)

      // When: FTS insertion fails after the pointer update.
      const execute = () => database.services.repairCurrentVersions(plan)

      // Then: both the pointer and prior index content are restored.
      expect(execute).toThrow(/Repair rollback/)
      expect(snapshotTables(database, actionTables)).toEqual(before)
    } finally {
      database.close()
    }
  })

  it("rolls back empty-asset link cleanup when asset deletion fails", async () => {
    // Given: an eligible tagged empty asset whose final delete is forced to fail.
    const database = await createSearchTestDatabase()
    try {
      const asset = database.services.createPromptAsset({
        projectId: null,
        title: "Empty rollback",
        scenario: "feature",
        targetAgent: "codex",
      })
      const tag = database.services.createTag({ name: "rollback link" })
      database.services.attachTagToPrompt(asset.id, tag.id)
      const plan = { assets: [readEmptyAssetSnapshot(database, asset.id)] }
      database.sqlite.exec(
        `CREATE TRIGGER maintenance_empty_failure BEFORE DELETE ON prompt_assets
         WHEN OLD.id = '${asset.id}' BEGIN SELECT RAISE(ABORT, 'empty failure'); END`,
      )
      const before = snapshotTables(database, actionTables)

      // When: deletion fails after direct prompt-tag cleanup.
      const execute = () => database.services.deleteEmptyPromptAssets(plan)

      // Then: the selected asset and its tag link are both restored.
      expect(execute).toThrow(/empty failure/)
      expect(snapshotTables(database, actionTables)).toEqual(before)
    } finally {
      database.close()
    }
  })
})
