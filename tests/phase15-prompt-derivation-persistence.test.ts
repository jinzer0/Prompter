import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"
import { openPrompterDatabase } from "../electron/db/connection"
import {
  PersistenceNotFoundError,
  PromptLineageCycleError,
  PromptVersionOwnershipError,
} from "../electron/db/errors"

type TestDatabase = ReturnType<typeof openPrompterDatabase>

const directories: string[] = []

async function createTestDatabase(): Promise<TestDatabase> {
  const directory = await mkdtemp(join(tmpdir(), "prompter-derivation-db-"))
  directories.push(directory)
  return openPrompterDatabase({
    databasePath: join(directory, "prompter.sqlite"),
    migrationsFolder: join(process.cwd(), "drizzle"),
  })
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })))
})

describe("Phase 15 prompt derivation persistence", () => {
  it("duplicates current and historical source versions with controlled tag and quality copying", async () => {
    const database = await createTestDatabase()

    try {
      const project = database.services.createProject({ name: "Derivation Project" })
      const source = database.services.createPromptWithInitialVersion({
        projectId: project.id,
        title: "Source prompt",
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "Initial input",
        compiledPrompt: "Initial output",
        qualityScore: 91,
        tagNames: ["source-tag"],
      })
      const current = database.services.createNextPromptVersion({
        promptAssetId: source.asset.id,
        originalInput: "Current input",
        compiledPrompt: "Current output",
        qualityScore: 84,
        makeCurrent: true,
      })

      const duplicate = database.services.duplicatePromptAsset({
        sourcePromptAssetId: source.asset.id,
        copyTags: true,
      })
      const historicalDuplicate = database.services.duplicatePromptAsset({
        sourcePromptAssetId: source.asset.id,
        sourcePromptVersionId: source.version.id,
        copyTags: false,
      })

      expect(duplicate).toMatchObject({
        asset: {
          projectId: project.id,
          title: "Copy of Source prompt",
          parentPromptId: source.asset.id,
          parentPromptVersionId: current.version.id,
          derivationType: "duplicate",
        },
        version: { versionNumber: 1, compiledPrompt: "Current output", qualityScore: null },
      })
      expect(database.services.listTagsForPrompt(duplicate.asset.id)).toEqual([
        expect.objectContaining({ name: "source-tag" }),
      ])
      expect(historicalDuplicate.version).toMatchObject({
        versionNumber: 1,
        compiledPrompt: "Initial output",
        qualityScore: null,
      })
      expect(database.services.listTagsForPrompt(historicalDuplicate.asset.id)).toEqual([])
    } finally {
      database.close()
    }
  })

  it.each([
    true,
    false,
  ])("원본 저장 없이 편집 스냅샷을 복제한다 (copyTags=%s)", async (copyTags) => {
    const database = await createTestDatabase()

    try {
      const project = database.services.createProject({ name: "Editor duplicate project" })
      const source = database.services.createPromptWithInitialVersion({
        projectId: project.id,
        title: "Original title",
        scenario: "docs",
        targetAgent: "cursor",
        originalInput: "Saved input",
        compiledPrompt: "Saved output",
        assumptions: "Saved assumptions",
        qualityScore: 91,
        tagNames: ["original-tag", "shared-tag"],
      })
      const current = database.services.createNextPromptVersion({
        promptAssetId: source.asset.id,
        originalInput: "Current input",
        compiledPrompt: "Current output",
        makeCurrent: true,
      })
      const originalVersions = database.services.listPromptVersions(source.asset.id)
      const originalTags = database.services.listTagsForPrompt(source.asset.id)
      const editedVersion = {
        originalInput: "  Edited input\n\t",
        compiledPrompt: "\n  Edited output  \n",
        assumptions: "  Edited assumptions  \n",
        questions: "\tEdited questions\n",
        answers: "  Edited answers  ",
        acceptanceCriteria: "\n  Edited acceptance  \n",
        validationCommands: "  npm test\n",
        qualityScore: 99,
      }

      const duplicate = database.services.duplicatePromptAsset({
        sourcePromptAssetId: source.asset.id,
        sourcePromptVersionId: source.version.id,
        title: "Edited duplicate title",
        editedVersion,
        copyTags,
      })

      expect(duplicate.asset).toMatchObject({
        projectId: project.id,
        title: "Edited duplicate title",
        scenario: source.asset.scenario,
        targetAgent: source.asset.targetAgent,
        currentVersionId: duplicate.version.id,
        parentPromptId: source.asset.id,
        parentPromptVersionId: source.version.id,
        derivationType: "duplicate",
      })
      expect(duplicate.asset.id).not.toBe(source.asset.id)
      expect(duplicate.version.id).not.toBe(source.version.id)
      expect(duplicate.version.id).not.toBe(current.version.id)
      expect(duplicate.version).toMatchObject({
        ...editedVersion,
        promptAssetId: duplicate.asset.id,
        versionNumber: 1,
        qualityScore: null,
      })
      expect(database.services.listPromptVersions(duplicate.asset.id)).toEqual([duplicate.version])
      expect(database.services.getCurrentPromptVersion(duplicate.asset.id)).toEqual(
        duplicate.version,
      )
      expect(database.services.getPromptAsset(source.asset.id)).toEqual(current.asset)
      expect(database.services.getCurrentPromptVersion(source.asset.id)).toEqual(current.version)
      expect(database.services.listPromptVersions(source.asset.id)).toEqual(originalVersions)
      expect(database.services.listTagsForPrompt(source.asset.id)).toEqual(originalTags)
      expect(database.services.listTagsForPrompt(duplicate.asset.id)).toEqual(
        copyTags ? originalTags : [],
      )
    } finally {
      database.close()
    }
  })

  it("편집 복제의 잘못된 출처와 쓰기 실패는 원본과 모든 테이블을 보존한다", async () => {
    const database = await createTestDatabase()

    try {
      const source = database.services.createPromptWithInitialVersion({
        projectId: null,
        title: "Original",
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "Source input",
        compiledPrompt: "Source output",
        tagNames: ["source-tag"],
      })
      const other = database.services.createPromptWithInitialVersion({
        projectId: null,
        title: "Other",
        scenario: "docs",
        targetAgent: "cursor",
        originalInput: "Other input",
        compiledPrompt: "Other output",
      })
      const tables = [
        "prompt_assets",
        "prompt_versions",
        "tags",
        "prompt_tags",
        "prompt_search_fts",
      ]
      const before = tables.map((table) =>
        database.sqlite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(),
      )
      const input = {
        sourcePromptAssetId: source.asset.id,
        title: "Rejected edited duplicate",
        editedVersion: { originalInput: "Edited input", compiledPrompt: "Edited output" },
        copyTags: true,
      }

      expect(() =>
        database.services.duplicatePromptAsset({ ...input, sourcePromptAssetId: "malformed" }),
      ).toThrow(PersistenceNotFoundError)
      expect(() =>
        database.services.duplicatePromptAsset({ ...input, sourcePromptVersionId: "missing" }),
      ).toThrow(PersistenceNotFoundError)
      expect(() =>
        database.services.duplicatePromptAsset({
          ...input,
          sourcePromptVersionId: other.version.id,
        }),
      ).toThrow(PromptVersionOwnershipError)
      expect(
        tables.map((table) =>
          database.sqlite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(),
        ),
      ).toEqual(before)

      database.sqlite.exec(
        "CREATE TRIGGER edited_duplicate_tag_fault AFTER INSERT ON prompt_tags BEGIN SELECT RAISE(ABORT, 'edited duplicate tag failure'); END",
      )
      expect(() => database.services.duplicatePromptAsset(input)).toThrow(
        "edited duplicate tag failure",
      )
      expect(
        tables.map((table) =>
          database.sqlite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(),
        ),
      ).toEqual(before)
      expect(database.services.getPromptAsset(source.asset.id)).toEqual(source.asset)
      expect(database.services.listPromptVersions(source.asset.id)).toEqual([source.version])
    } finally {
      database.close()
    }
  })

  it("rejects cross-asset source versions and corrupt lineage cycles", async () => {
    const database = await createTestDatabase()

    try {
      const firstProject = database.services.createProject({ name: "First project" })
      const secondProject = database.services.createProject({ name: "Second project" })
      const source = database.services.createPromptWithInitialVersion({
        projectId: firstProject.id,
        title: "Source",
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "Source input",
        compiledPrompt: "Source output",
      })
      const other = database.services.createPromptWithInitialVersion({
        projectId: secondProject.id,
        title: "Other",
        scenario: "docs",
        targetAgent: "cursor",
        originalInput: "Other input",
        compiledPrompt: "Other output",
      })

      expect(() =>
        database.services.createDerivedPromptAsset({
          sourcePromptAssetId: source.asset.id,
          sourcePromptVersionId: other.version.id,
          title: "Rejected cross-project derivation",
          originalInput: "Input",
          compiledPrompt: "Output",
        }),
      ).toThrow(PromptVersionOwnershipError)

      database.sqlite
        .prepare("UPDATE prompt_assets SET parent_prompt_id = ? WHERE id = ?")
        .run(source.asset.id, source.asset.id)
      expect(() =>
        database.services.duplicatePromptAsset({
          sourcePromptAssetId: source.asset.id,
          copyTags: true,
        }),
      ).toThrow(PromptLineageCycleError)
    } finally {
      database.close()
    }
  })

  it("returns current child lineage summaries and preserves deleted-source derivation state", async () => {
    const database = await createTestDatabase()

    try {
      const source = database.services.createPromptWithInitialVersion({
        projectId: null,
        title: "Lineage source",
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "Source input",
        compiledPrompt: "Source output",
      })
      const child = database.services.createDerivedPromptAsset({
        sourcePromptAssetId: source.asset.id,
        sourcePromptVersionId: source.version.id,
        title: "Lineage child",
        originalInput: "Child input",
        compiledPrompt: "Child output",
      })
      const childCurrent = database.services.createNextPromptVersion({
        promptAssetId: child.asset.id,
        originalInput: "Child current input",
        compiledPrompt: "Child current output",
        makeCurrent: true,
      })

      expect(database.services.getLineage(child.asset.id).parent).toEqual({
        promptAssetId: source.asset.id,
        promptVersionId: source.version.id,
        title: source.asset.title,
        versionNumber: 1,
        derivationType: "derived",
      })
      expect(database.services.getLineage(source.asset.id).children).toEqual([
        {
          promptAssetId: child.asset.id,
          promptVersionId: childCurrent.version.id,
          title: child.asset.title,
          versionNumber: 2,
          derivationType: "derived",
        },
      ])

      database.services.deletePromptAsset(source.asset.id)
      expect(database.services.getLineage(child.asset.id).parent).toBeNull()
      expect(database.services.getPromptAsset(child.asset.id)?.derivationType).toBe("derived")
    } finally {
      database.close()
    }
  })
})
