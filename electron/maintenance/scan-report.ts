import { createHash } from "node:crypto"
import { z } from "zod"

import { MAINTENANCE_ACTION_TYPES, MAINTENANCE_CATEGORIES } from "../ipc-contract.js"
import type {
  MaintenanceActionPreview,
  MaintenanceCategory,
  MaintenanceFinding,
  MaintenanceScanInput,
  MaintenanceScanResult,
} from "../ipc-types.js"
import {
  findHarnessTemplateIssues,
  findPromptTemplateIssues,
  findQualityReviewIssues,
} from "./finding-planners.js"
import { type ActionDraft, buildCoreScanDrafts, type FindingDraft } from "./scan-report-core.js"
import type { MaintenanceScanSnapshot } from "./scan-snapshot.js"

const FINDING_LIMIT = 200
const ACTION_LIMIT = 50
const ENTITY_ID_LIMIT = 200
const uuidSchema = z.string().uuid()
const categoryOrder = new Map(MAINTENANCE_CATEGORIES.map((category, index) => [category, index]))
const actionOrder = new Map(
  MAINTENANCE_ACTION_TYPES.map((actionType, index) => [actionType, index]),
)

type Bounded<T> = { readonly value: T; readonly truncated: boolean }

function deterministicId(parts: readonly string[]): string {
  const hash = createHash("sha1").update(JSON.stringify(parts)).digest("hex")
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

function boundedEntityIds(ids: readonly string[]): Bounded<string[]> {
  const uniqueIds = [...new Set(ids)].sort()
  const validIds = uniqueIds.filter((id) => uuidSchema.safeParse(id).success)
  return {
    value: validIds.slice(0, ENTITY_ID_LIMIT),
    truncated: validIds.length !== uniqueIds.length || validIds.length > ENTITY_ID_LIMIT,
  }
}

function finding(draft: FindingDraft): Bounded<MaintenanceFinding> {
  const affectedEntityIds = boundedEntityIds(draft.affectedEntityIds)
  return {
    value: {
      ...draft,
      id: deterministicId([
        draft.category,
        draft.title,
        ...[...new Set(draft.affectedEntityIds)].sort(),
      ]),
      affectedEntityIds: affectedEntityIds.value,
    },
    truncated: affectedEntityIds.truncated,
  }
}

function action(draft: ActionDraft): Bounded<MaintenanceActionPreview> {
  const affectedEntityIds = boundedEntityIds(draft.affectedEntityIds)
  return {
    value: { ...draft, affectedEntityIds: affectedEntityIds.value },
    truncated: affectedEntityIds.truncated,
  }
}

function displayIssue(issueType: string): string {
  return issueType.replaceAll("_", " ")
}

function emptyCategoryCounts(): Record<MaintenanceCategory, number> {
  return {
    duplicate_prompts: 0,
    duplicate_tags: 0,
    unused_tags: 0,
    empty_prompt_assets: 0,
    current_version_issues: 0,
    search_index_health: 0,
    prompt_template_issues: 0,
    harness_template_issues: 0,
    quality_review_findings: 0,
  }
}

export function buildMaintenanceScanResult(
  snapshot: MaintenanceScanSnapshot,
  input: MaintenanceScanInput,
): MaintenanceScanResult {
  const drafts = buildCoreScanDrafts(snapshot, input)
  const findings = drafts.findings.map(finding)
  const actions = drafts.actions.map(action)
  const findingOnlyIssues = [
    ...(input.includePromptTemplateIssues
      ? findPromptTemplateIssues(snapshot.promptTemplates)
      : []),
    ...(input.includeHarnessTemplateIssues
      ? findHarnessTemplateIssues(snapshot.harnessTemplates)
      : []),
    ...(input.includeQualityFindings
      ? findQualityReviewIssues(snapshot.assets, snapshot.versions, snapshot.qualityReviews)
      : []),
  ]

  for (const issue of findingOnlyIssues) {
    findings.push(
      finding({
        severity: issue.issueType === "stale_quality_review" ? "low" : "medium",
        category: issue.category,
        title: displayIssue(issue.issueType),
        description: `Detected ${displayIssue(issue.issueType)}.`,
        affectedEntityType: issue.affectedEntityType,
        affectedEntityIds: issue.affectedEntityIds,
        safeAutoFixAvailable: false,
      }),
    )
  }

  findings.sort(
    (left, right) =>
      (categoryOrder.get(left.value.category) ?? 0) -
        (categoryOrder.get(right.value.category) ?? 0) ||
      left.value.id.localeCompare(right.value.id),
  )
  actions.sort(
    (left, right) =>
      (actionOrder.get(left.value.actionType) ?? 0) -
        (actionOrder.get(right.value.actionType) ?? 0) ||
      left.value.affectedEntityIds.join().localeCompare(right.value.affectedEntityIds.join()),
  )

  const severityCounts = { low: 0, medium: 0, high: 0 }
  const categoryCounts = emptyCategoryCounts()
  for (const entry of findings) {
    severityCounts[entry.value.severity] += 1
    categoryCounts[entry.value.category] += 1
  }

  return {
    summary: {
      totalFindings: findings.length,
      severityCounts,
      categoryCounts,
      truncated:
        findings.length > FINDING_LIMIT ||
        actions.length > ACTION_LIMIT ||
        findings.some(({ truncated }) => truncated) ||
        actions.some(({ truncated }) => truncated),
    },
    findings: findings.slice(0, FINDING_LIMIT).map(({ value }) => value),
    recommendedActions: actions.slice(0, ACTION_LIMIT).map(({ value }) => value),
  }
}
