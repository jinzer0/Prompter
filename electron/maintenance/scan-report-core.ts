import type {
  MaintenanceActionPreview,
  MaintenanceFinding,
  MaintenanceScanInput,
} from "../ipc-types.js"
import { findDuplicatePromptCandidates, findDuplicateTagGroups } from "./duplicate-detection.js"
import type { MaintenanceScanSnapshot } from "./scan-snapshot.js"
import { planCurrentVersionRepairs, planSearchIndexHealth } from "./version-planning.js"

export type FindingDraft = Omit<MaintenanceFinding, "id" | "affectedEntityIds"> & {
  readonly affectedEntityIds: readonly string[]
}

export type ActionDraft = Omit<MaintenanceActionPreview, "affectedEntityIds"> & {
  readonly affectedEntityIds: readonly string[]
}

type CoreScanDrafts = {
  readonly findings: readonly FindingDraft[]
  readonly actions: readonly ActionDraft[]
}

function finding(draft: FindingDraft): FindingDraft {
  return draft
}

function action(draft: ActionDraft): ActionDraft {
  return draft
}

function displayIssue(issueType: string): string {
  return issueType.replaceAll("_", " ")
}

export function buildCoreScanDrafts(
  snapshot: MaintenanceScanSnapshot,
  input: MaintenanceScanInput,
): CoreScanDrafts {
  const findings: FindingDraft[] = []
  const actions: ActionDraft[] = []
  const duplicateTagGroups = input.includeTagDuplicates ? findDuplicateTagGroups(snapshot.tags) : []
  const unusedTags = input.includeUnusedTags
    ? snapshot.tags.filter(({ promptCount }) => promptCount === 0)
    : []
  const versionPlan =
    input.includeCurrentVersionIssues || input.includeEmptyAssets
      ? planCurrentVersionRepairs(snapshot.assets, snapshot.versions)
      : { repairs: [], emptyAssetFindings: [] }

  if (input.includePromptDuplicates) {
    for (const candidate of findDuplicatePromptCandidates(snapshot.assets, snapshot.versions)) {
      findings.push(
        finding({
          severity: "medium",
          category: "duplicate_prompts",
          title: "Potential duplicate prompts",
          description: `Matched on ${candidate.matchedOn.join(", ")}.`,
          affectedEntityType: "prompt_asset",
          affectedEntityIds: candidate.promptAssetIds,
          safeAutoFixAvailable: false,
        }),
      )
    }
  }
  for (const group of duplicateTagGroups) {
    findings.push(
      finding({
        severity: "medium",
        category: "duplicate_tags",
        title: "Duplicate tags",
        description: `Tags normalize to ${group.normalizedName}; recommended canonical tag is ${group.canonicalRecommendation.tagName}.`,
        affectedEntityType: "tag",
        affectedEntityIds: group.tagIds,
        suggestedActionType: "merge_duplicate_tags",
        safeAutoFixAvailable: false,
      }),
    )
    actions.push(
      action({
        actionType: "merge_duplicate_tags",
        title: "Merge duplicate tags",
        description: `Merge into ${group.canonicalRecommendation.tagName} after confirmation.`,
        severity: "high",
        affectedEntityType: "tag",
        affectedEntityIds: group.tagIds,
        destructive: true,
        relationshipChanging: true,
        estimatedChangeCount: group.tagIds.length - 1,
        backupRecommendation: "Export a backup before merging tags.",
      }),
    )
  }
  for (const tag of unusedTags) {
    findings.push(
      finding({
        severity: "low",
        category: "unused_tags",
        title: "Unused tag",
        description: `${tag.name} has no prompt links.`,
        affectedEntityType: "tag",
        affectedEntityIds: [tag.id],
        suggestedActionType: "delete_unused_tags",
        safeAutoFixAvailable: false,
      }),
    )
  }
  if (unusedTags.length > 0) {
    actions.push(
      action({
        actionType: "delete_unused_tags",
        title: "Delete unused tags",
        description: "Delete selected tags that remain unused at execution time.",
        severity: "medium",
        affectedEntityType: "tag",
        affectedEntityIds: unusedTags.map(({ id }) => id),
        destructive: true,
        relationshipChanging: false,
        estimatedChangeCount: unusedTags.length,
        backupRecommendation: "Export a backup before deleting tags.",
      }),
    )
  }
  if (input.includeCurrentVersionIssues) {
    for (const repair of versionPlan.repairs) {
      findings.push(
        finding({
          severity: "high",
          category: "current_version_issues",
          title: "Current version needs repair",
          description: `Current version state: ${displayIssue(repair.reason)}.`,
          affectedEntityType: "prompt_asset",
          affectedEntityIds: [repair.promptAssetId],
          suggestedActionType: "repair_current_versions",
          safeAutoFixAvailable: true,
        }),
      )
    }
    if (versionPlan.repairs.length > 0) {
      actions.push(
        action({
          actionType: "repair_current_versions",
          title: "Repair current versions",
          description: "Point selected assets to their highest owned version.",
          severity: "high",
          affectedEntityType: "prompt_asset",
          affectedEntityIds: versionPlan.repairs.map(({ promptAssetId }) => promptAssetId),
          destructive: false,
          relationshipChanging: true,
          estimatedChangeCount: versionPlan.repairs.length,
          backupRecommendation: "Export a backup before changing current versions.",
        }),
      )
    }
  }
  if (input.includeEmptyAssets) {
    for (const empty of versionPlan.emptyAssetFindings) {
      findings.push(
        finding({
          severity: "medium",
          category: "empty_prompt_assets",
          title: "Empty prompt asset",
          description: "This prompt asset has no versions.",
          affectedEntityType: "prompt_asset",
          affectedEntityIds: [empty.promptAssetId],
          suggestedActionType: "delete_empty_prompt_assets",
          safeAutoFixAvailable: false,
        }),
      )
    }
    if (versionPlan.emptyAssetFindings.length > 0) {
      actions.push(
        action({
          actionType: "delete_empty_prompt_assets",
          title: "Delete empty prompt assets",
          description: "Delete selected versionless assets after reference checks.",
          severity: "high",
          affectedEntityType: "prompt_asset",
          affectedEntityIds: versionPlan.emptyAssetFindings.map(
            ({ promptAssetId }) => promptAssetId,
          ),
          destructive: true,
          relationshipChanging: false,
          estimatedChangeCount: versionPlan.emptyAssetFindings.length,
          backupRecommendation: "Export a backup before deleting prompt assets.",
        }),
      )
    }
  }
  if (input.includeSearchIndexHealth) {
    const searchPlan =
      snapshot.searchIndex.status === "available"
        ? planSearchIndexHealth(snapshot.assets, snapshot.versions, snapshot.searchIndex.rows)
        : null
    const affectedIds =
      searchPlan === null
        ? []
        : [
            ...searchPlan.missingPromptAssetIds,
            ...searchPlan.extraPromptAssetIds,
            ...searchPlan.stalePromptAssetIds,
          ]
    if (searchPlan === null || affectedIds.length > 0) {
      findings.push(
        finding({
          severity: "high",
          category: "search_index_health",
          title: "Search index needs rebuild",
          description:
            searchPlan === null
              ? "The search index is missing or unusable."
              : "The search index contains missing, extra, or stale rows.",
          affectedEntityType: "prompt_asset",
          affectedEntityIds: affectedIds,
          suggestedActionType: "rebuild_search_index",
          safeAutoFixAvailable: true,
        }),
      )
      actions.push(
        action({
          actionType: "rebuild_search_index",
          title: "Rebuild search index",
          description: "Atomically rebuild search rows from owned current versions.",
          severity: "high",
          affectedEntityType: "prompt_asset",
          affectedEntityIds: affectedIds,
          destructive: false,
          relationshipChanging: false,
          estimatedChangeCount: searchPlan === null ? 1 : affectedIds.length,
          backupRecommendation: null,
        }),
      )
    }
  }

  return { findings, actions }
}
