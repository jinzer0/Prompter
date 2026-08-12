import { describe, expect, it } from "vitest"

import { backupEnvelopeSchema } from "../electron/ipc-contract.js"
import {
  backupPayloadFields,
  scanSensitivePayload,
} from "../electron/privacy/scan-sensitive-payload.js"

const projectId = "11111111-1111-4111-8111-111111111111"
const assetId = "22222222-2222-4222-8222-222222222222"
const versionId = "33333333-3333-4333-8333-333333333333"
const tagId = "44444444-4444-4444-8444-444444444444"
const templateId = "55555555-5555-4555-8555-555555555555"
const contextId = "66666666-6666-4666-8666-666666666666"
const reviewId = "77777777-7777-4777-8777-777777777777"
const templateName = "template.owner@example.test"

function location(entityType: string, field: string, entityId?: string) {
  return expect.objectContaining(
    entityId === undefined ? { entityType, field } : { entityType, entityId, field },
  )
}

function fullBackup() {
  return backupEnvelopeSchema.parse({
    schemaVersion: 1,
    appName: "Prompter",
    backupType: "full",
    exportedAt: 1,
    exportedByAppVersion: "1.0.0",
    metadata: {
      itemCounts: {
        projects: 1,
        promptAssets: 1,
        promptVersions: 1,
        tags: 1,
        promptTags: 1,
        harnessTemplates: 1,
        projectContextProfiles: 1,
        promptTemplates: 1,
        promptQualityReviews: 1,
      },
      sourceSummary: "metadata.owner@example.test",
      excludesSecrets: true,
      excludesSecretStatus: true,
      includesSettings: false,
      plaintext: true,
      schemaVersion: 1,
    },
    data: {
      projects: [
        {
          id: projectId,
          name: "Project",
          description: "project.owner@example.test",
          techStack: "TypeScript",
          defaultAgent: "codex",
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      promptAssets: [
        {
          id: assetId,
          projectId,
          title: "Asset",
          scenario: "feature",
          targetAgent: "codex",
          currentVersionId: versionId,
          parentPromptId: null,
          parentPromptVersionId: null,
          derivationType: null,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      promptVersions: [
        {
          id: versionId,
          promptAssetId: assetId,
          versionNumber: 1,
          originalInput: "safe",
          compiledPrompt: "safe",
          assumptions: "version.owner@example.test",
          questions: null,
          answers: null,
          acceptanceCriteria: null,
          validationCommands: null,
          qualityScore: null,
          createdAt: 1,
        },
      ],
      tags: [{ id: tagId, name: "tag.owner@example.test", createdAt: 1 }],
      promptTags: [{ promptAssetId: assetId, tagId }],
      harnessTemplates: [
        {
          id: templateId,
          name: "Harness",
          scenario: "feature",
          targetAgent: "codex",
          templateBody: "safe",
          requiredFields: '{"owner":"harness.owner@example.test"}',
          clarificationPolicy: '{"mode":"ask"}',
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      projectContextProfiles: [
        {
          id: contextId,
          projectId,
          name: "Context",
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
          repoPath: "http://localhost:3000",
          isDefault: true,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      promptTemplates: [
        {
          id: templateId,
          name: templateName,
          description: "template.description@example.test",
          sourcePromptAssetId: assetId,
          sourcePromptVersionId: versionId,
          scenario: "feature",
          targetAgent: "codex",
          templateBody: "Bearer abcdefghijklmnopqrstu",
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      promptQualityReviews: [
        {
          id: reviewId,
          promptVersionId: versionId,
          source: "prompt_version",
          reviewMode: "local",
          overallScore: 80,
          grade: "good",
          dimensionScores: "{}",
          strengths: "[]",
          issues: "[]",
          suggestions: "[]",
          missingSections: "[]",
          warnings: "[]",
          recommendedClarifyingQuestions: "[]",
          scoreExplanation: "review.owner@example.test",
          snapshot: '{"owner":"review.snapshot@example.test"}',
          improvedPromptDraft: null,
          createdAt: 1,
        },
      ],
    },
  })
}

describe("Phase 19 backup privacy projection", () => {
  it("scans omitted metadata, entity, link, reference, and stored JSON fields without mutation", () => {
    // Given: a full typed envelope with sensitive values outside the former collector subset.
    const backup = fullBackup()

    // When: every backup leaf is projected for local scanning.
    const fields = backupPayloadFields(backup)
    const result = scanSensitivePayload({ source: "backup", fields })

    // Then: locations retain the originating entity and field, and the envelope is untouched.
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          location: location("backup_metadata", "sourceSummary"),
        }),
        expect.objectContaining({
          location: location("project", "description", projectId),
        }),
        expect.objectContaining({
          location: location("tag", "name", tagId),
        }),
        expect.objectContaining({
          location: location("harness_template", "requiredFields", templateId),
        }),
        expect.objectContaining({
          location: location("prompt_quality_review", "snapshot", reviewId),
        }),
      ]),
    )
    expect(fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          location: location("prompt_asset", "projectId", assetId),
        }),
        expect.objectContaining({
          location: location("prompt_asset", "scenario", assetId),
        }),
        expect.objectContaining({
          location: location("prompt_tag_link", "tagId"),
        }),
        expect.objectContaining({
          location: location("prompt_template", "sourcePromptVersionId", templateId),
        }),
        {
          text: "good",
          location: {
            entityType: "prompt_quality_review",
            entityId: reviewId,
            field: "grade",
            previewLabel: "Backup quality review grade",
          },
        },
      ]),
    )
    expect(backup).toEqual(fullBackup())
  })

  it("uses static backup labels so serialized findings never disclose user-authored names", () => {
    // Given: a secret-shaped template body whose user-authored name is itself sensitive.
    const backup = fullBackup()

    // When: the backup is scanned.
    const result = scanSensitivePayload({ source: "backup", fields: backupPayloadFields(backup) })

    // Then: the finding remains navigable without serializing either raw secret-bearing label value.
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          location: location("prompt_template", "templateBody", templateId),
        }),
      ]),
    )
    expect(JSON.stringify(result)).not.toContain(templateName)
    expect(JSON.stringify(result)).not.toContain("abcdefghijklmnopqrstu")
  })

  it("makes a truncated field unsafe without fabricating findings or counts", () => {
    // Given: a clean backup field whose tail exceeds the local scanner limit.
    const fields = [
      { text: "x".repeat(1_000_001), location: { entityType: "backup", field: "text" } },
    ]

    // When: the field is bounded for local scanning.
    const result = scanSensitivePayload({ source: "backup", fields })

    // Then: incompleteness requires confirmation but does not invent a sensitive finding.
    expect(result).toMatchObject({
      safeToProceed: false,
      findingCount: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
    })
    expect(result.warnings).toEqual([
      "One or more fields exceeded the 1 MiB scan limit.",
      "The privacy scan is incomplete and requires confirmation.",
    ])
    expect(fields[0]?.text).toHaveLength(1_000_001)
  })
})
