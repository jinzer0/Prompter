import { describe, expect, it } from "vitest"

import {
  APP_LOCK_SCRYPT_PARAMETERS,
  hashAppLockPassphrase,
  verifyAppLockPassphrase,
} from "../electron/app-lock/app-lock-crypto.js"
import { appLockMetadataSchema } from "../electron/app-lock/app-lock-metadata.js"

describe("Phase 20 app lock passphrase hashing", () => {
  it("derives salted scrypt verifiers that authenticate only the original passphrase", async () => {
    // Given: one passphrase submitted twice to the main-process KDF.
    const passphrase = "correct horse battery staple"

    // When: each setup derives a verifier and both correct and wrong values are checked.
    const firstVerifier = await hashAppLockPassphrase(passphrase)
    const secondVerifier = await hashAppLockPassphrase(passphrase)
    const correct = await verifyAppLockPassphrase(passphrase, firstVerifier)
    const incorrect = await verifyAppLockPassphrase("wrong passphrase value", firstVerifier)

    // Then: random salts produce distinct verifiers and no serialized verifier contains the secret.
    expect(firstVerifier.kdf).toBe("scrypt")
    expect(firstVerifier.kdfParameters).toEqual(APP_LOCK_SCRYPT_PARAMETERS)
    expect(firstVerifier.salt).not.toBe(secondVerifier.salt)
    expect(firstVerifier.hash).not.toBe(secondVerifier.hash)
    expect(correct).toBe(true)
    expect(incorrect).toBe(false)
    expect(JSON.stringify(firstVerifier)).not.toContain(passphrase)
  })

  it("serializes only the approved explicit scrypt profile in versioned metadata", async () => {
    // Given: a freshly derived verifier and valid app-lock policy.
    const verifier = await hashAppLockPassphrase("correct horse battery staple")
    const metadata = {
      version: 2,
      enabled: true,
      ...verifier,
      lockOnStart: false,
      timeoutMinutes: 15,
      requireForExport: true,
      requireForBackup: true,
      requireForLlm: true,
      createdAt: 1_000,
      updatedAt: 1_000,
    }

    // When: persisted metadata is validated with an altered KDF cost.
    const valid = appLockMetadataSchema.safeParse(metadata)
    const altered = appLockMetadataSchema.safeParse({
      ...metadata,
      kdfParameters: { ...APP_LOCK_SCRYPT_PARAMETERS, cost: 32_768 },
    })

    // Then: only the explicitly approved KDF profile can be used for verification.
    expect(valid.success).toBe(true)
    expect(altered.success).toBe(false)
  })
})
