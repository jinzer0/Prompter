import { describe, expect, it } from "vitest"

import {
  APP_LOCK_SCRYPT_PARAMETERS,
  type AppLockPassphraseVerifier,
} from "../electron/app-lock/app-lock-crypto.js"
import { appLockMetadataSchema } from "../electron/app-lock/app-lock-metadata.js"
import {
  type AppLockMetadataStore,
  AppLockSetupUnavailableError,
  createAppLockService,
} from "../electron/app-lock/app-lock-service.js"

type Deferred<TValue> = {
  readonly promise: Promise<TValue>
  readonly resolve: (value: TValue) => void
}

function createDeferred<TValue>(): Deferred<TValue> {
  let resolvePromise: ((value: TValue) => void) | null = null
  const promise = new Promise<TValue>((resolve) => {
    resolvePromise = resolve
  })

  return {
    promise,
    resolve(value) {
      if (resolvePromise === null) {
        throw new TypeError("Expected deferred promise resolver")
      }
      resolvePromise(value)
    },
  }
}

function verifier(seed: number): AppLockPassphraseVerifier {
  return {
    kdf: "scrypt",
    kdfParameters: APP_LOCK_SCRYPT_PARAMETERS,
    salt: Buffer.alloc(16, seed).toString("base64"),
    hash: Buffer.alloc(64, seed).toString("base64"),
  }
}

function enabledMetadata(): string {
  return JSON.stringify(
    appLockMetadataSchema.parse({
      version: 2,
      enabled: true,
      ...verifier(1),
      lockOnStart: false,
      timeoutMinutes: 15,
      requireForExport: true,
      requireForBackup: true,
      requireForLlm: true,
      createdAt: 1_000,
      updatedAt: 1_000,
    }),
  )
}

function createMetadataStore(initialValue: string | null): AppLockMetadataStore & {
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

describe("Phase 20 app lock async state races", () => {
  it("keeps the app locked when lock occurs during passphrase unlock verification", async () => {
    // Given: a locked app with a paused successful verifier check.
    const verification = createDeferred<boolean>()
    const service = createAppLockService({
      metadataStore: createMetadataStore(enabledMetadata()),
      crypto: {
        hashPassphrase: async () => verifier(2),
        verifyPassphrase: () => verification.promise,
      },
    })

    service.lock()

    // When: a repeated lock request arrives before the successful verifier check resolves.
    const unlock = service.unlock({ passphrase: "correct horse battery staple" })
    service.lock()
    verification.resolve(true)

    // Then: stale verification cannot reopen the locked session.
    expect(await unlock).toBe(false)
    expect(service.getState().locked).toBe(true)
  })

  it("keeps metadata enabled when lock occurs during disable verification", async () => {
    // Given: an enabled lock with a paused successful disable verifier check.
    const verification = createDeferred<boolean>()
    const store = createMetadataStore(enabledMetadata())
    const service = createAppLockService({
      metadataStore: store,
      crypto: {
        hashPassphrase: async () => verifier(2),
        verifyPassphrase: () => verification.promise,
      },
    })

    // When: a newer lock transition occurs before verification resolves.
    const disable = service.disable({ passphrase: "correct horse battery staple" })
    service.lock()
    verification.resolve(true)

    // Then: stale disable cannot delete lock metadata or unlock the app.
    expect(await disable).toBe(false)
    expect(store.storedValue()).not.toBeNull()
    expect(service.getState()).toMatchObject({ enabled: true, locked: true })
  })

  it("keeps the existing verifier when lock occurs during passphrase replacement", async () => {
    // Given: a successful current-passphrase check followed by a paused new hash derivation.
    const verification = createDeferred<boolean>()
    const derivationStarted = createDeferred<void>()
    const derivation = createDeferred<AppLockPassphraseVerifier>()
    const store = createMetadataStore(enabledMetadata())
    const originalMetadata = store.storedValue()
    const service = createAppLockService({
      metadataStore: store,
      crypto: {
        hashPassphrase: () => {
          derivationStarted.resolve()
          return derivation.promise
        },
        verifyPassphrase: () => verification.promise,
      },
    })

    // When: lock occurs while the replacement verifier is still deriving.
    const change = service.changePassphrase({
      currentPassphrase: "correct horse battery staple",
      newPassphrase: "another secure passphrase",
      confirmation: "another secure passphrase",
    })
    verification.resolve(true)
    await derivationStarted.promise
    service.lock()
    derivation.resolve(verifier(2))

    // Then: stale derivation cannot replace the existing verifier or unlock the app.
    expect(await change).toBe(false)
    expect(store.storedValue()).toBe(originalMetadata)
    expect(service.getState().locked).toBe(true)
  })

  it("admits exactly one setup caller while the first verifier derives", async () => {
    // Given: an unlocked service with a first setup hash paused in crypto.
    const derivation = createDeferred<AppLockPassphraseVerifier>()
    let hashCalls = 0
    const store = createMetadataStore(null)
    const service = createAppLockService({
      metadataStore: store,
      crypto: {
        hashPassphrase: () => {
          hashCalls += 1
          return derivation.promise
        },
        verifyPassphrase: async () => false,
      },
    })

    // When: two setup calls race before the first KDF operation resolves.
    const firstSetup = service.setup({
      passphrase: "correct horse battery staple",
      confirmation: "correct horse battery staple",
    })
    const secondSetup = service.setup({
      passphrase: "another secure passphrase",
      confirmation: "another secure passphrase",
    })
    derivation.resolve(verifier(3))

    // Then: the first caller alone enables app lock and the second is rejected synchronously.
    await expect(firstSetup).resolves.toMatchObject({ enabled: true, locked: false })
    await expect(secondSetup).rejects.toBeInstanceOf(AppLockSetupUnavailableError)
    expect(hashCalls).toBe(1)
    expect(store.storedValue()).not.toBeNull()
  })

  it("keeps the first completed passphrase replacement when replacements derive concurrently", async () => {
    // Given: two current-passphrase checks and replacement hashes that resolve in a controlled order.
    const firstVerification = createDeferred<boolean>()
    const secondVerification = createDeferred<boolean>()
    const firstDerivation = createDeferred<AppLockPassphraseVerifier>()
    const secondDerivation = createDeferred<AppLockPassphraseVerifier>()
    let verificationCalls = 0
    let derivationCalls = 0
    const store = createMetadataStore(enabledMetadata())
    const service = createAppLockService({
      metadataStore: store,
      crypto: {
        hashPassphrase: () => {
          derivationCalls += 1
          return derivationCalls === 1 ? firstDerivation.promise : secondDerivation.promise
        },
        verifyPassphrase: () => {
          verificationCalls += 1
          return verificationCalls === 1 ? firstVerification.promise : secondVerification.promise
        },
      },
    })

    // When: both changes authenticate, but the first hash completes before the second.
    const firstChange = service.changePassphrase({
      currentPassphrase: "correct horse battery staple",
      newPassphrase: "first replacement passphrase",
      confirmation: "first replacement passphrase",
    })
    const secondChange = service.changePassphrase({
      currentPassphrase: "correct horse battery staple",
      newPassphrase: "second replacement passphrase",
      confirmation: "second replacement passphrase",
    })
    firstVerification.resolve(true)
    secondVerification.resolve(true)
    firstDerivation.resolve(verifier(4))
    await expect(firstChange).resolves.toBe(true)
    const firstStoredMetadata = store.storedValue()
    secondDerivation.resolve(verifier(5))

    // Then: the stale second derivation cannot overwrite the first completed replacement.
    await expect(secondChange).resolves.toBe(false)
    expect(store.storedValue()).toBe(firstStoredMetadata)
  })
})
