import { describe, expect, it } from "vitest"

import { backupEnvelopeSchema } from "../electron/ipc-contract.js"
import {
  backupPayloadFields,
  draftPayloadFields,
  exportPayloadFields,
  libraryPayloadFields,
  scanSensitivePayload,
} from "../electron/privacy/scan-sensitive-payload.js"
import { scanSensitiveText } from "../electron/privacy/scan-sensitive-text.js"

const entityId = "8f529b76-09d2-45ee-8f16-57910a1dfa26"
const versionId = "9f529b76-09d2-45ee-8f16-57910a1dfa26"

describe("Phase 19 sensitive information scanner", () => {
  it("detects every MVP pattern without returning a full matched value", () => {
    // Given: locally scanned text containing one candidate for every supported category.
    const values = [
      "sk-proj-abcdefghijklmnopqrstuvwx",
      "ghp_123456789012345678901234567890123456",
      "Bearer abcdefghijklmnopqrstu",
      "AKIA1234567890ABCDEF",
      "-----BEGIN OPENSSH PRIVATE KEY-----",
      "API_KEY=environment-secret-value-123",
      "https://example.test/callback?access_token=url-secret-value-123",
      "jane.doe@example.test",
      "+14155552671",
      "123-45-6789",
      "http://localhost:3000",
      "172.16.4.2",
    ]
    const text = values.join("\n")

    // When: the pure local scanner evaluates the text.
    const result = scanSensitiveText({ source: "draft", text })

    // Then: every category is reported, high-risk findings gate progress, and no full value escapes.
    expect(result.findings.map((finding) => finding.category)).toEqual([
      "openai_api_key",
      "github_token",
      "bearer_token",
      "aws_access_key",
      "private_key",
      "environment_secret",
      "url_secret",
      "email_address",
      "phone_number",
      "national_id",
      "internal_url",
      "private_ip",
    ])
    expect(result.findingCount).toBe(12)
    expect(result.safeToProceed).toBe(false)
    expect(result.warnings).toContain("High-risk findings require confirmation.")
    expect(JSON.stringify(result)).not.toContain(values[0])
    expect(JSON.stringify(result)).not.toContain(values[1])
    expect(JSON.stringify(result)).not.toContain(values[5])
    expect(JSON.stringify(result)).not.toContain(values[6])
    expect(result.findings.every((finding) => finding.evidenceMasked.includes("..."))).toBe(true)
  })

  it("keeps offsets absolute, ordering deterministic, and repeated scans stable", () => {
    // Given: a value at a known absolute position with a location projection.
    const token = "sk-abcdefghijklmnopqrstuvwx"
    const text = `prefix ${token} suffix`
    const input = {
      source: "draft" as const,
      text,
      location: {
        entityType: "draft",
        field: "originalInput",
        previewLabel: "Draft original input",
      },
    }

    // When: the same input is scanned twice.
    const first = scanSensitiveText(input)
    const second = scanSensitiveText(input)

    // Then: field-local offsets and finding identifiers are stable and the input remains untouched.
    expect(first.findings[0]).toMatchObject({
      startOffset: 7,
      endOffset: 7 + token.length,
      location: input.location,
    })
    expect(second.findings[0]?.id).toBe(first.findings[0]?.id)
    expect(text).toBe(`prefix ${token} suffix`)
  })

  it("bounds internal payload fields at one MiB and warns without mutating them", () => {
    // Given: an internal library field whose secret begins beyond the scan cap.
    const oversized = `${"x".repeat(1_000_000)} sk-abcdefghijklmnopqrstuvwx`
    const fields = [
      {
        text: oversized,
        location: { entityType: "prompt_version", entityId, field: "compiledPrompt" },
      },
    ]

    // When: payload aggregation scans the bounded field.
    const result = scanSensitivePayload({ source: "library", fields })

    // Then: the unscanned tail is reported as truncated and the original text stays unchanged.
    expect(result.findings).toEqual([])
    expect(result).toMatchObject({ safeToProceed: false, findingCount: 0 })
    expect(result.warnings).toEqual([
      "One or more fields exceeded the 1 MiB scan limit.",
      "The privacy scan is incomplete and requires confirmation.",
    ])
    expect(fields[0]?.text).toBe(oversized)
  })

  it("projects draft, export, backup, and library text fields to exact locations", () => {
    // Given: contract-shaped content from every scanner payload source.
    const backup = backupEnvelopeSchema.parse({
      schemaVersion: 1,
      appName: "Prompter",
      backupType: "full",
      exportedAt: 1,
      metadata: {
        itemCounts: {
          projects: 0,
          promptAssets: 0,
          promptVersions: 1,
          tags: 0,
          promptTags: 0,
          harnessTemplates: 0,
          projectContextProfiles: 0,
          promptTemplates: 0,
          promptQualityReviews: 0,
        },
        sourceSummary: "Test backup",
        excludesSecrets: true,
        excludesSecretStatus: true,
        includesSettings: false,
        plaintext: true,
        schemaVersion: 1,
      },
      data: {
        projects: [],
        promptAssets: [],
        promptVersions: [
          {
            id: versionId,
            promptAssetId: entityId,
            versionNumber: 1,
            originalInput: "safe",
            compiledPrompt: "Bearer abcdefghijklmnopqrstu",
            assumptions: null,
            questions: null,
            answers: null,
            acceptanceCriteria: null,
            validationCommands: null,
            qualityScore: null,
            createdAt: 1,
          },
        ],
        tags: [],
        promptTags: [],
        harnessTemplates: [],
        projectContextProfiles: [],
        promptTemplates: [],
        promptQualityReviews: [],
      },
    })

    // When: each payload is reduced to scanner fields.
    const draft = draftPayloadFields({
      originalInput: "safe",
      additionalNotes: "jane@example.test",
    })
    const exported = exportPayloadFields({ content: "safe", format: "markdown" })
    const backupFields = backupPayloadFields(backup)
    const library = libraryPayloadFields({
      promptAssets: [{ id: entityId, title: "Token ghp_123456789012345678901234567890123456" }],
    })

    // Then: each source has an explicit entity, field, and user-facing preview label.
    expect(draft).toContainEqual({
      text: "jane@example.test",
      location: {
        entityType: "draft",
        field: "additionalNotes",
        previewLabel: "Draft additional notes",
      },
    })
    expect(exported).toEqual([
      {
        text: "safe",
        location: {
          entityType: "export",
          field: "content",
          previewLabel: "Markdown export content",
        },
      },
    ])
    expect(backupFields).toContainEqual({
      text: "Bearer abcdefghijklmnopqrstu",
      location: {
        entityType: "prompt_version",
        entityId: versionId,
        field: "compiledPrompt",
        previewLabel: "Backup prompt version compiled prompt",
      },
    })
    expect(library).toEqual([
      {
        text: "Token ghp_123456789012345678901234567890123456",
        location: {
          entityType: "prompt_asset",
          entityId,
          field: "title",
          previewLabel: "Prompt title",
        },
      },
    ])
  })
})
