import { describe, expect, it } from "vitest"

import { createAppLockService } from "../electron/app-lock/app-lock-service.js"
import { createAppLockSessionRevoker } from "../electron/app-lock/app-lock-session-revoker.js"
import { createBackupExportSessionStore } from "../electron/backup/backup-export-session-store.js"
import { createBackupImportSessionStore } from "../electron/backup/backup-session-store.js"
import { createEncryptedBackupImportSessionStore } from "../electron/backup/encrypted-backup-import-session-store.js"
import { encryptedBackupEnvelopeSchema } from "../electron/backup/encrypted-backup-schemas.js"
import { backupEnvelopeSchema } from "../electron/ipc-contract.js"
import type { MaintenanceActionPreview } from "../electron/ipc-types.js"
import { createMaintenanceActionSessionStore } from "../electron/maintenance/maintenance-action-session-store.js"
import { createPrivacyConfirmationSessionStore } from "../electron/privacy/privacy-confirmation-session-store.js"
import { sensitiveScanResultSchema } from "../electron/privacy/privacy-schemas.js"

const backupEnvelope = backupEnvelopeSchema.parse({
  schemaVersion: 1,
  appName: "Prompter",
  backupType: "full",
  exportedAt: 1_000,
  metadata: {
    itemCounts: {
      projects: 0,
      promptAssets: 0,
      promptVersions: 0,
      tags: 0,
      promptTags: 0,
      harnessTemplates: 0,
      projectContextProfiles: 0,
      promptTemplates: 0,
      promptQualityReviews: 0,
    },
    sourceSummary: "Lock revocation fixture",
    excludesSecrets: true,
    excludesSecretStatus: true,
    includesSettings: false,
    plaintext: true,
    schemaVersion: 1,
  },
  data: {
    projects: [],
    promptAssets: [],
    promptVersions: [],
    tags: [],
    promptTags: [],
    harnessTemplates: [],
    projectContextProfiles: [],
    promptTemplates: [],
    promptQualityReviews: [],
  },
})

const encryptedBackup = encryptedBackupEnvelopeSchema.parse({
  schemaVersion: 1,
  appName: "Prompter",
  encrypted: true,
  encryption: {
    algorithm: "aes-256-gcm",
    kdf: "scrypt",
    cost: 16_384,
    blockSize: 8,
    parallelization: 1,
    keyLength: 32,
    salt: "MTIzNDU2Nzg5MDEyMzQ1Ng==",
    iv: "MTIzNDU2Nzg5MDEy",
    authTag: "MTIzNDU2Nzg5MDEyMzQ1Ng==",
  },
  ciphertext: "Y2lwaGVydGV4dC1mb3ItbG9jay1yZXZvY2F0aW9u",
  exportedAt: 1_000,
  metadata: {
    backupType: "full",
    excludesSecrets: true,
    itemCounts: backupEnvelope.metadata.itemCounts,
  },
})

const maintenancePreview = {
  actionType: "repair_current_versions",
  title: "Repair current versions",
  description: "Point selected assets to their highest owned version.",
  severity: "high",
  affectedEntityType: "prompt_asset",
  affectedEntityIds: ["00000000-0000-4000-8000-000000000304"],
  destructive: false,
  relationshipChanging: true,
  estimatedChangeCount: 1,
  backupRecommendation: "Export a full backup before changing relationships.",
} satisfies MaintenanceActionPreview

describe("Phase 20 app lock prepared-session revocation", () => {
  it("cancels prepared privacy, maintenance, export, and import work on lock", async () => {
    // Given: one real ready session in each Phase 17-19 sensitive store.
    const privacySessions = createPrivacyConfirmationSessionStore({
      createId: () => "00000000-0000-4000-8000-000000000301",
    })
    const maintenanceSessions = createMaintenanceActionSessionStore({
      createId: () => "00000000-0000-4000-8000-000000000302",
    })
    const backupExportSessions = createBackupExportSessionStore({
      createId: () => "00000000-0000-4000-8000-000000000303",
    })
    const backupImportSessions = createBackupImportSessionStore({
      createId: () => "00000000-0000-4000-8000-000000000304",
      now: () => 10_000,
    })
    const encryptedBackupImportSessions = createEncryptedBackupImportSessionStore({
      createId: () => "00000000-0000-4000-8000-000000000305",
    })
    const privacySession = privacySessions.createPrivacyConfirmationSession({
      action: "prompt_export",
      payload: "prepared export payload",
      maskedResult: sensitiveScanResultSchema.parse({
        scannedAt: 1_000,
        source: "export",
        findingCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        findings: [],
        safeToProceed: true,
        warnings: [],
      }),
    })
    const maintenanceSession = maintenanceSessions.createActionSession({
      executionPlan: {
        actionType: "repair_current_versions",
        repairs: [
          {
            promptAssetId: "00000000-0000-4000-8000-000000000304",
            expectedCurrentVersionId: null,
            replacementVersionId: "00000000-0000-4000-8000-000000000306",
            replacementVersionNumber: 1,
            expectedOwnedVersionCount: 1,
          },
        ],
      },
      preview: maintenancePreview,
      affectedDisplayNames: ["Repair target"],
      selectedEntityIds: ["00000000-0000-4000-8000-000000000304"],
      expectedCounts: { selectedAssets: 1, ownedVersions: 1 },
      rowSnapshots: [],
      warningLedger: [],
      consequenceLedger: [],
      destructive: false,
      relationshipChanging: true,
      backupRecommendation: "Export a full backup before changing relationships.",
    })
    const exportSession = backupExportSessions.createBackupExportSession({ backupEnvelope })
    const importSession = backupImportSessions.createImportSession({
      envelope: backupEnvelope,
      resolutionPlan: {
        itemCounts: backupEnvelope.metadata.itemCounts,
        conflicts: [],
        warnings: [],
        consequences: [],
        requiresDestinationProject: false,
      },
      previewFingerprint: "a".repeat(64),
      preview: {
        backupType: "full",
        schemaVersion: 1,
        exportedAt: 1_000,
        itemCounts: backupEnvelope.metadata.itemCounts,
        conflicts: [],
        warnings: [],
        consequences: [],
        requiresDestinationProject: false,
        excludesSecrets: true,
        excludesSecretStatus: true,
        includesSettings: false,
        plaintext: true,
      },
    })
    const encryptedImportSession = encryptedBackupImportSessions.createEncryptedBackupImportSession(
      {
        encryptedBackup,
      },
    )

    // When: the authoritative main-process app lock transitions into its locked state.
    const revoker = createAppLockSessionRevoker({
      privacyConfirmationSessions: privacySessions,
      maintenanceActionSessions: maintenanceSessions,
      backupExportSessions,
      backupImportSessions,
      encryptedBackupImportSessions,
    })
    let metadata: string | null = null
    const appLock = createAppLockService({
      metadataStore: {
        getAppLockMetadata: () => metadata,
        setAppLockMetadata: (value) => {
          metadata = value
        },
        deleteAppLockMetadata: () => {
          metadata = null
        },
      },
      revokeSensitiveSessions: revoker.revokeSensitiveSessions,
    })
    const passphrase = "correct horse battery staple"
    await appLock.setup({ passphrase, confirmation: passphrase })
    appLock.lock()

    // Then: a lock transition makes every prepared object terminal and releases ready-store access.
    expect(privacySession.status).toBe("cancelled")
    expect(maintenanceSession.status).toBe("cancelled")
    expect(exportSession.status).toBe("cancelled")
    expect(importSession.status).toBe("cancelled")
    expect(encryptedImportSession.status).toBe("cancelled")
    expect(backupExportSessions.getBackupExportSession(exportSession.id)).toBeNull()
    expect(backupImportSessions.getImportSession(importSession.id)).toBeNull()
    expect(
      encryptedBackupImportSessions.getEncryptedBackupImportSession(encryptedImportSession.id),
    ).toBeNull()
  })
})
