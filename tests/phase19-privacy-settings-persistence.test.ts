import { afterEach, describe, expect, it } from "vitest"

import {
  cleanupBackupImportTestDatabases,
  createBackupImportTestDatabase,
  reopenBackupImportTestDatabase,
} from "./phase16-backup-import-test-helpers.js"

afterEach(async () => {
  await cleanupBackupImportTestDatabases()
})

describe("Phase 19 privacy settings persistence", () => {
  it("persists each safe-default privacy preference without relaxing secret setting rules", async () => {
    // Given: a migrated database with no stored privacy preferences.
    const database = await createBackupImportTestDatabase()

    // When: all four preferences are explicitly changed and the database is reopened.
    expect(database.services.getPrivacySettings()).toEqual({
      warnBeforeLLM: true,
      warnBeforeExport: true,
      warnBeforeBackup: true,
      enableLibraryScan: true,
    })
    database.services.updatePrivacySettings({
      warnBeforeLLM: false,
      warnBeforeExport: false,
      warnBeforeBackup: false,
      enableLibraryScan: false,
    })
    const reopened = reopenBackupImportTestDatabase(database)

    // Then: the four exact public keys retain their independently persisted boolean values.
    expect(reopened.services.getPrivacySettings()).toEqual({
      warnBeforeLLM: false,
      warnBeforeExport: false,
      warnBeforeBackup: false,
      enableLibraryScan: false,
    })
    expect(reopened.services.getSetting("privacy_warn_before_llm")?.value).toBe("false")
    expect(reopened.services.getSetting("privacy_warn_before_export")?.value).toBe("false")
    expect(reopened.services.getSetting("privacy_warn_before_backup")?.value).toBe("false")
    expect(reopened.services.getSetting("privacy_enable_library_scan")?.value).toBe("false")
    expect(() => reopened.services.setSetting("openai_api_key", "sk-not-allowed")).toThrow(
      "Secrets cannot be stored in settings",
    )
  })
})
