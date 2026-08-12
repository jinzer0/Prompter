import { describe, expect, it } from "vitest"

import { createBackupExportSessionStore } from "../electron/backup/backup-export-session-store.js"
import { createBackupNativeService } from "../electron/backup/backup-native-service.js"
import { createBackupSecureExportService } from "../electron/backup/backup-secure-export-service.js"
import { createEncryptedBackupCrypto } from "../electron/backup/encrypted-backup-crypto.js"
import { backupEnvelopeSchema } from "../electron/ipc-contract.js"
import { createPromptExportNativeService } from "../electron/prompt-export-native.js"

type Deferred<TValue> = {
  readonly promise: Promise<TValue>
  readonly resolve: (value: TValue) => void
}

function createRevisionGuard() {
  let locked = false
  let revision = 0

  return {
    lockThenUnlock() {
      locked = true
      revision += 1
      locked = false
      revision += 1
    },
    guard: {
      capture: () => {
        if (locked) throw new Error("Prompter is locked")
        return { revision }
      },
      check: (epoch: { readonly revision: number }) => {
        if (locked || revision !== epoch.revision) throw new Error("Prompter is locked")
      },
    },
  }
}

function createDeferred<TValue>(): Deferred<TValue> {
  let resolvePromise: ((value: TValue) => void) | null = null
  const promise = new Promise<TValue>((resolve) => {
    resolvePromise = resolve
  })
  return {
    promise,
    resolve(value) {
      if (resolvePromise === null) throw new TypeError("Expected deferred resolver")
      resolvePromise(value)
    },
  }
}

describe("Phase 20 lock native side-effect boundaries", () => {
  it("does not write a prompt after locking during the native save dialog", async () => {
    // Given: a pending native dialog and a guard that transitions to locked before it resolves.
    const dialog = createDeferred<{ readonly canceled: false; readonly filePath: string }>()
    const appLock = createRevisionGuard()
    let writes = 0
    const service = createPromptExportNativeService({
      showSaveDialog: () => dialog.promise,
      writeFile: async () => {
        writes += 1
      },
      copyText: () => undefined,
      readText: () => "",
      privacyGuard: { assertAuthorized: () => undefined },
      appLockGuard: appLock.guard,
    })

    // When: a lock and unlock occur while the dialog is pending.
    const saving = service.savePromptToFile({ content: "sensitive", format: "markdown" })
    appLock.lockThenUnlock()
    dialog.resolve({ canceled: false, filePath: "/tmp/prompt.md" })

    // Then: the await checkpoint rejects before the filesystem effect.
    await expect(saving).rejects.toThrow("Prompter is locked")
    expect(writes).toBe(0)
  })

  it("does not write a backup after locking during the native save dialog", async () => {
    // Given: a pending backup dialog and a guard that locks before its result is used.
    const dialog = createDeferred<{ readonly canceled: false; readonly filePath: string }>()
    const appLock = createRevisionGuard()
    let writes = 0
    const native = createBackupNativeService(
      {
        showSaveDialog: () => dialog.promise,
        showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
        readFile: async () => "",
        getFileSize: async () => 0,
        writeFile: async () => {
          writes += 1
        },
        now: () => 1,
        createId: () => "id",
        hashText: () => "hash",
      },
      appLock.guard,
    )

    // When: a lock and unlock transition wins the race against dialog completion.
    const saving = native.saveBackup({ content: "sensitive", defaultFilename: "backup.json" })
    appLock.lockThenUnlock()
    dialog.resolve({ canceled: false, filePath: "/tmp/backup.json" })

    // Then: the native boundary prevents the write.
    await expect(saving).rejects.toThrow("Prompter is locked")
    expect(writes).toBe(0)
  })

  it("does not write or consume an encrypted export session after locking during encryption", async () => {
    const encryption =
      createDeferred<
        Awaited<ReturnType<ReturnType<typeof createEncryptedBackupCrypto>["encryptBackupEnvelope"]>>
      >()
    const appLock = createRevisionGuard()
    const sessions = createBackupExportSessionStore({
      createId: () => "00000000-0000-4000-8000-000000000020",
    })
    let writes = 0
    const native = createBackupNativeService(
      {
        showSaveDialog: async () => ({ canceled: false, filePath: "/tmp/backup.enc" }),
        showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
        readFile: async () => "",
        getFileSize: async () => 0,
        writeFile: async () => {
          writes += 1
        },
        now: () => 1,
        createId: () => "id",
        hashText: () => "hash",
      },
      appLock.guard,
    )
    const crypto = createEncryptedBackupCrypto()
    const backup = backupEnvelopeSchema.parse({
      schemaVersion: 1,
      appName: "Prompter",
      backupType: "full",
      exportedAt: 1,
      metadata: {
        itemCounts: {
          projects: 0,
          promptAssets: 0,
          promptVersions: 0,
          tags: 0,
          promptTags: 0,
          harnessTemplates: 0,
          projectContextProfiles: 0,
          promptTemplates: 0,
          promptQualityReviews: 0,
        },
        sourceSummary: "backup",
        excludesSecrets: true,
        excludesSecretStatus: true,
        includesSettings: false,
        plaintext: true,
        schemaVersion: 1,
      },
      data: {
        projects: [],
        promptAssets: [],
        promptVersions: [],
        tags: [],
        promptTags: [],
        harnessTemplates: [],
        projectContextProfiles: [],
        promptTemplates: [],
        promptQualityReviews: [],
      },
    })
    const service = createBackupSecureExportService({
      native,
      plaintextFilenames: {
        full: "backup.json",
        project: "project.json",
        prompt_assets: "prompts.json",
        prompt_templates: "templates.json",
        harness_templates: "harness.json",
      },
      exportSessions: sessions,
      crypto: { ...crypto, encryptBackupEnvelope: () => encryption.promise },
      getWarnBeforeBackup: () => false,
      appLockGuard: appLock.guard,
    })
    const session = sessions.createBackupExportSession({ backupEnvelope: backup })
    const saving = service.savePreparedEncryptedBackup({
      preparedBackupSessionId: session.id,
      passphrase: "correct passphrase",
    })
    appLock.lockThenUnlock()
    encryption.resolve(
      await crypto.encryptBackupEnvelope({
        backupEnvelope: backup,
        passphrase: "correct passphrase",
      }),
    )

    await expect(saving).rejects.toThrow("Prompter is locked")
    expect(writes).toBe(0)
    expect(sessions.requireReadyBackupExportSession(session.id).status).toBe("ready")
  })
})
