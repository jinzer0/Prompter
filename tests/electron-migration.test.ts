import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { openPrompterDatabase } from "../electron/db/connection"

const legacyProjectId = "11111111-1111-4111-8111-111111111111"
const legacyAssetId = "22222222-2222-4222-8222-222222222222"
const legacyBody = "Legacy prompt body without a prompt_versions row."

const tempDirectories: string[] = []

async function createLegacyMigrationFolder(root: string): Promise<string> {
  const migrationsFolder = join(root, "legacy-drizzle")
  const metaFolder = join(migrationsFolder, "meta")

  await mkdir(metaFolder, { recursive: true })
  await copyFile(
    "drizzle/0000_curious_lockjaw.sql",
    join(migrationsFolder, "0000_curious_lockjaw.sql"),
  )
  await copyFile("drizzle/meta/0000_snapshot.json", join(metaFolder, "0000_snapshot.json"))
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

describe("Electron persistence migrations", () => {
  it("preserves legacy prompt asset body as the current Phase 2 version", async () => {
    const directory = await mkdtemp(join(tmpdir(), "prompter-migration-"))
    tempDirectories.push(directory)
    const databasePath = join(directory, "prompter.sqlite")
    const legacyMigrations = await createLegacyMigrationFolder(directory)
    const legacyDatabase = openPrompterDatabase({
      databasePath,
      migrationsFolder: legacyMigrations,
    })

    try {
      legacyDatabase.sqlite
        .prepare(
          "insert into projects (id, name, description, created_at, updated_at) values (?, ?, ?, ?, ?)",
        )
        .run(
          legacyProjectId,
          "Legacy Project",
          "",
          "2026-01-01T00:00:00.000Z",
          "2026-01-01T00:00:00.000Z",
        )
      legacyDatabase.sqlite
        .prepare(
          "insert into prompt_assets (id, project_id, title, body, created_at, updated_at) values (?, ?, ?, ?, ?, ?)",
        )
        .run(
          legacyAssetId,
          legacyProjectId,
          "Legacy Prompt",
          legacyBody,
          "2026-01-01T00:00:00.000Z",
          "2026-01-01T00:00:00.000Z",
        )
    } finally {
      legacyDatabase.close()
    }

    const upgradedDatabase = openPrompterDatabase({
      databasePath,
      migrationsFolder: join(process.cwd(), "drizzle"),
    })

    try {
      const asset = upgradedDatabase.services.getPromptAsset(legacyAssetId)
      const versions = upgradedDatabase.services.listPromptVersions(legacyAssetId)

      expect(asset?.currentVersionId).toBe(legacyAssetId)
      expect(versions).toHaveLength(1)
      expect(versions[0]).toMatchObject({
        id: legacyAssetId,
        promptAssetId: legacyAssetId,
        versionNumber: 1,
        originalInput: legacyBody,
        compiledPrompt: legacyBody,
      })
    } finally {
      upgradedDatabase.close()
    }
  })
})
