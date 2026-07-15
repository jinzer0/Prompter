import type {
  MaintenanceActionPreview,
  MaintenanceCategory,
  MaintenanceScanInput,
  MaintenanceSeverity,
  PrepareMaintenanceActionInput,
} from "../../../../electron/ipc-types"

export type ScanOptionKey = keyof Omit<MaintenanceScanInput, "projectId">

export const scanOptionRows = [
  {
    key: "includePromptDuplicates",
    label: "Duplicate prompts",
    description: "Finding-only candidates for manual compare and open review.",
  },
  {
    key: "includeTagDuplicates",
    label: "Duplicate tags",
    description: "Tags that normalize to the same name and can be merged after preview.",
  },
  {
    key: "includeUnusedTags",
    label: "Unused tags",
    description: "Tags with no prompt links, prepared as explicit delete previews.",
  },
  {
    key: "includeCurrentVersionIssues",
    label: "Current-version repairs",
    description: "Broken current-version pointers that can be repointed to owned versions.",
  },
  {
    key: "includeEmptyAssets",
    label: "Empty prompt assets",
    description: "Versionless assets eligible for guarded deletion previews.",
  },
  {
    key: "includeSearchIndexHealth",
    label: "Search index health",
    description: "FTS rows compared with the current-version projection.",
  },
  {
    key: "includePromptTemplateIssues",
    label: "Prompt template issues",
    description: "Finding-only template source/reference issues.",
  },
  {
    key: "includeHarnessTemplateIssues",
    label: "Harness template issues",
    description: "Finding-only harness template drift and missing fields.",
  },
  {
    key: "includeQualityFindings",
    label: "Quality review findings",
    description: "Finding-only stale or detached prompt quality review records.",
  },
] as const satisfies readonly {
  readonly key: ScanOptionKey
  readonly label: string
  readonly description: string
}[]

const categoryLabels = {
  duplicate_prompts: "Duplicate prompts",
  duplicate_tags: "Duplicate tags",
  unused_tags: "Unused tags",
  empty_prompt_assets: "Empty assets",
  current_version_issues: "Current versions",
  search_index_health: "Search index",
  prompt_template_issues: "Prompt templates",
  harness_template_issues: "Harness templates",
  quality_review_findings: "Quality reviews",
} as const satisfies Record<MaintenanceCategory, string>

const severityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
} as const satisfies Record<MaintenanceSeverity, string>

export function categoryLabel(category: MaintenanceCategory): string {
  return categoryLabels[category]
}

export function severityLabel(severity: MaintenanceSeverity): string {
  return severityLabels[severity]
}

export function prepareInputFromAction(
  action: MaintenanceActionPreview,
  canonicalTagId: string,
): PrepareMaintenanceActionInput | null {
  switch (action.actionType) {
    case "merge_duplicate_tags": {
      if (canonicalTagId.length === 0) {
        return null
      }

      const duplicateTagIds = action.affectedEntityIds.filter((id) => id !== canonicalTagId)
      if (duplicateTagIds.length === 0) {
        return null
      }

      return { actionType: "merge_duplicate_tags", canonicalTagId, duplicateTagIds }
    }
    case "delete_unused_tags":
      return { actionType: "delete_unused_tags", tagIds: action.affectedEntityIds }
    case "repair_current_versions":
      return { actionType: "repair_current_versions", promptAssetIds: action.affectedEntityIds }
    case "delete_empty_prompt_assets":
      return { actionType: "delete_empty_prompt_assets", promptAssetIds: action.affectedEntityIds }
    case "rebuild_search_index":
      return { actionType: "rebuild_search_index" }
  }
}
