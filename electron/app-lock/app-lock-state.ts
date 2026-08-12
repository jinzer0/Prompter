import type { AppLockSettings, AppLockState } from "../ipc-types.js"
import type { AppLockMetadata } from "./app-lock-metadata.js"

export const defaultAppLockSettings = {
  enabled: false,
  lockOnStart: false,
  timeoutMinutes: 15,
  requireForExport: true,
  requireForBackup: true,
  requireForLlm: true,
} as const satisfies AppLockSettings

export const corruptAppLockMetadataSettings = {
  ...defaultAppLockSettings,
  enabled: true,
  lockOnStart: true,
} as const satisfies AppLockSettings

export function appLockStateFromMetadata(
  metadata: AppLockMetadata,
  locked: boolean,
  lastUnlockedAt: number | null,
): AppLockState {
  return {
    enabled: true,
    locked,
    lockOnStart: metadata.lockOnStart,
    timeoutMinutes: metadata.timeoutMinutes,
    lastUnlockedAt,
  }
}

export function appLockSettingsFromMetadata(metadata: AppLockMetadata): AppLockSettings {
  return {
    enabled: true,
    lockOnStart: metadata.lockOnStart,
    timeoutMinutes: metadata.timeoutMinutes,
    requireForExport: metadata.requireForExport,
    requireForBackup: metadata.requireForBackup,
    requireForLlm: metadata.requireForLlm,
  }
}
