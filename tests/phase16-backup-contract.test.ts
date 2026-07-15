import { describe, expect, it } from "vitest"

import { createElectronBridge } from "../electron/bridge"
import {
  BACKUP_BODY_MAX_LENGTH,
  BACKUP_NAME_MAX_LENGTH,
  BACKUP_PREVIEW_MAX_ITEMS,
  BACKUP_ROW_MAX_ITEMS,
  BACKUP_TYPES,
  backupEnvelopeSchema,
  backupExportResultSchema,
  backupImportResultSchema,
  backupValidationResultSchema,
  exportFullBackupInputSchema,
  exportHarnessTemplatesPackInputSchema,
  exportPromptAssetsBackupInputSchema,
  exportPromptTemplatesPackInputSchema,
  importBackupInputSchema,
  PERSISTENCE_CHANNELS,
  promptAssetsImportBackupInputSchema,
} from "../electron/ipc-contract"
import { createPersistenceIpcHandlers } from "../electron/ipc-handlers"
import { createFailingServices } from "./electron-contract-service-fixture"

// allow: SIZE_OK - one Phase 16 contract fixture covers all strict backup variants and boundaries.
const projectId = "11111111-1111-4111-8111-111111111111"
const assetId = "22222222-2222-4222-8222-222222222222"
const versionId = "33333333-3333-4333-8333-333333333333"
const tagId = "44444444-4444-4444-8444-444444444444"
const templateId = "55555555-5555-4555-8555-555555555555"
const sessionId = "66666666-6666-4666-8666-666666666666"
const itemCounts = {
  projects: 1,
  promptAssets: 1,
  promptVersions: 1,
  tags: 1,
  promptTags: 1,
  harnessTemplates: 1,
  projectContextProfiles: 1,
  promptTemplates: 1,
  promptQualityReviews: 1,
} as const
const metadata = {
  itemCounts,
  sourceSummary: "One project with one prompt",
  excludesSecrets: true,
  excludesSecretStatus: true,
  includesSettings: false,
  plaintext: true,
  schemaVersion: 1,
} as const
const rows = {
  projects: [
    {
      id: projectId,
      name: "Project",
      description: null,
      techStack: null,
      defaultAgent: "codex",
      createdAt: 1,
      updatedAt: 2,
    },
  ],
  promptAssets: [
    {
      id: assetId,
      projectId,
      title: "Prompt",
      scenario: "feature",
      targetAgent: "codex",
      currentVersionId: versionId,
      parentPromptId: null,
      parentPromptVersionId: null,
      derivationType: null,
      createdAt: 1,
      updatedAt: 2,
    },
  ],
  promptVersions: [
    {
      id: versionId,
      promptAssetId: assetId,
      versionNumber: 1,
      originalInput: "Build it",
      compiledPrompt: "# Objective\nBuild it",
      assumptions: null,
      questions: null,
      answers: null,
      acceptanceCriteria: null,
      validationCommands: null,
      qualityScore: 80,
      createdAt: 1,
    },
  ],
  tags: [{ id: tagId, name: "feature", createdAt: 1 }],
  promptTags: [{ promptAssetId: assetId, tagId }],
  harnessTemplates: [
    {
      id: templateId,
      name: "Harness",
      scenario: "feature",
      targetAgent: "codex",
      templateBody: "{{prompt}}",
      requiredFields: '["prompt"]',
      clarificationPolicy: '{"mode":"ask"}',
      createdAt: 1,
      updatedAt: 2,
    },
  ],
  projectContextProfiles: [
    {
      id: sessionId,
      projectId,
      name: "Default",
      summary: null,
      techStack: null,
      architectureNotes: null,
      codingConventions: null,
      constraints: null,
      forbiddenActions: null,
      acceptanceDefaults: null,
      validationCommands: null,
      securityNotes: null,
      additionalContext: null,
      testingNotes: null,
      packageManager: null,
      defaultBranch: null,
      repoPath: null,
      isDefault: true,
      createdAt: 1,
      updatedAt: 2,
    },
  ],
  promptTemplates: [
    {
      id: templateId,
      name: "Template",
      description: null,
      sourcePromptAssetId: assetId,
      sourcePromptVersionId: versionId,
      scenario: "feature",
      targetAgent: "codex",
      templateBody: "{{objective}}",
      createdAt: 1,
      updatedAt: 2,
    },
  ],
  promptQualityReviews: [
    {
      id: sessionId,
      promptVersionId: versionId,
      source: "prompt_version",
      reviewMode: "local",
      overallScore: 80,
      grade: "good",
      dimensionScores: '{"clarity":80}',
      strengths: "[]",
      issues: "[]",
      suggestions: "[]",
      missingSections: "[]",
      warnings: "[]",
      recommendedClarifyingQuestions: "[]",
      scoreExplanation: "Clear",
      snapshot: '{"compiledPrompt":"# Objective"}',
      improvedPromptDraft: null,
      createdAt: 1,
    },
  ],
} as const

const envelopes = [
  {
    schemaVersion: 1,
    appName: "Prompter",
    backupType: "full",
    exportedAt: 1,
    metadata,
    data: rows,
  },
  {
    schemaVersion: 1,
    appName: "Prompter",
    backupType: "project",
    exportedAt: 1,
    metadata,
    data: {
      projects: rows.projects,
      promptAssets: rows.promptAssets,
      promptVersions: rows.promptVersions,
      tags: rows.tags,
      promptTags: rows.promptTags,
      projectContextProfiles: rows.projectContextProfiles,
      promptTemplates: rows.promptTemplates,
      promptQualityReviews: rows.promptQualityReviews,
    },
  },
  {
    schemaVersion: 1,
    appName: "Prompter",
    backupType: "prompt_assets",
    exportedAt: 1,
    metadata,
    data: {
      promptAssets: rows.promptAssets,
      promptVersions: rows.promptVersions,
      tags: rows.tags,
      promptTags: rows.promptTags,
      promptQualityReviews: rows.promptQualityReviews,
    },
  },
  {
    schemaVersion: 1,
    appName: "Prompter",
    backupType: "prompt_templates",
    exportedAt: 1,
    metadata,
    data: { promptTemplates: rows.promptTemplates },
  },
  {
    schemaVersion: 1,
    appName: "Prompter",
    backupType: "harness_templates",
    exportedAt: 1,
    metadata,
    data: { harnessTemplates: rows.harnessTemplates },
  },
] as const

const exportResult = {
  cancelled: false,
  backupType: "full",
  itemCounts,
  message: "Backup exported",
} as const
const preview = {
  importSessionId: sessionId,
  previewFingerprint: "a".repeat(64),
  previewRevision: 1,
  backupType: "full",
  schemaVersion: 1,
  exportedAt: 1,
  itemCounts,
  conflicts: [],
  warnings: [],
  consequences: [],
  requiresDestinationProject: false,
  excludesSecrets: true,
  excludesSecretStatus: true,
  includesSettings: false,
  plaintext: true,
  expiresAt: 2,
} as const
const importResult = {
  backupType: "full",
  importedCounts: itemCounts,
  createdProjectIds: [projectId],
  createdPromptAssetIds: [assetId],
  createdPromptTemplateIds: [templateId],
  createdHarnessTemplateIds: [templateId],
  warnings: [],
  searchIndexStatus: "updated",
  message: "Backup imported",
} as const

describe("Phase 16 backup contracts", () => {
  it("parses strict v1 envelopes for all five backup types", () => {
    expect(BACKUP_TYPES).toEqual([
      "full",
      "project",
      "prompt_assets",
      "prompt_templates",
      "harness_templates",
    ])
    expect(envelopes.map((envelope) => backupEnvelopeSchema.parse(envelope).backupType)).toEqual(
      BACKUP_TYPES,
    )
  })

  it("rejects unsupported, unknown, forbidden, and oversized envelope content", () => {
    const full = envelopes[0]
    const invalid = [
      { ...full, schemaVersion: 2 },
      { ...full, backupType: "settings" },
      { ...full, checksum: "forbidden" },
      { ...full, metadata: { ...metadata, secret: "forbidden" } },
      { ...full, data: { ...rows, settings: [] } },
      { ...full, data: { ...rows, projects: [{ ...rows.projects[0], apiKey: "forbidden" }] } },
      {
        ...full,
        data: {
          ...rows,
          projects: [{ ...rows.projects[0], name: "x".repeat(BACKUP_NAME_MAX_LENGTH + 1) }],
        },
      },
      {
        ...full,
        data: {
          ...rows,
          promptVersions: [
            { ...rows.promptVersions[0], compiledPrompt: "x".repeat(BACKUP_BODY_MAX_LENGTH + 1) },
          ],
        },
      },
      {
        ...full,
        data: {
          ...rows,
          tags: Array.from({ length: BACKUP_ROW_MAX_ITEMS + 1 }, () => rows.tags[0]),
        },
      },
    ]

    expect(invalid.every((value) => !backupEnvelopeSchema.safeParse(value).success)).toBe(true)
  })

  it("accepts only approved export and import input shapes", () => {
    expect(exportFullBackupInputSchema.parse({})).toEqual({})
    expect(exportPromptAssetsBackupInputSchema.parse({ promptAssetIds: [assetId] })).toEqual({
      promptAssetIds: [assetId],
    })
    expect(exportPromptTemplatesPackInputSchema.safeParse({ promptTemplateIds: [] }).success).toBe(
      false,
    )
    expect(exportPromptTemplatesPackInputSchema.safeParse({ includeAll: true }).success).toBe(true)
    expect(
      exportHarnessTemplatesPackInputSchema.safeParse({ includeAllUserTemplates: true }).success,
    ).toBe(true)
    expect(exportFullBackupInputSchema.safeParse({ includeSettings: true }).success).toBe(false)
    expect(
      importBackupInputSchema.safeParse({
        importSessionId: sessionId,
        previewFingerprint: "a".repeat(64),
        previewRevision: 1,
        strategy: "safe_duplicate",
        settings: {},
      }).success,
    ).toBe(false)
    expect(
      promptAssetsImportBackupInputSchema.safeParse({
        importSessionId: sessionId,
        previewFingerprint: "a".repeat(64),
        previewRevision: 1,
        strategy: "safe_duplicate",
      }).success,
    ).toBe(false)
  })

  it("keeps paths and parsed backup data out of renderer-facing responses", () => {
    const warning = { code: "external_reference", message: "External reference removed" }
    expect(backupExportResultSchema.parse(exportResult)).toEqual(exportResult)
    expect(backupValidationResultSchema.parse({ cancelled: false, preview })).toEqual({
      cancelled: false,
      preview,
    })
    expect(backupImportResultSchema.parse(importResult)).toEqual(importResult)
    expect(
      backupExportResultSchema.safeParse({ ...exportResult, filePath: "/tmp/backup.json" }).success,
    ).toBe(false)
    expect(
      backupValidationResultSchema.safeParse({
        cancelled: false,
        preview: { ...preview, data: rows },
      }).success,
    ).toBe(false)
    expect(backupImportResultSchema.safeParse({ ...importResult, data: rows }).success).toBe(false)
    expect(
      backupValidationResultSchema.safeParse({
        cancelled: false,
        preview: {
          ...preview,
          warnings: Array.from({ length: BACKUP_PREVIEW_MAX_ITEMS + 1 }, () => warning),
        },
      }).success,
    ).toBe(false)
  })

  it("exposes and routes exactly the eight approved backup bridge methods", async () => {
    const calls: { readonly channel: string; readonly payload: unknown }[] = []
    const bridge = createElectronBridge(async (channel, payload) => {
      calls.push({ channel, payload })
      if (channel === PERSISTENCE_CHANNELS.validateBackupFile) {
        return { cancelled: false, preview }
      }
      if (channel === PERSISTENCE_CHANNELS.importBackup) {
        return importResult
      }
      if (channel === PERSISTENCE_CHANNELS.cancelImportSession) {
        return { cancelled: true }
      }
      return { ...exportResult, backupType: channel.includes("project") ? "project" : "full" }
    })

    expect({
      exportFullBackup: PERSISTENCE_CHANNELS.exportFullBackup,
      exportProjectBackup: PERSISTENCE_CHANNELS.exportProjectBackup,
      exportPromptAssetsBackup: PERSISTENCE_CHANNELS.exportPromptAssetsBackup,
      exportPromptTemplatesPack: PERSISTENCE_CHANNELS.exportPromptTemplatesPack,
      exportHarnessTemplatesPack: PERSISTENCE_CHANNELS.exportHarnessTemplatesPack,
      validateBackupFile: PERSISTENCE_CHANNELS.validateBackupFile,
      importBackup: PERSISTENCE_CHANNELS.importBackup,
      cancelImportSession: PERSISTENCE_CHANNELS.cancelImportSession,
    }).toEqual({
      exportFullBackup: "prompter:backup:export-full",
      exportProjectBackup: "prompter:backup:export-project",
      exportPromptAssetsBackup: "prompter:backup:export-prompt-assets",
      exportPromptTemplatesPack: "prompter:backup:export-prompt-templates",
      exportHarnessTemplatesPack: "prompter:backup:export-harness-templates",
      validateBackupFile: "prompter:backup:validate-file",
      importBackup: "prompter:backup:import",
      cancelImportSession: "prompter:backup:cancel-import-session",
    })
    expect(Object.keys(bridge.backup)).toEqual([
      "exportFullBackup",
      "exportProjectBackup",
      "exportPromptAssetsBackup",
      "exportPromptTemplatesPack",
      "exportHarnessTemplatesPack",
      "validateBackupFile",
      "importBackup",
      "cancelImportSession",
    ])
    await bridge.backup.exportFullBackup({})
    await bridge.backup.exportProjectBackup({ projectId })
    await bridge.backup.exportPromptAssetsBackup({ promptAssetIds: [assetId] })
    await bridge.backup.exportPromptTemplatesPack({ includeAll: true })
    await bridge.backup.exportHarnessTemplatesPack({ includeAllUserTemplates: true })
    await bridge.backup.validateBackupFile()
    await bridge.backup.importBackup({
      importSessionId: sessionId,
      previewFingerprint: "a".repeat(64),
      previewRevision: 1,
      strategy: "safe_duplicate",
    })
    await bridge.backup.cancelImportSession({ importSessionId: sessionId })

    expect(calls.map(({ channel }) => channel)).toEqual([
      PERSISTENCE_CHANNELS.exportFullBackup,
      PERSISTENCE_CHANNELS.exportProjectBackup,
      PERSISTENCE_CHANNELS.exportPromptAssetsBackup,
      PERSISTENCE_CHANNELS.exportPromptTemplatesPack,
      PERSISTENCE_CHANNELS.exportHarnessTemplatesPack,
      PERSISTENCE_CHANNELS.validateBackupFile,
      PERSISTENCE_CHANNELS.importBackup,
      PERSISTENCE_CHANNELS.cancelImportSession,
    ])
  })

  it("rejects malformed backup handler payloads before service calls", () => {
    // Given: backup services that count every invocation after the IPC trust boundary.
    let serviceCallCount = 0
    const serviceCalled = async () => {
      serviceCallCount += 1
      return exportResult
    }
    const handlers = createPersistenceIpcHandlers({
      ...createFailingServices(() => undefined),
      exportFullBackup: serviceCalled,
      exportProjectBackup: serviceCalled,
      exportPromptAssetsBackup: serviceCalled,
      exportPromptTemplatesPack: serviceCalled,
      exportHarnessTemplatesPack: serviceCalled,
      validateBackupFile: async () => {
        serviceCallCount += 1
        return { cancelled: false as const, preview }
      },
      importBackup: async () => {
        serviceCallCount += 1
        return importResult
      },
      cancelImportSession: async () => {
        serviceCallCount += 1
        return { cancelled: true as const }
      },
    })

    // When: each backup handler receives a malformed or forbidden payload.
    const attempts = [
      () => handlers.exportFullBackup({ includeSettings: true }),
      () => handlers.exportProjectBackup({ projectId: "not-a-uuid" }),
      () => handlers.exportPromptAssetsBackup({ promptAssetIds: [] }),
      () =>
        handlers.exportPromptTemplatesPack({ includeAll: true, promptTemplateIds: [templateId] }),
      () =>
        handlers.exportHarnessTemplatesPack({
          includeAllUserTemplates: true,
          harnessTemplateIds: [templateId],
        }),
      () => handlers.validateBackupFile({ filePath: "/tmp/backup.json" }),
      () =>
        handlers.importBackup({
          importSessionId: sessionId,
          previewFingerprint: "a".repeat(64),
          previewRevision: 1,
          strategy: "overwrite",
        }),
      () => handlers.cancelImportSession({ importSessionId: "not-a-uuid" }),
    ]

    // Then: every payload is rejected before any backup service can run.
    expect(handlers).toMatchObject({
      exportFullBackup: expect.any(Function),
      exportProjectBackup: expect.any(Function),
      exportPromptAssetsBackup: expect.any(Function),
      exportPromptTemplatesPack: expect.any(Function),
      exportHarnessTemplatesPack: expect.any(Function),
      validateBackupFile: expect.any(Function),
      importBackup: expect.any(Function),
      cancelImportSession: expect.any(Function),
    })
    for (const attempt of attempts) {
      expect(attempt).toThrow()
    }
    expect(serviceCallCount).toBe(0)
  })

  it("rejects malformed responses from every backup service", async () => {
    // Given: backup services that return renderer-forbidden fields.
    const malformedExportResult = { ...exportResult, filePath: "/tmp/backup.json" }
    const handlers = createPersistenceIpcHandlers({
      ...createFailingServices(() => undefined),
      exportFullBackup: async () => malformedExportResult,
      exportProjectBackup: async () => malformedExportResult,
      exportPromptAssetsBackup: async () => malformedExportResult,
      exportPromptTemplatesPack: async () => malformedExportResult,
      exportHarnessTemplatesPack: async () => malformedExportResult,
      validateBackupFile: async () => ({
        cancelled: false as const,
        preview: { ...preview, data: rows },
      }),
      importBackup: async () => ({ ...importResult, data: rows }),
      cancelImportSession: async () => ({ cancelled: true as const, filePath: "/tmp/backup.json" }),
    })

    // When: valid payloads reach each malformed service response.
    const attempts = [
      handlers.exportFullBackup({}),
      handlers.exportProjectBackup({ projectId }),
      handlers.exportPromptAssetsBackup({ promptAssetIds: [assetId] }),
      handlers.exportPromptTemplatesPack({ includeAll: true }),
      handlers.exportHarnessTemplatesPack({ includeAllUserTemplates: true }),
      handlers.validateBackupFile(undefined),
      handlers.importBackup({
        importSessionId: sessionId,
        previewFingerprint: "a".repeat(64),
        previewRevision: 1,
        strategy: "safe_duplicate",
      }),
      handlers.cancelImportSession({ importSessionId: sessionId }),
    ]

    // Then: no malformed or path-bearing response crosses the main-process boundary.
    for (const attempt of attempts) {
      await expect(attempt).rejects.toThrow()
    }
  })

  it("rejects malformed responses from every backup bridge invocation", async () => {
    // Given: a bridge invoke fake that returns renderer-forbidden backup response fields.
    const bridge = createElectronBridge(async (channel) => {
      if (channel === PERSISTENCE_CHANNELS.validateBackupFile) {
        return { cancelled: false, preview: { ...preview, data: rows } }
      }
      if (channel === PERSISTENCE_CHANNELS.importBackup) {
        return { ...importResult, data: rows }
      }
      if (channel === PERSISTENCE_CHANNELS.cancelImportSession) {
        return { cancelled: true, filePath: "/tmp/backup.json" }
      }
      return { ...exportResult, filePath: "/tmp/backup.json" }
    })

    // When: every approved renderer backup method receives a malformed main response.
    const attempts = [
      bridge.backup.exportFullBackup({}),
      bridge.backup.exportProjectBackup({ projectId }),
      bridge.backup.exportPromptAssetsBackup({ promptAssetIds: [assetId] }),
      bridge.backup.exportPromptTemplatesPack({ includeAll: true }),
      bridge.backup.exportHarnessTemplatesPack({ includeAllUserTemplates: true }),
      bridge.backup.validateBackupFile(),
      bridge.backup.importBackup({
        importSessionId: sessionId,
        previewFingerprint: "a".repeat(64),
        previewRevision: 1,
        strategy: "safe_duplicate",
      }),
      bridge.backup.cancelImportSession({ importSessionId: sessionId }),
    ]

    // Then: bridge response parsing rejects every path-bearing or parsed-data response.
    for (const attempt of attempts) {
      await expect(attempt).rejects.toThrow()
    }
  })
})
