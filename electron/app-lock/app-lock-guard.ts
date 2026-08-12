export type AppLockEpoch = { readonly revision: number }

export class AppLockOperationInvalidatedError extends Error {
  readonly name = "AppLockOperationInvalidatedError"

  constructor() {
    super("Prompter is locked")
  }
}

export type AppLockGuard = {
  readonly capture: () => AppLockEpoch
  readonly check: (epoch: AppLockEpoch) => void
}
