import "./prompt-quality-persistence.test.ts"
import "./phase15-atomic-persistence.test.ts"
import "./phase15-prompt-derivation-persistence.test.ts"
import "./phase15-prompt-template-persistence.test.ts"

import { randomUUID } from "node:crypto"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"

import { openPrompterDatabase } from "../electron/db/connection"
import { DEFAULT_HARNESS_TEMPLATE_IDS } from "../electron/db/default-harness-templates"
import { PersistenceNotFoundError } from "../electron/db/errors"
import {
  expectedColumns,
  expectedTables,
  forbiddenHarnessTemplateColumns,
  forbiddenTables,
  stringArraySchema,
} from "./phase2-schema-contract"

type TestDatabase = ReturnType<typeof openPrompterDatabase>

const sqliteIndexSchema = z.object({
  name: z.string(),
  unique: z.number(),
  partial: z.number(),
})
const sqliteForeignKeySchema = z.object({
  from: z.string(),
  table: z.string(),
  to: z.string(),
  on_delete: z.string(),
})
const profileCountSchema = z.object({ count: z.number() })
const harnessNullableColumnsSchema = z.object({
  required_fields: z.string().nullable(),
  clarification_policy: z.string().nullable(),
})
const profileDefaultRowsSchema = z.array(
  z.object({ id: z.string(), project_id: z.string(), is_default: z.number() }),
)
const profileStoredTextSchema = z.object({
  repo_path: z.string().nullable(),
  summary: z.string().nullable(),
})
const projectContextProfileIdSchema = z.object({ id: z.string() })

const fixedHarnessTemplateIds = Object.values(DEFAULT_HARNESS_TEMPLATE_IDS)

const tempDirectories: string[] = []

async function createTestDatabase(): Promise<TestDatabase> {
  const directory = await mkdtemp(join(tmpdir(), "prompter-db-"))
  tempDirectories.push(directory)

  return openPrompterDatabase({
    databasePath: join(directory, "prompter.sqlite"),
    migrationsFolder: join(process.cwd(), "drizzle"),
  })
}

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  )
})

describe("Electron persistence", () => {
  it("initializes the Phase 2 SQLite tables and excludes run storage", async () => {
    const database = await createTestDatabase()

    try {
      const tableNames = stringArraySchema.parse(
        database.sqlite
          .prepare("select name from sqlite_master where type = 'table'")
          .pluck()
          .all(),
      )

      expect(tableNames).toEqual(expect.arrayContaining([...expectedTables]))

      for (const tableName of forbiddenTables) {
        expect(tableNames).not.toContain(tableName)
      }

      for (const [tableName, columns] of Object.entries(expectedColumns)) {
        const columnNames = stringArraySchema.parse(
          database.sqlite.prepare("select name from pragma_table_info(?)").pluck().all(tableName),
        )

        expect(columnNames).toEqual(expect.arrayContaining([...columns]))
      }

      const harnessColumns = stringArraySchema.parse(
        database.sqlite
          .prepare("select name from pragma_table_info('harness_templates')")
          .pluck()
          .all(),
      )

      expect(harnessColumns).toEqual([...expectedColumns.harness_templates])
      for (const columnName of forbiddenHarnessTemplateColumns) {
        expect(harnessColumns).not.toContain(columnName)
      }
    } finally {
      database.close()
    }
  })

  it("creates project context profile constraints and indexes", async () => {
    const database = await createTestDatabase()

    try {
      const projectId = "33333333-3333-4333-8333-333333333333"
      const firstProfileId = "44444444-4444-4444-8444-444444444444"
      const secondProfileId = "55555555-5555-4555-8555-555555555555"
      database.sqlite
        .prepare(
          `insert into projects (id, name, created_at, updated_at)
            values (?, ?, ?, ?)`,
        )
        .run(projectId, "Context Project", 1000, 1000)

      const foreignKeys = z
        .array(sqliteForeignKeySchema)
        .parse(
          database.sqlite
            .prepare("select * from pragma_foreign_key_list('project_context_profiles')")
            .all(),
        )
      expect(foreignKeys).toContainEqual(
        expect.objectContaining({
          from: "project_id",
          table: "projects",
          to: "id",
          on_delete: "CASCADE",
        }),
      )

      const indexes = z
        .array(sqliteIndexSchema)
        .parse(
          database.sqlite
            .prepare("select * from pragma_index_list('project_context_profiles')")
            .all(),
        )
      expect(indexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "project_context_profiles_project_id_idx", unique: 0 }),
          expect.objectContaining({
            name: "project_context_profiles_default_unique_idx",
            unique: 1,
            partial: 1,
          }),
        ]),
      )
      expect(
        database.sqlite
          .prepare(
            "select sql from sqlite_master where name = 'project_context_profiles_default_unique_idx'",
          )
          .pluck()
          .get(),
      ).toBe(
        "CREATE UNIQUE INDEX `project_context_profiles_default_unique_idx` ON `project_context_profiles` (`project_id`) WHERE is_default = 1",
      )

      insertProjectContextProfile(database, firstProfileId, projectId, 1)
      expect(() => insertProjectContextProfile(database, secondProfileId, projectId, 1)).toThrow()
      insertProjectContextProfile(database, secondProfileId, projectId, 0)

      database.sqlite.prepare("delete from projects where id = ?").run(projectId)
      expect(readProjectContextProfileCount(database, projectId)).toBe(0)
    } finally {
      database.close()
    }
  })

  it("seeds default harness templates idempotently without overwriting edits", async () => {
    const database = await createTestDatabase()

    try {
      const seeded = database.services.listHarnessTemplates()

      expect(seeded).toHaveLength(6)
      expect(seeded.map((template) => template.id).sort()).toEqual(
        [...fixedHarnessTemplateIds].sort(),
      )

      database.services.seedDefaultHarnessTemplates()
      expect(database.services.listHarnessTemplates()).toHaveLength(6)

      const featureId = DEFAULT_HARNESS_TEMPLATE_IDS.feature
      const edited = database.services.updateHarnessTemplate(featureId, {
        name: "Edited Feature Harness",
        templateBody: "Edited body {{title}}",
      })

      database.services.seedDefaultHarnessTemplates()
      expect(database.services.getHarnessTemplate(featureId)).toMatchObject({
        name: edited.name,
        templateBody: edited.templateBody,
      })

      database.services.deleteHarnessTemplate(featureId)
      expect(database.services.getHarnessTemplate(featureId)).toBeNull()

      database.services.seedDefaultHarnessTemplates()
      expect(database.services.getHarnessTemplate(featureId)).toMatchObject({
        id: featureId,
        name: "Feature Implementation",
      })
      expect(database.services.listHarnessTemplates()).toHaveLength(6)
    } finally {
      database.close()
    }
  })

  it("filters harness templates by scenario, target agent, and case-insensitive name query", async () => {
    const database = await createTestDatabase()

    try {
      const codexTemplate = database.services.createHarnessTemplate({
        name: "Codex Specific Harness",
        scenario: "feature",
        targetAgent: "codex",
        templateBody: "Use {{title}} for Codex.",
      })
      database.services.createHarnessTemplate({
        name: "Cursor Specific Harness",
        scenario: "bugfix",
        targetAgent: "cursor",
        templateBody: "Use {{title}} for Cursor.",
      })

      const featureTemplates = database.services.listHarnessTemplates({ scenario: "feature" })
      const codexTemplates = database.services.listHarnessTemplates({ targetAgent: "codex" })
      const queryTemplates = database.services.listHarnessTemplates({
        query: "feature implementation",
      })

      expect(featureTemplates.every((template) => template.scenario === "feature")).toBe(true)
      expect(featureTemplates.map((template) => template.id)).toEqual(
        expect.arrayContaining([DEFAULT_HARNESS_TEMPLATE_IDS.feature, codexTemplate.id]),
      )
      expect(codexTemplates).toEqual([codexTemplate])
      expect(queryTemplates.map((template) => template.id)).toEqual([
        DEFAULT_HARNESS_TEMPLATE_IDS.feature,
      ])
    } finally {
      database.close()
    }
  })

  it("orders harness template lists by updated time, created time, then name", async () => {
    const database = await createTestDatabase()

    try {
      database.sqlite
        .prepare(
          `insert into harness_templates
            (id, name, scenario, target_agent, template_body, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          "10000000-0000-4000-8000-000000000001",
          "Order C",
          "feature",
          "generic_agent",
          "Order {{title}} C",
          100,
          200,
        )
      database.sqlite
        .prepare(
          `insert into harness_templates
            (id, name, scenario, target_agent, template_body, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          "10000000-0000-4000-8000-000000000002",
          "Order A",
          "feature",
          "generic_agent",
          "Order {{title}} A",
          101,
          200,
        )
      database.sqlite
        .prepare(
          `insert into harness_templates
            (id, name, scenario, target_agent, template_body, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          "10000000-0000-4000-8000-000000000003",
          "Order B",
          "feature",
          "generic_agent",
          "Order {{title}} B",
          101,
          200,
        )
      database.sqlite
        .prepare(
          `insert into harness_templates
            (id, name, scenario, target_agent, template_body, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          "10000000-0000-4000-8000-000000000004",
          "Order D",
          "feature",
          "generic_agent",
          "Order {{title}} D",
          99,
          201,
        )

      expect(
        database.services.listHarnessTemplates({ query: "order" }).map((template) => template.name),
      ).toEqual(["Order D", "Order A", "Order B", "Order C"])
    } finally {
      database.close()
    }
  })

  it("creates, reads, updates, and deletes projects with millisecond timestamps", async () => {
    const database = await createTestDatabase()

    try {
      const project = database.services.createProject({
        name: "Research",
        description: "Reusable prompts",
        techStack: "Electron, React, TypeScript",
        defaultAgent: "codex",
      })

      expect(project).toMatchObject({
        name: "Research",
        description: "Reusable prompts",
        techStack: "Electron, React, TypeScript",
        defaultAgent: "codex",
      })
      expect(typeof project.createdAt).toBe("number")
      expect(typeof project.updatedAt).toBe("number")
      expect(database.services.getProject(project.id)).toEqual(project)
      expect(database.services.listProjects()).toEqual([project])

      const updated = database.services.updateProject(project.id, {
        name: "Research Ops",
        defaultAgent: "claude_code",
      })

      expect(updated).toMatchObject({
        id: project.id,
        name: "Research Ops",
        defaultAgent: "claude_code",
      })
      expect(updated.updatedAt).toBeGreaterThanOrEqual(project.updatedAt)

      expect(database.services.deleteProject(project.id)).toEqual({ id: project.id })
      expect(database.services.getProject(project.id)).toBeNull()
    } finally {
      database.close()
    }
  })

  it("creates one default project context profile with copied project text on project creation", async () => {
    const database = await createTestDatabase()

    try {
      const project = database.services.createProject({
        name: "Context Seed Project",
        description: "Project description is copied as inert context.",
        techStack: "Electron, React, TypeScript",
      })

      const defaultProfile = database.services.getDefaultProjectContextProfile(project.id)
      const profiles = database.services.listProjectContextProfiles({ projectId: project.id })

      expect(project).toMatchObject({
        description: "Project description is copied as inert context.",
        techStack: "Electron, React, TypeScript",
      })
      expect(profiles).toHaveLength(1)
      expect(defaultProfile).toMatchObject({
        id: profiles[0]?.id,
        projectId: project.id,
        name: "Default Context",
        summary: "Project description is copied as inert context.",
        techStack: "Electron, React, TypeScript",
        isDefault: true,
      })
      expect(readProjectContextProfileCount(database, project.id)).toBe(1)
      const defaultProfileId = projectContextProfileIdSchema.parse(defaultProfile).id

      database.services.updateProjectContextProfile(
        { projectId: project.id, profileId: defaultProfileId },
        { summary: "User-owned summary", techStack: "User-owned stack" },
      )
      const updatedProject = database.services.updateProject(project.id, {
        description: "Updated project description",
        techStack: "Updated project stack",
      })
      const userOwnedProfile = database.services.getDefaultProjectContextProfile(project.id)

      expect(updatedProject).toMatchObject({
        description: "Updated project description",
        techStack: "Updated project stack",
      })
      expect(userOwnedProfile).toMatchObject({
        summary: "User-owned summary",
        techStack: "User-owned stack",
      })
      expect(readProjectContextProfileCount(database, project.id)).toBe(1)
    } finally {
      database.close()
    }
  })

  it("stores prompt assets, versions, and current version pointers", async () => {
    const database = await createTestDatabase()

    try {
      const project = database.services.createProject({ name: "Prompts" })
      const asset = database.services.createPromptAsset({
        projectId: project.id,
        title: "Summarizer",
        scenario: "research",
        targetAgent: "generic_agent",
      })
      const version = database.services.createPromptVersion({
        promptAssetId: asset.id,
        originalInput: "Summarize this document.",
        compiledPrompt: "Summarize this document in three bullets.",
        assumptions: "[]",
        questions: "[]",
        answers: "[]",
        acceptanceCriteria: "[]",
        validationCommands: "[]",
        qualityScore: 80,
      })

      const filteredAssets = database.services.listPromptAssets({ projectId: project.id })

      expect(filteredAssets).toEqual([asset])
      expect(database.services.getPromptAsset(asset.id)).toEqual(asset)
      expect(database.services.listPromptVersions(asset.id)).toEqual([version])
      expect(database.services.getPromptVersion(version.id)).toEqual(version)
      expect(version).toMatchObject({
        promptAssetId: asset.id,
        versionNumber: 1,
        originalInput: "Summarize this document.",
        compiledPrompt: "Summarize this document in three bullets.",
      })

      const currentAsset = database.services.setCurrentPromptVersion(asset.id, version.id)
      expect(currentAsset.currentVersionId).toBe(version.id)

      const updatedAsset = database.services.updatePromptAsset(asset.id, {
        title: "Research Summarizer",
        scenario: "docs",
      })
      expect(updatedAsset).toMatchObject({ title: "Research Summarizer", scenario: "docs" })

      expect(database.services.deletePromptAsset(asset.id)).toEqual({ id: asset.id })
      expect(database.services.getPromptAsset(asset.id)).toBeNull()
    } finally {
      database.close()
    }
  })

  it("creates the next prompt version and marks it current atomically", async () => {
    const database = await createTestDatabase()

    try {
      const project = database.services.createProject({ name: "Versioned Prompts" })
      const asset = database.services.createPromptAsset({
        projectId: project.id,
        title: "Versioned Compiler Prompt",
        scenario: "feature",
        targetAgent: "codex",
      })

      const first = database.services.createNextPromptVersion({
        promptAssetId: asset.id,
        originalInput: "Write the first implementation prompt.",
        compiledPrompt: "# Objective\nShip the first implementation prompt.",
        makeCurrent: true,
        qualityScore: 72,
      })
      const second = database.services.createNextPromptVersion({
        promptAssetId: asset.id,
        originalInput: "Write the revised implementation prompt.",
        compiledPrompt: "# Objective\nShip the revised implementation prompt.",
        makeCurrent: true,
        assumptions: '["Existing prompt metadata stays on the version."]',
        questions: "[]",
        answers: "[]",
        acceptanceCriteria: "Version 2 is current.",
        validationCommands: "npm run typecheck",
        qualityScore: 91,
      })

      expect(first.version.versionNumber).toBe(1)
      expect(first.asset.currentVersionId).toBe(first.version.id)
      expect(second.version.versionNumber).toBe(2)
      expect(second.asset.currentVersionId).toBe(second.version.id)
      expect(database.services.getPromptAsset(asset.id)?.currentVersionId).toBe(second.version.id)
      expect(database.services.listPromptVersions(asset.id).map((version) => version.id)).toEqual([
        second.version.id,
        first.version.id,
      ])

      const restored = database.services.setCurrentPromptVersion(asset.id, first.version.id)

      expect(restored.currentVersionId).toBe(first.version.id)
      expect(database.services.listPromptVersions(asset.id)).toHaveLength(2)
    } finally {
      database.close()
    }
  })

  it("creates tags and attaches them to prompt assets", async () => {
    const database = await createTestDatabase()

    try {
      const asset = database.services.createPromptAsset({
        title: "Classifier",
        scenario: "code_review",
        targetAgent: "cursor",
      })
      const tag = database.services.createTag({ name: "taxonomy" })
      const updatedTag = database.services.updateTag(tag.id, { name: "classification" })

      expect(database.services.listTags()).toEqual([updatedTag])
      expect(database.services.attachTagToPrompt(asset.id, updatedTag.id)).toEqual({
        promptAssetId: asset.id,
        tagId: updatedTag.id,
      })
      expect(database.services.detachTagFromPrompt(asset.id, updatedTag.id)).toEqual({
        promptAssetId: asset.id,
        tagId: updatedTag.id,
      })
      expect(database.services.deleteTag(updatedTag.id)).toEqual({ id: updatedTag.id })
    } finally {
      database.close()
    }
  })

  it("creates, lists, updates, and deletes harness templates", async () => {
    const database = await createTestDatabase()

    try {
      const template = database.services.createHarnessTemplate({
        name: "Feature Builder",
        scenario: "feature",
        targetAgent: "codex",
        templateBody: "Build {{feature}} with tests.",
        requiredFields: '["feature"]',
        clarificationPolicy: "ask_when_missing",
      })

      expect(database.services.listHarnessTemplates({ query: "Feature Builder" })).toEqual([
        template,
      ])
      expect(database.services.getHarnessTemplate(template.id)).toEqual(template)

      const updated = database.services.updateHarnessTemplate(template.id, {
        name: "Feature Builder v2",
        targetAgent: "generic_agent",
      })

      expect(updated).toMatchObject({ name: "Feature Builder v2", targetAgent: "generic_agent" })
      expect(database.services.deleteHarnessTemplate(template.id)).toEqual({ id: template.id })
      expect(database.services.getHarnessTemplate(template.id)).toBeNull()
    } finally {
      database.close()
    }
  })

  it("persists harness nullable JSON create and update semantics", async () => {
    const database = await createTestDatabase()

    try {
      const omitted = database.services.createHarnessTemplate({
        name: "Omitted JSON Harness",
        scenario: "feature",
        targetAgent: "generic_agent",
        templateBody: "Use {{title}}.",
      })
      const explicitNull = database.services.createHarnessTemplate({
        name: "Null JSON Harness",
        scenario: "bugfix",
        targetAgent: "generic_agent",
        templateBody: "Use {{originalInput}}.",
        requiredFields: null,
        clarificationPolicy: null,
      })
      const structured = database.services.createHarnessTemplate({
        name: "Structured JSON Harness",
        scenario: "docs",
        targetAgent: "generic_agent",
        templateBody: "Use {{constraints}}.",
        requiredFields: JSON.stringify(["title", "originalInput"]),
        clarificationPolicy: JSON.stringify({ mode: "ask_when_missing" }),
      })

      expect(readHarnessNullableColumns(database, omitted.id)).toEqual({
        required_fields: null,
        clarification_policy: null,
      })
      expect(readHarnessNullableColumns(database, explicitNull.id)).toEqual({
        required_fields: null,
        clarification_policy: null,
      })
      expect(readHarnessNullableColumns(database, structured.id)).toEqual({
        required_fields: '["title","originalInput"]',
        clarification_policy: '{"mode":"ask_when_missing"}',
      })

      database.services.updateHarnessTemplate(structured.id, { name: "Structured JSON Harness v2" })
      expect(readHarnessNullableColumns(database, structured.id)).toEqual({
        required_fields: '["title","originalInput"]',
        clarification_policy: '{"mode":"ask_when_missing"}',
      })

      database.services.updateHarnessTemplate(structured.id, {
        requiredFields: null,
        clarificationPolicy: null,
      })
      expect(readHarnessNullableColumns(database, structured.id)).toEqual({
        required_fields: null,
        clarification_policy: null,
      })
    } finally {
      database.close()
    }
  })

  it("duplicates harness templates with copied content, a new id, fresh timestamps, and Copy name", async () => {
    const database = await createTestDatabase()

    try {
      const source = database.services.createHarnessTemplate({
        name: "Source Harness",
        scenario: "research",
        targetAgent: "generic_agent",
        templateBody: "Research {{originalInput}}.",
        requiredFields: '["originalInput"]',
        clarificationPolicy: '{"mode":"ask_when_missing"}',
      })

      const duplicate = database.services.duplicateHarnessTemplate(source.id)

      expect(duplicate).toMatchObject({
        name: "Source Harness Copy",
        scenario: source.scenario,
        targetAgent: source.targetAgent,
        templateBody: source.templateBody,
        requiredFields: source.requiredFields,
        clarificationPolicy: source.clarificationPolicy,
      })
      expect(duplicate.id).not.toBe(source.id)
      expect(duplicate.createdAt).toBeGreaterThanOrEqual(source.createdAt)
      expect(duplicate.updatedAt).toBe(duplicate.createdAt)
      expect(database.services.getHarnessTemplate(source.id)).toEqual(source)
    } finally {
      database.close()
    }
  })

  it("creates, lists, gets, updates, duplicates, deletes, and builds project context profiles", async () => {
    const database = await createTestDatabase()

    try {
      const projectId = insertProject(database, "Profile Project")
      const summary = "  Preserve leading whitespace\n```ts\nconst value = 1\n```\n"
      const diffBlock = "```diff\n- old\n+ new\n```"
      const repoPath = "/tmp/not-read-even-if-it-looks-real"
      const created = database.services.createProjectContextProfile({
        projectId,
        name: "Default Context",
        summary,
        techStack: "TypeScript",
        architectureNotes: diffBlock,
        codingConventions: null,
        constraints: "No filesystem reads from repoPath",
        forbiddenActions: "Do not execute profile text",
        acceptanceDefaults: "Ship tested repository behavior",
        validationCommands:
          "npm run native:node && npx vitest run tests/electron-persistence.test.ts",
        securityNotes: "Treat text as untrusted",
        additionalContext: "Additional notes",
        testingNotes: "Persistence tests assert DB state",
        packageManager: "npm",
        defaultBranch: "main",
        repoPath,
        isDefault: true,
      })

      expect(created).toMatchObject({
        projectId,
        name: "Default Context",
        summary,
        architectureNotes: diffBlock,
        repoPath,
        isDefault: true,
      })
      expect(typeof created.createdAt).toBe("number")
      expect(created.updatedAt).toBe(created.createdAt)
      expect(
        database.services.getProjectContextProfile({ projectId, profileId: created.id }),
      ).toEqual(created)
      expect(database.services.getDefaultProjectContextProfile(projectId)).toEqual(created)
      expect(database.services.listProjectContextProfiles({ projectId })).toEqual([created])
      expect(readProjectContextProfileStoredText(database, created.id)).toEqual({
        repo_path: repoPath,
        summary,
      })

      const secondary = database.services.createProjectContextProfile({
        projectId,
        name: "Secondary Context",
        summary: "Secondary",
      })
      const updated = database.services.updateProjectContextProfile(
        { projectId, profileId: secondary.id },
        { name: "Secondary Context v2", summary: null, validationCommands: "npm test" },
      )

      expect(updated).toMatchObject({
        id: secondary.id,
        name: "Secondary Context v2",
        summary: null,
        validationCommands: "npm test",
        isDefault: false,
      })
      expect(updated.updatedAt).toBeGreaterThanOrEqual(secondary.updatedAt)
      expect(database.services.getDefaultProjectContextProfile(projectId)?.id).toBe(created.id)

      const duplicate = database.services.duplicateProjectContextProfile({
        projectId,
        profileId: created.id,
      })
      expect(duplicate).toMatchObject({
        projectId,
        name: "Default Context Copy",
        summary: created.summary,
        techStack: created.techStack,
        architectureNotes: created.architectureNotes,
        repoPath: created.repoPath,
        isDefault: false,
      })
      expect(duplicate.id).not.toBe(created.id)
      expect(duplicate.createdAt).toBeGreaterThanOrEqual(created.createdAt)
      expect(duplicate.updatedAt).toBe(duplicate.createdAt)

      const context = database.services.buildCompilerContext({ projectId, profileId: created.id })
      expect(context).toMatchObject({
        profileId: created.id,
        profileName: created.name,
        warnings: [],
      })
      expect(context.context).toContain("## Project Context Profile")
      expect(context.context).toContain(summary)
      expect(context.context).toContain(diffBlock)
      expect(context.context).toContain(repoPath)
      expect(context.sectionNames).toEqual(expect.arrayContaining(["### Repository Path"]))

      expect(
        database.services.deleteProjectContextProfile({ projectId, profileId: created.id }),
      ).toEqual({
        id: created.id,
      })
      expect(
        database.services.getProjectContextProfile({ projectId, profileId: created.id }),
      ).toBeNull()
      expect(database.services.getDefaultProjectContextProfile(projectId)).toBeNull()
    } finally {
      database.close()
    }
  })

  it("keeps exactly one project context default per project and isolates project ownership", async () => {
    const database = await createTestDatabase()

    try {
      const firstProjectId = insertProject(database, "First Project")
      const secondProjectId = insertProject(database, "Second Project")
      const firstDefault = database.services.createProjectContextProfile({
        projectId: firstProjectId,
        name: "First Default",
        isDefault: true,
      })
      const firstOther = database.services.createProjectContextProfile({
        projectId: firstProjectId,
        name: "First Other",
      })
      const secondDefault = database.services.createProjectContextProfile({
        projectId: secondProjectId,
        name: "Second Default",
        isDefault: true,
      })

      expect(readProjectContextDefaultRows(database)).toEqual(
        expect.arrayContaining([
          { id: firstDefault.id, project_id: firstProjectId, is_default: 1 },
          { id: secondDefault.id, project_id: secondProjectId, is_default: 1 },
        ]),
      )

      const selected = database.services.setDefaultProjectContextProfile({
        projectId: firstProjectId,
        profileId: firstOther.id,
      })
      expect(selected.id).toBe(firstOther.id)
      expect(selected.isDefault).toBe(true)
      expect(database.services.getDefaultProjectContextProfile(firstProjectId)?.id).toBe(
        firstOther.id,
      )
      expect(
        database.services.getProjectContextProfile({
          projectId: firstProjectId,
          profileId: firstDefault.id,
        }),
      ).toMatchObject({ isDefault: false })
      expect(database.services.getDefaultProjectContextProfile(secondProjectId)?.id).toBe(
        secondDefault.id,
      )
      expect(
        readProjectContextDefaultRows(database).filter((row) => row.project_id === firstProjectId),
      ).toEqual([{ id: firstOther.id, project_id: firstProjectId, is_default: 1 }])

      const ownershipMismatch = { projectId: secondProjectId, profileId: firstOther.id }
      expect(database.services.getProjectContextProfile(ownershipMismatch)).toBeNull()
      expect(() =>
        database.services.updateProjectContextProfile(ownershipMismatch, { name: "Leaked" }),
      ).toThrow(PersistenceNotFoundError)
      expect(() => database.services.deleteProjectContextProfile(ownershipMismatch)).toThrow(
        PersistenceNotFoundError,
      )
      expect(() => database.services.duplicateProjectContextProfile(ownershipMismatch)).toThrow(
        PersistenceNotFoundError,
      )
      expect(() => database.services.setDefaultProjectContextProfile(ownershipMismatch)).toThrow(
        PersistenceNotFoundError,
      )
      expect(database.services.buildCompilerContext(ownershipMismatch)).toEqual({
        profileId: null,
        profileName: null,
        context: null,
        sectionNames: [],
        warnings: [
          "Selected project context profile is unavailable; profile context was excluded.",
        ],
      })

      database.services.deleteProject(firstProjectId)
      expect(database.services.listProjectContextProfiles({ projectId: firstProjectId })).toEqual(
        [],
      )
      expect(
        database.services.getProjectContextProfile({
          projectId: firstProjectId,
          profileId: firstOther.id,
        }),
      ).toBeNull()
      expect(database.services.getDefaultProjectContextProfile(firstProjectId)).toBeNull()
      expect(database.services.getDefaultProjectContextProfile(secondProjectId)?.id).toBe(
        secondDefault.id,
      )
    } finally {
      database.close()
    }
  })

  it("sets, gets, and lists non-secret settings", async () => {
    const database = await createTestDatabase()

    try {
      const setting = database.services.setSetting("theme", "dark")

      expect(setting).toMatchObject({ key: "theme", value: "dark" })
      expect(typeof setting.updatedAt).toBe("number")
      expect(database.services.getSetting("theme")).toEqual(setting)
      expect(database.services.listSettings()).toEqual([setting])
      expect(database.services.getSetting("missing")).toBeNull()
    } finally {
      database.close()
    }
  })
})

function readHarnessNullableColumns(database: TestDatabase, id: string) {
  return harnessNullableColumnsSchema.parse(
    database.sqlite
      .prepare(
        `select required_fields, clarification_policy
          from harness_templates
          where id = ?`,
      )
      .get(id),
  )
}

function readProjectContextDefaultRows(database: TestDatabase) {
  return profileDefaultRowsSchema.parse(
    database.sqlite
      .prepare(
        `select id, project_id, is_default
          from project_context_profiles
          where is_default = 1
          order by project_id`,
      )
      .all(),
  )
}

function readProjectContextProfileStoredText(database: TestDatabase, id: string) {
  return profileStoredTextSchema.parse(
    database.sqlite
      .prepare(
        `select repo_path, summary
          from project_context_profiles
          where id = ?`,
      )
      .get(id),
  )
}

function insertProject(database: TestDatabase, name: string): string {
  const id = randomUUID()

  database.sqlite
    .prepare("insert into projects (id, name, created_at, updated_at) values (?, ?, ?, ?)")
    .run(id, name, 1000, 1000)

  return id
}

function insertProjectContextProfile(
  database: TestDatabase,
  id: string,
  projectId: string,
  isDefault: number,
): void {
  database.sqlite
    .prepare(
      `insert into project_context_profiles (
        id,
        project_id,
        name,
        summary,
        tech_stack,
        architecture_notes,
        coding_conventions,
        constraints,
        forbidden_actions,
        acceptance_defaults,
        validation_commands,
        security_notes,
        additional_context,
        testing_notes,
        package_manager,
        default_branch,
        repo_path,
        is_default,
        created_at,
        updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      projectId,
      "Default Profile",
      "Summary",
      "TypeScript",
      "Architecture",
      "Conventions",
      "Constraints",
      "Forbidden",
      "Acceptance",
      "npm test",
      "Security",
      "Additional",
      "Testing",
      "npm",
      "main",
      "/tmp/project",
      isDefault,
      1000,
      1000,
    )
}

function readProjectContextProfileCount(database: TestDatabase, projectId: string): number {
  const row = profileCountSchema.parse(
    database.sqlite
      .prepare("select count(*) as count from project_context_profiles where project_id = ?")
      .get(projectId),
  )

  return row.count
}
