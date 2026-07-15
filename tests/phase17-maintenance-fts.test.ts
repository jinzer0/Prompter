import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"

import { rebuildSearchIndexAtomically } from "../electron/db/repositories/search"
import {
  createSearchTestDatabase,
  removeSearchTestDatabases,
  type TestDatabase,
} from "./electron-search-test-helpers"

const indexedRowsSchema = z.array(
  z.object({
    promptAssetId: z.string(),
    title: z.string(),
    originalInput: z.string(),
    compiledPrompt: z.string(),
  }),
)

type PromptInput = {
  readonly title: string
  readonly originalInput: string
  readonly compiledPrompt: string
}

function createIndexedPrompt(database: TestDatabase, input: PromptInput) {
  return database.services.createPromptWithInitialVersion({
    projectId: null,
    title: input.title,
    scenario: "feature",
    targetAgent: "codex",
    originalInput: input.originalInput,
    compiledPrompt: input.compiledPrompt,
  })
}

function readIndexedRows(database: TestDatabase) {
  return indexedRowsSchema.parse(
    database.sqlite
      .prepare(
        `
          SELECT
            prompt_asset_id AS promptAssetId,
            title,
            original_input AS originalInput,
            compiled_prompt AS compiledPrompt
          FROM prompt_search_fts
          ORDER BY title
        `,
      )
      .all(),
  )
}

afterEach(async () => {
  await removeSearchTestDatabases()
})

describe("Phase 17 atomic search index rebuild", () => {
  it("repairs missing, extra, and stale rows from owned current versions through the direct API", async () => {
    // Given: missing, extra, stale, historical, and wrong-owner index states.
    const database = await createSearchTestDatabase()

    try {
      const current = createIndexedPrompt(database, {
        title: "Current projection",
        originalInput: "historical input",
        compiledPrompt: "historical compiled prompt",
      })
      const currentVersion = database.services.createNextPromptVersion({
        promptAssetId: current.asset.id,
        originalInput: "current input",
        compiledPrompt: "current compiled prompt",
        makeCurrent: true,
      }).version
      const missing = createIndexedPrompt(database, {
        title: "Missing row",
        originalInput: "missing input",
        compiledPrompt: "missing compiled prompt",
      })
      const wrongOwner = createIndexedPrompt(database, {
        title: "Wrong owner",
        originalInput: "wrong input",
        compiledPrompt: "wrong compiled prompt",
      })
      const versionOwner = createIndexedPrompt(database, {
        title: "Version owner",
        originalInput: "owner input",
        compiledPrompt: "owner compiled prompt",
      })
      database.sqlite
        .prepare("DELETE FROM prompt_search_fts WHERE prompt_asset_id = ?")
        .run(missing.asset.id)
      database.sqlite
        .prepare(
          "INSERT INTO prompt_search_fts (prompt_asset_id, title, original_input, compiled_prompt) VALUES (?, ?, ?, ?)",
        )
        .run("extra-row", "Extra row", "extra input", "extra compiled prompt")
      database.sqlite
        .prepare("UPDATE prompt_assets SET current_version_id = ? WHERE id = ?")
        .run(versionOwner.version.id, wrongOwner.asset.id)

      // When: the existing direct repository service rebuilds the index.
      const result = database.services.rebuildSearchIndex()

      // Then: only owned current versions remain and every drift class is corrected.
      expect(result).toBeUndefined()
      expect(readIndexedRows(database)).toEqual([
        {
          promptAssetId: current.asset.id,
          title: "Current projection",
          originalInput: currentVersion.originalInput,
          compiledPrompt: currentVersion.compiledPrompt,
        },
        {
          promptAssetId: missing.asset.id,
          title: "Missing row",
          originalInput: missing.version.originalInput,
          compiledPrompt: missing.version.compiledPrompt,
        },
        {
          promptAssetId: versionOwner.asset.id,
          title: "Version owner",
          originalInput: versionOwner.version.originalInput,
          compiledPrompt: versionOwner.version.compiledPrompt,
        },
      ])
    } finally {
      database.close()
    }
  })

  it("rolls back base and FTS changes when an enclosing transaction fails", async () => {
    // Given: a searchable prompt and an outer transaction that will fail after rebuilding.
    const database = await createSearchTestDatabase()

    try {
      const prompt = createIndexedPrompt(database, {
        title: "Stable title",
        originalInput: "stable input",
        compiledPrompt: "stable compiled prompt",
      })
      const transaction = database.sqlite.transaction(() => {
        database.sqlite
          .prepare("UPDATE prompt_assets SET title = ? WHERE id = ?")
          .run("Transient title", prompt.asset.id)
        rebuildSearchIndexAtomically(database.sqlite)
        throw new Error("force outer rollback")
      })

      // When: the caller rolls back after the synchronous helper completes.
      expect(transaction).toThrow("force outer rollback")

      // Then: the same connection restores both the base row and its indexed projection.
      expect(
        database.sqlite
          .prepare("SELECT title FROM prompt_assets WHERE id = ?")
          .pluck()
          .get(prompt.asset.id),
      ).toBe("Stable title")
      expect(readIndexedRows(database)).toEqual([
        {
          promptAssetId: prompt.asset.id,
          title: "Stable title",
          originalInput: "stable input",
          compiledPrompt: "stable compiled prompt",
        },
      ])
    } finally {
      database.close()
    }
  })

  it("restores prior FTS rows when rebuilding fails after deletion", async () => {
    // Given: a replacement index table that rejects the current projection during insertion.
    const database = await createSearchTestDatabase()

    try {
      createIndexedPrompt(database, {
        title: "Blocked title",
        originalInput: "blocked input",
        compiledPrompt: "blocked compiled prompt",
      })
      database.sqlite.exec(`
        DROP TABLE prompt_search_fts;
        CREATE TABLE prompt_search_fts (
          prompt_asset_id TEXT,
          title TEXT CHECK (title <> 'Blocked title'),
          original_input TEXT,
          compiled_prompt TEXT
        );
        INSERT INTO prompt_search_fts VALUES (
          'preserved-row',
          'Preserved title',
          'preserved input',
          'preserved compiled prompt'
        );
      `)

      // When: repopulation fails after the helper has issued its delete.
      expect(() => database.services.rebuildSearchIndex()).toThrow(/Blocked title/)

      // Then: the helper transaction restores the prior index state instead of reporting success.
      expect(readIndexedRows(database)).toEqual([
        {
          promptAssetId: "preserved-row",
          title: "Preserved title",
          originalInput: "preserved input",
          compiledPrompt: "preserved compiled prompt",
        },
      ])
    } finally {
      database.close()
    }
  })
})
