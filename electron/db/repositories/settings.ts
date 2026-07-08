import { desc, eq } from "drizzle-orm"

import type { Setting } from "../../ipc-types.js"
import * as schema from "../schema.js"
import { type AppDatabase, createTimestamp, requireRow } from "./common.js"

export type SettingsRepository = {
  readonly getSetting: (key: string) => Setting | null
  readonly setSetting: (key: string, value: string) => Setting
  readonly listSettings: () => readonly Setting[]
}

export function createSettingsRepository(db: AppDatabase): SettingsRepository {
  return {
    getSetting(key) {
      return db.select().from(schema.settings).where(eq(schema.settings.key, key)).get() ?? null
    },
    setSetting(key, value) {
      const updatedAt = createTimestamp()

      return requireRow(
        db
          .insert(schema.settings)
          .values({ key, value, updatedAt })
          .onConflictDoUpdate({
            target: schema.settings.key,
            set: { value, updatedAt },
          })
          .returning()
          .get(),
        "setting",
        key,
      )
    },
    listSettings() {
      return db.select().from(schema.settings).orderBy(desc(schema.settings.updatedAt)).all()
    },
  }
}
