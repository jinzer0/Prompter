import { afterEach, describe, expect, it, vi } from "vitest"

import {
  type AppearanceNativeTheme,
  createAppearanceService,
} from "../electron/appearance-service.js"
import { createSettingsRepository } from "../electron/db/repositories/settings.js"
import { appThemeSchema, settingsDefaultsSchema } from "../electron/ipc-contract.js"
import type {
  AppearanceState,
  SettingsDefaults,
  UpdateDefaultsInput,
} from "../electron/ipc-types.js"
import {
  cleanupBackupImportTestDatabases,
  createBackupImportTestDatabase,
  reopenBackupImportTestDatabase,
} from "./phase16-backup-import-test-helpers.js"

class FakeNativeTheme implements AppearanceNativeTheme {
  private source: AppearanceState["preference"] = "system"
  readonly listeners = new Set<() => void>()

  constructor(private systemDark: boolean) {}

  get themeSource(): AppearanceState["preference"] {
    return this.source
  }

  set themeSource(value: AppearanceState["preference"]) {
    this.source = value
    this.emitUpdated()
  }

  get shouldUseDarkColors(): boolean {
    return this.source === "system" ? this.systemDark : this.source === "dark"
  }

  on(_event: "updated", listener: () => void): void {
    this.listeners.add(listener)
  }

  removeListener(_event: "updated", listener: () => void): void {
    this.listeners.delete(listener)
  }

  setSystemDark(value: boolean): void {
    this.systemDark = value
    this.emitUpdated()
  }

  emitUpdated(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

function createSettings(appTheme: SettingsDefaults["appTheme"] = "system") {
  let defaults: SettingsDefaults = {
    defaultModel: "gpt-4.1",
    defaultTargetAgent: "codex",
    defaultProjectId: null,
    defaultScenario: "feature",
    appTheme,
    compilerDefaultLanguage: "ko",
  }
  return {
    getDefaults: vi.fn(() => ({ ...defaults })),
    updateDefaults: vi.fn((input: UpdateDefaultsInput) => {
      defaults = settingsDefaultsSchema.parse({ ...defaults, ...input })
      return { ...defaults }
    }),
    setSetting: vi.fn((key: string, value: string) => {
      if (key === "app_theme") {
        defaults = { ...defaults, appTheme: appThemeSchema.parse(value) }
      }
      return { key, value, updatedAt: 1 }
    }),
  }
}

afterEach(async () => {
  await cleanupBackupImportTestDatabases()
})

describe("appearance service", () => {
  it.each([
    ["system", false, "light"],
    ["system", true, "dark"],
    ["light", true, "light"],
    ["dark", false, "dark"],
  ] as const)("loads persisted %s with system dark=%s", (preference, systemDark, effectiveTheme) => {
    const nativeTheme = new FakeNativeTheme(systemDark)
    const settings = createSettings(preference)
    const service = createAppearanceService({ nativeTheme, settings })

    expect(nativeTheme.themeSource).toBe(preference)
    expect(service.getState()).toEqual({ preference, effectiveTheme })
    expect(settings.setSetting).not.toHaveBeenCalled()
    expect(settings.updateDefaults).not.toHaveBeenCalled()
    service.dispose()
  })

  it("notifies only changed effective system state, without persisting OS changes", () => {
    const nativeTheme = new FakeNativeTheme(false)
    const settings = createSettings()
    const service = createAppearanceService({ nativeTheme, settings })
    const changed = vi.fn()
    service.subscribe(changed)

    nativeTheme.emitUpdated()
    nativeTheme.setSystemDark(true)
    nativeTheme.setSystemDark(true)
    nativeTheme.setSystemDark(false)

    expect(changed.mock.calls).toEqual([
      [{ preference: "system", effectiveTheme: "dark" }],
      [{ preference: "system", effectiveTheme: "light" }],
    ])
    expect(settings.setSetting).not.toHaveBeenCalled()
    expect(settings.updateDefaults).not.toHaveBeenCalled()
    service.dispose()
  })

  it.each(["light", "dark"] as const)("keeps explicit %s fixed across OS updates", (preference) => {
    const nativeTheme = new FakeNativeTheme(false)
    const service = createAppearanceService({ nativeTheme, settings: createSettings(preference) })
    const changed = vi.fn()
    service.subscribe(changed)

    nativeTheme.setSystemDark(true)
    nativeTheme.setSystemDark(false)

    expect(service.getState()).toEqual({ preference, effectiveTheme: preference })
    expect(changed).not.toHaveBeenCalled()
    service.dispose()
  })

  it("persists both write paths before applying and emits once for synchronous native events", () => {
    const nativeTheme = new FakeNativeTheme(false)
    const settings = createSettings()
    const service = createAppearanceService({ nativeTheme, settings })
    const changed = vi.fn()
    service.subscribe(changed)
    settings.updateDefaults.mockImplementationOnce((input) => {
      expect(nativeTheme.themeSource).toBe("system")
      expect(service.getState()).toEqual({ preference: "system", effectiveTheme: "light" })
      return settingsDefaultsSchema.parse({ ...settings.getDefaults(), ...input })
    })

    expect(
      service.updateDefaults({ appTheme: "dark", defaultModel: "gpt-4.1-mini" }),
    ).toMatchObject({
      appTheme: "dark",
      defaultModel: "gpt-4.1-mini",
    })
    settings.setSetting.mockImplementationOnce((key, value) => {
      expect(nativeTheme.themeSource).toBe("dark")
      return { key, value, updatedAt: 2 }
    })
    expect(service.setSetting("app_theme", "light")).toEqual({
      key: "app_theme",
      value: "light",
      updatedAt: 2,
    })
    service.setSetting("app_theme", "system")
    service.setSetting("unrelated_preference", "value")
    service.updateDefaults({ defaultModel: "gpt-4.1-mini" })
    nativeTheme.emitUpdated()

    expect(changed.mock.calls).toEqual([
      [{ preference: "dark", effectiveTheme: "dark" }],
      [{ preference: "light", effectiveTheme: "light" }],
      [{ preference: "system", effectiveTheme: "light" }],
    ])
    expect(settings.updateDefaults).toHaveBeenCalledWith({
      appTheme: "dark",
      defaultModel: "gpt-4.1-mini",
    })
    expect(settings.setSetting).toHaveBeenCalledWith("app_theme", "light")
    service.dispose()
  })

  it("retains persisted preferences across service recreation", () => {
    const settings = createSettings()
    const first = createAppearanceService({ nativeTheme: new FakeNativeTheme(false), settings })
    first.updateDefaults({ appTheme: "dark" })
    first.dispose()
    const second = createAppearanceService({ nativeTheme: new FakeNativeTheme(false), settings })
    expect(second.getState()).toEqual({ preference: "dark", effectiveTheme: "dark" })
    second.setSetting("app_theme", "light")
    second.dispose()
    const third = createAppearanceService({ nativeTheme: new FakeNativeTheme(true), settings })
    expect(third.getState()).toEqual({ preference: "light", effectiveTheme: "light" })
    third.dispose()
  })

  it("removes subscribers and the native listener on cleanup", () => {
    const nativeTheme = new FakeNativeTheme(false)
    const service = createAppearanceService({ nativeTheme, settings: createSettings() })
    const removed = vi.fn()
    const active = vi.fn()
    const unsubscribe = service.subscribe(removed)
    service.subscribe(active)
    expect(nativeTheme.listeners.size).toBe(1)
    unsubscribe()
    unsubscribe()
    nativeTheme.setSystemDark(true)
    expect(removed).not.toHaveBeenCalled()
    expect(active).toHaveBeenCalledTimes(1)

    service.dispose()
    service.dispose()
    expect(nativeTheme.listeners.size).toBe(0)
    const lateSubscriber = vi.fn()
    service.subscribe(lateSubscriber)()
    nativeTheme.setSystemDark(false)
    expect(active).toHaveBeenCalledTimes(1)
    expect(lateSubscriber).not.toHaveBeenCalled()
  })

  it("does not expose mutable internal state to readers or subscribers", () => {
    const nativeTheme = new FakeNativeTheme(false)
    const service = createAppearanceService({ nativeTheme, settings: createSettings() })
    const snapshot = service.getState()
    snapshot.preference = "dark"
    const changed = vi.fn()
    service.subscribe((state) => {
      state.effectiveTheme = "light"
    })
    service.subscribe(changed)
    nativeTheme.setSystemDark(true)
    expect(service.getState()).toEqual({ preference: "system", effectiveTheme: "dark" })
    expect(changed).toHaveBeenCalledWith({ preference: "system", effectiveTheme: "dark" })
    service.dispose()
  })

  it("leaves actual state and notifications unchanged when either write fails", () => {
    const nativeTheme = new FakeNativeTheme(false)
    const settings = createSettings()
    const service = createAppearanceService({ nativeTheme, settings })
    const changed = vi.fn()
    service.subscribe(changed)
    settings.updateDefaults.mockImplementationOnce(() => {
      throw new Error("defaults write failed")
    })
    settings.setSetting.mockImplementationOnce(() => {
      throw new Error("setting write failed")
    })

    expect(() => service.updateDefaults({ appTheme: "dark" })).toThrow("defaults write failed")
    expect(() => service.setSetting("app_theme", "dark")).toThrow("setting write failed")
    nativeTheme.emitUpdated()
    expect(nativeTheme.themeSource).toBe("system")
    expect(nativeTheme.shouldUseDarkColors).toBe(false)
    expect(settings.getDefaults().appTheme).toBe("system")
    expect(service.getState()).toEqual({ preference: "system", effectiveTheme: "light" })
    expect(changed).not.toHaveBeenCalled()
    service.dispose()
  })

  it("rejects invalid inputs before calling persistence or mutating native state", () => {
    const nativeTheme = new FakeNativeTheme(false)
    const settings = createSettings()
    const service = createAppearanceService({ nativeTheme, settings })
    const changed = vi.fn()
    service.subscribe(changed)
    const invalidInputs: unknown[] = [
      {},
      { appTheme: "sepia" },
      { appTheme: "dark", defaultModel: " " },
    ]
    for (const input of invalidInputs) {
      expect(() => service.updateDefaults(input as UpdateDefaultsInput)).toThrow()
    }
    expect(() => service.setSetting("app_theme", "sepia")).toThrow()
    expect(() => service.setSetting("openai_api_key", "not-a-secret")).toThrow()
    expect(() => service.setSetting("", "dark")).toThrow()
    expect(settings.updateDefaults).not.toHaveBeenCalled()
    expect(settings.setSetting).not.toHaveBeenCalled()
    expect(nativeTheme.themeSource).toBe("system")
    expect(service.getState()).toEqual({ preference: "system", effectiveTheme: "light" })
    expect(changed).not.toHaveBeenCalled()
    service.dispose()
  })
})

describe("appearance settings persistence", () => {
  it.each([
    ["default_model", " ", "defaultModel", "gpt-4.1"],
    ["default_target_agent", "invalid-agent", "defaultTargetAgent", "codex"],
    ["default_project_id", "not-a-uuid", "defaultProjectId", null],
    ["default_scenario", "invalid-scenario", "defaultScenario", "feature"],
    ["app_theme", "sepia", "appTheme", "system"],
    ["compiler_default_language", " ", "compilerDefaultLanguage", "ko"],
  ] as const)("recovers malformed %s without changing stored rows", async (key, value, field, fallback) => {
    const database = await createBackupImportTestDatabase()
    const settings = createSettingsRepository(database.db)
    const validDefaults: SettingsDefaults = {
      defaultModel: "gpt-4.1-mini",
      defaultTargetAgent: "claude_code",
      defaultProjectId: "b5bc220f-2d58-4b79-837b-104963b2a67c",
      defaultScenario: "bugfix",
      appTheme: "dark",
      compilerDefaultLanguage: "en",
    }
    const persistedDefaults = [
      ["default_model", validDefaults.defaultModel],
      ["default_target_agent", validDefaults.defaultTargetAgent],
      ["default_project_id", validDefaults.defaultProjectId],
      ["default_scenario", validDefaults.defaultScenario],
      ["app_theme", validDefaults.appTheme],
      ["compiler_default_language", validDefaults.compilerDefaultLanguage],
    ] as const
    const insert = database.sqlite.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
    )
    for (const [persistedKey, persistedValue] of persistedDefaults) {
      insert.run(persistedKey, persistedKey === key ? value : persistedValue, 1)
    }
    const rowsBefore = database.sqlite.prepare("SELECT * FROM settings ORDER BY key").all()
    const nativeTheme = new FakeNativeTheme(false)
    const service = createAppearanceService({ nativeTheme, settings })

    expect(settings.getDefaults()).toEqual({ ...validDefaults, [field]: fallback })
    const preference = field === "appTheme" ? "system" : "dark"
    expect(nativeTheme.themeSource).toBe(preference)
    expect(service.getState()).toEqual({
      preference,
      effectiveTheme: preference === "system" ? "light" : "dark",
    })
    expect(database.sqlite.prepare("SELECT * FROM settings ORDER BY key").all()).toEqual(rowsBefore)
    service.dispose()
  })

  it.each([
    ["default_model", "gpt-4.1-mini", " "],
    ["default_target_agent", "claude_code", "invalid-agent"],
    ["default_project_id", "b5bc220f-2d58-4b79-837b-104963b2a67c", "not-a-uuid"],
    ["default_scenario", "bugfix", "invalid-scenario"],
    ["app_theme", "dark", "sepia"],
    ["compiler_default_language", "en", " "],
  ] as const)("rejects invalid public %s writes without writing", async (key, valid, invalid) => {
    const database = await createBackupImportTestDatabase()
    const settings = createSettingsRepository(database.db)
    const rowsBefore = database.sqlite.prepare("SELECT * FROM settings ORDER BY key").all()

    expect(() => settings.setSetting(key, invalid)).toThrow()
    expect(database.sqlite.prepare("SELECT * FROM settings ORDER BY key").all()).toEqual(rowsBefore)
    settings.setSetting(key, valid)
    const saved = settings.getSetting(key)
    expect(() => settings.setSetting(key, invalid)).toThrow()
    expect(settings.getSetting(key)).toEqual(saved)
  })

  it("clears the nullable project default with the public empty-string representation", async () => {
    const database = await createBackupImportTestDatabase()
    const settings = createSettingsRepository(database.db)
    settings.setSetting("default_project_id", "b5bc220f-2d58-4b79-837b-104963b2a67c")
    settings.setSetting("default_project_id", "")

    expect(settings.getDefaults().defaultProjectId).toBeNull()
    expect(settings.getSetting("default_project_id")?.value).toBe("")
    settings.updateDefaults({ defaultProjectId: "b5bc220f-2d58-4b79-837b-104963b2a67c" })
    expect(settings.updateDefaults({ defaultProjectId: null }).defaultProjectId).toBeNull()
    expect(settings.getSetting("default_project_id")?.value).toBe("")
  })

  it("propagates database read failures during appearance startup", async () => {
    const database = await createBackupImportTestDatabase()
    const settings = createSettingsRepository(database.db)
    const nativeTheme = new FakeNativeTheme(false)
    database.sqlite.exec("DROP TABLE settings")

    expect(() => settings.getDefaults()).toThrow("no such table: settings")
    expect(() => createAppearanceService({ nativeTheme, settings })).toThrow(
      "no such table: settings",
    )
    expect(nativeTheme.listeners.size).toBe(0)
  })

  it("persists both preference write paths across database reopen", async () => {
    const database = await createBackupImportTestDatabase()
    const first = createAppearanceService({
      nativeTheme: new FakeNativeTheme(false),
      settings: createSettingsRepository(database.db),
    })
    first.updateDefaults({ appTheme: "dark" })
    first.dispose()
    const reopened = reopenBackupImportTestDatabase(database)
    const second = createAppearanceService({
      nativeTheme: new FakeNativeTheme(false),
      settings: createSettingsRepository(reopened.db),
    })
    expect(second.getState()).toEqual({ preference: "dark", effectiveTheme: "dark" })
    second.setSetting("app_theme", "light")
    second.dispose()
    const reopenedAgain = reopenBackupImportTestDatabase(reopened)
    const third = createAppearanceService({
      nativeTheme: new FakeNativeTheme(true),
      settings: createSettingsRepository(reopenedAgain.db),
    })
    expect(third.getState()).toEqual({ preference: "light", effectiveTheme: "light" })
    third.dispose()
  })

  it("rolls back all defaults when a write after app_theme fails", async () => {
    const database = await createBackupImportTestDatabase()
    const settings = createSettingsRepository(database.db)
    settings.updateDefaults({ appTheme: "light", compilerDefaultLanguage: "ko" })
    const before = settings.getDefaults()
    const nativeTheme = new FakeNativeTheme(false)
    const service = createAppearanceService({ nativeTheme, settings })
    const changed = vi.fn()
    service.subscribe(changed)
    database.sqlite.exec(`
      CREATE TRIGGER fail_compiler_language BEFORE INSERT ON settings
      WHEN NEW.key = 'compiler_default_language'
      BEGIN SELECT RAISE(ABORT, 'language write failed'); END;
    `)

    expect(() =>
      service.updateDefaults({
        defaultModel: "gpt-4.1-mini",
        appTheme: "dark",
        compilerDefaultLanguage: "en",
      }),
    ).toThrow("language write failed")
    expect(settings.getDefaults()).toEqual(before)
    expect(settings.getSetting("app_theme")?.value).toBe("light")
    expect(settings.getSetting("default_model")).toBeNull()
    expect(nativeTheme.themeSource).toBe("light")
    expect(service.getState()).toEqual({ preference: "light", effectiveTheme: "light" })
    expect(changed).not.toHaveBeenCalled()
    service.dispose()
    const reopened = reopenBackupImportTestDatabase(database)
    expect(reopened.services.getDefaults()).toEqual(before)
  })

  it("rolls back the preference if reading the saved defaults fails", async () => {
    const database = await createBackupImportTestDatabase()
    const settings = createSettingsRepository(database.db)
    settings.setSetting("app_theme", "light")
    const nativeTheme = new FakeNativeTheme(false)
    const service = createAppearanceService({ nativeTheme, settings })
    const changed = vi.fn()
    service.subscribe(changed)
    vi.spyOn(settings, "getDefaults").mockImplementationOnce(() => {
      throw new Error("defaults read failed")
    })

    expect(() => service.updateDefaults({ appTheme: "dark" })).toThrow("defaults read failed")
    expect(settings.getSetting("app_theme")?.value).toBe("light")
    expect(nativeTheme.themeSource).toBe("light")
    expect(service.getState()).toEqual({ preference: "light", effectiveTheme: "light" })
    expect(changed).not.toHaveBeenCalled()
    service.dispose()
  })

  it("rejects invalid public app_theme writes without poisoning subsequent startup", async () => {
    const database = await createBackupImportTestDatabase()
    const settings = createSettingsRepository(database.db)
    settings.setSetting("app_theme", "dark")
    expect(() => settings.setSetting("app_theme", "sepia")).toThrow()
    expect(() => settings.updateDefaults({ appTheme: "light", defaultModel: " " })).toThrow()
    expect(settings.getSetting("app_theme")?.value).toBe("dark")
    const reopened = reopenBackupImportTestDatabase(database)
    const service = createAppearanceService({
      nativeTheme: new FakeNativeTheme(false),
      settings: createSettingsRepository(reopened.db),
    })
    expect(service.getState()).toEqual({ preference: "dark", effectiveTheme: "dark" })
    service.dispose()
  })
})
