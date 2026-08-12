import { describe, expect, it } from "vitest"

import {
  type AppLockMetadataStore,
  AppLockSetupUnavailableError,
  createAppLockService,
} from "../electron/app-lock/app-lock-service.js"
import { createAppLockSessionRevoker } from "../electron/app-lock/app-lock-session-revoker.js"

function createMetadataStore(initialValue: string | null = null): AppLockMetadataStore & {
  readonly storedValue: () => string | null
} {
  let value = initialValue

  return {
    getAppLockMetadata: () => value,
    setAppLockMetadata: (nextValue) => {
      value = nextValue
    },
    deleteAppLockMetadata: () => {
      value = null
    },
    storedValue: () => value,
  }
}

function createService(store: AppLockMetadataStore, revoked: string[] = []) {
  return createAppLockService({
    metadataStore: store,
    now: () => 10_000,
    revokeSensitiveSessions: () => {
      revoked.push("sessions")
    },
  })
}

describe("Phase 20 app lock service", () => {
  it("sets a verifier without persisting the raw passphrase and leaves setup unlocked", async () => {
    // Given: an app with no existing lock metadata.
    const store = createMetadataStore()
    const service = createService(store)
    const passphrase = "correct horse battery staple"

    // When: the main-owned service enables the lock.
    const state = await service.setup({
      passphrase,
      confirmation: passphrase,
      lockOnStart: false,
      timeoutMinutes: 20,
      requireForExport: true,
      requireForBackup: true,
      requireForLlm: true,
    })

    // Then: only scrypt metadata is persisted and this active session remains unlocked.
    expect(state).toEqual({
      enabled: true,
      locked: false,
      lockOnStart: false,
      timeoutMinutes: 20,
      lastUnlockedAt: 10_000,
    })
    expect(store.storedValue()).not.toContain(passphrase)
    expect(store.storedValue()).toContain('"kdf":"scrypt"')
  })

  it("locks, revokes prepared work, and unlocks only for the current passphrase", async () => {
    // Given: an enabled app lock and a revocation sink for sensitive prepared sessions.
    const revoked: string[] = []
    const store = createMetadataStore()
    const service = createService(store, revoked)
    const passphrase = "correct horse battery staple"
    await service.setup({ passphrase, confirmation: passphrase })

    // When: the active session locks, rejects a wrong passphrase, then receives the correct one.
    const lockedState = service.lock()
    const wrongPassphrase = await service.unlock({ passphrase: "wrong passphrase value" })
    const correctPassphrase = await service.unlock({ passphrase })

    // Then: lock state is authoritative in memory and only the valid unlock restores it.
    expect(lockedState.locked).toBe(true)
    expect(revoked).toEqual(["sessions"])
    expect(wrongPassphrase).toBe(false)
    expect(correctPassphrase).toBe(true)
    expect(service.getState().locked).toBe(false)
  })

  it("requires the current passphrase to change or disable the lock", async () => {
    // Given: an enabled app lock with one current passphrase.
    const store = createMetadataStore()
    const service = createService(store)
    const currentPassphrase = "correct horse battery staple"
    const nextPassphrase = "another secure passphrase"
    await service.setup({ passphrase: currentPassphrase, confirmation: currentPassphrase })

    // When: callers attempt passphrase change and disable with both invalid and valid credentials.
    const failedChange = await service.changePassphrase({
      currentPassphrase: "wrong passphrase value",
      newPassphrase: nextPassphrase,
      confirmation: nextPassphrase,
    })
    const changed = await service.changePassphrase({
      currentPassphrase,
      newPassphrase: nextPassphrase,
      confirmation: nextPassphrase,
    })
    service.lock()
    const oldUnlock = await service.unlock({ passphrase: currentPassphrase })
    const newUnlock = await service.unlock({ passphrase: nextPassphrase })
    const failedDisable = await service.disable({ passphrase: currentPassphrase })
    const disabled = await service.disable({ passphrase: nextPassphrase })

    // Then: old credentials never retain authority and disabling deletes private metadata.
    expect(failedChange).toBe(false)
    expect(changed).toBe(true)
    expect(oldUnlock).toBe(false)
    expect(newUnlock).toBe(true)
    expect(failedDisable).toBe(false)
    expect(disabled).toBe(true)
    expect(store.storedValue()).toBeNull()
    expect(service.getState()).toMatchObject({ enabled: false, locked: false })
  })

  it("honors lock-on-start and fails closed when private metadata is corrupt", async () => {
    // Given: a persisted lock whose startup policy requires locking.
    const store = createMetadataStore()
    const configured = createService(store)
    const passphrase = "correct horse battery staple"
    await configured.setup({
      passphrase,
      confirmation: passphrase,
      lockOnStart: true,
    })

    // When: a new main-process session starts from valid then malformed persistence.
    const restarted = createService(store)
    const corrupt = createService(createMetadataStore("not-json"))

    // Then: startup is locked and malformed metadata cannot silently unlock the app.
    expect(restarted.getState()).toMatchObject({ enabled: true, locked: true, lockOnStart: true })
    expect(await restarted.unlock({ passphrase })).toBe(true)
    expect(corrupt.getState()).toMatchObject({ enabled: true, locked: true })
    expect(await corrupt.unlock({ passphrase })).toBe(false)
    await expect(
      corrupt.setup({
        passphrase,
        confirmation: passphrase,
      }),
    ).rejects.toBeInstanceOf(AppLockSetupUnavailableError)
  })

  it("fans a lock transition out to every prepared sensitive-session store", () => {
    // Given: the five Phase 17-19 session-store revocation hooks.
    const revoked: string[] = []
    const revoker = createAppLockSessionRevoker({
      privacyConfirmationSessions: {
        revokePrivacyConfirmationSessions: () => revoked.push("privacy"),
      },
      maintenanceActionSessions: {
        revokeMaintenanceActionSessions: () => revoked.push("maintenance"),
      },
      backupExportSessions: {
        revokeBackupExportSessions: () => revoked.push("backup-export"),
      },
      backupImportSessions: {
        revokeBackupImportSessions: () => revoked.push("backup-import"),
      },
      encryptedBackupImportSessions: {
        revokeEncryptedBackupImportSessions: () => revoked.push("encrypted-backup-import"),
      },
    })

    // When: the app lock revokes stale prepared work.
    revoker.revokeSensitiveSessions()

    // Then: privacy, maintenance, and all backup preparations lose their authority together.
    expect(revoked).toEqual([
      "privacy",
      "maintenance",
      "backup-export",
      "backup-import",
      "encrypted-backup-import",
    ])
  })
})
