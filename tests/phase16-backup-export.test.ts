import { randomUUID } from "node:crypto"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  BackupExportSelectionError,
  createBackupExportService,
} from "../electron/backup/backup-export-service"
import {
  type BackupNativeDependencies,
  BackupNativeWriteError,
  createBackupNativeService,
} from "../electron/backup/backup-native-service"
import { openPrompterDatabase } from "../electron/db/connection"
import { backupEnvelopeSchema } from "../electron/ipc-contract"
import { createPromptExportNativeService } from "../electron/prompt-export-native"

type TestDatabase = ReturnType<typeof openPrompterDatabase>
type NativeOverrides = {
  readonly showSaveDialog?: BackupNativeDependencies["showSaveDialog"]
  readonly writeFile?: BackupNativeDependencies["writeFile"]
}

const directories: string[] = []
const ids = {
  projectA: "10000000-0000-4000-8000-000000000001",
  projectB: "10000000-0000-4000-8000-000000000002",
  assetA: "20000000-0000-4000-8000-000000000001",
  assetB: "20000000-0000-4000-8000-000000000002",
  versionA: "30000000-0000-4000-8000-000000000001",
  versionB: "30000000-0000-4000-8000-000000000002",
  tagA: "40000000-0000-4000-8000-000000000001",
  tagB: "40000000-0000-4000-8000-000000000002",
  templateA: "50000000-0000-4000-8000-000000000001",
  templateB: "50000000-0000-4000-8000-000000000002",
  templateOrphan: "50000000-0000-4000-8000-000000000003",
  harness: "60000000-0000-4000-8000-000000000001",
  reviewA: "70000000-0000-4000-8000-000000000001",
  reviewB: "70000000-0000-4000-8000-000000000002",
} as const
const rawReviewText = {
  dimensionScores: '{  "clarity": 91, "context": 82 }',
  strengths: '[ "precise" ]',
  issues: "[]",
  suggestions: "[]",
  missingSections: "[]",
  warnings: "[]",
  recommendedClarifyingQuestions: "[]",
  snapshot: '{ "compiledPrompt": "# Objective" }',
} as const

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })))
})

async function createTestDatabase(): Promise<{
  readonly database: TestDatabase
  readonly directory: string
}> {
  const directory = await mkdtemp(join(tmpdir(), "prompter-phase16-export-"))
  directories.push(directory)
  const database = openPrompterDatabase({
    databasePath: join(directory, "prompter.sqlite"),
    migrationsFolder: join(process.cwd(), "drizzle"),
  })
  seedDatabase(database)
  return { database, directory }
}

function seedDatabase(database: TestDatabase): void {
  database.sqlite.exec(`
    insert into projects (id, name, description, tech_stack, default_agent, created_at, updated_at) values
      ('${ids.projectA}', 'Project A', 'Alpha description', 'TypeScript', 'codex', 100, 101),
      ('${ids.projectB}', 'Project B', 'Beta description', 'Rust', 'cursor', 200, 201);
    insert into project_context_profiles (id, project_id, name, repo_path, is_default, created_at, updated_at) values
      ('80000000-0000-4000-8000-000000000001', '${ids.projectA}', 'Alpha Profile', '/repo/alpha', 1, 100, 101),
      ('80000000-0000-4000-8000-000000000002', '${ids.projectB}', 'Beta Profile', '/repo/beta', 1, 200, 201);
    insert into prompt_assets (id, project_id, title, scenario, target_agent, current_version_id, parent_prompt_id, parent_prompt_version_id, derivation_type, created_at, updated_at) values
      ('${ids.assetB}', '${ids.projectB}', 'External Parent', 'research', 'cursor', '${ids.versionB}', null, null, null, 200, 201);
    insert into prompt_versions (id, prompt_asset_id, version_number, original_input, compiled_prompt, assumptions, questions, answers, acceptance_criteria, validation_commands, quality_score, created_at) values
      ('${ids.versionB}', '${ids.assetB}', 1, 'Beta input', '# Objective\nBeta', '[]', '[]', '[]', '[]', '[]', 82, 201);
    insert into prompt_assets (id, project_id, title, scenario, target_agent, current_version_id, parent_prompt_id, parent_prompt_version_id, derivation_type, created_at, updated_at) values
      ('${ids.assetA}', '${ids.projectA}', 'Selected Child', 'feature', 'codex', '${ids.versionA}', '${ids.assetB}', '${ids.versionB}', 'derived', 100, 101);
    insert into prompt_versions (id, prompt_asset_id, version_number, original_input, compiled_prompt, assumptions, questions, answers, acceptance_criteria, validation_commands, quality_score, created_at) values
      ('${ids.versionA}', '${ids.assetA}', 1, 'Alpha input', '# Objective\nAlpha', '[]', '[]', '[]', '[]', '[]', 91, 101);
    insert into tags (id, name, created_at) values ('${ids.tagA}', 'alpha', 100), ('${ids.tagB}', 'beta', 200);
    insert into prompt_tags (prompt_asset_id, tag_id) values ('${ids.assetA}', '${ids.tagA}'), ('${ids.assetB}', '${ids.tagB}');
    insert into prompt_templates (id, name, source_prompt_asset_id, source_prompt_version_id, scenario, target_agent, template_body, created_at, updated_at) values
      ('${ids.templateA}', 'Alpha Template', '${ids.assetA}', '${ids.versionA}', 'feature', 'codex', 'Alpha {{objective}}', 100, 101),
      ('${ids.templateB}', 'Beta Template', '${ids.assetB}', '${ids.versionB}', 'research', 'cursor', 'Beta {{objective}}', 200, 201),
      ('${ids.templateOrphan}', 'Orphan Template', null, null, 'docs', 'generic_agent', 'Orphan {{objective}}', 300, 301);
    insert into harness_templates (id, name, scenario, target_agent, template_body, required_fields, clarification_policy, created_at, updated_at) values
      ('${ids.harness}', 'User Harness', 'feature', 'codex', 'User {{objective}}', '["objective"]', '{"mode":"ask"}', 100, 101);
    insert into prompt_quality_reviews (id, prompt_version_id, source, review_mode, overall_score, grade, dimension_scores, strengths, issues, suggestions, missing_sections, warnings, recommended_clarifying_questions, score_explanation, snapshot, improved_prompt_draft, created_at) values
      ('${ids.reviewA}', '${ids.versionA}', 'prompt_version', 'local', 91, 'excellent', '${rawReviewText.dimensionScores}', '${rawReviewText.strengths}', '[]', '[]', '[]', '[]', '[]', 'Exact raw review', '${rawReviewText.snapshot}', null, 101),
      ('${ids.reviewB}', '${ids.versionB}', 'prompt_version', 'local', 82, 'good', '{"clarity":82}', '[]', '[]', '[]', '[]', '[]', '[]', 'Beta review', '{"compiledPrompt":"# Objective"}', null, 201);
    insert into settings (key, value, updated_at) values ('openai_api_key', 'top-secret-key', 999);
  `)
}

function createService(database: TestDatabase, directory: string, overrides: NativeOverrides = {}) {
  const path = join(directory, "backup.json")
  const native = createBackupNativeService({
    showSaveDialog: overrides.showSaveDialog ?? (async () => ({ canceled: false, filePath: path })),
    showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
    readFile: (filePath) => readFile(filePath, "utf8"),
    getFileSize: async () => 0,
    writeFile: overrides.writeFile ?? ((filePath, content) => writeFile(filePath, content, "utf8")),
    now: () => 123_456,
    createId: randomUUID,
    hashText: () => "a".repeat(64),
    getAppVersion: () => "16.0.0",
  })

  return { service: createBackupExportService({ db: database.db, native }), path }
}

describe("Phase 16 backup export", () => {
  it("keeps the prompt-export path baseline separate from full backup results", async () => {
    // Given: a prompt export dialog and a full backup over a seeded temporary database.
    const { database, directory } = await createTestDatabase()
    const promptExport = createPromptExportNativeService({
      showSaveDialog: async () => ({ canceled: false, filePath: "/tmp/prompt.md" }),
      writeFile: async () => undefined,
      copyText: () => undefined,
      readText: () => "",
    })

    try {
      // When: both native export operations save their content.
      const promptResult = await promptExport.savePromptToFile({
        content: "Prompt",
        format: "markdown",
      })
      const { service, path } = createService(database, directory)
      const backupResult = await service.exportFullBackup({})
      const content = await readFile(path, "utf8")
      const envelope = backupEnvelopeSchema.parse(JSON.parse(content))
      if (envelope.backupType !== "full") {
        throw new Error("Expected a full backup envelope")
      }

      // Then: only the legacy prompt export reveals a selected path, while backup data is strict.
      expect(promptResult).toEqual({ cancelled: false, filePath: "/tmp/prompt.md" })
      expect(backupResult).toEqual({
        cancelled: false,
        backupType: "full",
        itemCounts: {
          projects: 2,
          promptAssets: 2,
          promptVersions: 2,
          tags: 2,
          promptTags: 2,
          harnessTemplates: 7,
          projectContextProfiles: 2,
          promptTemplates: 3,
          promptQualityReviews: 2,
        },
        message: "Backup exported",
      })
      expect(Object.hasOwn(backupResult, "filePath")).toBe(false)
      expect(envelope.exportedByAppVersion).toBe("16.0.0")
      expect(
        envelope.data.promptQualityReviews.find((review) => review.id === ids.reviewA),
      ).toMatchObject(rawReviewText)
      expect(content).toBe(JSON.stringify(envelope, null, 2))
      expect(content).not.toContain("top-secret-key")
      expect(content).not.toContain('"settings"')
      expect(content).not.toContain("maskedKey")
    } finally {
      database.close()
    }
  })

  it("returns a strict cancellation result without writing a backup file", async () => {
    // Given: a save dialog that the user cancels before choosing a destination.
    const { database, directory } = await createTestDatabase()
    const writes: string[] = []

    try {
      // When: a full backup is requested.
      const { service } = createService(database, directory, {
        showSaveDialog: async () => ({ canceled: true }),
        writeFile: async (filePath) => {
          writes.push(filePath)
        },
      })
      const result = await service.exportFullBackup({})

      // Then: the renderer-safe cancellation result contains no path and no write occurs.
      expect(result.cancelled).toBe(true)
      expect(Object.hasOwn(result, "filePath")).toBe(false)
      expect(writes).toEqual([])
    } finally {
      database.close()
    }
  })

  it("keeps every backup-type collection inside its selected relationship boundary", async () => {
    // Given: project-, prompt-, template-, and harness-scoped export requests.
    const { database, directory } = await createTestDatabase()

    try {
      // When: each backup type writes its own strict envelope.
      const { service, path } = createService(database, directory)
      await service.exportProjectBackup({ projectId: ids.projectA })
      const project = backupEnvelopeSchema.parse(JSON.parse(await readFile(path, "utf8")))
      if (project.backupType !== "project") {
        throw new Error("Expected a project backup envelope")
      }
      await service.exportPromptAssetsBackup({ promptAssetIds: [ids.assetA] })
      const prompts = backupEnvelopeSchema.parse(JSON.parse(await readFile(path, "utf8")))
      await service.exportPromptTemplatesPack({ promptTemplateIds: [ids.templateA] })
      const templates = backupEnvelopeSchema.parse(JSON.parse(await readFile(path, "utf8")))
      await service.exportHarnessTemplatesPack({ includeAllUserTemplates: true })
      const harnesses = backupEnvelopeSchema.parse(JSON.parse(await readFile(path, "utf8")))

      // Then: every pack retains only its required rows while preserving stored references.
      expect(project).toMatchObject({
        backupType: "project",
        data: {
          projects: [{ id: ids.projectA }],
          promptAssets: [
            { id: ids.assetA, parentPromptId: ids.assetB, parentPromptVersionId: ids.versionB },
          ],
          promptTemplates: [{ id: ids.templateA }],
        },
      })
      expect(project.data.promptAssets.map((asset) => asset.id)).toEqual([ids.assetA])
      expect(prompts).toMatchObject({
        backupType: "prompt_assets",
        data: {
          promptAssets: [
            { id: ids.assetA, parentPromptId: ids.assetB, parentPromptVersionId: ids.versionB },
          ],
        },
      })
      expect(Object.hasOwn(prompts.data, "projectContextProfiles")).toBe(false)
      expect(templates).toMatchObject({
        backupType: "prompt_templates",
        data: {
          promptTemplates: [
            {
              id: ids.templateA,
              sourcePromptAssetId: ids.assetA,
              sourcePromptVersionId: ids.versionA,
            },
          ],
        },
      })
      expect(harnesses).toMatchObject({
        backupType: "harness_templates",
        data: { harnessTemplates: [{ id: ids.harness }] },
      })
    } finally {
      database.close()
    }
  })

  it("rejects stale selected IDs and wraps native write failures", async () => {
    // Given: a valid database, an unknown selected asset, and a failed native file write.
    const { database, directory } = await createTestDatabase()

    try {
      // When: selection and filesystem failure paths are exercised.
      const { service } = createService(database, directory, {
        writeFile: async () => {
          throw new Error("disk unavailable")
        },
      })

      // Then: stale selections and write failures remain typed failures.
      await expect(
        service.exportPromptAssetsBackup({
          promptAssetIds: ["90000000-0000-4000-8000-000000000001"],
        }),
      ).rejects.toBeInstanceOf(BackupExportSelectionError)
      await expect(service.exportFullBackup({})).rejects.toBeInstanceOf(BackupNativeWriteError)
    } finally {
      database.close()
    }
  })
})
