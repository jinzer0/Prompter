import { describe, expect, it } from "vitest"

import {
  encryptedBackupEnvelopeSchema,
  encryptedBackupUnlockValidationResultSchema,
  PERSISTENCE_CHANNELS,
  payloadSchemas,
  privacyConfirmationResultSchema,
  privacySettingsSchema,
  responseSchemas,
  sensitiveFindingSchema,
  sensitiveScanResultSchema,
} from "../electron/ipc-contract.js"

const entityId = "8f529b76-09d2-45ee-8f16-57910a1dfa26"
const sessionId = "d6636652-38f7-4c54-980a-e5b44df98c58"

const highRiskFinding = {
  id: "openai-key-candidate",
  severity: "high",
  category: "openai_api_key",
  label: "OpenAI API key candidate",
  description: "A key-shaped value needs review.",
  location: { entityType: "prompt_version", entityId, field: "originalInput" },
  evidenceMasked: "sk-proj-...abcd",
  confidence: "high",
  recommendation: "Remove the value before sharing this content.",
}

const highRiskScan = {
  scannedAt: 1_000,
  source: "draft",
  findingCount: 1,
  criticalCount: 0,
  highCount: 1,
  mediumCount: 0,
  lowCount: 0,
  findings: [highRiskFinding],
  safeToProceed: false,
  warnings: ["High-risk findings require confirmation."],
}

describe("Phase 19 privacy and encrypted-backup contracts", () => {
  it("accepts a counted high-risk privacy result only when it gates progress", () => {
    // Given: a high-risk, masked finding from a local draft scan.
    const input = highRiskScan

    // When: the scan result crosses the IPC boundary.
    const result = sensitiveScanResultSchema.parse(input)

    // Then: the result preserves its count and requires a later confirmation.
    expect(result).toEqual(input)
  })

  it("rejects raw evidence and unsafe high-risk scan summaries", () => {
    // Given: a finding with a raw secret and a high-risk result that bypasses its gate.
    const findingWithRawEvidence = { ...highRiskFinding, rawEvidence: "sk-proj-secret" }
    const bypassedGate = { ...highRiskScan, safeToProceed: true }

    // When: each unsafe shape is parsed.
    const rawEvidence = sensitiveFindingSchema.safeParse(findingWithRawEvidence)
    const bypass = sensitiveScanResultSchema.safeParse(bypassedGate)

    // Then: neither shape can cross the boundary.
    expect(rawEvidence.success).toBe(false)
    expect(bypass.success).toBe(false)
  })

  it("defaults privacy warnings to enabled and keeps scan inputs strict", () => {
    // Given: no user override and a text scan request with an unknown field.
    const defaults = privacySettingsSchema.parse({})
    const forgedInput = payloadSchemas.scanSensitiveText.safeParse({
      source: "export",
      text: "Bearer masked-token",
      filePath: "/private/source.txt",
    })

    // When: settings and the request are parsed.
    // Then: every warning starts enabled and filesystem paths are rejected.
    expect(defaults).toEqual({
      warnBeforeLLM: true,
      warnBeforeExport: true,
      warnBeforeBackup: true,
      enableLibraryScan: true,
    })
    expect(forgedInput.success).toBe(false)
  })

  it("models confirmation-required and cancelled privacy decisions without raw findings", () => {
    // Given: a high-risk scan that requires an explicit continuation decision.
    const confirmationRequired = {
      status: "confirmation_required",
      privacyConfirmationSessionId: sessionId,
      scanResult: highRiskScan,
    }

    // When: the required and cancelled decisions are parsed.
    const required = privacyConfirmationResultSchema.parse(confirmationRequired)
    const cancelled = privacyConfirmationResultSchema.parse({ status: "cancelled" })

    // Then: both states are explicit and carry no authorization shortcut.
    expect(required).toEqual(confirmationRequired)
    expect(cancelled).toEqual({ status: "cancelled" })
  })

  it("accepts only canonical AES-256-GCM and scrypt encrypted envelopes", () => {
    // Given: an encrypted envelope with canonical base64 fields.
    const envelope = {
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
      ciphertext: "cGF5bG9hZA==",
      exportedAt: 1_000,
      metadata: {
        backupType: "full",
        excludesSecrets: true,
        itemCounts: {
          projects: 1,
          promptAssets: 2,
          promptVersions: 3,
          tags: 4,
          promptTags: 5,
          harnessTemplates: 6,
          projectContextProfiles: 7,
          promptTemplates: 8,
          promptQualityReviews: 9,
        },
      },
    }

    // When: the envelope crosses the encrypted backup boundary.
    const result = encryptedBackupEnvelopeSchema.parse(envelope)

    // Then: the envelope remains encrypted and never carries plaintext backup data.
    expect(result).toEqual(envelope)
  })

  it("rejects noncanonical encryption metadata and passphrase bypasses", () => {
    // Given: invalid algorithm, missing authentication tag, malformed base64, and empty passphrase.
    const envelope = {
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
      ciphertext: "cGF5bG9hZA==",
      exportedAt: 1_000,
      metadata: {
        backupType: "full",
        excludesSecrets: true,
        itemCounts: {
          projects: 1,
          promptAssets: 2,
          promptVersions: 3,
          tags: 4,
          promptTags: 5,
          harnessTemplates: 6,
          projectContextProfiles: 7,
          promptTemplates: 8,
          promptQualityReviews: 9,
        },
      },
    }

    // When: each invalid boundary value is parsed.
    const invalidAlgorithm = encryptedBackupEnvelopeSchema.safeParse({
      ...envelope,
      encryption: { ...envelope.encryption, algorithm: "aes-128-gcm" },
    })
    const missingAuthTag = encryptedBackupEnvelopeSchema.safeParse({
      ...envelope,
      encryption: {
        salt: "MTIzNDU2Nzg5MDEyMzQ1Ng==",
        iv: "MTIzNDU2Nzg5MDEy",
        algorithm: "aes-256-gcm",
        kdf: "scrypt",
        cost: 16_384,
        blockSize: 8,
        parallelization: 1,
        keyLength: 32,
      },
    })
    const invalidBase64 = encryptedBackupEnvelopeSchema.safeParse({
      ...envelope,
      ciphertext: "not base64",
    })
    const emptyPassphrase = payloadSchemas.savePreparedEncryptedBackup.safeParse({
      preparedBackupSessionId: sessionId,
      passphrase: "",
    })

    // Then: unsupported crypto and missing passphrase material are rejected.
    expect(invalidAlgorithm.success).toBe(false)
    expect(missingAuthTag.success).toBe(false)
    expect(invalidBase64.success).toBe(false)
    expect(emptyPassphrase.success).toBe(false)
  })

  it("registers privacy, prepared-backup, and encrypted-import channels", () => {
    // Given: the central IPC registry.
    const expectedChannels = {
      scanSensitiveText: "prompter:privacy:scan-text",
      scanDraftPrivacy: "prompter:privacy:scan-draft",
      scanLibraryPrivacy: "prompter:privacy:scan-library",
      scanExportContent: "prompter:privacy:scan-export-content",
      getPrivacySettings: "prompter:privacy:settings:get",
      updatePrivacySettings: "prompter:privacy:settings:update",
      prepareEncryptedBackup: "prompter:backup:encrypted:prepare",
      savePreparedEncryptedBackup: "prompter:backup:encrypted:save-prepared",
      validateEncryptedBackupFile: "prompter:backup:encrypted:validate-file",
      unlockEncryptedBackup: "prompter:backup:encrypted:unlock",
    }

    // When: the new payload and response schemas are looked up by channel key.
    const unlockResult = encryptedBackupUnlockValidationResultSchema.parse({
      status: "invalid_passphrase",
      message: "The passphrase could not unlock this backup.",
    })

    // Then: every channel has a concrete boundary and unlock failures reveal no passphrase.
    expect(PERSISTENCE_CHANNELS).toMatchObject(expectedChannels)
    expect(Object.keys(payloadSchemas)).toEqual(
      expect.arrayContaining(Object.keys(expectedChannels)),
    )
    expect(Object.keys(responseSchemas)).toEqual(
      expect.arrayContaining(Object.keys(expectedChannels)),
    )
    expect(unlockResult).toEqual({
      status: "invalid_passphrase",
      message: "The passphrase could not unlock this backup.",
    })
  })
})
