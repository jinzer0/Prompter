import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { openPrompterDatabase } from "../electron/db/connection.js"
import { VERSION_HEAVY_PROMPT_THRESHOLD } from "../electron/insights/thresholds.js"

export type TestDatabase = ReturnType<typeof openPrompterDatabase>

export const NOW = Date.UTC(2026, 7, 8, 12)
export const DAY = 24 * 60 * 60 * 1000

const directories: string[] = []
const databases: TestDatabase[] = []
const tables = [
  "projects",
  "project_context_profiles",
  "prompt_assets",
  "prompt_versions",
  "tags",
  "prompt_tags",
  "prompt_templates",
  "harness_templates",
  "prompt_quality_reviews",
  "settings",
  "prompt_search_fts",
] as const

export const ids = {
  projectA: "10000000-0000-4000-8000-000000000001",
  projectB: "10000000-0000-4000-8000-000000000002",
  profileA: "20000000-0000-4000-8000-000000000001",
  profileB: "20000000-0000-4000-8000-000000000002",
  assetA1: "30000000-0000-4000-8000-000000000001",
  assetA2: "30000000-0000-4000-8000-000000000002",
  assetA3: "30000000-0000-4000-8000-000000000003",
  assetA4: "30000000-0000-4000-8000-000000000004",
  assetB1: "30000000-0000-4000-8000-000000000005",
  orphanAsset: "30000000-0000-4000-8000-000000000006",
  versionA1: "40000000-0000-4000-8000-000000000001",
  versionA2: "40000000-0000-4000-8000-000000000002",
  versionA4: "40000000-0000-4000-8000-000000000003",
  versionB1: "40000000-0000-4000-8000-000000000004",
  orphanVersion: "40000000-0000-4000-8000-000000000005",
  tagShared: "50000000-0000-4000-8000-000000000001",
  tagProjectA: "50000000-0000-4000-8000-000000000002",
  tagProjectB: "50000000-0000-4000-8000-000000000003",
  templateA: "60000000-0000-4000-8000-000000000001",
  templateB: "60000000-0000-4000-8000-000000000002",
  templateGlobal: "60000000-0000-4000-8000-000000000003",
  invalidHarness: "70000000-0000-4000-8000-000000000001",
} as const

export async function createTestDatabase(): Promise<TestDatabase> {
  const directory = await mkdtemp(join(tmpdir(), "prompter-insights-db-"))
  directories.push(directory)
  const database = openPrompterDatabase({
    databasePath: join(directory, "prompter.sqlite"),
    migrationsFolder: join(process.cwd(), "drizzle"),
  })
  databases.push(database)
  return database
}

export function seedInsightsFixture(database: TestDatabase): number {
  const defaultHarnessCount = database.services.listHarnessTemplates().length
  const old = NOW - 95 * DAY

  database.sqlite.exec(`
    UPDATE harness_templates SET updated_at = ${old};
    INSERT INTO projects (id, name, description, tech_stack, default_agent, created_at, updated_at) VALUES
      ('${ids.projectA}', 'Alpha', null, null, 'codex', ${old}, ${old}),
      ('${ids.projectB}', 'Beta', null, null, 'generic_agent', ${old}, ${old});
    INSERT INTO project_context_profiles (
      id, project_id, name, tech_stack, forbidden_actions, validation_commands, repo_path,
      is_default, created_at, updated_at
    ) VALUES
      ('${ids.profileA}', '${ids.projectA}', 'Alpha context', '  ', '  ', null, '/repo/alpha', 1, ${old}, ${old}),
      ('${ids.profileB}', '${ids.projectB}', 'Beta context', 'Rust', 'No secrets', 'cargo test', ' ', 0, ${old}, ${old});
    INSERT INTO prompt_assets (
      id, project_id, title, scenario, target_agent, current_version_id,
      parent_prompt_id, parent_prompt_version_id, derivation_type, created_at, updated_at
    ) VALUES
      ('${ids.assetA1}', '${ids.projectA}', 'Excellent prompt', 'feature', 'codex', '${ids.versionA1}', null, null, null, ${NOW - 5 * DAY}, ${NOW - 2 * DAY}),
      ('${ids.assetA2}', '${ids.projectA}', 'Unevaluated prompt', 'bugfix', 'claude_code', '${ids.versionA2}', null, null, null, ${NOW - 20 * DAY}, ${NOW - 20 * DAY}),
      ('${ids.assetA3}', '${ids.projectA}', 'Versionless prompt', 'docs', 'cursor', null, null, null, null, ${NOW - 40 * DAY}, ${NOW - 40 * DAY}),
      ('${ids.assetA4}', '${ids.projectA}', 'Stale version-heavy prompt', 'feature', 'codex', '${ids.versionA4}', null, null, null, ${old}, ${NOW - 91 * DAY}),
      ('${ids.assetB1}', '${ids.projectB}', 'Good prompt', 'research', 'generic_agent', '${ids.versionB1}', null, null, null, ${NOW - 10 * DAY}, ${NOW - 10 * DAY}),
      ('${ids.orphanAsset}', null, 'Orphan prompt', 'research', 'generic_agent', '${ids.orphanVersion}', null, null, null, ${NOW - 3 * DAY}, ${NOW - 3 * DAY});
    INSERT INTO prompt_versions (
      id, prompt_asset_id, version_number, original_input, compiled_prompt, quality_score, created_at
    ) VALUES
      ('${ids.versionA1}', '${ids.assetA1}', 1, 'Input', 'Compiled', 95, ${NOW - 5 * DAY}),
      ('${ids.versionA2}', '${ids.assetA2}', 1, 'Input', 'Compiled', null, ${NOW - 20 * DAY}),
      ('40000000-0000-4000-8000-000000000011', '${ids.assetA4}', 1, 'Input', 'Compiled', 10, ${old}),
      ('40000000-0000-4000-8000-000000000012', '${ids.assetA4}', 2, 'Input', 'Compiled', 20, ${NOW - 94 * DAY}),
      ('40000000-0000-4000-8000-000000000013', '${ids.assetA4}', 3, 'Input', 'Compiled', 25, ${NOW - 93 * DAY}),
      ('40000000-0000-4000-8000-000000000014', '${ids.assetA4}', 4, 'Input', 'Compiled', 28, ${NOW - 92 * DAY}),
      ('${ids.versionA4}', '${ids.assetA4}', 5, 'Input', 'Compiled', 30, ${NOW - 91 * DAY}),
      ('${ids.versionB1}', '${ids.assetB1}', 1, 'Input', 'Compiled', 80, ${NOW - 10 * DAY}),
      ('${ids.orphanVersion}', '${ids.orphanAsset}', 1, 'Input', 'Compiled', 55, ${NOW - 3 * DAY});
    INSERT INTO tags (id, name, created_at) VALUES
      ('${ids.tagShared}', 'Shared', ${old}),
      ('${ids.tagProjectA}', 'Project A', ${old}),
      ('${ids.tagProjectB}', 'Project B', ${old}),
      ('50000000-0000-4000-8000-000000000004', 'Unused', ${old}),
      ('50000000-0000-4000-8000-000000000005', 'Duplicate', ${old}),
      ('50000000-0000-4000-8000-000000000006', ' duplicate ', ${old});
    INSERT INTO prompt_tags (prompt_asset_id, tag_id) VALUES
      ('${ids.assetA1}', '${ids.tagShared}'),
      ('${ids.assetA2}', '${ids.tagShared}'),
      ('${ids.assetA4}', '${ids.tagProjectA}'),
      ('${ids.assetB1}', '${ids.tagProjectB}');
    INSERT INTO prompt_templates (
      id, name, source_prompt_asset_id, source_prompt_version_id, scenario, target_agent,
      template_body, created_at, updated_at
    ) VALUES
      ('${ids.templateA}', 'Alpha template', '${ids.assetA1}', '${ids.versionA1}', 'feature', 'codex', '{{objective}} {{objective}} {{acceptance}} {{dotted.name}} {{hyphen-name}} {{1leading}} {{ malformed }}', ${NOW - 2 * DAY}, ${NOW - 2 * DAY}),
      ('${ids.templateB}', 'Beta template', '${ids.assetB1}', '${ids.versionB1}', 'research', 'generic_agent', '{{objective}}', ${NOW - 10 * DAY}, ${NOW - 10 * DAY}),
      ('${ids.templateGlobal}', 'Global template', null, null, 'docs', 'cursor', '{{objective}}', ${old}, ${old});
    INSERT INTO harness_templates (
      id, name, scenario, target_agent, template_body, required_fields, clarification_policy,
      created_at, updated_at
    ) VALUES
      ('${ids.invalidHarness}', 'Invalid harness', 'feature', 'codex', '{{objective}}', '{}', '[]', ${old}, ${old});
  `)

  return defaultHarnessCount
}

export function seedVersionHeavyThresholdFixture(database: TestDatabase): string {
  const projectId = "81000000-0000-4000-8000-000000000001"
  const lowAssetId = "81000000-0000-4000-8000-000000000002"
  const heavyAssetId = "81000000-0000-4000-8000-000000000003"
  const lowVersionRows = Array.from(
    { length: VERSION_HEAVY_PROMPT_THRESHOLD - 1 },
    (_, index) => `
      ('82000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}',
       '${lowAssetId}', ${index + 1}, 'Input', 'Compiled', null, ${NOW - index * 1000})`,
  ).join(",")
  const heavyVersionRows = Array.from(
    { length: VERSION_HEAVY_PROMPT_THRESHOLD },
    (_, index) => `
      ('83000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}',
       '${heavyAssetId}', ${index + 1}, 'Input', 'Compiled', null, ${NOW - index * 1000})`,
  ).join(",")

  database.sqlite.exec(`
    INSERT INTO projects (id, name, description, tech_stack, default_agent, created_at, updated_at)
    VALUES ('${projectId}', 'Threshold project', null, null, 'codex', ${NOW}, ${NOW});
    INSERT INTO prompt_assets (
      id, project_id, title, scenario, target_agent, current_version_id,
      parent_prompt_id, parent_prompt_version_id, derivation_type, created_at, updated_at
    ) VALUES
      ('${lowAssetId}', '${projectId}', 'Threshold minus one prompt', 'feature', 'codex',
       '82000000-0000-4000-8000-${String(VERSION_HEAVY_PROMPT_THRESHOLD).padStart(12, "0")}',
       null, null, null, ${NOW}, ${NOW}),
      ('${heavyAssetId}', '${projectId}', 'Threshold prompt', 'feature', 'codex',
       '83000000-0000-4000-8000-${String(VERSION_HEAVY_PROMPT_THRESHOLD).padStart(12, "0")}',
       null, null, null, ${NOW}, ${NOW});
    INSERT INTO prompt_versions (
      id, prompt_asset_id, version_number, original_input, compiled_prompt, quality_score, created_at
    ) VALUES
      ${lowVersionRows},
      ${heavyVersionRows};
  `)

  return projectId
}

export function snapshotTables(database: TestDatabase) {
  return Object.fromEntries(
    tables.map((table) => [
      table,
      database.sqlite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(),
    ]),
  )
}

export async function cleanupTestDatabases(): Promise<void> {
  for (const database of databases.splice(0)) {
    database.close()
  }
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })))
}
