import Database from "better-sqlite3"
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import type { PromptCompilerClientFactory } from "../prompt-compiler/prompt-compiler-service.js"
import type { OpenAIKeyStore } from "../secrets/open-ai-key-store.js"
import * as schema from "./schema.js"
import { createPersistenceServices, type PersistenceServices } from "./services.js"

function bootstrapSearchIndex(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS prompt_search_fts USING fts5(
      prompt_asset_id UNINDEXED,
      title,
      original_input,
      compiled_prompt,
      tokenize = 'unicode61'
    )
  `)
}

function currentHarnessTemplateSchemaExists(sqlite: Database.Database): boolean {
  const columns = sqlite
    .prepare("select name from pragma_table_info('harness_templates')")
    .pluck()
    .all()

  return columns.includes("scenario")
}

export type PrompterDatabaseConfig = {
  readonly databasePath: string
  readonly migrationsFolder: string
  readonly openAIKeyStore?: OpenAIKeyStore
  readonly promptCompilerClientFactory?: PromptCompilerClientFactory
}

export type PrompterDatabase = {
  readonly sqlite: Database.Database
  readonly db: BetterSQLite3Database<typeof schema>
  readonly services: PersistenceServices
  readonly close: () => void
}

export function openPrompterDatabase(config: PrompterDatabaseConfig): PrompterDatabase {
  const sqlite = new Database(config.databasePath)
  sqlite.pragma("foreign_keys = ON")
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("busy_timeout = 5000")

  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: config.migrationsFolder })
  bootstrapSearchIndex(sqlite)

  const services = createPersistenceServices(
    db,
    sqlite,
    config.openAIKeyStore,
    config.promptCompilerClientFactory,
  )
  if (currentHarnessTemplateSchemaExists(sqlite)) {
    services.seedDefaultHarnessTemplates()
  }

  return {
    sqlite,
    db,
    services,
    close: () => sqlite.close(),
  }
}
