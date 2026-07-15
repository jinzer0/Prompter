import { randomUUID } from "node:crypto"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { z } from "zod"

import type { BackupImportSessionStore } from "../electron/backup/backup-session-store"
import { openPrompterDatabase } from "../electron/db/connection"
import type { BackupEnvelope, ImportBackupInput } from "../electron/ipc-types"
import { rawReviewTexts } from "./phase16-backup-import-fixtures"

export type TestDatabase = ReturnType<typeof openPrompterDatabase>

export type SeededBackupFixture = {
  readonly projectId: string
  readonly promptAssetId: string
  readonly promptVersionId: string
  readonly tagId: string
  readonly promptTemplateId: string
  readonly harnessTemplateId: string
  readonly projectContextProfileId: string
  readonly promptQualityReviewId: string
}

const directories: string[] = []
const databases: TestDatabase[] = []
const databasePathSchema = z.object({ file: z.string().min(1) })
const countSchema = z.object({ count: z.number() })
const allCountsSchema = z.object({
  projects: z.number(),
  promptAssets: z.number(),
  promptVersions: z.number(),
  tags: z.number(),
  promptTags: z.number(),
  profiles: z.number(),
  templates: z.number(),
  harnesses: z.number(),
  reviews: z.number(),
  fts: z.number(),
})

export async function createBackupImportTestDatabase(): Promise<TestDatabase> {
  const directory = await mkdtemp(join(tmpdir(), "prompter-phase16-import-"))
  directories.push(directory)
  const database = openPrompterDatabase({
    databasePath: join(directory, "prompter.sqlite"),
    migrationsFolder: join(process.cwd(), "drizzle"),
  })
  databases.push(database)
  return database
}

export async function cleanupBackupImportTestDatabases(): Promise<void> {
  for (const database of databases.splice(0)) {
    database.close()
  }
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })))
}

export function reopenBackupImportTestDatabase(database: TestDatabase): TestDatabase {
  const databasePath = databasePathSchema.parse(
    database.sqlite.prepare("PRAGMA database_list").get(),
  ).file
  const databaseIndex = databases.indexOf(database)
  if (databaseIndex >= 0) {
    databases.splice(databaseIndex, 1)
  }
  database.close()

  const reopened = openPrompterDatabase({
    databasePath,
    migrationsFolder: join(process.cwd(), "drizzle"),
  })
  databases.push(reopened)
  return reopened
}

export function seedBackupDatabase(database: TestDatabase): SeededBackupFixture {
  const project = database.services.createProject({
    name: "Backup helper project",
    description: "Seed every supported backup entity.",
    techStack: "TypeScript",
    defaultAgent: "codex",
  })
  const profile = database.services.getDefaultProjectContextProfile(project.id)
  if (profile === null) {
    throw new TypeError("Expected the seeded project context profile")
  }
  const tag = database.services.createTag({ name: "backup-helper" })
  const prompt = database.services.createPromptWithInitialVersion({
    projectId: project.id,
    title: "Backup helper prompt",
    scenario: "feature",
    targetAgent: "codex",
    originalInput: "Seed the backup helper.",
    compiledPrompt: "# Objective\nSeed every supported backup entity.",
    tagIds: [tag.id],
  })
  const promptTemplate = database.services.createPromptTemplateFromVersion({
    sourcePromptAssetId: prompt.asset.id,
    sourcePromptVersionId: prompt.version.id,
    name: "Backup helper template",
    description: "Seeded prompt template",
    templateBody: "{{objective}}",
  })
  const harnessTemplate = database.services.createHarnessTemplate({
    name: "Backup helper harness",
    scenario: "feature",
    targetAgent: "codex",
    templateBody: "{{prompt}}",
    requiredFields: '["prompt"]',
    clarificationPolicy: '{"mode":"ask"}',
  })
  const promptQualityReviewId = randomUUID()
  const raw = rawReviewTexts
  database.sqlite
    .prepare(
      `INSERT INTO prompt_quality_reviews (
        id, prompt_version_id, source, review_mode, overall_score, grade, dimension_scores,
        strengths, issues, suggestions, missing_sections, warnings,
        recommended_clarifying_questions, score_explanation, snapshot, improved_prompt_draft,
        created_at
      ) VALUES (?, ?, 'prompt_version', 'local', 91, 'excellent', ?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?)`,
    )
    .run(
      promptQualityReviewId,
      prompt.version.id,
      raw.dimensionScores,
      raw.strengths,
      raw.issues,
      raw.suggestions,
      raw.missingSections,
      raw.warnings,
      raw.recommendedClarifyingQuestions,
      "Exact raw review",
      raw.snapshot,
      1_000,
    )

  return {
    projectId: project.id,
    promptAssetId: prompt.asset.id,
    promptVersionId: prompt.version.id,
    tagId: tag.id,
    promptTemplateId: promptTemplate.id,
    harnessTemplateId: harnessTemplate.id,
    projectContextProfileId: profile.id,
    promptQualityReviewId,
  }
}

export function backupImportCounts(database: TestDatabase) {
  const count = (table: string): number =>
    countSchema.parse(database.sqlite.prepare(`SELECT count(*) AS count FROM ${table}`).get()).count
  return allCountsSchema.parse({
    projects: count("projects"),
    promptAssets: count("prompt_assets"),
    promptVersions: count("prompt_versions"),
    tags: count("tags"),
    promptTags: count("prompt_tags"),
    profiles: count("project_context_profiles"),
    templates: count("prompt_templates"),
    harnesses: count("harness_templates"),
    reviews: count("prompt_quality_reviews"),
    fts: count("prompt_search_fts"),
  })
}

export function createBackupImportSession(
  sessions: BackupImportSessionStore,
  envelope: BackupEnvelope,
) {
  return sessions.createImportSession({
    envelope,
    resolutionPlan: {
      itemCounts: envelope.metadata.itemCounts,
      conflicts: [],
      warnings: [],
      consequences: [],
      requiresDestinationProject: envelope.backupType === "prompt_assets",
    },
    previewFingerprint: "a".repeat(64),
    preview: {
      backupType: envelope.backupType,
      schemaVersion: envelope.schemaVersion,
      exportedAt: envelope.exportedAt,
      itemCounts: envelope.metadata.itemCounts,
      conflicts: [],
      warnings: [],
      consequences: [],
      requiresDestinationProject: envelope.backupType === "prompt_assets",
      excludesSecrets: true,
      excludesSecretStatus: true,
      includesSettings: false,
      plaintext: true,
    },
  })
}

export function backupImportInput(
  importSessionId: string,
  destinationProjectId?: string,
): ImportBackupInput {
  return {
    importSessionId,
    previewFingerprint: "a".repeat(64),
    previewRevision: 1,
    strategy: "safe_duplicate",
    ...(destinationProjectId === undefined ? {} : { destinationProjectId }),
  }
}
