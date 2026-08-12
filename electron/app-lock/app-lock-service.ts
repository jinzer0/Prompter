import {
  changeAppLockPassphraseInputSchema,
  disableAppLockInputSchema,
  setupAppLockInputSchema,
  unlockAppInputSchema,
  updateAppLockSettingsInputSchema,
} from "../ipc-contract.js"
import type {
  AppLockSettings,
  AppLockState,
  ChangeAppLockPassphraseInput,
  DisableAppLockInput,
  SetupAppLockInput,
  UnlockAppInput,
  UpdateAppLockSettingsInput,
} from "../ipc-types.js"
import { hashAppLockPassphrase, verifyAppLockPassphrase } from "./app-lock-crypto.js"
import {
  APP_LOCK_METADATA_VERSION,
  type AppLockMetadata,
  appLockMetadataSchema,
  parseAppLockMetadata,
} from "./app-lock-metadata.js"
import {
  type AppLockServiceDependencies,
  AppLockSetupUnavailableError,
} from "./app-lock-service-types.js"
import {
  appLockSettingsFromMetadata,
  appLockStateFromMetadata,
  corruptAppLockMetadataSettings,
  defaultAppLockSettings,
} from "./app-lock-state.js"

export {
  type AppLockMetadataStore,
  AppLockSetupUnavailableError,
} from "./app-lock-service-types.js"

export function createAppLockService(dependencies: AppLockServiceDependencies) {
  const now = dependencies.now ?? Date.now
  const crypto = dependencies.crypto ?? {
    hashPassphrase: hashAppLockPassphrase,
    verifyPassphrase: verifyAppLockPassphrase,
  }
  const storedMetadata = parseAppLockMetadata(dependencies.metadataStore.getAppLockMetadata())
  let metadata: AppLockMetadata | null = null
  let metadataIsCorrupt = false
  let locked = false
  let lastUnlockedAt: number | null = now()
  let stateRevision = 0
  let setupReserved = false

  switch (storedMetadata.kind) {
    case "absent":
      break
    case "invalid":
      metadataIsCorrupt = true
      locked = true
      lastUnlockedAt = null
      break
    case "valid":
      metadata = storedMetadata.metadata
      locked = metadata.lockOnStart
      lastUnlockedAt = locked ? null : now()
      break
  }

  function getState(): AppLockState {
    if (metadataIsCorrupt) {
      return {
        enabled: true,
        locked: true,
        lockOnStart: true,
        timeoutMinutes: corruptAppLockMetadataSettings.timeoutMinutes,
        lastUnlockedAt: null,
      }
    }
    if (metadata === null) {
      return {
        enabled: false,
        locked: false,
        lockOnStart: false,
        timeoutMinutes: defaultAppLockSettings.timeoutMinutes,
        lastUnlockedAt: null,
      }
    }

    return appLockStateFromMetadata(metadata, locked, lastUnlockedAt)
  }

  function getSettings(): AppLockSettings {
    if (metadataIsCorrupt) {
      return corruptAppLockMetadataSettings
    }
    return metadata === null ? defaultAppLockSettings : appLockSettingsFromMetadata(metadata)
  }

  function persist(nextMetadata: AppLockMetadata): void {
    dependencies.metadataStore.setAppLockMetadata(JSON.stringify(nextMetadata))
    metadata = nextMetadata
  }

  function advanceStateRevision(): number {
    stateRevision += 1
    return stateRevision
  }

  return {
    getState,
    getSettings,
    getStateRevision: () => stateRevision,
    async setup(input: SetupAppLockInput): Promise<AppLockState> {
      const parsed = setupAppLockInputSchema.parse(input)
      if (metadata !== null || metadataIsCorrupt || setupReserved) {
        throw new AppLockSetupUnavailableError()
      }
      setupReserved = true
      try {
        const revision = advanceStateRevision()
        const createdAt = now()
        const verifier = await crypto.hashPassphrase(parsed.passphrase)
        if (revision !== stateRevision) {
          throw new AppLockSetupUnavailableError()
        }
        persist(
          appLockMetadataSchema.parse({
            version: APP_LOCK_METADATA_VERSION,
            enabled: true,
            ...verifier,
            lockOnStart: parsed.lockOnStart,
            timeoutMinutes: parsed.timeoutMinutes,
            requireForExport: parsed.requireForExport,
            requireForBackup: parsed.requireForBackup,
            requireForLlm: parsed.requireForLlm,
            createdAt,
            updatedAt: createdAt,
          }),
        )
        metadataIsCorrupt = false
        locked = false
        lastUnlockedAt = createdAt
        return getState()
      } finally {
        setupReserved = false
      }
    },
    lock(): AppLockState {
      if (metadata !== null || setupReserved) {
        advanceStateRevision()
        if (metadata !== null && !locked) {
          locked = true
          lastUnlockedAt = null
          dependencies.revokeSensitiveSessions?.()
        }
      }
      return getState()
    },
    async unlock(input: UnlockAppInput): Promise<boolean> {
      const parsed = unlockAppInputSchema.parse(input)
      if (metadata === null || metadataIsCorrupt) {
        return false
      }
      const currentMetadata = metadata
      const revision = stateRevision
      const lockState = locked
      const valid = await crypto.verifyPassphrase(parsed.passphrase, currentMetadata)
      if (
        !valid ||
        revision !== stateRevision ||
        metadata !== currentMetadata ||
        locked !== lockState
      ) {
        return false
      }

      advanceStateRevision()
      locked = false
      lastUnlockedAt = now()
      return true
    },
    async disable(input: DisableAppLockInput): Promise<boolean> {
      const parsed = disableAppLockInputSchema.parse(input)
      if (metadata === null || metadataIsCorrupt || locked) {
        return false
      }
      const currentMetadata = metadata
      const revision = stateRevision
      const valid = await crypto.verifyPassphrase(parsed.passphrase, currentMetadata)
      if (!valid || revision !== stateRevision || metadata !== currentMetadata || locked) {
        return false
      }

      dependencies.metadataStore.deleteAppLockMetadata()
      metadata = null
      lastUnlockedAt = null
      advanceStateRevision()
      return true
    },
    async changePassphrase(input: ChangeAppLockPassphraseInput): Promise<boolean> {
      const parsed = changeAppLockPassphraseInputSchema.parse(input)
      if (metadata === null || metadataIsCorrupt || locked) {
        return false
      }
      const currentMetadata = metadata
      const revision = stateRevision
      const valid = await crypto.verifyPassphrase(parsed.currentPassphrase, currentMetadata)
      if (!valid || revision !== stateRevision || metadata !== currentMetadata || locked) {
        return false
      }

      const verifier = await crypto.hashPassphrase(parsed.newPassphrase)
      if (revision !== stateRevision || metadata !== currentMetadata || locked) {
        return false
      }
      persist({
        ...currentMetadata,
        ...verifier,
        updatedAt: now(),
      })
      advanceStateRevision()
      return true
    },
    updateSettings(input: UpdateAppLockSettingsInput): AppLockSettings | null {
      const parsed = updateAppLockSettingsInputSchema.parse(input)
      if (metadata === null || metadataIsCorrupt || locked) {
        return null
      }

      const nextMetadata = appLockMetadataSchema.parse({
        ...metadata,
        ...(parsed.lockOnStart === undefined ? {} : { lockOnStart: parsed.lockOnStart }),
        ...(parsed.timeoutMinutes === undefined ? {} : { timeoutMinutes: parsed.timeoutMinutes }),
        ...(parsed.requireForExport === undefined
          ? {}
          : { requireForExport: parsed.requireForExport }),
        ...(parsed.requireForBackup === undefined
          ? {}
          : { requireForBackup: parsed.requireForBackup }),
        ...(parsed.requireForLlm === undefined ? {} : { requireForLlm: parsed.requireForLlm }),
        updatedAt: now(),
      })
      persist(nextMetadata)
      advanceStateRevision()
      return getSettings()
    },
  }
}

export type AppLockService = ReturnType<typeof createAppLockService>
