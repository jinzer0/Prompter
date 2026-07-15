import { afterEach, describe, expect, it, vi } from "vitest"

import { maintenanceScanResultSchema } from "../electron/ipc-contract"
import type { MaintenanceScanInput, MaintenanceScanResult } from "../electron/ipc-types"
import type { OpenAIKeyStore } from "../electron/secrets/open-ai-key-store"
import {
  createSearchTestDatabase,
  removeSearchTestDatabases,
  type TestDatabase,
} from "./electron-search-test-helpers"

const wholeLibraryInput = {
  includePromptDuplicates: true,
  includeTagDuplicates: true,
  includeUnusedTags: true,
  includeCurrentVersionIssues: true,
  includeEmptyAssets: true,
  includeSearchIndexHealth: true,
  includePromptTemplateIssues: true,
  includeHarnessTemplateIssues: true,
  includeQualityFindings: true,
} satisfies MaintenanceScanInput

const stateTables = [
  "projects",
  "project_context_profiles",
  "prompt_assets",
  "prompt_versions",
  "prompt_quality_reviews",
  "prompt_templates",
  "tags",
  "prompt_tags",
  "harness_templates",
  "settings",
  "prompt_search_fts",
] as const

function scanLibrary(database: TestDatabase, input: MaintenanceScanInput): MaintenanceScanResult {
  const scan = Reflect.get(database.services, "scanLibrary")
  if (typeof scan !== "function") {
    throw new TypeError("Maintenance scan service is not registered")
  }
  return maintenanceScanResultSchema.parse(Reflect.apply(scan, database.services, [input]))
}

function snapshotDatabase(database: TestDatabase): Readonly<Record<string, readonly unknown[]>> {
  return Object.fromEntries(
    stateTables.map((table) => [
      table,
      database.sqlite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(),
    ]),
  )
}

function createScanFixture(database: TestDatabase) {
  const project = database.services.createProject({ name: "Maintenance Project" })
  const otherProject = database.services.createProject({ name: "Other Project" })
  const firstDuplicate = database.services.createPromptWithInitialVersion({
    projectId: project.id,
    title: "Shared Prompt",
    scenario: "feature",
    targetAgent: "codex",
    originalInput: "first unique input",
    compiledPrompt: "first unique output",
  })
  database.services.createPromptWithInitialVersion({
    projectId: project.id,
    title: "shared-prompt",
    scenario: "feature",
    targetAgent: "codex",
    originalInput: "second unique input",
    compiledPrompt: "second unique output",
  })
  const otherProjectPrompt = database.services.createPromptWithInitialVersion({
    projectId: otherProject.id,
    title: "Shared Prompt",
    scenario: "docs",
    targetAgent: "cursor",
    originalInput: "other project input",
    compiledPrompt: "other project output",
  })
  const broken = database.services.createPromptWithInitialVersion({
    projectId: project.id,
    title: "Broken current pointer",
    scenario: "bugfix",
    targetAgent: "codex",
    originalInput: "repair input",
    compiledPrompt: "repair output",
  })
  const empty = database.services.createPromptAsset({
    projectId: project.id,
    title: "Empty asset",
    scenario: "feature",
    targetAgent: "codex",
  })
  const canonicalTag = database.services.createTag({ name: "build tools" })
  const duplicateTag = database.services.createTag({ name: "Build-Tools" })
  database.services.attachTagToPrompt(firstDuplicate.asset.id, canonicalTag.id)
  database.services.attachTagToPrompt(firstDuplicate.asset.id, duplicateTag.id)
  database.services.createTag({ name: "unused maintenance tag" })
  database.sqlite
    .prepare("UPDATE prompt_assets SET current_version_id = NULL WHERE id = ?")
    .run(broken.asset.id)
  database.sqlite
    .prepare("DELETE FROM prompt_search_fts WHERE prompt_asset_id = ?")
    .run(firstDuplicate.asset.id)

  return { empty, firstDuplicate, otherProjectPrompt, project }
}

afterEach(async () => {
  await removeSearchTestDatabases()
})

describe("Phase 17 maintenance scan service", () => {
  it("returns seeded findings and only planner-backed allowed action previews", async () => {
    // Given: every actionable read-only scan class plus a finding-only duplicate prompt.
    const database = await createSearchTestDatabase()
    try {
      createScanFixture(database)

      // When: the whole library is scanned with every class enabled.
      const result = scanLibrary(database, wholeLibraryInput)

      // Then: summaries reflect actual findings and duplicate prompts never become actions.
      expect(result.summary.totalFindings).toBe(result.findings.length)
      expect(result.summary.severityCounts.high).toBeGreaterThan(0)
      expect(result.summary.categoryCounts).toMatchObject({
        duplicate_prompts: expect.any(Number),
        duplicate_tags: 1,
        unused_tags: 1,
        empty_prompt_assets: 1,
        current_version_issues: 1,
        search_index_health: 1,
      })
      expect(result.summary.categoryCounts.duplicate_prompts).toBeGreaterThan(0)
      expect(result.recommendedActions.map(({ actionType }) => actionType).sort()).toEqual([
        "delete_empty_prompt_assets",
        "delete_unused_tags",
        "merge_duplicate_tags",
        "rebuild_search_index",
        "repair_current_versions",
      ])
      expect(result.recommendedActions).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ actionType: "duplicate_prompts" })]),
      )
    } finally {
      database.close()
    }
  })

  it("defaults to whole-library scope and applies project scope and include flags", async () => {
    // Given: duplicate titles spanning two projects and a scan with one enabled class.
    const database = await createSearchTestDatabase()
    try {
      const fixture = createScanFixture(database)
      const promptDuplicatesOnly = {
        ...wholeLibraryInput,
        projectId: fixture.project.id,
        includeTagDuplicates: false,
        includeUnusedTags: false,
        includeCurrentVersionIssues: false,
        includeEmptyAssets: false,
        includeSearchIndexHealth: false,
        includePromptTemplateIssues: false,
        includeHarnessTemplateIssues: false,
        includeQualityFindings: false,
      }

      // When: whole-library and current-project scans run against the same stable state.
      const wholeLibrary = scanLibrary(database, wholeLibraryInput)
      const currentProject = scanLibrary(database, promptDuplicatesOnly)

      // Then: project results exclude foreign ids and disabled categories remain zero.
      expect(
        wholeLibrary.findings.some((finding) =>
          finding.affectedEntityIds.includes(fixture.otherProjectPrompt.asset.id),
        ),
      ).toBe(true)
      expect(
        currentProject.findings.every((finding) => finding.category === "duplicate_prompts"),
      ).toBe(true)
      expect(
        currentProject.findings.every(
          (finding) => !finding.affectedEntityIds.includes(fixture.otherProjectPrompt.asset.id),
        ),
      ).toBe(true)
      expect(currentProject.summary.categoryCounts.current_version_issues).toBe(0)
      expect(currentProject.recommendedActions).toEqual([])
    } finally {
      database.close()
    }
  })

  it("preserves every database and FTS row and never reaches compiler or LLM key seams", async () => {
    // Given: a seeded database with observable external-service spies and a full row snapshot.
    const getOpenAIKeyForMainProcessOnly = vi.fn(async () => "unused-key")
    const createClient = vi.fn(() => ({ createStructuredResponse: vi.fn(async () => "{}") }))
    const openAIKeyStore: OpenAIKeyStore = {
      saveOpenAIKey: vi.fn(),
      hasOpenAIKey: vi.fn(),
      getOpenAIKeyStatus: vi.fn(),
      deleteOpenAIKey: vi.fn(),
      getOpenAIKeyForMainProcessOnly,
    }
    const database = await createSearchTestDatabase({
      openAIKeyStore,
      promptCompilerClientFactory: createClient,
    })
    try {
      createScanFixture(database)
      const before = snapshotDatabase(database)
      database.sqlite.pragma("query_only = ON")

      // When: a full maintenance scan is executed.
      scanLibrary(database, wholeLibraryInput)

      // Then: base/FTS state is identical and no compiler or quality-LLM key path ran.
      expect(snapshotDatabase(database)).toEqual(before)
      expect(getOpenAIKeyForMainProcessOnly).not.toHaveBeenCalled()
      expect(createClient).not.toHaveBeenCalled()
    } finally {
      database.close()
    }
  })

  it("caps large deterministic results and rejects malformed direct service input", async () => {
    // Given: more unused tags than the scan result cap.
    const database = await createSearchTestDatabase()
    try {
      for (let index = 0; index < 220; index += 1) {
        database.services.createTag({ name: `unused-${index.toString().padStart(3, "0")}` })
      }
      const unusedOnly = {
        ...wholeLibraryInput,
        includePromptDuplicates: false,
        includeTagDuplicates: false,
        includeCurrentVersionIssues: false,
        includeEmptyAssets: false,
        includeSearchIndexHealth: false,
        includePromptTemplateIssues: false,
        includeHarnessTemplateIssues: false,
        includeQualityFindings: false,
      }

      // When: the same scan runs twice and malformed input is sent directly to the service.
      const first = scanLibrary(database, unusedOnly)
      const second = scanLibrary(database, unusedOnly)
      const scan = Reflect.get(database.services, "scanLibrary")

      // Then: ordering is repeatable, totals remain honest, and the production schema rejects input.
      expect(first).toEqual(second)
      expect(first.summary.totalFindings).toBe(220)
      expect(first.findings).toHaveLength(200)
      expect(first.findings.map(({ id }) => id)).toEqual(
        first.findings.map(({ id }) => id).toSorted(),
      )
      expect(first.recommendedActions).toEqual([
        expect.objectContaining({
          actionType: "delete_unused_tags",
          affectedEntityIds: expect.any(Array),
          estimatedChangeCount: 220,
        }),
      ])
      expect(first.recommendedActions[0]?.affectedEntityIds).toHaveLength(200)
      expect(first.summary.truncated).toBe(true)
      expect(() =>
        Reflect.apply(scan, database.services, [{ ...unusedOnly, projectId: "bad" }]),
      ).toThrow()
    } finally {
      database.close()
    }
  })
})
