import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { z } from "zod"

import { openPrompterDatabase } from "../electron/db/connection"
import { stringArraySchema } from "./phase2-schema-contract"

export const sourceAssetId = "15151515-1515-4515-8515-151515151516"
export const sourceVersionId = "15151515-1515-4515-8515-151515151517"

const projectId = "15151515-1515-4515-8515-151515151515"
const childAssetId = "15151515-1515-4515-8515-151515151518"
const templateId = "15151515-1515-4515-8515-151515151519"
const reviewId = "15151515-1515-4515-8515-151515151520"
const harnessId = "15151515-1515-4515-8515-151515151521"

const phase14MigrationTags = [
  "0000_curious_lockjaw",
  "0001_phase2_schema",
  "0002_project_context_profiles",
  "0003_lame_shocker",
] as const

const migrationJournalSchema = z.object({
  version: z.string(),
  dialect: z.literal("sqlite"),
  entries: z.array(
    z.object({
      idx: z.number(),
      version: z.string(),
      when: z.number(),
      tag: z.string(),
      breakpoints: z.boolean(),
    }),
  ),
})
const foreignKeySchema = z.object({
  from: z.string(),
  table: z.string(),
  to: z.string(),
  on_delete: z.string(),
})
const lineageRowSchema = z.object({
  parent_prompt_id: z.string().nullable(),
  parent_prompt_version_id: z.string().nullable(),
  derivation_type: z.string().nullable(),
})
const templateSourceRowSchema = z.object({
  source_prompt_asset_id: z.string().nullable(),
  source_prompt_version_id: z.string().nullable(),
})
const preservedRowsSchema = z.object({
  project_name: z.string(),
  asset_title: z.string(),
  compiled_prompt: z.string(),
  harness_name: z.string(),
  review_score: z.number(),
})

type TestDatabase = ReturnType<typeof openPrompterDatabase>

const tempDirectories: string[] = []

export async function createCurrentDatabase(prefix: string): Promise<TestDatabase> {
  const directory = await mkdtemp(join(tmpdir(), prefix))
  tempDirectories.push(directory)
  return openPrompterDatabase({
    databasePath: join(directory, "prompter.sqlite"),
    migrationsFolder: join(process.cwd(), "drizzle"),
  })
}

export async function createUpgradedPhase14Database(): Promise<TestDatabase> {
  const directory = await mkdtemp(join(tmpdir(), "prompter-phase15-upgrade-"))
  tempDirectories.push(directory)
  const databasePath = join(directory, "prompter.sqlite")
  const phase14Database = openPrompterDatabase({
    databasePath,
    migrationsFolder: await createPhase14MigrationFolder(directory),
  })
  try {
    insertPhase14Rows(phase14Database)
  } finally {
    phase14Database.close()
  }

  return openPrompterDatabase({
    databasePath,
    migrationsFolder: join(process.cwd(), "drizzle"),
  })
}

export async function removePhase15TestDatabases(): Promise<void> {
  await Promise.all(
    tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  )
}

async function createPhase14MigrationFolder(root: string): Promise<string> {
  const migrationsFolder = join(root, "phase14-drizzle")
  const metaFolder = join(migrationsFolder, "meta")
  await mkdir(metaFolder, { recursive: true })

  await Promise.all(
    phase14MigrationTags.flatMap((tag, index) => [
      copyFile(join("drizzle", `${tag}.sql`), join(migrationsFolder, `${tag}.sql`)),
      copyFile(
        join("drizzle", "meta", `${String(index).padStart(4, "0")}_snapshot.json`),
        join(metaFolder, `${String(index).padStart(4, "0")}_snapshot.json`),
      ),
    ]),
  )

  const journal = migrationJournalSchema.parse(
    JSON.parse(await readFile(join("drizzle", "meta", "_journal.json"), "utf8")),
  )
  await writeFile(
    join(metaFolder, "_journal.json"),
    JSON.stringify({ ...journal, entries: journal.entries.filter(({ idx }) => idx <= 3) }),
  )

  return migrationsFolder
}

export function readColumnNames(database: TestDatabase, tableName: string): readonly string[] {
  return stringArraySchema.parse(
    database.sqlite.prepare("select name from pragma_table_info(?)").pluck().all(tableName),
  )
}

export function readIndexNames(database: TestDatabase, tableName: string): readonly string[] {
  return stringArraySchema.parse(
    database.sqlite.prepare("select name from pragma_index_list(?)").pluck().all(tableName),
  )
}

export function readForeignKeys(database: TestDatabase, tableName: string) {
  return z
    .array(foreignKeySchema)
    .parse(
      database.sqlite
        .prepare("select `from`, `table`, `to`, on_delete from pragma_foreign_key_list(?)")
        .all(tableName),
    )
}

export function readPreservedRows(database: TestDatabase) {
  return preservedRowsSchema.parse(
    database.sqlite
      .prepare(
        `select projects.name as project_name, prompt_assets.title as asset_title,
          prompt_versions.compiled_prompt, harness_templates.name as harness_name,
          prompt_quality_reviews.overall_score as review_score
        from projects, prompt_assets, prompt_versions, harness_templates, prompt_quality_reviews
        where projects.id = ? and prompt_assets.id = ? and prompt_versions.id = ?
          and harness_templates.id = ? and prompt_quality_reviews.id = ?`,
      )
      .get(projectId, sourceAssetId, sourceVersionId, harnessId, reviewId),
  )
}

export function insertLineageRows(database: TestDatabase): void {
  database.sqlite.exec(`
    insert into prompt_assets (id, title, scenario, target_agent, created_at, updated_at)
      values ('${sourceAssetId}', 'Source prompt', 'feature', 'codex', 1000, 1000);
    insert into prompt_versions (id, prompt_asset_id, version_number, original_input, compiled_prompt, created_at)
      values ('${sourceVersionId}', '${sourceAssetId}', 1, 'Source', 'Source compiled', 1000);
    insert into prompt_assets
      (id, title, scenario, target_agent, parent_prompt_id, parent_prompt_version_id,
       derivation_type, created_at, updated_at)
      values ('${childAssetId}', 'Derived prompt', 'feature', 'codex', '${sourceAssetId}',
       '${sourceVersionId}', 'derived', 1000, 1000);
    insert into prompt_templates
      (id, name, source_prompt_asset_id, source_prompt_version_id, scenario, target_agent,
       template_body, created_at, updated_at)
      values ('${templateId}', 'Source template', '${sourceAssetId}', '${sourceVersionId}',
       'feature', 'codex', '{{originalInput}}', 1000, 1000);
  `)
}

export function readLineageRow(database: TestDatabase) {
  return lineageRowSchema.parse(
    database.sqlite
      .prepare(
        `select parent_prompt_id, parent_prompt_version_id, derivation_type
          from prompt_assets where id = ?`,
      )
      .get(childAssetId),
  )
}

export function readTemplateSourceRow(database: TestDatabase) {
  return templateSourceRowSchema.parse(
    database.sqlite
      .prepare(
        `select source_prompt_asset_id, source_prompt_version_id
          from prompt_templates where id = ?`,
      )
      .get(templateId),
  )
}

function insertPhase14Rows(database: TestDatabase): void {
  database.sqlite.exec(`
    insert into projects (id, name, created_at, updated_at)
      values ('${projectId}', 'Phase 14 project', 1000, 1000);
    insert into prompt_assets (id, project_id, title, scenario, target_agent, created_at, updated_at)
      values ('${sourceAssetId}', '${projectId}', 'Phase 14 prompt', 'feature', 'codex', 1000, 1000);
    insert into prompt_versions (id, prompt_asset_id, version_number, original_input, compiled_prompt, created_at)
      values ('${sourceVersionId}', '${sourceAssetId}', 1, 'Original input', '# Objective' || char(10) || 'Preserve this prompt', 1000);
    insert into harness_templates (id, name, scenario, target_agent, template_body, created_at, updated_at)
      values ('${harnessId}', 'Phase 14 harness', 'feature', 'codex', 'Use {{title}}.', 1000, 1000);
    insert into prompt_quality_reviews
      (id, prompt_version_id, source, review_mode, overall_score, grade, dimension_scores,
       strengths, issues, suggestions, missing_sections, warnings,
       recommended_clarifying_questions, score_explanation, snapshot, created_at)
      values ('${reviewId}', '${sourceVersionId}', 'static', 'draft', 88, 'B', '{}', '[]', '[]',
       '[]', '[]', '[]', '[]', 'Preserved review', '{}', 1000);
  `)
}
