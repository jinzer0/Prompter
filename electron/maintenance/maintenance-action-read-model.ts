import type Database from "better-sqlite3"
import { z } from "zod"

const tagRowSchema = z
  .object({ id: z.string(), name: z.string(), promptLinkCount: z.number().int().nonnegative() })
  .nullish()
const repairRowSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    currentVersionId: z.string().nullable(),
    validCurrentVersionCount: z.number().int().nonnegative(),
    replacementVersionId: z.string().nullable(),
    replacementVersionNumber: z.number().int().positive().nullable(),
    ownedVersionCount: z.number().int().nonnegative(),
  })
  .nullish()
const emptyAssetRowSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    currentVersionId: z.string().nullable(),
    versionCount: z.number().int().nonnegative(),
    childReferenceCount: z.number().int().nonnegative(),
    templateSourceReferenceCount: z.number().int().nonnegative(),
    promptTagCount: z.number().int().nonnegative(),
  })
  .nullish()

type TagRow = NonNullable<z.infer<typeof tagRowSchema>>
type RepairRow = Omit<
  NonNullable<z.infer<typeof repairRowSchema>>,
  "replacementVersionId" | "replacementVersionNumber"
> & {
  readonly replacementVersionId: string
  readonly replacementVersionNumber: number
}
type EmptyAssetRow = NonNullable<z.infer<typeof emptyAssetRowSchema>>

export class MaintenanceActionPreparationError extends Error {
  readonly name = "MaintenanceActionPreparationError"

  constructor() {
    super("Selected maintenance rows are no longer eligible.")
  }
}

function present<T>(rows: readonly (T | null | undefined)[]): readonly T[] {
  if (rows.some((row) => row === null || row === undefined)) {
    throw new MaintenanceActionPreparationError()
  }
  return rows.flatMap((row) => (row === null || row === undefined ? [] : [row]))
}

export function createMaintenanceActionReadModel(sqlite: Database.Database) {
  const readTag = sqlite.prepare(`SELECT tags.id, tags.name,
    COUNT(prompt_tags.prompt_asset_id) AS promptLinkCount
    FROM tags LEFT JOIN prompt_tags ON prompt_tags.tag_id = tags.id
    WHERE tags.id = ? GROUP BY tags.id, tags.name`)
  const readRepair = sqlite.prepare(`SELECT prompt_assets.id, prompt_assets.title,
    prompt_assets.current_version_id AS currentVersionId,
    (SELECT COUNT(*) FROM prompt_versions WHERE id = prompt_assets.current_version_id
      AND prompt_asset_id = prompt_assets.id) AS validCurrentVersionCount,
    (SELECT id FROM prompt_versions WHERE prompt_asset_id = prompt_assets.id
      ORDER BY version_number DESC LIMIT 1) AS replacementVersionId,
    (SELECT version_number FROM prompt_versions WHERE prompt_asset_id = prompt_assets.id
      ORDER BY version_number DESC LIMIT 1) AS replacementVersionNumber,
    (SELECT COUNT(*) FROM prompt_versions
      WHERE prompt_asset_id = prompt_assets.id) AS ownedVersionCount
    FROM prompt_assets WHERE prompt_assets.id = ?`)
  const readEmptyAsset = sqlite.prepare(`SELECT prompt_assets.id, prompt_assets.title,
    prompt_assets.current_version_id AS currentVersionId,
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
    FROM prompt_assets WHERE prompt_assets.id = ?`)

  return {
    readTags(ids: readonly string[]): readonly TagRow[] {
      return present(ids.map((id) => tagRowSchema.parse(readTag.get(id))))
    },
    readRepairAssets(ids: readonly string[]): readonly RepairRow[] {
      const rows = present(ids.map((id) => repairRowSchema.parse(readRepair.get(id))))
      if (
        rows.some(
          (row) =>
            row.validCurrentVersionCount !== 0 ||
            row.replacementVersionId === null ||
            row.replacementVersionNumber === null ||
            row.ownedVersionCount === 0,
        )
      ) {
        throw new MaintenanceActionPreparationError()
      }
      return rows.flatMap((row) =>
        row.replacementVersionId === null || row.replacementVersionNumber === null
          ? []
          : [
              {
                ...row,
                replacementVersionId: row.replacementVersionId,
                replacementVersionNumber: row.replacementVersionNumber,
              },
            ],
      )
    },
    readEmptyAssets(ids: readonly string[]): readonly EmptyAssetRow[] {
      const rows = present(ids.map((id) => emptyAssetRowSchema.parse(readEmptyAsset.get(id))))
      if (
        rows.some(
          (row) =>
            row.versionCount !== 0 ||
            row.childReferenceCount !== 0 ||
            row.templateSourceReferenceCount !== 0,
        )
      ) {
        throw new MaintenanceActionPreparationError()
      }
      return rows
    },
  }
}
