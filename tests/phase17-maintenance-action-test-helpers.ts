import { z } from "zod"

import type { TestDatabase } from "./electron-search-test-helpers"

const tagSnapshotSchema = z.object({
  tagId: z.string(),
  expectedName: z.string(),
  expectedPromptLinkCount: z.number().int().nonnegative(),
})

const repairSnapshotSchema = z.object({
  promptAssetId: z.string(),
  expectedCurrentVersionId: z.string().nullable(),
  replacementVersionId: z.string(),
  replacementVersionNumber: z.number().int().positive(),
  expectedOwnedVersionCount: z.number().int().positive(),
})

const emptyAssetSnapshotSchema = z.object({
  promptAssetId: z.string(),
  expectedCurrentVersionId: z.string().nullable(),
  expectedPromptTagCount: z.number().int().nonnegative(),
})

export function readTagSnapshot(database: TestDatabase, tagId: string) {
  return tagSnapshotSchema.parse(
    database.sqlite
      .prepare(
        `SELECT tags.id AS tagId, tags.name AS expectedName,
          COUNT(prompt_tags.prompt_asset_id) AS expectedPromptLinkCount
         FROM tags LEFT JOIN prompt_tags ON prompt_tags.tag_id = tags.id
         WHERE tags.id = ? GROUP BY tags.id, tags.name`,
      )
      .get(tagId),
  )
}

export function readRepairSnapshot(database: TestDatabase, promptAssetId: string) {
  return repairSnapshotSchema.parse(
    database.sqlite
      .prepare(
        `SELECT prompt_assets.id AS promptAssetId,
          prompt_assets.current_version_id AS expectedCurrentVersionId,
          highest.id AS replacementVersionId,
          highest.version_number AS replacementVersionNumber,
          COUNT(prompt_versions.id) AS expectedOwnedVersionCount
         FROM prompt_assets
         INNER JOIN prompt_versions ON prompt_versions.prompt_asset_id = prompt_assets.id
         INNER JOIN prompt_versions AS highest ON highest.id = (
           SELECT id FROM prompt_versions
           WHERE prompt_asset_id = prompt_assets.id
           ORDER BY version_number DESC LIMIT 1
         )
         WHERE prompt_assets.id = ?
         GROUP BY prompt_assets.id, prompt_assets.current_version_id,
           highest.id, highest.version_number`,
      )
      .get(promptAssetId),
  )
}

export function readEmptyAssetSnapshot(database: TestDatabase, promptAssetId: string) {
  return emptyAssetSnapshotSchema.parse(
    database.sqlite
      .prepare(
        `SELECT prompt_assets.id AS promptAssetId,
          prompt_assets.current_version_id AS expectedCurrentVersionId,
          COUNT(prompt_tags.tag_id) AS expectedPromptTagCount
         FROM prompt_assets
         LEFT JOIN prompt_tags ON prompt_tags.prompt_asset_id = prompt_assets.id
         WHERE prompt_assets.id = ?
         GROUP BY prompt_assets.id, prompt_assets.current_version_id`,
      )
      .get(promptAssetId),
  )
}

export function snapshotTables(
  database: TestDatabase,
  tables: readonly string[],
): Readonly<Record<string, readonly unknown[]>> {
  return Object.fromEntries(
    tables.map((table) => [table, database.sqlite.prepare(`SELECT * FROM ${table}`).all()]),
  )
}
