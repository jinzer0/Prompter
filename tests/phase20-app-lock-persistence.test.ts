import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"

import { APP_LOCK_METADATA_SETTING_KEY } from "../electron/app-lock/app-lock-metadata.js"
import { createAppLockService } from "../electron/app-lock/app-lock-service.js"
import {
  cleanupBackupImportTestDatabases,
  createBackupImportTestDatabase,
} from "./phase16-backup-import-test-helpers.js"

afterEach(async () => {
  await cleanupBackupImportTestDatabases()
})

describe("Phase 20 private app-lock metadata persistence", () => {
  it("stores app-lock metadata privately in settings while generic settings APIs exclude it", async () => {
    // Given: a migrated database and synthetic scrypt metadata that contains no raw passphrase.
    const database = await createBackupImportTestDatabase()
    const metadata = JSON.stringify({
      version: 1,
      enabled: true,
      kdf: "scrypt",
      salt: "c2FsdC12YWx1ZQ==",
      hash: "aGFzaC12YWx1ZQ==",
      lockOnStart: false,
      timeoutMinutes: 15,
      requireForExport: true,
      requireForBackup: true,
      requireForLlm: true,
      createdAt: 1_000,
      updatedAt: 1_000,
    })

    // When: the private settings seam persists metadata.
    database.services.setAppLockMetadata(metadata)

    // Then: generic public setting reads cannot discover or mutate the reserved row.
    expect(database.services.getAppLockMetadata()).toBe(metadata)
    expect(database.services.getSetting(APP_LOCK_METADATA_SETTING_KEY)).toBeNull()
    expect(database.services.listSettings()).not.toContainEqual(
      expect.objectContaining({ key: APP_LOCK_METADATA_SETTING_KEY }),
    )
    expect(() => database.services.setSetting(APP_LOCK_METADATA_SETTING_KEY, metadata)).toThrow(
      "Private settings cannot be stored through public settings APIs",
    )
  })

  it("persists an actual app-lock verifier without storing the submitted passphrase", async () => {
    // Given: a real settings-backed metadata store and a setup passphrase.
    const database = await createBackupImportTestDatabase()
    const passphrase = "correct horse battery staple"
    const service = createAppLockService({ metadataStore: database.services })

    // When: the main-owned lock service enables app lock through its private persistence seam.
    await service.setup({ passphrase, confirmation: passphrase })

    // Then: no settings row serializes the submitted raw passphrase.
    const storedRows = z
      .array(z.object({ value: z.string() }))
      .parse(database.sqlite.prepare("select value from settings").all())
    expect(JSON.stringify(storedRows)).not.toContain(passphrase)
    expect(database.services.getAppLockMetadata()).not.toBeNull()
  })
})
