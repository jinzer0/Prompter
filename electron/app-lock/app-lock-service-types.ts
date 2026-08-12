import type { AppLockPassphraseVerifier } from "./app-lock-crypto.js"

export type AppLockMetadataStore = {
  readonly getAppLockMetadata: () => string | null
  readonly setAppLockMetadata: (value: string) => void
  readonly deleteAppLockMetadata: () => void
}

export type AppLockServiceDependencies = {
  readonly metadataStore: AppLockMetadataStore
  readonly now?: () => number
  readonly revokeSensitiveSessions?: () => void
  readonly crypto?: {
    readonly hashPassphrase: (passphrase: string) => Promise<AppLockPassphraseVerifier>
    readonly verifyPassphrase: (
      passphrase: string,
      verifier: AppLockPassphraseVerifier,
    ) => Promise<boolean>
  }
}

export class AppLockSetupUnavailableError extends Error {
  readonly name = "AppLockSetupUnavailableError"

  constructor() {
    super("App lock setup is unavailable while existing lock metadata is present.")
  }
}
