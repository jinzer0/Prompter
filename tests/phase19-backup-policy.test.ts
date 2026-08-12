import { readFile } from "node:fs/promises"

import { afterEach, describe, expect, it } from "vitest"

import {
  BackupExportPrivacyConfirmationRequiredError,
  createBackupExportService,
} from "../electron/backup/backup-export-service.js"
import { createBackupExportSessionStore } from "../electron/backup/backup-export-session-store.js"
import { createPrivacyConfirmationSessionStore } from "../electron/privacy/privacy-confirmation-session-store.js"
import {
  cleanupBackupTestResources,
  createBackupImportTestDatabase,
  createFakeBackupNative,
} from "./phase16-backup-test-helpers.js"

const policyCases = [
  {
    name: "critical findings when warnings are disabled",
    originalInput: "-----BEGIN OPENSSH PRIVATE KEY-----",
    warnBeforeBackup: false,
    requiresConfirmation: true,
  },
  {
    name: "high findings when warnings are disabled",
    originalInput: "sk-proj-abcdefghijklmnopqrstuvwx",
    warnBeforeBackup: false,
    requiresConfirmation: true,
  },
  {
    name: "medium findings when warnings are enabled",
    originalInput: "+14155552671",
    warnBeforeBackup: true,
    requiresConfirmation: true,
  },
  {
    name: "low findings when warnings are enabled",
    originalInput: "person@example.test",
    warnBeforeBackup: true,
    requiresConfirmation: true,
  },
  {
    name: "low findings when warnings are disabled",
    originalInput: "person@example.test",
    warnBeforeBackup: false,
    requiresConfirmation: false,
  },
  {
    name: "no findings",
    originalInput: "ordinary backup content",
    warnBeforeBackup: true,
    requiresConfirmation: false,
  },
] as const

afterEach(async () => {
  await cleanupBackupTestResources()
})

describe("Phase 19 backup privacy policy", () => {
  it.each(policyCases)("applies $name to plaintext and encrypted saves", async (policyCase) => {
    // Given: one library with a value at the policy boundary and a cancelled native save dialog.
    const database = await createBackupImportTestDatabase()
    database.services.createPromptWithInitialVersion({
      projectId: null,
      title: "Policy backup prompt",
      scenario: "feature",
      targetAgent: "codex",
      originalInput: policyCase.originalInput,
      compiledPrompt: "safe",
    })
    const service = createBackupExportService({
      db: database.db,
      native: createFakeBackupNative().native,
      exportSessions: createBackupExportSessionStore(),
      privacyConfirmationSessions: createPrivacyConfirmationSessionStore(),
      getWarnBeforeBackup: () => policyCase.warnBeforeBackup,
    })

    try {
      // When: the same trusted envelope is requested through plaintext and prepared encrypted saves.
      const plaintext = service.exportFullBackup({})
      const prepared = service.prepareEncryptedBackup({ backupType: "full" })
      const encrypted = service.savePreparedEncryptedBackup({
        preparedBackupSessionId: prepared.preparedBackupSessionId,
        passphrase: "transient passphrase",
      })

      // Then: high risk cannot be bypassed, optional warnings gate only when enabled, and safe saves proceed.
      if (policyCase.requiresConfirmation) {
        await expect(plaintext).rejects.toBeInstanceOf(BackupExportPrivacyConfirmationRequiredError)
        await expect(encrypted).rejects.toBeInstanceOf(BackupExportPrivacyConfirmationRequiredError)
      } else {
        await expect(plaintext).resolves.toMatchObject({ cancelled: true, backupType: "full" })
        await expect(encrypted).resolves.toEqual({
          cancelled: true,
          backupType: "full",
          message: "Encrypted backup export cancelled",
        })
      }
    } finally {
      database.close()
    }
  })

  it("reads the warning setting for each backup authorization while high risk remains mandatory", async () => {
    // Given: a low-risk backup and a settings getter that changes after the first action.
    const database = await createBackupImportTestDatabase()
    let warnBeforeBackup = true
    database.services.createPromptWithInitialVersion({
      projectId: null,
      title: "Dynamic policy backup prompt",
      scenario: "feature",
      targetAgent: "codex",
      originalInput: "person@example.test",
      compiledPrompt: "safe",
    })
    const service = createBackupExportService({
      db: database.db,
      native: createFakeBackupNative().native,
      exportSessions: createBackupExportSessionStore(),
      privacyConfirmationSessions: createPrivacyConfirmationSessionStore(),
      getWarnBeforeBackup: () => warnBeforeBackup,
    })

    try {
      // When: settings are disabled after an initial gated plaintext action.
      await expect(service.exportFullBackup({})).rejects.toBeInstanceOf(
        BackupExportPrivacyConfirmationRequiredError,
      )
      warnBeforeBackup = false
      const prepared = service.prepareEncryptedBackup({ backupType: "full" })

      // Then: the later low-risk encrypted save proceeds without confirmation.
      await expect(
        service.savePreparedEncryptedBackup({
          preparedBackupSessionId: prepared.preparedBackupSessionId,
          passphrase: "transient passphrase",
        }),
      ).resolves.toMatchObject({ cancelled: true, backupType: "full" })
    } finally {
      database.close()
    }
  })

  it("blocks incomplete plaintext and encrypted scans before native save confirmation", async () => {
    // Given: a clean oversized backup field and a native boundary that records save attempts.
    const database = await createBackupImportTestDatabase()
    database.services.createPromptWithInitialVersion({
      projectId: null,
      title: "Oversized policy prompt",
      scenario: "feature",
      targetAgent: "codex",
      originalInput: "x".repeat(1_000_001),
      compiledPrompt: "safe",
    })
    const native = createFakeBackupNative()
    const service = createBackupExportService({
      db: database.db,
      native: native.native,
      exportSessions: createBackupExportSessionStore(),
      privacyConfirmationSessions: createPrivacyConfirmationSessionStore(),
      getWarnBeforeBackup: () => false,
    })

    try {
      // When: plaintext and encrypted saves reach their privacy checks without confirmation.
      const plaintext = service.exportFullBackup({})
      const prepared = service.prepareEncryptedBackup({ backupType: "full" })
      const encrypted = service.savePreparedEncryptedBackup({
        preparedBackupSessionId: prepared.preparedBackupSessionId,
        passphrase: "transient passphrase",
      })

      // Then: both incomplete scans are gated before either native save seam is invoked.
      await expect(plaintext).rejects.toBeInstanceOf(BackupExportPrivacyConfirmationRequiredError)
      await expect(encrypted).rejects.toBeInstanceOf(BackupExportPrivacyConfirmationRequiredError)
      expect(native.calls).toMatchObject({ showSaveDialog: 0, writeFile: 0 })
    } finally {
      database.close()
    }
  })

  it("keeps JSON and encrypted backup extensions reachable from the main-process open dialog", async () => {
    // Given: the main-process native backup composition.
    const mainSource = await readFile("electron/main.ts", "utf8")

    // When: the open-dialog filter is inspected.
    // Then: legacy JSON and encrypted backups are selectable.
    expect(mainSource).toContain('extensions: ["json", "enc"]')
  })
})
