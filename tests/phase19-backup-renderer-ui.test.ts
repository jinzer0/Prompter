import { readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import type {
  BackupPrivacyConfirmationRequired,
  PreparedEncryptedBackupPreview,
  SensitiveFinding,
  SensitiveScanResult,
  ValidateEncryptedBackupResult,
} from "../electron/ipc-types"
import { EncryptedBackupDialog } from "../renderer/src/components/backup/encrypted-backup-dialog"
import { EncryptedImportDialog } from "../renderer/src/components/backup/encrypted-import-dialog"
import { PlaintextBackupDialog } from "../renderer/src/components/backup/plaintext-backup-dialog"
import { type BackupState, backupMessage, backupPreview } from "../renderer/src/hooks/backup-state"

const finding = {
  id: "masked-finding",
  severity: "high",
  category: "github_token",
  label: "Token candidate",
  description: "A token-shaped value needs review.",
  location: {
    entityType: "prompt_version",
    entityId: "11111111-1111-4111-8111-111111111111",
    field: "compiledPrompt",
    previewLabel: "Compiled prompt",
  },
  evidenceMasked: "github_pat_...safe-mask",
  confidence: "high",
  recommendation: "Remove the token before sharing.",
} satisfies SensitiveFinding

const scanResult = {
  scannedAt: 1_000,
  source: "backup",
  findingCount: 1,
  criticalCount: 0,
  highCount: 1,
  mediumCount: 0,
  lowCount: 0,
  findings: [finding],
  safeToProceed: false,
  warnings: [
    "High findings require confirmation.",
    "The backup scan was truncated before all fields were inspected.",
  ],
} satisfies SensitiveScanResult

const itemCounts = {
  projects: 1,
  projectContextProfiles: 1,
  promptAssets: 2,
  promptVersions: 3,
  tags: 1,
  promptTags: 1,
  harnessTemplates: 1,
  promptTemplates: 1,
  promptQualityReviews: 1,
}

describe("Phase 19 privacy-aware backup renderer UI", () => {
  it("renders the exact plaintext warning with masked findings and prepared counts", () => {
    // Given: a prepared plaintext export that requires privacy confirmation.
    const confirmation = {
      status: "confirmation_required",
      plaintext: true,
      preparedBackupSessionId: "22222222-2222-4222-8222-222222222222",
      privacyConfirmationSessionId: "33333333-3333-4333-8333-333333333333",
      scanResult,
      cancelled: true,
      backupType: "full",
      itemCounts,
      message: "Privacy confirmation is required before saving a plaintext backup.",
    } satisfies BackupPrivacyConfirmationRequired

    // When: the confirmation surface is rendered without interaction.
    const onConfirm = vi.fn<() => void>()
    const markup = renderToStaticMarkup(
      createElement(PlaintextBackupDialog, {
        confirmation,
        onCancel: () => undefined,
        onConfirm,
      }),
    )

    // Then: only masked evidence is shown and rendering never continues the export.
    expect(markup).toContain("Privacy confirmation is required before saving a plaintext backup.")
    expect(markup).toContain("github_pat_...safe-mask")
    expect(markup).toContain("Continue with plaintext")
    expect(markup).toContain("Prompts")
    expect(markup).toContain("High findings require confirmation.")
    expect(markup).toContain("The backup scan was truncated before all fields were inspected.")
    expect(markup).not.toContain("github_pat_raw_secret")
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("renders encrypted preparation findings with matching passphrase inputs and no-recovery copy", () => {
    // Given: an encrypted full backup prepared in memory.
    const preview = {
      preparedBackupSessionId: "44444444-4444-4444-8444-444444444444",
      backupType: "full",
      privacyScan: scanResult,
    } satisfies PreparedEncryptedBackupPreview
    const state = {
      kind: "encrypted_export",
      preview,
      confirmation: null,
      message: "Encrypted backup prepared.",
    } satisfies BackupState

    // When: the passphrase dialog renders.
    const onSubmit = vi.fn<(passphrase: string) => void>()
    const markup = renderToStaticMarkup(
      createElement(EncryptedBackupDialog, {
        state,
        onCancel: () => undefined,
        onSubmit,
      }),
    )

    // Then: both secret inputs and masked scan evidence are visible, with no implicit save.
    expect(markup.match(/type="password"/g)?.length ?? 0).toBe(2)
    expect(markup).toContain("confirm passphrase")
    expect(markup).toContain("cannot recover this passphrase")
    expect(markup).toContain("github_pat_...safe-mask")
    expect(markup).toContain("High")
    expect(markup).toContain("High findings require confirmation.")
    expect(markup).toContain("The backup scan was truncated before all fields were inspected.")
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("renders locked encrypted metadata without exposing an import preview", () => {
    // Given: an encrypted file validated only far enough to read locked metadata.
    const locked = {
      status: "passphrase_required",
      encryptedImportSessionId: "55555555-5555-4555-8555-555555555555",
      backupType: "project",
      exportedAt: 1_000,
    } satisfies ValidateEncryptedBackupResult
    const state = {
      kind: "encrypted_import",
      locked,
      error: "The passphrase could not unlock this backup.",
      message: "Encrypted backup remains locked. Try again.",
    } satisfies BackupState

    // When: the retryable unlock dialog renders.
    const onUnlock = vi.fn<(passphrase: string) => void>()
    const markup = renderToStaticMarkup(
      createElement(EncryptedImportDialog, {
        state,
        onCancel: () => undefined,
        onUnlock,
      }),
    )

    // Then: locked metadata and a generic retry are shown, but no Phase16 preview is exposed.
    expect(markup).toContain("Backup type")
    expect(markup).toContain("project")
    expect(markup).toContain('<time dateTime="1970-01-01T00:00:01.000Z">')
    expect(markup).toContain("The passphrase could not unlock this backup.")
    expect(markup).not.toContain("Import preview ledger")
    expect(markup).not.toContain("github_pat_...safe-mask")
    expect(onUnlock).not.toHaveBeenCalled()
  })

  it("renders a stable fallback when locked metadata has an extreme finite timestamp", () => {
    // Given: schema-valid locked metadata whose finite timestamp is outside the Date range.
    const state = {
      kind: "encrypted_import",
      locked: {
        status: "passphrase_required",
        encryptedImportSessionId: "77777777-7777-4777-8777-777777777777",
        backupType: "full",
        exportedAt: Number.MAX_SAFE_INTEGER,
      },
      error: null,
      message: "Encrypted backup locked. Enter its passphrase to continue.",
    } satisfies BackupState

    // When: the unlock dialog renders before authentication.
    const markup = renderToStaticMarkup(
      createElement(EncryptedImportDialog, {
        state,
        onCancel: () => undefined,
        onUnlock: () => undefined,
      }),
    )

    // Then: rendering is stable and invalid metadata is not emitted as semantic time markup.
    expect(markup).toContain("Date unavailable")
    expect(markup).not.toContain("<time")
  })

  it("keeps locked metadata outside the Phase16 preview state", () => {
    // Given: an encrypted import is still locked.
    const state = {
      kind: "encrypted_import",
      locked: {
        status: "passphrase_required",
        encryptedImportSessionId: "66666666-6666-4666-8666-666666666666",
        backupType: "full",
        exportedAt: 2_000,
      },
      error: null,
      message: "Encrypted backup locked. Enter its passphrase to continue.",
    } satisfies BackupState

    // When: panel selectors project the exhaustive state.
    const preview = backupPreview(state)
    const message = backupMessage(state)

    // Then: no import session preview exists before a successful unlock.
    expect(preview).toBeNull()
    expect(message).toBe("Encrypted backup locked. Enter its passphrase to continue.")
  })

  it("keeps passphrases out of shared backup state and the facade hook", () => {
    // Given: the shared state and public hook sources.
    const sharedStateSource = readFileSync("renderer/src/hooks/backup-state.ts", "utf8")
    const facadeSource = readFileSync("renderer/src/hooks/use-backup.ts", "utf8")

    // When: renderer-persisted backup state surfaces are inspected.
    const stateCarriesPassphrase = /\bpassphrase\s*:/i.test(sharedStateSource)
    const facadeCarriesPassphrase = /\bpassphrase\s*:/i.test(facadeSource)

    // Then: secret inputs remain owned only by dialog-local state and transient bridge calls.
    expect(stateCarriesPassphrase).toBe(false)
    expect(facadeCarriesPassphrase).toBe(false)
  })
})
