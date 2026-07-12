import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"

import { openPrompterDatabase } from "../electron/db/connection.js"
import { createPromptQualityReviewRepository } from "../electron/db/repositories/prompt-quality-reviews.js"

const projectId = "99999999-9999-4999-8999-999999999999"
const promptAssetId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const promptVersionId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const stringArraySchema = z.array(z.string())
const tempDirectories: string[] = []

async function createPhase13MigrationFolder(root: string): Promise<string> {
  const migrationsFolder = join(root, "phase13-drizzle")
  const metaFolder = join(migrationsFolder, "meta")

  await mkdir(metaFolder, { recursive: true })
  await copyFile(
    "drizzle/0000_curious_lockjaw.sql",
    join(migrationsFolder, "0000_curious_lockjaw.sql"),
  )
  await copyFile("drizzle/0001_phase2_schema.sql", join(migrationsFolder, "0001_phase2_schema.sql"))
  await copyFile(
    "drizzle/0002_project_context_profiles.sql",
    join(migrationsFolder, "0002_project_context_profiles.sql"),
  )
  await copyFile("drizzle/meta/0000_snapshot.json", join(metaFolder, "0000_snapshot.json"))
  await copyFile("drizzle/meta/0001_snapshot.json", join(metaFolder, "0001_snapshot.json"))
  await copyFile("drizzle/meta/0002_snapshot.json", join(metaFolder, "0002_snapshot.json"))
  await writeFile(
    join(metaFolder, "_journal.json"),
    JSON.stringify({
      version: "7",
      dialect: "sqlite",
      entries: [
        {
          idx: 0,
          version: "6",
          when: 1783359379033,
          tag: "0000_curious_lockjaw",
          breakpoints: true,
        },
        {
          idx: 1,
          version: "6",
          when: 1783405557414,
          tag: "0001_phase2_schema",
          breakpoints: true,
        },
        {
          idx: 2,
          version: "6",
          when: 1783752366364,
          tag: "0002_project_context_profiles",
          breakpoints: true,
        },
      ],
    }),
  )

  return migrationsFolder
}

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  )
})

describe("Prompt quality review migration", () => {
  it("adds version-owned review storage without changing existing prompt data", async () => {
    const directory = await mkdtemp(join(tmpdir(), "prompter-quality-migration-"))
    tempDirectories.push(directory)
    const databasePath = join(directory, "prompter.sqlite")
    const phase13Migrations = await createPhase13MigrationFolder(directory)
    const phase13Database = openPrompterDatabase({
      databasePath,
      migrationsFolder: phase13Migrations,
    })

    try {
      phase13Database.sqlite.exec(`
        insert into projects (id, name, created_at, updated_at)
          values ('${projectId}', 'Quality migration project', 1000, 1000);
        insert into prompt_assets (id, project_id, title, scenario, target_agent, created_at, updated_at)
          values ('${promptAssetId}', '${projectId}', 'Quality migration prompt', 'feature', 'codex', 1000, 1000);
        insert into prompt_versions (id, prompt_asset_id, version_number, original_input, compiled_prompt, created_at)
          values ('${promptVersionId}', '${promptAssetId}', 1, 'Original input', '# Objective' || char(10) || 'Existing prompt', 1000);
      `)
    } finally {
      phase13Database.close()
    }

    const upgradedDatabase = openPrompterDatabase({
      databasePath,
      migrationsFolder: join(process.cwd(), "drizzle"),
    })

    try {
      const tableNames = stringArraySchema.parse(
        upgradedDatabase.sqlite
          .prepare("select name from sqlite_master where type = 'table'")
          .pluck()
          .all(),
      )
      const reviewColumns = stringArraySchema.parse(
        upgradedDatabase.sqlite
          .prepare("select name from pragma_table_info('prompt_quality_reviews')")
          .pluck()
          .all(),
      )

      expect(tableNames).toContain("prompt_quality_reviews")
      expect(reviewColumns).toEqual(
        expect.arrayContaining(["id", "prompt_version_id", "overall_score", "dimension_scores"]),
      )
      expect(upgradedDatabase.services.getPromptVersion(promptVersionId)).toMatchObject({
        id: promptVersionId,
        compiledPrompt: "# Objective\nExisting prompt",
      })
      expect(
        createPromptQualityReviewRepository(upgradedDatabase.db).listPromptQualityReviewsForVersion(
          {
            promptVersionId,
          },
        ),
      ).toEqual([])
    } finally {
      upgradedDatabase.close()
    }
  })
})
