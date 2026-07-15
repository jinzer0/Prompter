import {
  type MaintenancePromptAssetRow,
  type MaintenancePromptVersionRow,
  projectCurrentVersions,
} from "./current-version-projection.js"
import { normalizeMaintenanceName } from "./duplicate-detection.js"

type TemplateIdentityRow = {
  readonly id: string
  readonly name: string
  readonly scenario: string
  readonly targetAgent: string
  readonly templateBody: string
}

export type PromptTemplateMaintenanceRow = TemplateIdentityRow

export type HarnessTemplateMaintenanceRow = TemplateIdentityRow & {
  readonly requiredFields: string | null
  readonly clarificationPolicy: string | null
}

export type QualityReviewMaintenanceRow = {
  readonly id: string
  readonly promptVersionId: string
  readonly overallScore: number
  readonly createdAt: number
}

export type FindingOnlyIssue = {
  readonly category:
    | "prompt_template_issues"
    | "harness_template_issues"
    | "quality_review_findings"
  readonly issueType:
    | "empty_template_body"
    | "duplicate_template_name"
    | "invalid_required_fields"
    | "invalid_clarification_policy"
    | "missing_quality_score"
    | "quality_score_mismatch"
    | "stale_quality_review"
  readonly affectedEntityType: "prompt_template" | "harness_template" | "prompt_version"
  readonly affectedEntityIds: readonly string[]
  readonly safeAutoFixAvailable: false
}

function duplicateIdentityGroups(
  rows: readonly TemplateIdentityRow[],
): readonly (readonly string[])[] {
  const idsByIdentity = new Map<string, readonly string[]>()
  for (const row of rows) {
    const normalizedName = normalizeMaintenanceName(row.name)
    if (normalizedName.length === 0) {
      continue
    }
    const identity = JSON.stringify([normalizedName, row.scenario, row.targetAgent])
    idsByIdentity.set(identity, [...(idsByIdentity.get(identity) ?? []), row.id])
  }
  return [...idsByIdentity.values()].filter((ids) => ids.length > 1)
}

function hasValidRequiredFields(value: string | null): boolean {
  if (value === null) {
    return true
  }
  try {
    const parsed: unknown = JSON.parse(value)
    return (
      Array.isArray(parsed) &&
      parsed.every((field) => typeof field === "string" && field.trim().length > 0)
    )
  } catch {
    return false
  }
}

function hasValidClarificationPolicy(value: string | null): boolean {
  if (value === null) {
    return true
  }
  try {
    const parsed: unknown = JSON.parse(value)
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
  } catch {
    return false
  }
}

export function findPromptTemplateIssues(
  rows: readonly PromptTemplateMaintenanceRow[],
): readonly FindingOnlyIssue[] {
  const emptyBodyFindings: FindingOnlyIssue[] = rows.flatMap((row) =>
    row.templateBody.trim().length === 0
      ? [
          {
            category: "prompt_template_issues",
            issueType: "empty_template_body",
            affectedEntityType: "prompt_template",
            affectedEntityIds: [row.id],
            safeAutoFixAvailable: false,
          },
        ]
      : [],
  )
  const duplicateFindings: FindingOnlyIssue[] = duplicateIdentityGroups(rows).map((ids) => ({
    category: "prompt_template_issues",
    issueType: "duplicate_template_name",
    affectedEntityType: "prompt_template",
    affectedEntityIds: ids,
    safeAutoFixAvailable: false,
  }))
  return [...emptyBodyFindings, ...duplicateFindings]
}

export function findHarnessTemplateIssues(
  rows: readonly HarnessTemplateMaintenanceRow[],
): readonly FindingOnlyIssue[] {
  const rowFindings: FindingOnlyIssue[] = rows.flatMap((row) => {
    const findings: FindingOnlyIssue[] = []
    if (row.templateBody.trim().length === 0) {
      findings.push({
        category: "harness_template_issues",
        issueType: "empty_template_body",
        affectedEntityType: "harness_template",
        affectedEntityIds: [row.id],
        safeAutoFixAvailable: false,
      })
    }
    if (!hasValidRequiredFields(row.requiredFields)) {
      findings.push({
        category: "harness_template_issues",
        issueType: "invalid_required_fields",
        affectedEntityType: "harness_template",
        affectedEntityIds: [row.id],
        safeAutoFixAvailable: false,
      })
    }
    if (!hasValidClarificationPolicy(row.clarificationPolicy)) {
      findings.push({
        category: "harness_template_issues",
        issueType: "invalid_clarification_policy",
        affectedEntityType: "harness_template",
        affectedEntityIds: [row.id],
        safeAutoFixAvailable: false,
      })
    }
    return findings
  })
  const duplicateFindings: FindingOnlyIssue[] = duplicateIdentityGroups(rows).map((ids) => ({
    category: "harness_template_issues",
    issueType: "duplicate_template_name",
    affectedEntityType: "harness_template",
    affectedEntityIds: ids,
    safeAutoFixAvailable: false,
  }))
  return [...rowFindings, ...duplicateFindings]
}

export function findQualityReviewIssues(
  assets: readonly MaintenancePromptAssetRow[],
  versions: readonly MaintenancePromptVersionRow[],
  reviews: readonly QualityReviewMaintenanceRow[],
): readonly FindingOnlyIssue[] {
  const currentVersionIds = new Set(
    projectCurrentVersions(assets, versions).map(({ version }) => version.id),
  )
  const latestReviewByVersion = new Map<string, QualityReviewMaintenanceRow>()
  for (const review of reviews) {
    const latest = latestReviewByVersion.get(review.promptVersionId)
    if (latest === undefined || review.createdAt > latest.createdAt) {
      latestReviewByVersion.set(review.promptVersionId, review)
    }
  }

  return versions.flatMap((version) => {
    const review = latestReviewByVersion.get(version.id)
    if (review === undefined) {
      return []
    }
    const issueType = currentVersionIds.has(version.id)
      ? version.qualityScore === null || version.qualityScore === undefined
        ? "missing_quality_score"
        : version.qualityScore === review.overallScore
          ? null
          : "quality_score_mismatch"
      : "stale_quality_review"
    return issueType === null
      ? []
      : [
          {
            category: "quality_review_findings",
            issueType,
            affectedEntityType: "prompt_version",
            affectedEntityIds: [version.id],
            safeAutoFixAvailable: false,
          },
        ]
  })
}
