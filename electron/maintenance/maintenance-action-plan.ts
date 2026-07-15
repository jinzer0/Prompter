import type { MaintenanceActionType } from "../ipc-types.js"

export type MaintenanceTagSnapshot = {
  readonly tagId: string
  readonly expectedName: string
  readonly expectedPromptLinkCount: number
}

export type DuplicateTagMergePlan = {
  readonly canonicalTag: MaintenanceTagSnapshot
  readonly duplicateTags: readonly MaintenanceTagSnapshot[]
}

export type DeleteUnusedTagsPlan = {
  readonly tags: readonly MaintenanceTagSnapshot[]
}

export type CurrentVersionRepairSnapshot = {
  readonly promptAssetId: string
  readonly expectedCurrentVersionId: string | null
  readonly replacementVersionId: string
  readonly replacementVersionNumber: number
  readonly expectedOwnedVersionCount: number
}

export type RepairCurrentVersionsPlan = {
  readonly repairs: readonly CurrentVersionRepairSnapshot[]
}

export type EmptyPromptAssetSnapshot = {
  readonly promptAssetId: string
  readonly expectedCurrentVersionId: string | null
  readonly expectedPromptTagCount: number
}

export type DeleteEmptyPromptAssetsPlan = {
  readonly assets: readonly EmptyPromptAssetSnapshot[]
}

export type MaintenanceActionPlan =
  | ({ readonly actionType: "merge_duplicate_tags" } & DuplicateTagMergePlan)
  | ({ readonly actionType: "delete_unused_tags" } & DeleteUnusedTagsPlan)
  | ({ readonly actionType: "repair_current_versions" } & RepairCurrentVersionsPlan)
  | ({ readonly actionType: "delete_empty_prompt_assets" } & DeleteEmptyPromptAssetsPlan)
  | { readonly actionType: "rebuild_search_index" }

export function detachMaintenanceActionPlan(plan: MaintenanceActionPlan): MaintenanceActionPlan {
  switch (plan.actionType) {
    case "merge_duplicate_tags":
      return Object.freeze({
        actionType: plan.actionType,
        canonicalTag: Object.freeze({ ...plan.canonicalTag }),
        duplicateTags: Object.freeze(
          plan.duplicateTags.map((snapshot) => Object.freeze({ ...snapshot })),
        ),
      })
    case "delete_unused_tags":
      return Object.freeze({
        actionType: plan.actionType,
        tags: Object.freeze(plan.tags.map((snapshot) => Object.freeze({ ...snapshot }))),
      })
    case "repair_current_versions":
      return Object.freeze({
        actionType: plan.actionType,
        repairs: Object.freeze(plan.repairs.map((snapshot) => Object.freeze({ ...snapshot }))),
      })
    case "delete_empty_prompt_assets":
      return Object.freeze({
        actionType: plan.actionType,
        assets: Object.freeze(plan.assets.map((snapshot) => Object.freeze({ ...snapshot }))),
      })
    case "rebuild_search_index":
      return Object.freeze({ actionType: plan.actionType })
    default:
      return assertNever(plan)
  }
}

function assertNever(value: never): never {
  throw new TypeError(`Unexpected maintenance action plan: ${String(value)}`)
}

type StaleReason =
  | "missing"
  | "snapshot_changed"
  | "no_longer_duplicate"
  | "now_used"
  | "replacement_changed"
  | "current_version_valid"
  | "now_referenced"

export class MaintenanceActionStaleError extends Error {
  readonly name = "MaintenanceActionStaleError"

  constructor(
    readonly actionType: MaintenanceActionType,
    readonly entityId: string,
    readonly reason: StaleReason,
  ) {
    super(`Maintenance action ${actionType} is stale for ${entityId}: ${reason}`)
  }
}
