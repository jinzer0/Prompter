import type Database from "better-sqlite3"
import { z } from "zod"

import { rebuildSearchIndexAtomically } from "../db/repositories/search.js"
import { normalizeMaintenanceName } from "./duplicate-detection.js"
import {
  type DeleteEmptyPromptAssetsPlan,
  type DeleteUnusedTagsPlan,
  type DuplicateTagMergePlan,
  MaintenanceActionStaleError,
  type MaintenanceTagSnapshot,
  type RepairCurrentVersionsPlan,
} from "./maintenance-action-plan.js"

export { MaintenanceActionStaleError } from "./maintenance-action-plan.js"

const readTagStateSql = `SELECT tags.id, tags.name,
  COUNT(prompt_tags.prompt_asset_id) AS promptLinkCount
 FROM tags LEFT JOIN prompt_tags ON prompt_tags.tag_id = tags.id
 WHERE tags.id = ? GROUP BY tags.id, tags.name`

const tagStateSchema = z
  .object({ id: z.string(), name: z.string(), promptLinkCount: z.number().int().nonnegative() })
  .nullish()

const repairStateSchema = z
  .object({
    id: z.string(),
    currentVersionId: z.string().nullable(),
    validCurrentVersionCount: z.number().int().nonnegative(),
    replacementVersionId: z.string().nullable(),
    replacementVersionNumber: z.number().int().positive().nullable(),
    ownedVersionCount: z.number().int().nonnegative(),
  })
  .nullish()

const emptyAssetStateSchema = z
  .object({
    id: z.string(),
    currentVersionId: z.string().nullable(),
    versionCount: z.number().int().nonnegative(),
    childReferenceCount: z.number().int().nonnegative(),
    templateSourceReferenceCount: z.number().int().nonnegative(),
    promptTagCount: z.number().int().nonnegative(),
  })
  .nullish()

export function createMaintenanceActionRepository(sqlite: Database.Database) {
  function requireTagSnapshot(
    actionType: "merge_duplicate_tags" | "delete_unused_tags",
    snapshot: MaintenanceTagSnapshot,
  ) {
    const state = tagStateSchema.parse(sqlite.prepare(readTagStateSql).get(snapshot.tagId))
    if (state === null || state === undefined) {
      throw new MaintenanceActionStaleError(actionType, snapshot.tagId, "missing")
    }
    if (
      state.name !== snapshot.expectedName ||
      state.promptLinkCount !== snapshot.expectedPromptLinkCount
    ) {
      throw new MaintenanceActionStaleError(actionType, snapshot.tagId, "snapshot_changed")
    }
    return state
  }

  return {
    mergeDuplicateTags(plan: DuplicateTagMergePlan): void {
      sqlite.transaction(() => {
        const canonical = requireTagSnapshot("merge_duplicate_tags", plan.canonicalTag)
        const normalizedName = normalizeMaintenanceName(canonical.name)
        for (const duplicate of plan.duplicateTags) {
          const state = requireTagSnapshot("merge_duplicate_tags", duplicate)
          if (
            normalizedName.length === 0 ||
            normalizeMaintenanceName(state.name) !== normalizedName
          ) {
            throw new MaintenanceActionStaleError(
              "merge_duplicate_tags",
              duplicate.tagId,
              "no_longer_duplicate",
            )
          }
        }

        for (const duplicate of plan.duplicateTags) {
          sqlite
            .prepare(
              `INSERT OR IGNORE INTO prompt_tags (prompt_asset_id, tag_id)
               SELECT prompt_asset_id, ? FROM prompt_tags WHERE tag_id = ?`,
            )
            .run(canonical.id, duplicate.tagId)
          sqlite.prepare("DELETE FROM prompt_tags WHERE tag_id = ?").run(duplicate.tagId)
          sqlite.prepare("DELETE FROM tags WHERE id = ?").run(duplicate.tagId)
        }
      })()
    },
    deleteUnusedTags(plan: DeleteUnusedTagsPlan): void {
      sqlite.transaction(() => {
        for (const tag of plan.tags) {
          const state = requireTagSnapshot("delete_unused_tags", tag)
          if (state.promptLinkCount !== 0) {
            throw new MaintenanceActionStaleError("delete_unused_tags", tag.tagId, "now_used")
          }
        }
        for (const tag of plan.tags) {
          sqlite.prepare("DELETE FROM tags WHERE id = ?").run(tag.tagId)
        }
      })()
    },
    repairCurrentVersions(plan: RepairCurrentVersionsPlan): void {
      const readRepairState = sqlite.prepare(
        `SELECT prompt_assets.id, prompt_assets.current_version_id AS currentVersionId,
          (SELECT COUNT(*) FROM prompt_versions
           WHERE id = prompt_assets.current_version_id
             AND prompt_asset_id = prompt_assets.id) AS validCurrentVersionCount,
          (SELECT id FROM prompt_versions WHERE prompt_asset_id = prompt_assets.id
           ORDER BY version_number DESC LIMIT 1) AS replacementVersionId,
          (SELECT version_number FROM prompt_versions WHERE prompt_asset_id = prompt_assets.id
           ORDER BY version_number DESC LIMIT 1) AS replacementVersionNumber,
          (SELECT COUNT(*) FROM prompt_versions
           WHERE prompt_asset_id = prompt_assets.id) AS ownedVersionCount
         FROM prompt_assets WHERE prompt_assets.id = ?`,
      )
      sqlite.transaction(() => {
        for (const repair of plan.repairs) {
          const state = repairStateSchema.parse(readRepairState.get(repair.promptAssetId))
          if (state === null || state === undefined) {
            throw new MaintenanceActionStaleError(
              "repair_current_versions",
              repair.promptAssetId,
              "missing",
            )
          }
          if (state.currentVersionId !== repair.expectedCurrentVersionId) {
            throw new MaintenanceActionStaleError(
              "repair_current_versions",
              repair.promptAssetId,
              "snapshot_changed",
            )
          }
          if (state.validCurrentVersionCount !== 0) {
            throw new MaintenanceActionStaleError(
              "repair_current_versions",
              repair.promptAssetId,
              "current_version_valid",
            )
          }
          if (
            state.replacementVersionId !== repair.replacementVersionId ||
            state.replacementVersionNumber !== repair.replacementVersionNumber ||
            state.ownedVersionCount !== repair.expectedOwnedVersionCount
          ) {
            throw new MaintenanceActionStaleError(
              "repair_current_versions",
              repair.promptAssetId,
              "replacement_changed",
            )
          }
        }
        for (const repair of plan.repairs) {
          sqlite
            .prepare("UPDATE prompt_assets SET current_version_id = ?, updated_at = ? WHERE id = ?")
            .run(repair.replacementVersionId, Date.now(), repair.promptAssetId)
        }
        rebuildSearchIndexAtomically(sqlite)
      })()
    },
    deleteEmptyPromptAssets(plan: DeleteEmptyPromptAssetsPlan): void {
      const readEmptyAssetState = sqlite.prepare(
        `SELECT prompt_assets.id, prompt_assets.current_version_id AS currentVersionId,
          (SELECT COUNT(*) FROM prompt_versions
           WHERE prompt_asset_id = prompt_assets.id) AS versionCount,
          (SELECT COUNT(*) FROM prompt_assets AS children
           WHERE children.parent_prompt_id = prompt_assets.id
             OR children.parent_prompt_version_id IN (
               SELECT id FROM prompt_versions WHERE prompt_asset_id = prompt_assets.id
             )) AS childReferenceCount,
          (SELECT COUNT(*) FROM prompt_templates
           WHERE source_prompt_asset_id = prompt_assets.id
             OR source_prompt_version_id IN (
               SELECT id FROM prompt_versions WHERE prompt_asset_id = prompt_assets.id
             )) AS templateSourceReferenceCount,
          (SELECT COUNT(*) FROM prompt_tags
           WHERE prompt_asset_id = prompt_assets.id) AS promptTagCount
         FROM prompt_assets WHERE prompt_assets.id = ?`,
      )
      sqlite.transaction(() => {
        for (const asset of plan.assets) {
          const state = emptyAssetStateSchema.parse(readEmptyAssetState.get(asset.promptAssetId))
          if (state === null || state === undefined) {
            throw new MaintenanceActionStaleError(
              "delete_empty_prompt_assets",
              asset.promptAssetId,
              "missing",
            )
          }
          if (
            state.currentVersionId !== asset.expectedCurrentVersionId ||
            state.promptTagCount !== asset.expectedPromptTagCount
          ) {
            throw new MaintenanceActionStaleError(
              "delete_empty_prompt_assets",
              asset.promptAssetId,
              "snapshot_changed",
            )
          }
          if (
            state.versionCount !== 0 ||
            state.childReferenceCount !== 0 ||
            state.templateSourceReferenceCount !== 0
          ) {
            throw new MaintenanceActionStaleError(
              "delete_empty_prompt_assets",
              asset.promptAssetId,
              "now_referenced",
            )
          }
        }
        for (const asset of plan.assets) {
          sqlite
            .prepare("DELETE FROM prompt_tags WHERE prompt_asset_id = ?")
            .run(asset.promptAssetId)
          sqlite
            .prepare("DELETE FROM prompt_search_fts WHERE prompt_asset_id = ?")
            .run(asset.promptAssetId)
          sqlite.prepare("DELETE FROM prompt_assets WHERE id = ?").run(asset.promptAssetId)
        }
      })()
    },
    rebuildMaintenanceSearchIndex(): void {
      rebuildSearchIndexAtomically(sqlite)
    },
  }
}

export type MaintenanceActionRepository = ReturnType<typeof createMaintenanceActionRepository>
