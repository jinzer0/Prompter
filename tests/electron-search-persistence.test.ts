import { afterEach, describe, expect, it } from "vitest"

import {
  createAndAttachTagToPrompt,
  createPhase7SearchFixture,
  createSearchTestDatabase,
  listTagsForPrompt,
  listTagsWithCounts,
  rebuildSearchIndex,
  removeSearchTestDatabases,
  searchPrompts,
} from "./electron-search-test-helpers"
import { stringArraySchema } from "./phase2-schema-contract"

afterEach(async () => {
  await removeSearchTestDatabases()
})

describe("Electron Phase 7 search persistence", () => {
  it("searches prompt assets through the FTS index with current-version previews and AND tag filters", async () => {
    const database = await createSearchTestDatabase()

    try {
      const fixture = createPhase7SearchFixture(database)

      rebuildSearchIndex(database)

      const ftsTables = stringArraySchema.parse(
        database.sqlite
          .prepare(
            "select name from sqlite_master where type = 'table' and name = 'prompt_search_fts'",
          )
          .pluck()
          .all(),
      )
      const results = searchPrompts(database, {
        projectId: fixture.project.id,
        query: "React command",
        scenario: "feature",
        tagIds: [fixture.frontendTag.id, fixture.urgentTag.id],
        targetAgent: "codex",
      })

      expect(ftsTables).toEqual(["prompt_search_fts"])
      expect(results).toEqual([
        expect.objectContaining({
          currentVersion: expect.objectContaining({
            compiledPrompt: "Ship the React command palette with keyboard navigation and tests.",
            id: fixture.currentVersion.id,
          }),
          preview: expect.stringContaining("React command palette"),
          promptAsset: expect.objectContaining({
            id: fixture.currentPrompt.id,
            title: "Command Palette Builder",
          }),
          tags: expect.arrayContaining([
            expect.objectContaining({ id: fixture.frontendTag.id, name: "frontend" }),
            expect.objectContaining({ id: fixture.urgentTag.id, name: "urgent" }),
          ]),
        }),
      ])
      expect(results).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            currentVersion: expect.objectContaining({ id: fixture.staleVersion.id }),
          }),
          expect.objectContaining({
            promptAsset: expect.objectContaining({ id: fixture.partialTagPrompt.id }),
          }),
          expect.objectContaining({
            promptAsset: expect.objectContaining({ id: fixture.otherProjectPrompt.id }),
          }),
        ]),
      )
    } finally {
      database.close()
    }
  })

  it("returns a filtered prompt list when the search query is blank", async () => {
    const database = await createSearchTestDatabase()

    try {
      const fixture = createPhase7SearchFixture(database)

      rebuildSearchIndex(database)

      const results = searchPrompts(database, {
        projectId: fixture.project.id,
        query: "   ",
        scenario: "docs",
        tagIds: [fixture.frontendTag.id],
        targetAgent: "codex",
      })

      expect(results).toEqual([
        expect.objectContaining({
          currentVersion: expect.objectContaining({ id: fixture.partialTagVersion.id }),
          promptAsset: expect.objectContaining({ id: fixture.partialTagPrompt.id }),
        }),
      ])
    } finally {
      database.close()
    }
  })

  it("handles Korean and special-character search queries without crashing", async () => {
    const database = await createSearchTestDatabase()

    try {
      const fixture = createPhase7SearchFixture(database)

      rebuildSearchIndex(database)
      const koreanResults = searchPrompts(database, {
        projectId: fixture.project.id,
        query: "결제 승인",
        tagIds: [fixture.koreanTag.id],
      })
      const specialCharacterResults = searchPrompts(database, {
        projectId: fixture.project.id,
        query: '" OR * : ( ) - + ?',
      })

      expect(koreanResults).toEqual([
        expect.objectContaining({
          currentVersion: expect.objectContaining({ id: fixture.koreanVersion.id }),
          preview: expect.stringContaining("결제 승인"),
          promptAsset: expect.objectContaining({ id: fixture.koreanPrompt.id }),
        }),
      ])
      expect(specialCharacterResults).toEqual([])
    } finally {
      database.close()
    }
  })

  it("lists prompt tags, counts usage, and treats create-and-attach duplicates as idempotent", async () => {
    const database = await createSearchTestDatabase()

    try {
      const firstPrompt = database.services.createPromptAsset({
        title: "Tagged Search Prompt",
        scenario: "feature",
        targetAgent: "codex",
      })
      const secondPrompt = database.services.createPromptAsset({
        title: "Tagged Review Prompt",
        scenario: "code_review",
        targetAgent: "cursor",
      })

      const firstLink = createAndAttachTagToPrompt(database, firstPrompt.id, { name: "phase-7" })
      const duplicateLink = createAndAttachTagToPrompt(database, firstPrompt.id, {
        name: "phase-7",
      })
      createAndAttachTagToPrompt(database, secondPrompt.id, { name: "phase-7" })

      expect(duplicateLink).toEqual(firstLink)
      expect(listTagsForPrompt(database, firstPrompt.id)).toEqual([
        expect.objectContaining({ name: "phase-7" }),
      ])
      expect(listTagsWithCounts(database)).toEqual([
        expect.objectContaining({ name: "phase-7", promptCount: 2 }),
      ])
    } finally {
      database.close()
    }
  })

  it("keeps search persistence free of prompt, agent, and execution run tables", async () => {
    const database = await createSearchTestDatabase()

    try {
      const runStorageTables = stringArraySchema.parse(
        database.sqlite
          .prepare(
            "select name from sqlite_master where type = 'table' and (name like '%run%' or name like '%execution%') order by name",
          )
          .pluck()
          .all(),
      )

      expect(runStorageTables).toEqual([])
    } finally {
      database.close()
    }
  })
})
