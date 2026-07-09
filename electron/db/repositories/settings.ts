import { desc, eq } from "drizzle-orm"

import { settingKeyIsPublic, settingsDefaultsSchema } from "../../ipc-contract.js"
import type { Setting, SettingsDefaults, UpdateDefaultsInput } from "../../ipc-types.js"
import * as schema from "../schema.js"
import { type AppDatabase, createTimestamp, requireRow } from "./common.js"

export type SettingsRepository = {
  readonly getSetting: (key: string) => Setting | null
  readonly setSetting: (key: string, value: string) => Setting
  readonly listSettings: () => readonly Setting[]
  readonly getDefaults: () => SettingsDefaults
  readonly updateDefaults: (input: UpdateDefaultsInput) => SettingsDefaults
}

const defaultSettings: SettingsDefaults = {
  defaultModel: "gpt-4.1",
  defaultTargetAgent: "codex",
  defaultProjectId: null,
  defaultScenario: "feature",
  appTheme: "system",
  compilerDefaultLanguage: "ko",
}

function publicSettingKey(key: string): string {
  if (!settingKeyIsPublic(key)) {
    throw new TypeError("Secrets cannot be stored in settings")
  }

  return key
}

function settingValue(settings: readonly Setting[], key: string): string | null {
  return settings.find((setting) => setting.key === key)?.value ?? null
}

function defaultsFromSettings(settings: readonly Setting[]): SettingsDefaults {
  const defaultProjectId = settingValue(settings, "default_project_id")

  return settingsDefaultsSchema.parse({
    defaultModel: settingValue(settings, "default_model") ?? defaultSettings.defaultModel,
    defaultTargetAgent:
      settingValue(settings, "default_target_agent") ?? defaultSettings.defaultTargetAgent,
    defaultProjectId:
      defaultProjectId === null || defaultProjectId.length === 0
        ? defaultSettings.defaultProjectId
        : defaultProjectId,
    defaultScenario: settingValue(settings, "default_scenario") ?? defaultSettings.defaultScenario,
    appTheme: settingValue(settings, "app_theme") ?? defaultSettings.appTheme,
    compilerDefaultLanguage:
      settingValue(settings, "compiler_default_language") ??
      defaultSettings.compilerDefaultLanguage,
  })
}

export function createSettingsRepository(db: AppDatabase): SettingsRepository {
  return {
    getSetting(key) {
      return db.select().from(schema.settings).where(eq(schema.settings.key, key)).get() ?? null
    },
    setSetting(key, value) {
      const updatedAt = createTimestamp()
      const publicKey = publicSettingKey(key)

      return requireRow(
        db
          .insert(schema.settings)
          .values({ key: publicKey, value, updatedAt })
          .onConflictDoUpdate({
            target: schema.settings.key,
            set: { value, updatedAt },
          })
          .returning()
          .get(),
        "setting",
        publicKey,
      )
    },
    listSettings() {
      return db.select().from(schema.settings).orderBy(desc(schema.settings.updatedAt)).all()
    },
    getDefaults() {
      return defaultsFromSettings(db.select().from(schema.settings).all())
    },
    updateDefaults(input) {
      if (input.defaultModel !== undefined) {
        this.setSetting("default_model", input.defaultModel)
      }

      if (input.defaultTargetAgent !== undefined) {
        this.setSetting("default_target_agent", input.defaultTargetAgent)
      }

      if (input.defaultProjectId !== undefined) {
        this.setSetting("default_project_id", input.defaultProjectId ?? "")
      }

      if (input.defaultScenario !== undefined) {
        this.setSetting("default_scenario", input.defaultScenario)
      }

      if (input.appTheme !== undefined) {
        this.setSetting("app_theme", input.appTheme)
      }

      if (input.compilerDefaultLanguage !== undefined) {
        this.setSetting("compiler_default_language", input.compilerDefaultLanguage)
      }

      return this.getDefaults()
    },
  }
}
