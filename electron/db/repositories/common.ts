import { randomUUID } from "node:crypto"

import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3"

import { PersistenceNotFoundError } from "../errors.js"
import type * as schema from "../schema.js"

export type AppDatabase = BetterSQLite3Database<typeof schema>

export function createTimestamp(): number {
  return Date.now()
}

export function createId(): string {
  return randomUUID()
}

export function requireRow<T>(row: T | undefined, entity: string, id: string): T {
  if (row === undefined) {
    throw new PersistenceNotFoundError(entity, id)
  }

  return row
}

export function optionalText(value: string | null | undefined): string | null {
  return value ?? null
}
