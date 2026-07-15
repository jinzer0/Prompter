import type { MaintenanceActionPreview } from "../ipc-types.js"
import type { MaintenanceActionPlan } from "./maintenance-action-plan.js"
import type {
  CreateMaintenanceActionSessionInput,
  MaintenanceActionRowSnapshot,
} from "./maintenance-action-session-store.js"

type PreparedActionDraft = {
  readonly executionPlan: MaintenanceActionPlan
  readonly preview: MaintenanceActionPreview
  readonly affectedDisplayNames: readonly string[]
  readonly rowSnapshots: readonly MaintenanceActionRowSnapshot[]
}

type MaintenanceActionPresentationMetadata = Readonly<
  Pick<MaintenanceActionPreview, "title" | "description" | "severity" | "affectedEntityType">
> & {
  readonly confirmation: Pick<
    CreateMaintenanceActionSessionInput,
    "destructive" | "relationshipChanging" | "backupRecommendation"
  >
}

const maintenanceActionMetadataByType = {
  merge_duplicate_tags: {
    title: "Merge duplicate tags",
    description: "Move prompt relationships to the canonical tag and delete selected duplicates.",
    severity: "high",
    affectedEntityType: "tag",
    confirmation: {
      destructive: true,
      relationshipChanging: true,
      backupRecommendation: "Export a backup before merging tags.",
    },
  },
  delete_unused_tags: {
    title: "Delete unused tags",
    description: "Delete selected tags that currently have no prompt relationships.",
    severity: "medium",
    affectedEntityType: "tag",
    confirmation: {
      destructive: true,
      relationshipChanging: false,
      backupRecommendation: "Export a backup before deleting tags.",
    },
  },
  repair_current_versions: {
    title: "Repair current versions",
    description: "Point selected prompt assets to their highest owned version.",
    severity: "high",
    affectedEntityType: "prompt_asset",
    confirmation: {
      destructive: false,
      relationshipChanging: true,
      backupRecommendation: "Export a backup before changing current versions.",
    },
  },
  delete_empty_prompt_assets: {
    title: "Delete empty prompt assets",
    description: "Delete selected versionless prompt assets with no protected references.",
    severity: "high",
    affectedEntityType: "prompt_asset",
    confirmation: {
      destructive: true,
      relationshipChanging: false,
      backupRecommendation: "Export a backup before deleting prompt assets.",
    },
  },
  rebuild_search_index: {
    title: "Rebuild search index",
    description: "Atomically rebuild search rows from owned current versions.",
    severity: "high",
    affectedEntityType: "prompt_asset",
    confirmation: {
      destructive: false,
      relationshipChanging: false,
      backupRecommendation: null,
    },
  },
} as const satisfies Record<
  MaintenanceActionPreview["actionType"],
  MaintenanceActionPresentationMetadata
>

export function createMaintenanceActionPreview(
  actionType: MaintenanceActionPreview["actionType"],
  affectedEntityIds: readonly string[],
  estimatedChangeCount: number,
): MaintenanceActionPreview {
  const { confirmation, ...presentation } = maintenanceActionMetadataByType[actionType]
  return {
    actionType,
    ...presentation,
    affectedEntityIds: [...affectedEntityIds],
    ...confirmation,
    estimatedChangeCount,
  }
}

export function createMaintenanceActionSessionInput(
  draft: PreparedActionDraft,
): CreateMaintenanceActionSessionInput {
  const selectedEntityIds = draft.preview.affectedEntityIds
  const base = {
    executionPlan: draft.executionPlan,
    preview: draft.preview,
    affectedDisplayNames: draft.affectedDisplayNames,
    selectedEntityIds,
    expectedCounts: {
      selectedRows: selectedEntityIds.length,
      estimatedChanges: draft.preview.estimatedChangeCount,
    },
    rowSnapshots: draft.rowSnapshots,
    warningLedger: draft.preview.destructive
      ? ["This action permanently removes selected records."]
      : draft.preview.relationshipChanging
        ? ["This action changes stored relationships."]
        : [],
    consequenceLedger: [draft.preview.description],
  }
  return {
    ...base,
    ...maintenanceActionMetadataByType[draft.executionPlan.actionType].confirmation,
  }
}
