import { describe, expect, it } from "vitest"

import { parseAppLockMetadata } from "../electron/app-lock/app-lock-metadata.js"
import {
  appLockSettingsSchema,
  appLockStateSchema,
  changeAppLockPassphraseInputSchema,
  disableAppLockInputSchema,
  setupAppLockInputSchema,
  unlockAppInputSchema,
  updateAppLockSettingsInputSchema,
} from "../electron/ipc-contract.js"

describe("Phase 20 app lock contracts", () => {
  it("accepts a complete setup and exposes only public lock state", () => {
    // Given: a valid passphrase setup and the main-owned lock state response.
    const setup = {
      passphrase: "correct horse battery staple",
      confirmation: "correct horse battery staple",
      lockOnStart: true,
      timeoutMinutes: 30,
      requireForExport: true,
      requireForBackup: true,
      requireForLlm: true,
    }

    // When: the IPC boundary parses both payloads.
    const parsedSetup = setupAppLockInputSchema.parse(setup)
    const state = appLockStateSchema.parse({
      enabled: true,
      locked: false,
      lockOnStart: true,
      timeoutMinutes: 30,
      lastUnlockedAt: 1_000,
    })

    // Then: setup preserves the policy and state has no persisted verifier material.
    expect(parsedSetup).toEqual(setup)
    expect(JSON.stringify(state)).not.toMatch(/(?:hash|salt|kdf|passphrase)/i)
  })

  it("rejects unsafe passphrases, mismatched confirmations, and invalid timeouts", () => {
    // Given: malformed app-lock requests at the IPC boundary.
    const shortPassphrase = {
      passphrase: "short",
      confirmation: "short",
    }
    const whitespacePassphrase = {
      passphrase: "        ",
      confirmation: "        ",
    }
    const mismatchedPassphrase = {
      currentPassphrase: "correct horse battery staple",
      newPassphrase: "another secure passphrase",
      confirmation: "different secure passphrase",
    }

    // When: schemas parse invalid values.
    const shortResult = setupAppLockInputSchema.safeParse(shortPassphrase)
    const whitespaceResult = setupAppLockInputSchema.safeParse(whitespacePassphrase)
    const mismatchResult = changeAppLockPassphraseInputSchema.safeParse(mismatchedPassphrase)
    const tooShortTimeout = updateAppLockSettingsInputSchema.safeParse({ timeoutMinutes: 0 })
    const tooLongTimeout = updateAppLockSettingsInputSchema.safeParse({ timeoutMinutes: 241 })
    const oversizedPassphrase = "p".repeat(1_025)
    const oversizedSetup = setupAppLockInputSchema.safeParse({
      passphrase: oversizedPassphrase,
      confirmation: oversizedPassphrase,
    })
    const oversizedUnlock = unlockAppInputSchema.safeParse({ passphrase: oversizedPassphrase })
    const oversizedDisable = disableAppLockInputSchema.safeParse({
      passphrase: oversizedPassphrase,
    })
    const oversizedChange = changeAppLockPassphraseInputSchema.safeParse({
      currentPassphrase: oversizedPassphrase,
      newPassphrase: oversizedPassphrase,
      confirmation: oversizedPassphrase,
    })

    // Then: each malformed request is rejected before it reaches the main service.
    expect(shortResult.success).toBe(false)
    expect(whitespaceResult.success).toBe(false)
    expect(mismatchResult.success).toBe(false)
    expect(tooShortTimeout.success).toBe(false)
    expect(tooLongTimeout.success).toBe(false)
    expect(oversizedSetup.success).toBe(false)
    expect(oversizedUnlock.success).toBe(false)
    expect(oversizedDisable.success).toBe(false)
    expect(oversizedChange.success).toBe(false)
  })

  it("keeps enabled policy separate from settings updates that cannot create a lock", () => {
    // Given: an enabled public settings response and a legitimate partial update.
    const settings = {
      enabled: true,
      lockOnStart: false,
      timeoutMinutes: 15,
      requireForExport: true,
      requireForBackup: true,
      requireForLlm: true,
    }

    // When: the response and a policy-only update are parsed.
    const parsedSettings = appLockSettingsSchema.parse(settings)
    const update = updateAppLockSettingsInputSchema.parse({
      lockOnStart: true,
      timeoutMinutes: 45,
    })

    // Then: settings show enablement while updates cannot bypass passphrase setup.
    expect(parsedSettings.enabled).toBe(true)
    expect(update).toEqual({ lockOnStart: true, timeoutMinutes: 45 })
    expect(updateAppLockSettingsInputSchema.safeParse({ enabled: true }).success).toBe(false)
  })

  it("fails closed for structurally complete metadata with an invalid verifier encoding", () => {
    // Given: persisted metadata with a malformed scrypt salt.
    const corruptMetadata = JSON.stringify({
      version: 2,
      enabled: true,
      kdf: "scrypt",
      kdfParameters: {
        cost: 16_384,
        blockSize: 8,
        parallelization: 1,
        keyLength: 64,
        maxMemory: 33_554_432,
      },
      salt: "not base64",
      hash: "aGFzaC12YWx1ZQ==",
      lockOnStart: true,
      timeoutMinutes: 15,
      requireForExport: true,
      requireForBackup: true,
      requireForLlm: true,
      createdAt: 1_000,
      updatedAt: 1_000,
    })

    // When: startup reads its private metadata row.
    const result = parseAppLockMetadata(corruptMetadata)

    // Then: malformed verifier data cannot become a usable lock configuration.
    expect(result).toEqual({ kind: "invalid" })
  })
})
