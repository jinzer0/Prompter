import { afterEach, describe, expect, it } from "vitest"
import {
  expectedColumns,
  expectedTables,
  forbiddenPromptTemplateColumns,
  forbiddenTables,
  stringArraySchema,
} from "./phase2-schema-contract"
import {
  createCurrentDatabase,
  createUpgradedPhase14Database,
  insertLineageRows,
  readColumnNames,
  readForeignKeys,
  readIndexNames,
  readLineageRow,
  readPreservedRows,
  readTemplateSourceRow,
  removePhase15TestDatabases,
  sourceAssetId,
  sourceVersionId,
} from "./phase15-schema-migration-helpers"

afterEach(async () => {
  await removePhase15TestDatabases()
})

describe("Phase 15 schema migration", () => {
  it("creates the exact lineage and prompt template schema on a fresh database", async () => {
    // Given: an empty database migrated through every checked-in migration.
    const database = await createCurrentDatabase("prompter-phase15-fresh-")

    try {
      // When: table, column, index, and foreign-key metadata are inspected.
      const tableNames = stringArraySchema.parse(
        database.sqlite
          .prepare("select name from sqlite_master where type = 'table'")
          .pluck()
          .all(),
      )
      const assetColumns = readColumnNames(database, "prompt_assets")
      const templateColumns = readColumnNames(database, "prompt_templates")
      const assetIndexes = readIndexNames(database, "prompt_assets")
      const templateIndexes = readIndexNames(database, "prompt_templates")
      const assetForeignKeys = readForeignKeys(database, "prompt_assets")
      const templateForeignKeys = readForeignKeys(database, "prompt_templates")

      // Then: only the approved Phase 15 storage and lookup paths exist.
      expect(tableNames).toEqual(expect.arrayContaining([...expectedTables]))
      for (const tableName of forbiddenTables) expect(tableNames).not.toContain(tableName)
      expect(assetColumns).toEqual(expect.arrayContaining([...expectedColumns.prompt_assets]))
      expect(assetColumns).toHaveLength(expectedColumns.prompt_assets.length)
      expect(templateColumns).toEqual([...expectedColumns.prompt_templates])
      for (const columnName of forbiddenPromptTemplateColumns) {
        expect(templateColumns).not.toContain(columnName)
      }
      expect(assetIndexes).toEqual(
        expect.arrayContaining([
          "sqlite_autoindex_prompt_assets_1",
          "prompt_assets_project_id_idx",
          "prompt_assets_parent_prompt_id_idx",
          "prompt_assets_parent_prompt_version_id_idx",
          "prompt_assets_derivation_type_idx",
        ]),
      )
      expect(assetIndexes).toHaveLength(5)
      expect(templateIndexes).toEqual(
        expect.arrayContaining([
          "sqlite_autoindex_prompt_templates_1",
          "prompt_templates_source_prompt_asset_id_idx",
          "prompt_templates_source_prompt_version_id_idx",
          "prompt_templates_scenario_idx",
          "prompt_templates_target_agent_idx",
          "prompt_templates_updated_at_idx",
        ]),
      )
      expect(templateIndexes).toHaveLength(6)
      expect(assetForeignKeys).toEqual(
        expect.arrayContaining([
          {
            from: "project_id",
            table: "projects",
            to: "id",
            on_delete: "SET NULL",
          },
          {
            from: "parent_prompt_id",
            table: "prompt_assets",
            to: "id",
            on_delete: "SET NULL",
          },
          {
            from: "parent_prompt_version_id",
            table: "prompt_versions",
            to: "id",
            on_delete: "SET NULL",
          },
        ]),
      )
      expect(assetForeignKeys).toHaveLength(3)
      expect(templateForeignKeys).toEqual(
        expect.arrayContaining([
          {
            from: "source_prompt_asset_id",
            table: "prompt_assets",
            to: "id",
            on_delete: "SET NULL",
          },
          {
            from: "source_prompt_version_id",
            table: "prompt_versions",
            to: "id",
            on_delete: "SET NULL",
          },
        ]),
      )
      expect(templateForeignKeys).toHaveLength(2)
    } finally {
      database.close()
    }
  })

  it("preserves Phase 14 project, prompt, harness, and review rows during upgrade", async () => {
    // Given: a Phase 14 database containing representative rows from each existing feature.
    const upgradedDatabase = await createUpgradedPhase14Database()

    // When: the database is reopened against the complete migration folder.

    try {
      // Then: all Phase 14 data remains and new nullable storage is available.
      expect(readPreservedRows(upgradedDatabase)).toEqual({
        project_name: "Phase 14 project",
        asset_title: "Phase 14 prompt",
        compiled_prompt: "# Objective\nPreserve this prompt",
        harness_name: "Phase 14 harness",
        review_score: 88,
      })
      expect(readColumnNames(upgradedDatabase, "prompt_assets")).toEqual(
        expect.arrayContaining(["parent_prompt_version_id", "derivation_type"]),
      )
      expect(readColumnNames(upgradedDatabase, "prompt_templates")).toEqual([
        ...expectedColumns.prompt_templates,
      ])
    } finally {
      upgradedDatabase.close()
    }
  })

  it("nulls deleted lineage and template sources while preserving dependent rows", async () => {
    // Given: derived asset and template rows linked to one source asset and version.
    const database = await createCurrentDatabase("prompter-phase15-delete-")
    try {
      insertLineageRows(database)

      // When: the source version and then source asset are deleted.
      database.sqlite.prepare("delete from prompt_versions where id = ?").run(sourceVersionId)
      expect(readLineageRow(database)).toEqual({
        parent_prompt_id: sourceAssetId,
        parent_prompt_version_id: null,
        derivation_type: "derived",
      })
      expect(readTemplateSourceRow(database)).toEqual({
        source_prompt_asset_id: sourceAssetId,
        source_prompt_version_id: null,
      })
      database.sqlite.prepare("delete from prompt_assets where id = ?").run(sourceAssetId)

      // Then: source IDs are null, derivation remains, and child/template rows remain.
      expect(readLineageRow(database)).toEqual({
        parent_prompt_id: null,
        parent_prompt_version_id: null,
        derivation_type: "derived",
      })
      expect(readTemplateSourceRow(database)).toEqual({
        source_prompt_asset_id: null,
        source_prompt_version_id: null,
      })
    } finally {
      database.close()
    }
  })
})
