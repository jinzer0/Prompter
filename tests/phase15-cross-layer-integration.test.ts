import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"

import { openPrompterDatabase } from "../electron/db/connection"
import { buildPromptLineageView } from "../renderer/src/lib/prompt-lineage-model"
import {
  createCurrentDatabase,
  removePhase15TestDatabases,
} from "./phase15-schema-migration-helpers"
import { promptQualityReviews, reviewForVersion } from "./prompt-quality-persistence-test-helpers"

type TestDatabase = Awaited<ReturnType<typeof createCurrentDatabase>>

const databasePathSchema = z.object({ file: z.string().min(1) })

afterEach(async () => {
  await removePhase15TestDatabases()
})

function currentDatabasePath(database: TestDatabase): string {
  return databasePathSchema.parse(database.sqlite.prepare("pragma database_list").get()).file
}

describe("Phase 15 cross-layer restart integration", () => {
  it("keeps normal, duplicate, and derived prompts searchable with lineage, tags, reviews, and templates after restart", async () => {
    // Given: one project with a normal prompt, its quality review, and both derivation paths.
    const database = await createCurrentDatabase("prompter-phase15-integration-")
    let initialDatabaseOpen = true
    let reopenedDatabase: TestDatabase | null = null

    try {
      const project = database.services.createProject({ name: "Phase 15 Restart Project" })
      const normal = database.services.createPromptWithInitialVersion({
        projectId: project.id,
        title: "Restart Source",
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "Restart search source input",
        compiledPrompt: "Restart search source output",
        tagNames: ["restart-source"],
      })
      const savedReview = promptQualityReviews(database).createPromptQualityReview({
        promptVersionId: normal.version.id,
        review: reviewForVersion({
          promptVersionId: normal.version.id,
          score: 87,
          createdAt: 1_000,
        }),
      })

      if (savedReview.id === null) {
        throw new TypeError("Saved prompt-version reviews must have an ID")
      }

      promptQualityReviews(database).applyPromptQualityScoreToVersion({
        promptVersionId: normal.version.id,
        reviewId: savedReview.id,
        qualityScore: savedReview.overallScore,
      })
      const duplicate = database.services.duplicatePromptAsset({
        sourcePromptAssetId: normal.asset.id,
        sourcePromptVersionId: normal.version.id,
        copyTags: true,
      })
      const derived = database.services.createDerivedPromptAsset({
        sourcePromptAssetId: normal.asset.id,
        sourcePromptVersionId: normal.version.id,
        title: "Restart Source Derived",
        originalInput: "Restart search derived input",
        compiledPrompt: "Restart search derived output",
        tagNames: ["restart-derived"],
      })
      const sourceTemplate = database.services.createPromptTemplateFromVersion({
        sourcePromptAssetId: normal.asset.id,
        sourcePromptVersionId: normal.version.id,
        name: "Restart source template",
        description: "Survives a database restart",
        templateBody: "Restart {{feature}} safely.",
      })
      const databasePath = currentDatabasePath(database)

      // When: the database closes and the application reopens its persisted SQLite file.
      database.close()
      initialDatabaseOpen = false
      reopenedDatabase = openPrompterDatabase({
        databasePath,
        migrationsFolder: join(process.cwd(), "drizzle"),
      })
      const searchResults = reopenedDatabase.services.searchPrompts({
        projectId: project.id,
        query: "restart search",
        limit: 50,
        offset: 0,
        sortBy: "relevance",
        sortDirection: "desc",
      })
      const lineage = reopenedDatabase.services.getLineage(normal.asset.id)
      const templates = reopenedDatabase.services.listPromptTemplates({
        query: "restart",
        scenario: "feature",
        targetAgent: "codex",
        limit: 100,
      })

      // Then: FTS, current-version quality, lineage fields, tags, templates, and review data persist.
      expect(searchResults).toHaveLength(3)
      expect(searchResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            currentVersion: expect.objectContaining({
              id: normal.version.id,
              qualityScore: savedReview.overallScore,
            }),
            promptAsset: expect.objectContaining({
              id: normal.asset.id,
              parentPromptVersionId: null,
              derivationType: null,
            }),
            tags: [expect.objectContaining({ name: "restart-source" })],
          }),
          expect.objectContaining({
            promptAsset: expect.objectContaining({
              id: duplicate.asset.id,
              parentPromptVersionId: normal.version.id,
              derivationType: "duplicate",
            }),
            tags: [expect.objectContaining({ name: "restart-source" })],
          }),
          expect.objectContaining({
            promptAsset: expect.objectContaining({
              id: derived.asset.id,
              parentPromptVersionId: normal.version.id,
              derivationType: "derived",
            }),
            tags: [expect.objectContaining({ name: "restart-derived" })],
          }),
        ]),
      )
      expect(lineage.children).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            promptAssetId: duplicate.asset.id,
            promptVersionId: duplicate.version.id,
            derivationType: "duplicate",
          }),
          expect.objectContaining({
            promptAssetId: derived.asset.id,
            promptVersionId: derived.version.id,
            derivationType: "derived",
          }),
        ]),
      )
      expect(templates).toEqual({ templates: [sourceTemplate], total: 1 })
      expect(
        promptQualityReviews(reopenedDatabase).listPromptQualityReviewsForVersion({
          promptVersionId: duplicate.version.id,
        }),
      ).toEqual([])
      expect(
        promptQualityReviews(reopenedDatabase).getLatestPromptQualityReview({
          promptVersionId: normal.version.id,
        }),
      ).toMatchObject({
        id: savedReview.id,
        overallScore: savedReview.overallScore,
        source: "prompt_version",
      })

      reopenedDatabase.services.deletePromptAsset(normal.asset.id)
      const deletedSourceChild = reopenedDatabase.services.getPromptAsset(derived.asset.id)
      if (deletedSourceChild === null) {
        throw new TypeError("Derived child must survive source deletion")
      }
      const deletedSourceLineage = reopenedDatabase.services.getLineage(derived.asset.id)

      expect(deletedSourceChild).toMatchObject({
        parentPromptId: null,
        parentPromptVersionId: null,
        derivationType: "derived",
      })
      expect(deletedSourceLineage).toEqual({ parent: null, children: [] })
      expect(
        buildPromptLineageView(deletedSourceChild, deletedSourceLineage, [deletedSourceChild])
          .parent,
      ).toEqual({ kind: "deleted" })
    } finally {
      reopenedDatabase?.close()
      if (initialDatabaseOpen) {
        database.close()
      }
    }
  })
})
