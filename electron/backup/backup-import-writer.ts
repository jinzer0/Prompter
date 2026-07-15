import type Database from "better-sqlite3"

import { eq } from "drizzle-orm"
import type { AppDatabase } from "../db/repositories/common.js"
import * as schema from "../db/schema.js"
import { updateImportedPromptSearchIndex } from "./backup-import-search.js"
import type { BackupImportCheckpoint, ResolvedBackupImport } from "./backup-import-types.js"

type BackupImportWriterDependencies = {
  readonly db: AppDatabase
  readonly sqlite: Database.Database
  readonly resolution: ResolvedBackupImport
  readonly onCheckpoint: (checkpoint: BackupImportCheckpoint) => void
}

export function writeResolvedBackupImport(dependencies: BackupImportWriterDependencies): void {
  dependencies.db.transaction((tx) => {
    for (const tag of dependencies.resolution.tags) {
      tx.insert(schema.tags).values(tag).run()
    }
    for (const project of dependencies.resolution.projects) {
      tx.insert(schema.projects).values(project).run()
    }
    for (const asset of dependencies.resolution.promptAssets) {
      tx.insert(schema.promptAssets).values(asset).run()
    }
    dependencies.onCheckpoint("after_assets")
    for (const version of dependencies.resolution.promptVersions) {
      tx.insert(schema.promptVersions).values(version).run()
    }
    dependencies.onCheckpoint("after_versions")
    for (const asset of dependencies.resolution.promptAssetUpdates) {
      tx.update(schema.promptAssets)
        .set({
          currentVersionId: asset.currentVersionId,
          parentPromptId: asset.parentPromptId,
          parentPromptVersionId: asset.parentPromptVersionId,
          derivationType: asset.derivationType,
        })
        .where(eq(schema.promptAssets.id, asset.id))
        .run()
    }
    for (const promptTag of dependencies.resolution.promptTags) {
      tx.insert(schema.promptTags).values(promptTag).run()
    }
    for (const profile of dependencies.resolution.projectContextProfiles) {
      tx.insert(schema.projectContextProfiles).values(profile).run()
    }
    for (const template of dependencies.resolution.promptTemplates) {
      tx.insert(schema.promptTemplates).values(template).run()
    }
    for (const template of dependencies.resolution.harnessTemplates) {
      tx.insert(schema.harnessTemplates).values(template).run()
    }
    for (const review of dependencies.resolution.promptQualityReviews) {
      tx.insert(schema.promptQualityReviews).values(review).run()
    }
    dependencies.onCheckpoint("after_quality_reviews")
    updateImportedPromptSearchIndex({
      sqlite: dependencies.sqlite,
      rows: dependencies.resolution.searchRows,
      onCheckpoint: dependencies.onCheckpoint,
    })
  })
}
