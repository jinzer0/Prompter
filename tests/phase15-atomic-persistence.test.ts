import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"

import { openPrompterDatabase } from "../electron/db/connection"

type TestDatabase = ReturnType<typeof openPrompterDatabase>

const directories: string[] = []
const countSchema = z.object({ count: z.number() })

async function createTestDatabase(): Promise<TestDatabase> {
  const directory = await mkdtemp(join(tmpdir(), "prompter-phase15-db-"))
  directories.push(directory)

  return openPrompterDatabase({
    databasePath: join(directory, "prompter.sqlite"),
    migrationsFolder: join(process.cwd(), "drizzle"),
  })
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })))
})

describe("Phase 15 atomic prompt persistence", () => {
  it("creates an asset, its first version, tags, and FTS entry atomically", async () => {
    const database = await createTestDatabase()

    try {
      const project = database.services.createProject({ name: "Atomic Prompt Project" })
      const existingTag = database.services.createTag({ name: "existing" })

      const result = database.services.createPromptWithInitialVersion({
        projectId: project.id,
        title: "Atomic prompt",
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "Build an atomic prompt.",
        compiledPrompt: "Build an atomic prompt with tests.",
        tagIds: [existingTag.id],
        tagNames: ["created"],
      })

      expect(result.asset.currentVersionId).toBe(result.version.id)
      expect(result.version.versionNumber).toBe(1)
      expect(
        database.services
          .listTagsForPrompt(result.asset.id)
          .map((tag) => tag.name)
          .sort(),
      ).toEqual(["created", "existing"])
      expect(
        database.services.searchPrompts({
          query: "atomic prompt",
          limit: 50,
          offset: 0,
          sortBy: "relevance",
          sortDirection: "desc",
        }),
      ).toEqual([
        expect.objectContaining({ promptAsset: expect.objectContaining({ id: result.asset.id }) }),
      ])
    } finally {
      database.close()
    }
  })

  it.each([
    {
      name: "asset insert",
      install: (database: TestDatabase) =>
        database.sqlite.exec(
          "CREATE TRIGGER phase15_asset_fault AFTER INSERT ON prompt_assets BEGIN SELECT RAISE(ABORT, 'asset'); END",
        ),
    },
    {
      name: "version insert",
      install: (database: TestDatabase) =>
        database.sqlite.exec(
          "CREATE TRIGGER phase15_version_fault AFTER INSERT ON prompt_versions BEGIN SELECT RAISE(ABORT, 'version'); END",
        ),
    },
    {
      name: "current pointer update",
      install: (database: TestDatabase) =>
        database.sqlite.exec(
          "CREATE TRIGGER phase15_pointer_fault AFTER UPDATE OF current_version_id ON prompt_assets BEGIN SELECT RAISE(ABORT, 'pointer'); END",
        ),
    },
    {
      name: "tag creation",
      install: (database: TestDatabase) =>
        database.sqlite.exec(
          "CREATE TRIGGER phase15_tag_fault AFTER INSERT ON tags BEGIN SELECT RAISE(ABORT, 'tag'); END",
        ),
    },
    {
      name: "tag link insert",
      install: (database: TestDatabase) =>
        database.sqlite.exec(
          "CREATE TRIGGER phase15_link_fault AFTER INSERT ON prompt_tags BEGIN SELECT RAISE(ABORT, 'link'); END",
        ),
    },
    {
      name: "FTS write",
      install: (database: TestDatabase) =>
        database.sqlite.exec(
          "DROP TABLE prompt_search_fts; CREATE TABLE prompt_search_fts (prompt_asset_id TEXT, title TEXT CHECK (title <> 'Atomic failure'), original_input TEXT, compiled_prompt TEXT)",
        ),
    },
  ])("rolls back every write when %s fails", async ({ install }) => {
    const database = await createTestDatabase()

    try {
      install(database)

      expect(() =>
        database.services.createPromptWithInitialVersion({
          projectId: null,
          title: "Atomic failure",
          scenario: "feature",
          targetAgent: "codex",
          originalInput: "Fail atomically.",
          compiledPrompt: "Fail atomically.",
          tagNames: ["transient"],
        }),
      ).toThrow()

      for (const table of [
        "prompt_assets",
        "prompt_versions",
        "tags",
        "prompt_tags",
        "prompt_search_fts",
      ]) {
        const row = countSchema.parse(
          database.sqlite.prepare(`SELECT count(*) AS count FROM ${table}`).get(),
        )
        expect(row.count).toBe(0)
      }
    } finally {
      database.close()
    }
  })
})
