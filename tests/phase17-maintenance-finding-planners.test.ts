import { describe, expect, it } from "vitest"

import type {
  MaintenancePromptAssetRow,
  MaintenancePromptVersionRow,
} from "../electron/maintenance/current-version-projection"
import type { FindingOnlyIssue } from "../electron/maintenance/finding-planners"
import * as findingPlanners from "../electron/maintenance/finding-planners"

function expectFindingOnly(
  findings: readonly FindingOnlyIssue[],
  issueTypes: readonly FindingOnlyIssue["issueType"][],
): void {
  expect(findings.map(({ issueType }) => issueType)).toEqual(issueTypes)
  expect(
    findings.every(
      (finding) => finding.safeAutoFixAvailable === false && !("actionType" in finding),
    ),
  ).toBe(true)
}

describe("Phase 17 finding-only maintenance planners", () => {
  it("returns prompt-template findings without action plans", () => {
    // Given: an empty body and a duplicate normalized name in the same scenario/agent scope.
    const rows = [
      {
        id: "pt1",
        name: "Review-Guide",
        scenario: "review",
        targetAgent: "codex",
        templateBody: "",
      },
      {
        id: "pt2",
        name: "review guide",
        scenario: "review",
        targetAgent: "codex",
        templateBody: "body",
      },
    ]

    // When: prompt-template issues are detected.
    const findings = findingPlanners.findPromptTemplateIssues(rows)

    // Then: findings are non-fixable issue shapes with no action type.
    expectFindingOnly(findings, ["empty_template_body", "duplicate_template_name"])
  })

  it("returns harness JSON, body, and duplicate findings without action plans", () => {
    // Given: malformed JSON fields and duplicate harness identity rows.
    const rows = [
      {
        id: "h1",
        name: "Agent_Harness",
        scenario: "feature",
        targetAgent: "codex",
        templateBody: " ",
        requiredFields: "{}",
        clarificationPolicy: "[]",
      },
      {
        id: "h2",
        name: "agent harness",
        scenario: "feature",
        targetAgent: "codex",
        templateBody: "body",
        requiredFields: '["title"]',
        clarificationPolicy: '{"mode":"ask"}',
      },
    ]

    // When: harness issues are detected.
    const findings = findingPlanners.findHarnessTemplateIssues(rows)

    // Then: all malformed classes are findings only.
    expectFindingOnly(findings, [
      "empty_template_body",
      "invalid_required_fields",
      "invalid_clarification_policy",
      "duplicate_template_name",
    ])
  })

  it("returns missing, mismatched, and stale quality-review findings without action plans", () => {
    // Given: two valid current versions and one historical reviewed version.
    const assets = [
      {
        id: "qa",
        title: "A",
        scenario: "feature",
        targetAgent: "codex",
        currentVersionId: "qva",
      },
      {
        id: "qb",
        title: "B",
        scenario: "feature",
        targetAgent: "codex",
        currentVersionId: "qvb",
      },
    ] satisfies readonly MaintenancePromptAssetRow[]
    const versions = [
      {
        id: "qva",
        promptAssetId: "qa",
        versionNumber: 2,
        originalInput: "oa",
        compiledPrompt: "ca",
        qualityScore: null,
      },
      {
        id: "old-qa",
        promptAssetId: "qa",
        versionNumber: 1,
        originalInput: "old",
        compiledPrompt: "old",
        qualityScore: 70,
      },
      {
        id: "qvb",
        promptAssetId: "qb",
        versionNumber: 1,
        originalInput: "ob",
        compiledPrompt: "cb",
        qualityScore: 50,
      },
    ] satisfies readonly MaintenancePromptVersionRow[]
    const reviews = [
      { id: "r1", promptVersionId: "qva", overallScore: 80, createdAt: 2 },
      { id: "r2", promptVersionId: "old-qa", overallScore: 70, createdAt: 1 },
      { id: "r3", promptVersionId: "qvb", overallScore: 60, createdAt: 3 },
    ]

    // When: quality review drift is detected.
    const findings = findingPlanners.findQualityReviewIssues(assets, versions, reviews)

    // Then: quality discrepancies and historical reviews remain finding-only output.
    expectFindingOnly(findings, [
      "missing_quality_score",
      "stale_quality_review",
      "quality_score_mismatch",
    ])
  })
})
