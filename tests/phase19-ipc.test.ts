import { describe, expect, it } from "vitest"

import { BackupExportPrivacyConfirmationRequiredError } from "../electron/backup/backup-export-service"
import { createElectronBridge } from "../electron/bridge"
import {
  PERSISTENCE_CHANNELS,
  promptQualityReviewSnapshotSchema,
  sensitiveScanResultSchema,
} from "../electron/ipc-contract"
import { createPersistenceIpcHandlers } from "../electron/ipc-handlers"
import { PrivacyConfirmationRequiredError } from "../electron/privacy/privacy-guard-service"
import { createFailingServices } from "./electron-contract-service-fixture"

const sessionId = "d6636652-38f7-4c54-980a-e5b44df98c58"
const preparedBackupSessionId = "d6636652-38f7-4c54-980a-e5b44df98c59"

const sensitiveScan = sensitiveScanResultSchema.parse({
  scannedAt: 1_000,
  source: "draft",
  findingCount: 1,
  criticalCount: 0,
  highCount: 1,
  mediumCount: 0,
  lowCount: 0,
  findings: [
    {
      id: "openai-key-candidate",
      severity: "high",
      category: "openai_api_key",
      label: "OpenAI API key candidate",
      description: "A key-shaped value needs review.",
      location: { entityType: "draft", field: "originalInput" },
      evidenceMasked: "sk-proj-...abcd",
      confidence: "high",
      recommendation: "Remove the value before sharing this content.",
    },
  ],
  safeToProceed: false,
  warnings: ["High-risk findings require confirmation."],
})

const reviewSnapshot = promptQualityReviewSnapshotSchema.parse({
  compiledPrompt: "# Objective\nReview the IPC contract.",
  originalInput: "Review this prompt.",
  scenario: "bugfix",
  targetAgent: "codex",
  harnessTemplateId: null,
  projectContextProfileId: null,
  includeProjectContextProfile: false,
  projectContext: null,
  constraints: null,
  acceptanceCriteria: null,
  validationCommands: null,
})

describe("Phase 19 privacy and encrypted backup IPC", () => {
  it("routes privacy scans and prepared encrypted backup methods through parsed bridge channels", async () => {
    // Given: a main-process invoke surface that returns only safe privacy and encrypted metadata.
    const calls: { readonly channel: string; readonly payload: unknown }[] = []
    const bridge = createElectronBridge(async (channel, payload) => {
      calls.push({ channel, payload })

      if (channel === PERSISTENCE_CHANNELS.scanSensitiveText) {
        return sensitiveScan
      }
      if (channel === PERSISTENCE_CHANNELS.getPrivacySettings) {
        return {
          warnBeforeLLM: true,
          warnBeforeExport: true,
          warnBeforeBackup: true,
          enableLibraryScan: true,
        }
      }
      if (channel === PERSISTENCE_CHANNELS.prepareEncryptedBackup) {
        return {
          preparedBackupSessionId,
          backupType: "full",
          privacyScan: sensitiveScan,
        }
      }
      if (channel === PERSISTENCE_CHANNELS.savePreparedEncryptedBackup) {
        return { cancelled: false, backupType: "full", message: "Encrypted backup exported" }
      }
      if (channel === PERSISTENCE_CHANNELS.savePreparedPlaintextBackup) {
        return {
          cancelled: true,
          backupType: "full",
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
          message: "Backup export cancelled",
        }
      }
      if (channel === PERSISTENCE_CHANNELS.validateEncryptedBackupFile) {
        return { status: "cancelled" }
      }
      if (channel === PERSISTENCE_CHANNELS.unlockEncryptedBackup) {
        return {
          status: "invalid_passphrase",
          message: "The passphrase could not unlock this backup.",
        }
      }

      throw new Error(`Unexpected channel ${channel}`)
    })

    // When: renderer code reaches every safe Phase 19 bridge method.
    const scan = await bridge.privacy.scanText({ source: "draft", text: "Review this safely." })
    const prepared = await bridge.backup.prepareEncryptedBackup({ backupType: "full" })
    const encrypted = await bridge.backup.savePreparedEncryptedBackup({
      preparedBackupSessionId,
      passphrase: "correct horse battery staple",
    })
    const plaintext = await bridge.backup.savePreparedPlaintextBackup({ preparedBackupSessionId })
    const validation = await bridge.backup.validateEncryptedBackupFile()
    const unlock = await bridge.backup.unlockEncryptedBackup({
      encryptedImportSessionId: sessionId,
      passphrase: "correct horse battery staple",
    })

    // Then: paths, plaintext envelopes, and passphrases never appear in responses.
    expect(scan).toEqual(sensitiveScan)
    expect(prepared).toEqual({
      preparedBackupSessionId,
      backupType: "full",
      privacyScan: sensitiveScan,
    })
    expect(encrypted).toEqual({
      cancelled: false,
      backupType: "full",
      message: "Encrypted backup exported",
    })
    expect(plaintext).toMatchObject({ cancelled: true, backupType: "full" })
    expect(validation).toEqual({ status: "cancelled" })
    expect(unlock).toEqual({
      status: "invalid_passphrase",
      message: "The passphrase could not unlock this backup.",
    })
    expect(calls.map((call) => call.channel)).toEqual([
      PERSISTENCE_CHANNELS.scanSensitiveText,
      PERSISTENCE_CHANNELS.prepareEncryptedBackup,
      PERSISTENCE_CHANNELS.savePreparedEncryptedBackup,
      PERSISTENCE_CHANNELS.savePreparedPlaintextBackup,
      PERSISTENCE_CHANNELS.validateEncryptedBackupFile,
      PERSISTENCE_CHANNELS.unlockEncryptedBackup,
    ])
  })

  it("requires the exact review snapshot at the public LLM review boundary", async () => {
    // Given: an LLM-review response whose privacy scan requires explicit confirmation.
    const calls: { readonly channel: string; readonly payload: unknown }[] = []
    const bridge = createElectronBridge(async (channel, payload) => {
      calls.push({ channel, payload })
      return {
        status: "confirmation_required",
        privacyConfirmationSessionId: sessionId,
        scanResult: sensitiveScan,
        ok: false,
        code: "llm_review_unavailable",
        message: "Privacy confirmation is required.",
      }
    })

    // When: the renderer submits its local review snapshot for an LLM review.
    const result = await bridge.promptQuality.reviewWithLLM(reviewSnapshot)

    // Then: the snapshot is preserved and the expected gate is a typed response, not a rejection.
    expect(result).toEqual({
      status: "confirmation_required",
      privacyConfirmationSessionId: sessionId,
      scanResult: sensitiveScan,
      ok: false,
      code: "llm_review_unavailable",
      message: "Privacy confirmation is required.",
    })
    expect(calls).toEqual([
      { channel: PERSISTENCE_CHANNELS.reviewPromptQualityWithLLM, payload: reviewSnapshot },
    ])
  })

  it("serializes known privacy confirmation errors while preserving unknown handler failures", async () => {
    // Given: compiler and backup services that stop before their downstream effects.
    const handlers = createPersistenceIpcHandlers({
      ...createFailingServices(() => undefined),
      async promptCompilerAnalyze() {
        throw new PrivacyConfirmationRequiredError({
          privacyConfirmationSessionId: sessionId,
          scanResult: sensitiveScan,
        })
      },
      async exportFullBackup() {
        throw new BackupExportPrivacyConfirmationRequiredError({
          plaintext: true,
          preparedBackupSessionId,
          privacyConfirmationSessionId: sessionId,
          scanResult: sensitiveScan,
          backupType: "full",
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
        })
      },
      async copyText() {
        throw new TypeError("unexpected clipboard failure")
      },
    })

    // When: both guarded actions cross their handler boundary.
    await expect(
      handlers.promptCompilerAnalyze({ originalInput: "Analyze this prompt." }),
    ).resolves.toEqual({
      status: "confirmation_required",
      privacyConfirmationSessionId: sessionId,
      scanResult: sensitiveScan,
      ok: false,
      code: "openai_request_failed",
      message: "Privacy confirmation is required.",
    })
    await expect(handlers.exportFullBackup({})).resolves.toEqual({
      status: "confirmation_required",
      plaintext: true,
      preparedBackupSessionId,
      privacyConfirmationSessionId: sessionId,
      scanResult: sensitiveScan,
      cancelled: true,
      backupType: "full",
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
      message: "Privacy confirmation is required before saving a plaintext backup.",
    })
    await expect(handlers.copyText({ text: "Copy this text." })).rejects.toThrow(
      "unexpected clipboard failure",
    )
  })
})
