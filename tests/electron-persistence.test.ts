import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { openPrompterDatabase } from "../electron/db/connection"
import {
  expectedColumns,
  expectedTables,
  forbiddenTables,
  stringArraySchema,
} from "./phase2-schema-contract"

type TestDatabase = ReturnType<typeof openPrompterDatabase>

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

  it("stores prompt assets, versions, and current version pointers", async () => {
    const database = await createTestDatabase()

    try {
      const project = database.services.createProject({ name: "Prompts" })
      const parent = database.services.createPromptAsset({
        projectId: project.id,
        title: "Parent Prompt",
        scenario: "feature",
        targetAgent: "codex",
      })
      const asset = database.services.createPromptAsset({
        projectId: project.id,
        title: "Summarizer",
        scenario: "research",
        targetAgent: "generic_agent",
        parentPromptId: parent.id,
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

      expect(filteredAssets).toHaveLength(2)
      expect(filteredAssets).toEqual(expect.arrayContaining([asset, parent]))
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

      expect(database.services.listHarnessTemplates()).toEqual([template])
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
