import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"
import { openPrompterDatabase } from "../electron/db/connection"
import {
  PromptTemplateSourceOverrideError,
  PromptVersionOwnershipError,
} from "../electron/db/errors"

type TestDatabase = ReturnType<typeof openPrompterDatabase>

const directories: string[] = []

async function createTestDatabase(): Promise<TestDatabase> {
  const directory = await mkdtemp(join(tmpdir(), "prompter-template-db-"))
  directories.push(directory)
  return openPrompterDatabase({
    databasePath: join(directory, "prompter.sqlite"),
    migrationsFolder: join(process.cwd(), "drizzle"),
  })
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })))
})

describe("Phase 15 prompt template persistence", () => {
  it("creates, filters, updates, duplicates, and deletes source-less templates", async () => {
    const database = await createTestDatabase()

    try {
      const nameMatch = database.services.createPromptTemplate({
        name: "Alpha template",
        description: null,
        scenario: "feature",
        targetAgent: "codex",
        templateBody: "Alpha body",
      })
      const descriptionMatch = database.services.createPromptTemplate({
        name: "Beta template",
        description: "Searchable description",
        scenario: "docs",
        targetAgent: "cursor",
        templateBody: "Beta body",
      })
      const bodyMatch = database.services.createPromptTemplate({
        name: "Gamma template",
        description: null,
        scenario: "feature",
        targetAgent: "codex",
        templateBody: "Searchable body",
      })
      database.sqlite
        .prepare("UPDATE prompt_templates SET updated_at = ? WHERE id = ?")
        .run(100, nameMatch.id)
      database.sqlite
        .prepare("UPDATE prompt_templates SET updated_at = ? WHERE id = ?")
        .run(200, descriptionMatch.id)
      database.sqlite
        .prepare("UPDATE prompt_templates SET updated_at = ? WHERE id = ?")
        .run(200, bodyMatch.id)

      expect(
        database.services
          .listPromptTemplates({ query: "searchable", limit: 100 })
          .templates.map((template) => template.id),
      ).toEqual([descriptionMatch.id, bodyMatch.id])
      expect(
        database.services
          .listPromptTemplates({ scenario: "feature", targetAgent: "codex", limit: 1 })
          .templates.map((template) => template.id),
      ).toEqual([bodyMatch.id])
      const updated = database.services.updatePromptTemplate(nameMatch.id, {
        name: "Alpha updated",
        templateBody: "Updated body",
      })
      const duplicate = database.services.duplicatePromptTemplate(updated.id)

      expect(duplicate).toMatchObject({
        name: "Copy of Alpha updated",
        sourcePromptAssetId: null,
        sourcePromptVersionId: null,
        templateBody: "Updated body",
      })
      expect(database.services.deletePromptTemplate(updated.id)).toEqual({
        id: updated.id,
        deleted: true,
      })
      expect(() => database.services.getPromptTemplate(updated.id)).toThrow()
    } finally {
      database.close()
    }
  })

  it("returns 100 templates when the service list limit is omitted", async () => {
    const database = await createTestDatabase()

    try {
      for (let index = 0; index < 101; index += 1) {
        database.services.createPromptTemplate({
          name: `Default limit template ${index}`,
          description: null,
          scenario: "feature",
          targetAgent: "codex",
          templateBody: "Template body",
        })
      }

      expect(database.services.listPromptTemplates()).toMatchObject({ total: 101 })
      expect(database.services.listPromptTemplates().templates).toHaveLength(100)
    } finally {
      database.close()
    }
  })

  it("creates source-linked templates from owned versions while preserving immutable provenance", async () => {
    const database = await createTestDatabase()

    try {
      const source = database.services.createPromptWithInitialVersion({
        projectId: null,
        title: "Template source",
        scenario: "research",
        targetAgent: "generic_agent",
        originalInput: "Input",
        compiledPrompt: "Source body",
      })
      const other = database.services.createPromptWithInitialVersion({
        projectId: null,
        title: "Other source",
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "Other input",
        compiledPrompt: "Other body",
      })
      const created = database.services.createPromptTemplateFromVersion({
        sourcePromptAssetId: source.asset.id,
        sourcePromptVersionId: source.version.id,
        name: "Linked template",
        description: "Derived from a version",
        templateBody: "Final edited body",
      })
      const updated = database.services.updatePromptTemplate(created.id, { name: "Linked updated" })

      expect(updated).toMatchObject({
        name: "Linked updated",
        sourcePromptAssetId: source.asset.id,
        sourcePromptVersionId: source.version.id,
        scenario: source.asset.scenario,
        targetAgent: source.asset.targetAgent,
        templateBody: "Final edited body",
      })
      expect(() =>
        database.services.createPromptTemplateFromVersion({
          sourcePromptAssetId: source.asset.id,
          sourcePromptVersionId: other.version.id,
          name: "Rejected ownership",
          templateBody: "Body",
        }),
      ).toThrow(PromptVersionOwnershipError)
      expect(() =>
        Reflect.apply(database.services.createPromptTemplateFromVersion, database.services, [
          Object.assign(
            {
              sourcePromptAssetId: source.asset.id,
              sourcePromptVersionId: source.version.id,
              name: "Rejected override",
              templateBody: "Body",
            },
            { scenario: "feature" },
          ),
        ]),
      ).toThrow(PromptTemplateSourceOverrideError)
    } finally {
      database.close()
    }
  })
})
