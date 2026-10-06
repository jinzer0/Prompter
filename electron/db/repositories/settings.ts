import { desc, eq } from "drizzle-orm"

import { APP_LOCK_METADATA_SETTING_KEY } from "../../app-lock/app-lock-metadata.js"
import {
  settingKeyIsPublic,
  settingsDefaultsSchema,
  updateDefaultsInputSchema,
} from "../../ipc-contract.js"
import type {
  PrivacySettings,
  Setting,
  SettingsDefaults,
  UpdateDefaultsInput,
  UpdatePrivacySettingsInput,
} from "../../ipc-types.js"
import { privacySettingsSchema } from "../../privacy/privacy-schemas.js"
import * as schema from "../schema.js"
import { type AppDatabase, createTimestamp, requireRow } from "./common.js"

export type SettingsRepository = {
  readonly getSetting: (key: string) => Setting | null
  readonly setSetting: (key: string, value: string) => Setting
  readonly listSettings: () => readonly Setting[]
  readonly getAppLockMetadata: () => string | null
  readonly setAppLockMetadata: (value: string) => void
  readonly deleteAppLockMetadata: () => void
  readonly getDefaults: () => SettingsDefaults
  readonly updateDefaults: (input: UpdateDefaultsInput) => SettingsDefaults
  readonly getPrivacySettings: () => PrivacySettings
  readonly updatePrivacySettings: (input: UpdatePrivacySettingsInput) => PrivacySettings
}

const defaultSettings: SettingsDefaults = {
  defaultModel: "gpt-4.1",
  defaultTargetAgent: "codex",
  defaultProjectId: null,
  defaultScenario: "feature",
  appTheme: "system",
  compilerDefaultLanguage: "ko",
}

const defaultSettingSchemas = {
  default_model: settingsDefaultsSchema.shape.defaultModel,
  default_target_agent: settingsDefaultsSchema.shape.defaultTargetAgent,
  default_project_id: settingsDefaultsSchema.shape.defaultProjectId,
  default_scenario: settingsDefaultsSchema.shape.defaultScenario,
  app_theme: settingsDefaultsSchema.shape.appTheme,
  compiler_default_language: settingsDefaultsSchema.shape.compilerDefaultLanguage,
}

const privacySettingKeys = {
  warnBeforeLLM: "privacy_warn_before_llm",
  warnBeforeExport: "privacy_warn_before_export",
  warnBeforeBackup: "privacy_warn_before_backup",
  enableLibraryScan: "privacy_enable_library_scan",
} as const satisfies Record<keyof PrivacySettings, string>

function publicSettingKey(key: string): string {
  if (!settingKeyIsPublic(key)) {
    if (
      key
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .startsWith("applock")
    ) {
      throw new TypeError("Private settings cannot be stored through public settings APIs")
    }
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
    defaultModel: defaultSettingSchemas.default_model
      .catch(defaultSettings.defaultModel)
      .parse(settingValue(settings, "default_model")),
    defaultTargetAgent: defaultSettingSchemas.default_target_agent
      .catch(defaultSettings.defaultTargetAgent)
      .parse(settingValue(settings, "default_target_agent")),
    defaultProjectId: defaultSettingSchemas.default_project_id
      .catch(defaultSettings.defaultProjectId)
      .parse(defaultProjectId === "" ? null : defaultProjectId),
    defaultScenario: defaultSettingSchemas.default_scenario
      .catch(defaultSettings.defaultScenario)
      .parse(settingValue(settings, "default_scenario")),
    appTheme: defaultSettingSchemas.app_theme
      .catch(defaultSettings.appTheme)
      .parse(settingValue(settings, "app_theme")),
    compilerDefaultLanguage: defaultSettingSchemas.compiler_default_language
      .catch(defaultSettings.compilerDefaultLanguage)
      .parse(settingValue(settings, "compiler_default_language")),
  })
}

function privacySettingValue(settings: readonly Setting[], key: string): boolean | undefined {
  const value = settingValue(settings, key)
  if (value === "true") {
    return true
  }
  if (value === "false") {
    return false
  }
  return undefined
}

function privacySettingsFromSettings(settings: readonly Setting[]): PrivacySettings {
  return privacySettingsSchema.parse({
    warnBeforeLLM: privacySettingValue(settings, privacySettingKeys.warnBeforeLLM),
    warnBeforeExport: privacySettingValue(settings, privacySettingKeys.warnBeforeExport),
    warnBeforeBackup: privacySettingValue(settings, privacySettingKeys.warnBeforeBackup),
    enableLibraryScan: privacySettingValue(settings, privacySettingKeys.enableLibraryScan),
  })
}

export function createSettingsRepository(db: AppDatabase): SettingsRepository {
  return {
    getSetting(key) {
      if (!settingKeyIsPublic(key)) {
        return null
      }
      return db.select().from(schema.settings).where(eq(schema.settings.key, key)).get() ?? null
    },
    setSetting(key, value) {
      const updatedAt = createTimestamp()
      const publicKey = publicSettingKey(key)
      if (Object.hasOwn(defaultSettingSchemas, publicKey)) {
        defaultSettingSchemas[publicKey as keyof typeof defaultSettingSchemas].parse(
          publicKey === "default_project_id" && value === "" ? null : value,
        )
      }

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
      return db
        .select()
        .from(schema.settings)
        .orderBy(desc(schema.settings.updatedAt))
        .all()
        .filter((setting) => settingKeyIsPublic(setting.key))
    },
    getAppLockMetadata() {
      return (
        db
          .select({ value: schema.settings.value })
          .from(schema.settings)
          .where(eq(schema.settings.key, APP_LOCK_METADATA_SETTING_KEY))
          .get()?.value ?? null
      )
    },
    setAppLockMetadata(value) {
      const updatedAt = createTimestamp()
      db.insert(schema.settings)
        .values({ key: APP_LOCK_METADATA_SETTING_KEY, value, updatedAt })
        .onConflictDoUpdate({
          target: schema.settings.key,
          set: { value, updatedAt },
        })
        .run()
    },
    deleteAppLockMetadata() {
      db.delete(schema.settings).where(eq(schema.settings.key, APP_LOCK_METADATA_SETTING_KEY)).run()
    },
    getDefaults() {
      return defaultsFromSettings(db.select().from(schema.settings).all())
    },
    updateDefaults(input) {
      const parsed = updateDefaultsInputSchema.parse(input)
      return db.transaction(() => {
        if (parsed.defaultModel !== undefined) {
          this.setSetting("default_model", parsed.defaultModel)
        }

        if (parsed.defaultTargetAgent !== undefined) {
          this.setSetting("default_target_agent", parsed.defaultTargetAgent)
        }

        if (parsed.defaultProjectId !== undefined) {
          this.setSetting("default_project_id", parsed.defaultProjectId ?? "")
        }

        if (parsed.defaultScenario !== undefined) {
          this.setSetting("default_scenario", parsed.defaultScenario)
        }

        if (parsed.appTheme !== undefined) {
          this.setSetting("app_theme", parsed.appTheme)
        }

        if (parsed.compilerDefaultLanguage !== undefined) {
          this.setSetting("compiler_default_language", parsed.compilerDefaultLanguage)
        }

        return this.getDefaults()
      })
    },
    getPrivacySettings() {
      return privacySettingsFromSettings(db.select().from(schema.settings).all())
    },
    updatePrivacySettings(input) {
      if (input.warnBeforeLLM !== undefined) {
        this.setSetting(privacySettingKeys.warnBeforeLLM, String(input.warnBeforeLLM))
      }

      if (input.warnBeforeExport !== undefined) {
        this.setSetting(privacySettingKeys.warnBeforeExport, String(input.warnBeforeExport))
      }

      if (input.warnBeforeBackup !== undefined) {
        this.setSetting(privacySettingKeys.warnBeforeBackup, String(input.warnBeforeBackup))
      }

      if (input.enableLibraryScan !== undefined) {
        this.setSetting(privacySettingKeys.enableLibraryScan, String(input.enableLibraryScan))
      }

      return this.getPrivacySettings()
    },
  }
}
