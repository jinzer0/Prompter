import { afterEach, describe, expect, it } from "vitest"

import {
  cleanupBackupImportTestDatabases,
  createBackupImportTestDatabase,
  seedBackupDatabase,
} from "./phase16-backup-import-test-helpers.js"

const libraryTables = [
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

afterEach(async () => {
  await cleanupBackupImportTestDatabases()
})

describe("Phase 19 privacy scan service", () => {
  it("scans text, drafts, and exports through the local scanner projections", async () => {
    // Given: a migrated local database and content for each manual scanner entry point.
    const database = await createBackupImportTestDatabase()

    // When: the service scans each explicit payload.
    const text = database.services.privacy.scanText({
      source: "draft",
      text: "jane.doe@example.test",
    })
    const draft = database.services.privacy.scanDraft({
      originalInput: "safe",
      additionalNotes: "Bearer abcdefghijklmnopqrstu",
    })
    const exported = database.services.privacy.scanExportContent({
      content: "API_KEY=export-secret-value-123",
      format: "markdown",
    })

    // Then: each result preserves its source and projection-specific navigation location.
    expect(text.findings[0]).toMatchObject({
      category: "email_address",
      location: { entityType: "draft", field: "text" },
    })
    expect(draft.findings[0]).toMatchObject({
      category: "bearer_token",
      location: { entityType: "draft", field: "additionalNotes" },
    })
    expect(exported.findings[0]).toMatchObject({
      category: "environment_secret",
      location: { entityType: "export", field: "content" },
    })
  })

  it("aggregates every required full-library field without persisting findings or scanning settings", async () => {
    // Given: every collector-backed entity type has a distinct sensitive value, including a setting.
    const database = await createBackupImportTestDatabase()
    const fixture = seedBackupDatabase(database)
    database.services.updatePrivacySettings({ enableLibraryScan: false })
    database.sqlite
      .prepare("UPDATE projects SET description = ? WHERE id = ?")
      .run("owner@example.test", fixture.projectId)
    database.sqlite
      .prepare("UPDATE prompt_assets SET title = ? WHERE id = ?")
      .run("ghp_123456789012345678901234567890123456", fixture.promptAssetId)
    database.sqlite
      .prepare("UPDATE prompt_versions SET assumptions = ? WHERE id = ?")
      .run("API_KEY=version-secret-value-123", fixture.promptVersionId)
    database.sqlite
      .prepare("UPDATE project_context_profiles SET repo_path = ? WHERE id = ?")
      .run("http://localhost:3000", fixture.projectContextProfileId)
    database.sqlite
      .prepare("UPDATE prompt_templates SET description = ? WHERE id = ?")
      .run("template.owner@example.test", fixture.promptTemplateId)
    database.sqlite
      .prepare(
        "UPDATE harness_templates SET required_fields = ?, clarification_policy = ? WHERE id = ?",
      )
      .run(
        "Bearer abcdefghijklmnopqrstu",
        '{"internalUrl":"http://localhost:4000"}',
        fixture.harnessTemplateId,
      )
    database.sqlite
      .prepare("UPDATE prompt_quality_reviews SET improved_prompt_draft = ? WHERE id = ?")
      .run("-----BEGIN OPENSSH PRIVATE KEY-----", fixture.promptQualityReviewId)
    database.sqlite
      .prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)")
      .run("openai_api_key", "sk-proj-not-scanned-value-1234567890", 1)
    const before = Object.fromEntries(
      libraryTables.map((table) => [
        table,
        database.sqlite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(),
      ]),
    )

    // When: an explicit full scan runs despite the disabled UI preference.
    const result = database.services.privacy.scanLibrary({})
    const after = Object.fromEntries(
      libraryTables.map((table) => [
        table,
        database.sqlite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(),
      ]),
    )

    // Then: findings are masked and navigable, settings are excluded, and all tables remain intact.
    expect(result.source).toBe("library")
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "email_address",
          location: expect.objectContaining({ entityType: "project", field: "description" }),
        }),
        expect.objectContaining({
          category: "github_token",
          location: expect.objectContaining({
            entityType: "prompt_asset",
            entityId: fixture.promptAssetId,
            field: "title",
          }),
        }),
        expect.objectContaining({
          category: "environment_secret",
          location: expect.objectContaining({
            entityType: "prompt_version",
            entityId: fixture.promptVersionId,
            field: "assumptions",
          }),
        }),
        expect.objectContaining({
          category: "internal_url",
          location: expect.objectContaining({
            entityType: "project_context",
            entityId: fixture.projectContextProfileId,
            field: "repoPath",
          }),
        }),
        expect.objectContaining({
          category: "email_address",
          location: expect.objectContaining({
            entityType: "prompt_template",
            entityId: fixture.promptTemplateId,
            field: "description",
          }),
        }),
        expect.objectContaining({
          category: "bearer_token",
          location: expect.objectContaining({
            entityType: "harness_template",
            entityId: fixture.harnessTemplateId,
            field: "requiredFields",
          }),
        }),
        expect.objectContaining({
          category: "internal_url",
          location: expect.objectContaining({
            entityType: "harness_template",
            entityId: fixture.harnessTemplateId,
            field: "clarificationPolicy",
          }),
        }),
        expect.objectContaining({
          category: "private_key",
          location: expect.objectContaining({
            entityType: "prompt_quality_review",
            entityId: fixture.promptQualityReviewId,
            field: "improvedPromptDraft",
          }),
        }),
      ]),
    )
    expect(JSON.stringify(result)).not.toContain("sk-proj-not-scanned-value-1234567890")
    expect(result.findings.every((finding) => finding.evidenceMasked.includes("..."))).toBe(true)
    expect(after).toEqual(before)
  })

  it("scopes project scans to the requested project while keeping full scans whole-library", async () => {
    // Given: two projects whose prompt versions contain different sensitive candidates.
    const database = await createBackupImportTestDatabase()
    const fixture = seedBackupDatabase(database)
    const otherProject = database.services.createProject({
      name: "Other privacy project",
      defaultAgent: "codex",
    })
    const otherPrompt = database.services.createPromptWithInitialVersion({
      projectId: otherProject.id,
      title: "Other prompt",
      scenario: "feature",
      targetAgent: "codex",
      originalInput: "safe",
      compiledPrompt: "safe",
      assumptions: "other.owner@example.test",
    })
    database.sqlite
      .prepare("UPDATE prompt_versions SET assumptions = ? WHERE id = ?")
      .run("owner@example.test", fixture.promptVersionId)

    // When: the scoped and full explicit library scans run.
    const scoped = database.services.privacy.scanLibrary({ projectId: fixture.projectId })
    const full = database.services.privacy.scanLibrary({})

    // Then: the scoped result excludes the other project's version while the full scan includes it.
    expect(
      scoped.findings.some((finding) => finding.location.entityId === otherPrompt.version.id),
    ).toBe(false)
    expect(
      full.findings.some((finding) => finding.location.entityId === otherPrompt.version.id),
    ).toBe(true)
  })
})
