import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import type { PrivacySettings, SensitiveFinding, SensitiveScanResult } from "../electron/ipc-types"
import {
  PrivacyCenterView,
  type PrivacyCenterViewProps,
} from "../renderer/src/components/privacy/privacy-center"
import {
  type PrivacyNavigationReader,
  resolvePrivacyFindingNavigation,
} from "../renderer/src/lib/privacy-navigation"

const projectId = "11111111-1111-4111-8111-111111111111"
const promptAssetId = "22222222-2222-4222-8222-222222222222"
const promptVersionId = "33333333-3333-4333-8333-333333333333"
const reviewId = "44444444-4444-4444-8444-444444444444"

const settings = {
  warnBeforeLLM: true,
  warnBeforeExport: true,
  warnBeforeBackup: true,
  enableLibraryScan: false,
} satisfies PrivacySettings

const promptFinding = {
  id: "finding-one",
  severity: "critical",
  category: "github_token",
  label: "GitHub token candidate",
  description: "A token-shaped value needs review.",
  location: {
    entityType: "prompt_version",
    entityId: promptVersionId,
    field: "compiledPrompt",
    previewLabel: "Prompt version 2",
  },
  evidenceMasked: "github_pat_...wxyz",
  confidence: "high",
  recommendation: "Remove the token before sharing this prompt.",
} satisfies SensitiveFinding

const findings = [
  promptFinding,
  {
    id: "finding-two",
    severity: "medium",
    category: "email_address",
    label: "Email address candidate",
    description: "An email address may identify a person.",
    location: {
      entityType: "prompt_version",
      entityId: promptVersionId,
      field: "originalInput",
      previewLabel: "Prompt version 2",
    },
    evidenceMasked: "a...z@example.com",
    confidence: "medium",
    recommendation: "Confirm this address is appropriate to retain.",
  },
] satisfies readonly SensitiveFinding[]

const scanResult = {
  scannedAt: 1_000,
  source: "library",
  findingCount: 2,
  criticalCount: 1,
  highCount: 0,
  mediumCount: 1,
  lowCount: 0,
  findings,
  safeToProceed: false,
  warnings: ["High-risk findings require confirmation."],
} satisfies SensitiveScanResult

function privacyCenterProps(
  state: PrivacyCenterViewProps["scan"]["state"],
): PrivacyCenterViewProps {
  return {
    onBackToLibrary: vi.fn<() => void>(),
    onNavigate: vi.fn<PrivacyCenterViewProps["onNavigate"]>(),
    scan: {
      reset: vi.fn<() => void>(),
      run: vi.fn<PrivacyCenterViewProps["scan"]["run"]>(),
      state,
    },
    settings: {
      canPersist: true,
      isSaving: false,
      isWorking: false,
      message: null,
      reload: vi.fn<() => Promise<void>>(),
      save: vi.fn<() => Promise<void>>(),
      setSetting: vi.fn<PrivacyCenterViewProps["settings"]["setSetting"]>(),
      settings,
      state: { kind: "ready", settings },
    },
  }
}

describe("Phase 19 Privacy Center", () => {
  it("renders limits and safe storage guidance without scanning on render", () => {
    // Given: privacy settings disable the discoverable manual library scan action.
    const props = privacyCenterProps({ kind: "idle" })

    // When: the workspace renders before any user action.
    const markup = renderToStaticMarkup(createElement(PrivacyCenterView, props))

    // Then: guidance is visible, scan remains passive, and settings are available.
    expect(markup).toContain("Privacy Center")
    expect(markup).toContain("Plaintext backups")
    expect(markup).toContain("Encrypted backups")
    expect(markup).toContain("no recovery")
    expect(markup).toContain("main-process secret store")
    expect(markup).toContain("excluded from backups")
    expect(markup).toContain("local-only")
    expect(markup).toContain("never redact")
    expect(markup).toContain("possible false positives")
    expect(markup).toContain("Enable manual library scans")
    expect(markup).toContain('disabled=""')
    expect(props.scan.run).not.toHaveBeenCalled()
  })

  it("shows severity counts and groups masked findings by entity", () => {
    // Given: one explicit library scan returned two findings for the same prompt version.
    const props = privacyCenterProps({ kind: "ready", result: scanResult })

    // When: the completed scan surface renders.
    const markup = renderToStaticMarkup(createElement(PrivacyCenterView, props))

    // Then: severity counts, one entity group, masked evidence, and recommendations are shown.
    expect(markup).toContain("1 critical")
    expect(markup).toContain("0 high")
    expect(markup).toContain("1 medium")
    expect(markup).toContain("0 low")
    expect(markup.match(/Prompt version 2/g)?.length).toBe(1)
    expect(markup).toContain("github_pat_...wxyz")
    expect(markup).toContain("a...z@example.com")
    expect(markup).not.toContain("github_pat_raw_secret")
  })

  it("resolves prompts and improved drafts through existing detail navigation", async () => {
    // Given: read-only entity lookups for a prompt version and its saved quality review.
    const reader = {
      getPromptAsset: vi.fn<PrivacyNavigationReader["getPromptAsset"]>().mockResolvedValue({
        id: promptAssetId,
        projectId,
      }),
      getProjectContextOwner: vi.fn<PrivacyNavigationReader["getProjectContextOwner"]>(),
      getPromptQualityReview: vi
        .fn<PrivacyNavigationReader["getPromptQualityReview"]>()
        .mockResolvedValue({ promptVersionId }),
      getPromptVersion: vi.fn<PrivacyNavigationReader["getPromptVersion"]>().mockResolvedValue({
        id: promptVersionId,
        promptAssetId,
      }),
    } satisfies PrivacyNavigationReader

    // When: prompt content and improved-prompt-draft locations are resolved.
    const promptDestination = await resolvePrivacyFindingNavigation(promptFinding.location, reader)
    const qualityDestination = await resolvePrivacyFindingNavigation(
      {
        entityType: "prompt_quality_review",
        entityId: reviewId,
        field: "improvedPromptDraft",
      },
      reader,
    )

    // Then: both select existing project/asset/version details without an edit or draft action.
    expect(promptDestination).toEqual({
      kind: "insights",
      intent: { kind: "prompt", projectId, promptAssetId, promptVersionId },
    })
    expect(qualityDestination).toEqual({
      kind: "insights",
      intent: { kind: "prompt_quality", projectId, promptAssetId, promptVersionId },
    })
  })

  it("routes exact managers and unavailable entity routes without mutations", async () => {
    // Given: locations with exact template and context manager ownership.
    const reader = {
      getPromptAsset: vi.fn<PrivacyNavigationReader["getPromptAsset"]>(),
      getProjectContextOwner: vi
        .fn<PrivacyNavigationReader["getProjectContextOwner"]>()
        .mockResolvedValue({ projectId }),
      getPromptQualityReview: vi.fn<PrivacyNavigationReader["getPromptQualityReview"]>(),
      getPromptVersion: vi.fn<PrivacyNavigationReader["getPromptVersion"]>(),
    } satisfies PrivacyNavigationReader

    // When: each safe destination is resolved.
    const destinations = await Promise.all([
      resolvePrivacyFindingNavigation(
        { entityType: "prompt_template", entityId: promptAssetId, field: "templateBody" },
        reader,
      ),
      resolvePrivacyFindingNavigation(
        { entityType: "harness_template", entityId: promptAssetId, field: "templateBody" },
        reader,
      ),
      resolvePrivacyFindingNavigation(
        { entityType: "project_context", entityId: promptAssetId, field: "securityNotes" },
        reader,
      ),
      resolvePrivacyFindingNavigation(
        { entityType: "tag", entityId: promptAssetId, field: "name" },
        reader,
      ),
    ])

    // Then: exact managers use existing requests and unavailable routes use the Settings heading.
    expect(destinations).toEqual([
      {
        kind: "insights",
        intent: { kind: "prompt_templates", promptTemplateId: promptAssetId },
      },
      {
        kind: "insights",
        intent: { kind: "harness_templates", harnessTemplateId: promptAssetId },
      },
      {
        kind: "insights",
        intent: { kind: "project_context", projectId, profileId: promptAssetId },
      },
      { kind: "settings", target: "settings" },
    ])
    expect(reader.getPromptAsset).not.toHaveBeenCalled()
    expect(reader.getPromptVersion).not.toHaveBeenCalled()
    expect(reader.getPromptQualityReview).not.toHaveBeenCalled()
  })
})
