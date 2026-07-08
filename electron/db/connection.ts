import Database from "better-sqlite3"
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"

import * as schema from "./schema.js"
import { createPersistenceServices, type PersistenceServices } from "./services.js"

export type PrompterDatabaseConfig = {
  readonly databasePath: string
  readonly migrationsFolder: string
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

  return {
    sqlite,
    db,
    services: createPersistenceServices(db),
    close: () => sqlite.close(),
  }
}
