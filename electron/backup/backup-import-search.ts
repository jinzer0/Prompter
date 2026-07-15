import type Database from "better-sqlite3"

import type { BackupImportCheckpoint, ResolvedBackupImport } from "./backup-import-types.js"

type SearchWriteDependencies = {
  readonly sqlite: Database.Database
  readonly rows: ResolvedBackupImport["searchRows"]
  readonly onCheckpoint: (checkpoint: BackupImportCheckpoint) => void
}

export function updateImportedPromptSearchIndex(dependencies: SearchWriteDependencies): void {
  const deleteStatement = dependencies.sqlite.prepare(
    "DELETE FROM prompt_search_fts WHERE prompt_asset_id = ?",
  )
  const insertStatement = dependencies.sqlite.prepare(
    "INSERT INTO prompt_search_fts (prompt_asset_id, title, original_input, compiled_prompt) VALUES (?, ?, ?, ?)",
  )

  for (const row of dependencies.rows) {
    deleteStatement.run(row.promptAssetId)
    dependencies.onCheckpoint("during_fts_update")
    insertStatement.run(row.promptAssetId, row.title, row.originalInput, row.compiledPrompt)
  }
}
