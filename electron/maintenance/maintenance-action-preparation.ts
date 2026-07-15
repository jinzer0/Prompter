import type Database from "better-sqlite3"
import { z } from "zod"

import { normalizeMaintenanceName } from "./duplicate-detection.js"
import type { MaintenanceActionPlan } from "./maintenance-action-plan.js"
import {
  createMaintenanceActionPreview,
  createMaintenanceActionSessionInput,
} from "./maintenance-action-presentation.js"
import {
  createMaintenanceActionReadModel,
  MaintenanceActionPreparationError,
} from "./maintenance-action-read-model.js"
import type { MaintenanceActionRowSnapshot } from "./maintenance-action-session-store.js"
import { readMaintenanceScanSnapshot } from "./scan-snapshot.js"
import { planSearchIndexHealth } from "./version-planning.js"

const uuidSchema = z.string().uuid()

type PreparationSelection =
  | {
      readonly actionType: "merge_duplicate_tags"
      readonly canonicalTagId: string
      readonly duplicateTagIds: readonly string[]
    }
  | { readonly actionType: "delete_unused_tags"; readonly tagIds: readonly string[] }
  | { readonly actionType: "repair_current_versions"; readonly promptAssetIds: readonly string[] }
  | {
      readonly actionType: "delete_empty_prompt_assets"
      readonly promptAssetIds: readonly string[]
    }
  | { readonly actionType: "rebuild_search_index" }

export { MaintenanceActionPreparationError } from "./maintenance-action-read-model.js"

function requireUnique(ids: readonly string[]): void {
  if (new Set(ids).size !== ids.length) {
    throw new MaintenanceActionPreparationError()
  }
}

function tagRowSnapshots(
  snapshots: readonly {
    readonly tagId: string
    readonly expectedName: string
    readonly expectedPromptLinkCount: number
  }[],
): readonly MaintenanceActionRowSnapshot[] {
  return snapshots.map((snapshot) => ({
    entityType: "tag",
    entityId: snapshot.tagId,
    fields: {
      expectedName: snapshot.expectedName,
      expectedPromptLinkCount: snapshot.expectedPromptLinkCount,
    },
  }))
}

export function createMaintenanceActionPlanner(sqlite: Database.Database) {
  const rows = createMaintenanceActionReadModel(sqlite)

  return {
    prepare(selection: PreparationSelection) {
      switch (selection.actionType) {
        case "merge_duplicate_tags": {
          requireUnique([selection.canonicalTagId, ...selection.duplicateTagIds])
          const tags = rows.readTags([selection.canonicalTagId, ...selection.duplicateTagIds])
          const normalizedName = normalizeMaintenanceName(tags[0]?.name ?? "")
          if (
            normalizedName.length === 0 ||
            tags.some((tag) => normalizeMaintenanceName(tag.name) !== normalizedName)
          ) {
            throw new MaintenanceActionPreparationError()
          }
          const snapshots = tags.map((tag) => ({
            tagId: tag.id,
            expectedName: tag.name,
            expectedPromptLinkCount: tag.promptLinkCount,
          }))
          const canonicalTag = snapshots[0]
          if (canonicalTag === undefined) {
            throw new MaintenanceActionPreparationError()
          }
          const executionPlan = {
            actionType: selection.actionType,
            canonicalTag,
            duplicateTags: snapshots.slice(1),
          } satisfies MaintenanceActionPlan
          const actionPreview = createMaintenanceActionPreview(
            selection.actionType,
            tags.map(({ id }) => id),
            selection.duplicateTagIds.length,
          )
          return createMaintenanceActionSessionInput({
            executionPlan,
            preview: actionPreview,
            affectedDisplayNames: tags.map(({ name }) => name),
            rowSnapshots: tagRowSnapshots(snapshots),
          })
        }
        case "delete_unused_tags": {
          requireUnique(selection.tagIds)
          const tags = rows.readTags(selection.tagIds)
          if (tags.some((tag) => tag.promptLinkCount !== 0)) {
            throw new MaintenanceActionPreparationError()
          }
          const snapshots = tags.map((tag) => ({
            tagId: tag.id,
            expectedName: tag.name,
            expectedPromptLinkCount: tag.promptLinkCount,
          }))
          const actionPreview = createMaintenanceActionPreview(
            selection.actionType,
            selection.tagIds,
            snapshots.length,
          )
          return createMaintenanceActionSessionInput({
            executionPlan: { actionType: selection.actionType, tags: snapshots },
            preview: actionPreview,
            affectedDisplayNames: tags.map(({ name }) => name),
            rowSnapshots: tagRowSnapshots(snapshots),
          })
        }
        case "repair_current_versions": {
          requireUnique(selection.promptAssetIds)
          const assets = rows.readRepairAssets(selection.promptAssetIds)
          const repairs = assets.map((row) => ({
            promptAssetId: row.id,
            expectedCurrentVersionId: row.currentVersionId,
            replacementVersionId: row.replacementVersionId,
            replacementVersionNumber: row.replacementVersionNumber,
            expectedOwnedVersionCount: row.ownedVersionCount,
          }))
          const actionPreview = createMaintenanceActionPreview(
            selection.actionType,
            selection.promptAssetIds,
            repairs.length,
          )
          return createMaintenanceActionSessionInput({
            executionPlan: { actionType: selection.actionType, repairs },
            preview: actionPreview,
            affectedDisplayNames: assets.map(({ title }) => title),
            rowSnapshots: repairs.map((repair) => ({
              entityType: "prompt_asset",
              entityId: repair.promptAssetId,
              fields: {
                expectedCurrentVersionId: repair.expectedCurrentVersionId,
                replacementVersionId: repair.replacementVersionId,
                replacementVersionNumber: repair.replacementVersionNumber,
                expectedOwnedVersionCount: repair.expectedOwnedVersionCount,
              },
            })),
          })
        }
        case "delete_empty_prompt_assets": {
          requireUnique(selection.promptAssetIds)
          const assets = rows.readEmptyAssets(selection.promptAssetIds)
          const snapshots = assets.map((row) => ({
            promptAssetId: row.id,
            expectedCurrentVersionId: row.currentVersionId,
            expectedPromptTagCount: row.promptTagCount,
          }))
          const actionPreview = createMaintenanceActionPreview(
            selection.actionType,
            selection.promptAssetIds,
            snapshots.length,
          )
          return createMaintenanceActionSessionInput({
            executionPlan: { actionType: selection.actionType, assets: snapshots },
            preview: actionPreview,
            affectedDisplayNames: assets.map(({ title }) => title),
            rowSnapshots: snapshots.map((snapshot) => ({
              entityType: "prompt_asset",
              entityId: snapshot.promptAssetId,
              fields: {
                expectedCurrentVersionId: snapshot.expectedCurrentVersionId,
                expectedPromptTagCount: snapshot.expectedPromptTagCount,
              },
            })),
          })
        }
        case "rebuild_search_index": {
          const snapshot = readMaintenanceScanSnapshot(sqlite, {
            includePromptDuplicates: false,
            includeTagDuplicates: false,
            includeUnusedTags: false,
            includeCurrentVersionIssues: false,
            includeEmptyAssets: false,
            includeSearchIndexHealth: true,
            includePromptTemplateIssues: false,
            includeHarnessTemplateIssues: false,
            includeQualityFindings: false,
          })
          const health =
            snapshot.searchIndex.status === "available"
              ? planSearchIndexHealth(snapshot.assets, snapshot.versions, snapshot.searchIndex.rows)
              : null
          const affectedIds =
            health === null
              ? []
              : [
                  ...new Set([
                    ...health.missingPromptAssetIds,
                    ...health.extraPromptAssetIds,
                    ...health.stalePromptAssetIds,
                  ]),
                ]
          const contractIds = affectedIds
            .filter((id) => uuidSchema.safeParse(id).success)
            .slice(0, 200)
          const actionPreview = createMaintenanceActionPreview(
            selection.actionType,
            contractIds,
            health === null ? 1 : affectedIds.length,
          )
          return createMaintenanceActionSessionInput({
            executionPlan: { actionType: selection.actionType },
            preview: actionPreview,
            affectedDisplayNames: ["Search index"],
            rowSnapshots: [],
          })
        }
        default:
          return assertNever(selection)
      }
    },
  }
}

function assertNever(value: never): never {
  throw new TypeError(`Unexpected maintenance action selection: ${String(value)}`)
}
