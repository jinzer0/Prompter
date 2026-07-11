import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"

import { openPrompterDatabase } from "../electron/db/connection"
import { DEFAULT_HARNESS_TEMPLATE_IDS } from "../electron/db/default-harness-templates"
import { forbiddenTables, stringArraySchema } from "./phase2-schema-contract"

const legacyProjectId = "11111111-1111-4111-8111-111111111111"
const legacyAssetId = "22222222-2222-4222-8222-222222222222"
const legacyBody = "Legacy prompt body without a prompt_versions row."
const phase2ProjectId = "66666666-6666-4666-8666-666666666666"
const phase2PromptAssetId = "77777777-7777-4777-8777-777777777777"
const phase2HarnessTemplateId = "88888888-8888-4888-8888-888888888888"

const profileCountSchema = z.object({ count: z.number() })
type TestDatabase = ReturnType<typeof openPrompterDatabase>

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

async function createPhase2MigrationFolder(root: string): Promise<string> {
  const migrationsFolder = join(root, "phase2-drizzle")
  const metaFolder = join(migrationsFolder, "meta")

  await mkdir(metaFolder, { recursive: true })
  await copyFile(
    "drizzle/0000_curious_lockjaw.sql",
    join(migrationsFolder, "0000_curious_lockjaw.sql"),
  )
  await copyFile("drizzle/0001_phase2_schema.sql", join(migrationsFolder, "0001_phase2_schema.sql"))
  await copyFile("drizzle/meta/0000_snapshot.json", join(metaFolder, "0000_snapshot.json"))
  await copyFile("drizzle/meta/0001_snapshot.json", join(metaFolder, "0001_snapshot.json"))
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

  it("seeds default harness templates after migrations", async () => {
    const directory = await mkdtemp(join(tmpdir(), "prompter-migration-seed-"))
    tempDirectories.push(directory)

    const database = openPrompterDatabase({
      databasePath: join(directory, "prompter.sqlite"),
      migrationsFolder: join(process.cwd(), "drizzle"),
    })

    try {
      expect(
        database.services
          .listHarnessTemplates()
          .map((template) => template.id)
          .sort(),
      ).toEqual(Object.values(DEFAULT_HARNESS_TEMPLATE_IDS).sort())
    } finally {
      database.close()
    }
  })

  it("preserves Phase 2 data while adding project context profiles", async () => {
    const directory = await mkdtemp(join(tmpdir(), "prompter-phase13-migration-"))
    tempDirectories.push(directory)
    const databasePath = join(directory, "prompter.sqlite")
    const phase2Migrations = await createPhase2MigrationFolder(directory)
    const phase2Database = openPrompterDatabase({
      databasePath,
      migrationsFolder: phase2Migrations,
    })

    try {
      insertPhase2Rows(phase2Database)
    } finally {
      phase2Database.close()
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

      expect(tableNames).toContain("project_context_profiles")
      for (const tableName of forbiddenTables) {
        expect(tableNames).not.toContain(tableName)
      }
      expect(upgradedDatabase.services.getProject(phase2ProjectId)).toMatchObject({
        id: phase2ProjectId,
        name: "Phase 2 Project",
        description: "Existing description",
        techStack: "Existing stack",
      })
      expect(upgradedDatabase.services.getPromptAsset(phase2PromptAssetId)).toMatchObject({
        id: phase2PromptAssetId,
        projectId: phase2ProjectId,
        title: "Phase 2 Prompt",
      })
      expect(upgradedDatabase.services.getHarnessTemplate(phase2HarnessTemplateId)).toMatchObject({
        id: phase2HarnessTemplateId,
        name: "Phase 2 Harness",
      })
      expect(
        upgradedDatabase.services.listProjectContextProfiles({ projectId: phase2ProjectId }),
      ).toEqual([])
      expect(upgradedDatabase.services.getDefaultProjectContextProfile(phase2ProjectId)).toBeNull()
      expect(readProjectContextProfileCount(upgradedDatabase, phase2ProjectId)).toBe(0)
    } finally {
      upgradedDatabase.close()
    }
  })
})

function insertPhase2Rows(database: TestDatabase): void {
  database.sqlite.exec(`
    insert into projects (id, name, description, tech_stack, created_at, updated_at)
      values ('${phase2ProjectId}', 'Phase 2 Project', 'Existing description', 'Existing stack', 1000, 1000);
    insert into prompt_assets (id, project_id, title, scenario, target_agent, created_at, updated_at)
      values ('${phase2PromptAssetId}', '${phase2ProjectId}', 'Phase 2 Prompt', 'feature', 'codex', 1000, 1000);
    insert into harness_templates (id, name, scenario, target_agent, template_body, created_at, updated_at)
      values ('${phase2HarnessTemplateId}', 'Phase 2 Harness', 'feature', 'generic_agent', 'Use {{title}}.', 1000, 1000);
  `)
}

function readProjectContextProfileCount(database: TestDatabase, projectId: string): number {
  const row = profileCountSchema.parse(
    database.sqlite
      .prepare("select count(*) as count from project_context_profiles where project_id = ?")
      .get(projectId),
  )

  return row.count
}
