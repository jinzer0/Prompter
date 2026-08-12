import type { Dispatch, SetStateAction } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type {
  BackupPrivacyConfirmationRequired,
  PreparedEncryptedBackupPreview,
  SavePreparedEncryptedBackupInput,
  SavePreparedEncryptedBackupResponse,
  SavePreparedEncryptedBackupResult,
  SensitiveScanResult,
} from "../electron/ipc-types"
import type { BackupState } from "../renderer/src/hooks/backup-state"
import { useBackupExport } from "../renderer/src/hooks/use-backup-export"

const privacyScan = {
  scannedAt: 1_000,
  source: "backup",
  findingCount: 0,
  criticalCount: 0,
  highCount: 0,
  mediumCount: 0,
  lowCount: 0,
  findings: [],
  safeToProceed: false,
  warnings: ["The backup scan was truncated before all fields were inspected."],
} satisfies SensitiveScanResult

const preview = {
  preparedBackupSessionId: "11111111-1111-4111-8111-111111111111",
  backupType: "full",
  privacyScan,
} satisfies PreparedEncryptedBackupPreview

const confirmation = {
  status: "confirmation_required",
  plaintext: false,
  preparedBackupSessionId: preview.preparedBackupSessionId,
  privacyConfirmationSessionId: "22222222-2222-4222-8222-222222222222",
  scanResult: privacyScan,
  cancelled: true,
  backupType: "full",
  itemCounts: {
    projects: 1,
    projectContextProfiles: 0,
    promptAssets: 0,
    promptVersions: 0,
    tags: 0,
    promptTags: 0,
    harnessTemplates: 0,
    promptTemplates: 0,
    promptQualityReviews: 0,
  },
  message: "Privacy confirmation is required before saving an encrypted backup.",
} satisfies BackupPrivacyConfirmationRequired

type BackupStateHarness = {
  readonly read: () => BackupState
  readonly setState: Dispatch<SetStateAction<BackupState>>
}

function createBackupStateHarness(initialState: BackupState): BackupStateHarness {
  let currentState = initialState
  return {
    read: () => currentState,
    setState: (update) => {
      currentState = typeof update === "function" ? update(currentState) : update
    },
  }
}

function installEncryptedSaveBridge(
  savePreparedEncryptedBackup: (
    input: SavePreparedEncryptedBackupInput,
  ) => Promise<SavePreparedEncryptedBackupResponse>,
): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { prompter: { backup: { savePreparedEncryptedBackup } } },
  })
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window")
})

describe("Phase 19 encrypted backup renderer state", () => {
  it("preserves the prepared preview and resets consumed confirmation after cancellation", async () => {
    // Given: a confirmed encrypted export whose native save dialog will be cancelled.
    const initialState = {
      kind: "encrypted_export",
      preview,
      confirmation,
      message: confirmation.message,
    } satisfies BackupState
    const state = createBackupStateHarness(initialState)
    const savePreparedEncryptedBackup = vi
      .fn<(input: SavePreparedEncryptedBackupInput) => Promise<SavePreparedEncryptedBackupResult>>()
      .mockResolvedValue({
        cancelled: true,
        backupType: "full",
        message: "Encrypted backup export cancelled",
      })
    installEncryptedSaveBridge(savePreparedEncryptedBackup)

    // When: the renderer submits the passphrase and native save is cancelled.
    await useBackupExport(state.read(), state.setState).saveEncryptedBackup("retry-passphrase")

    // Then: the dialog keeps the prepared export but drops the consumed confirmation session.
    expect(state.read()).toEqual({
      kind: "encrypted_export",
      preview,
      confirmation: null,
      message: "Encrypted backup export cancelled.",
    })
  })

  it("retries a cancelled encrypted export with the same prepared session", async () => {
    // Given: the encrypted export state restored after a cancelled native save.
    const state = createBackupStateHarness({
      kind: "encrypted_export",
      preview,
      confirmation: null,
      message: "Encrypted backup export cancelled.",
    })
    const freshConfirmation = {
      ...confirmation,
      privacyConfirmationSessionId: "33333333-3333-4333-8333-333333333333",
    } satisfies BackupPrivacyConfirmationRequired
    const savePreparedEncryptedBackup = vi
      .fn<
        (input: SavePreparedEncryptedBackupInput) => Promise<SavePreparedEncryptedBackupResponse>
      >()
      .mockResolvedValue(freshConfirmation)
    installEncryptedSaveBridge(savePreparedEncryptedBackup)

    // When: the user submits a second passphrase after cancellation.
    await useBackupExport(state.read(), state.setState).saveEncryptedBackup("second-passphrase")

    // Then: the same prepared session is submitted and receives a fresh confirmation gate.
    expect(savePreparedEncryptedBackup).toHaveBeenCalledWith({
      preparedBackupSessionId: preview.preparedBackupSessionId,
      passphrase: "second-passphrase",
    })
    expect(state.read()).toEqual({
      kind: "encrypted_export",
      preview,
      confirmation: freshConfirmation,
      message: freshConfirmation.message,
    })
  })

  it("transitions a normally saved encrypted export to exported", async () => {
    // Given: an encrypted export that does not require privacy confirmation.
    const state = createBackupStateHarness({
      kind: "encrypted_export",
      preview,
      confirmation: null,
      message: "Encrypted backup prepared.",
    })
    const result = {
      cancelled: false,
      backupType: "full",
      message: "Encrypted backup exported",
    } satisfies SavePreparedEncryptedBackupResult
    const savePreparedEncryptedBackup = vi
      .fn<(input: SavePreparedEncryptedBackupInput) => Promise<SavePreparedEncryptedBackupResult>>()
      .mockResolvedValue(result)
    installEncryptedSaveBridge(savePreparedEncryptedBackup)

    // When: native save completes normally.
    await useBackupExport(state.read(), state.setState).saveEncryptedBackup("normal-passphrase")

    // Then: the renderer exposes the completed export result.
    expect(state.read()).toEqual({ kind: "exported", result, message: result.message })
  })
})
