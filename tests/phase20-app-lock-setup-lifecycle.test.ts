import { describe, expect, it } from "vitest"

import {
  APP_LOCK_SCRYPT_PARAMETERS,
  type AppLockPassphraseVerifier,
} from "../electron/app-lock/app-lock-crypto.js"
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

function createMetadataStore(): AppLockMetadataStore & {
  readonly storedValue: () => string | null
} {
  let value: string | null = null

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

describe("Phase 20 app lock setup reservation lifecycle", () => {
  it("releases setup reservation after a KDF failure so a retry can enable lock", async () => {
    // Given: a KDF that rejects once before returning a valid verifier.
    let hashAttempts = 0
    const store = createMetadataStore()
    const service = createAppLockService({
      metadataStore: store,
      crypto: {
        hashPassphrase: async () => {
          hashAttempts += 1
          if (hashAttempts === 1) {
            throw new TypeError("Injected KDF failure")
          }
          return verifier(1)
        },
        verifyPassphrase: async () => true,
      },
    })

    // When: the user retries setup after KDF derivation fails.
    const firstSetup = service.setup({
      passphrase: "correct horse battery staple",
      confirmation: "correct horse battery staple",
    })
    await expect(firstSetup).rejects.toThrow("Injected KDF failure")
    const retry = service.setup({
      passphrase: "correct horse battery staple",
      confirmation: "correct horse battery staple",
    })

    // Then: the retry owns the released reservation and persists the first valid lock metadata.
    await expect(retry).resolves.toMatchObject({ enabled: true, locked: false })
    expect(hashAttempts).toBe(2)
    expect(store.storedValue()).not.toBeNull()
  })

  it("releases setup reservation after metadata persistence fails", async () => {
    // Given: a private metadata store that rejects its first write.
    let writes = 0
    const backingStore = createMetadataStore()
    const service = createAppLockService({
      metadataStore: {
        ...backingStore,
        setAppLockMetadata: (value) => {
          writes += 1
          if (writes === 1) {
            throw new TypeError("Injected metadata persistence failure")
          }
          backingStore.setAppLockMetadata(value)
        },
      },
      crypto: {
        hashPassphrase: async () => verifier(2),
        verifyPassphrase: async () => true,
      },
    })

    // When: setup retries after the private settings write throws.
    const firstSetup = service.setup({
      passphrase: "correct horse battery staple",
      confirmation: "correct horse battery staple",
    })
    await expect(firstSetup).rejects.toThrow("Injected metadata persistence failure")
    const retry = service.setup({
      passphrase: "correct horse battery staple",
      confirmation: "correct horse battery staple",
    })

    // Then: only the retry persists metadata and the service remains enabled.
    await expect(retry).resolves.toMatchObject({ enabled: true, locked: false })
    expect(writes).toBe(2)
    expect(backingStore.storedValue()).not.toBeNull()
  })

  it("allows a new setup only after successful disable removes existing metadata", async () => {
    // Given: an enabled app lock and valid verification for disable.
    const store = createMetadataStore()
    const service = createAppLockService({
      metadataStore: store,
      crypto: {
        hashPassphrase: async () => verifier(3),
        verifyPassphrase: async () => true,
      },
    })
    await service.setup({
      passphrase: "correct horse battery staple",
      confirmation: "correct horse battery staple",
    })

    // When: disable succeeds before another setup request arrives.
    const disabled = await service.disable({ passphrase: "correct horse battery staple" })
    const replacementSetup = service.setup({
      passphrase: "another secure passphrase",
      confirmation: "another secure passphrase",
    })

    // Then: only removed metadata releases setup eligibility for the replacement lock.
    expect(disabled).toBe(true)
    await expect(replacementSetup).resolves.toMatchObject({ enabled: true, locked: false })
  })

  it("rejects a stale setup when lock changes the revision during derivation", async () => {
    // Given: a setup KDF operation that cannot complete until after a lock request.
    const derivation = createDeferred<AppLockPassphraseVerifier>()
    const store = createMetadataStore()
    const service = createAppLockService({
      metadataStore: store,
      crypto: {
        hashPassphrase: () => derivation.promise,
        verifyPassphrase: async () => false,
      },
    })

    // When: lock advances the revision before derivation settles.
    const setup = service.setup({
      passphrase: "correct horse battery staple",
      confirmation: "correct horse battery staple",
    })
    service.lock()
    derivation.resolve(verifier(4))

    // Then: the stale setup cannot persist and a later setup may retry safely.
    await expect(setup).rejects.toBeInstanceOf(AppLockSetupUnavailableError)
    expect(store.storedValue()).toBeNull()
    await expect(
      service.setup({
        passphrase: "correct horse battery staple",
        confirmation: "correct horse battery staple",
      }),
    ).resolves.toMatchObject({ enabled: true, locked: false })
  })
})
