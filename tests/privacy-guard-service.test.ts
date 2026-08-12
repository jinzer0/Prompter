import { describe, expect, it } from "vitest"

import type {
  PrivacySettings,
  SensitiveFinding,
  SensitiveScanResult,
} from "../electron/ipc-types.js"
import {
  createPrivacyConfirmationSessionStore,
  PrivacyConfirmationSessionUnavailableError,
} from "../electron/privacy/privacy-confirmation-session-store.js"
import {
  createPrivacyGuardService,
  PrivacyConfirmationRequiredError,
} from "../electron/privacy/privacy-guard-service.js"
import { buildSensitiveScanResult } from "../electron/privacy/scan-sensitive-text.js"

const safeSettings = {
  warnBeforeLLM: false,
  warnBeforeExport: false,
  warnBeforeBackup: true,
  enableLibraryScan: true,
} as const satisfies PrivacySettings

function finding(severity: SensitiveFinding["severity"]): SensitiveFinding {
  return {
    id: `finding-${severity}`,
    severity,
    category: "private_key",
    label: "Sensitive value",
    description: "A sensitive value needs review.",
    location: { entityType: "draft", field: "payload" },
    evidenceMasked: "••••",
    confidence: "high",
    recommendation: "Remove the value before sharing.",
  }
}

function scanResult(severity: SensitiveFinding["severity"]): SensitiveScanResult {
  return buildSensitiveScanResult("draft", [finding(severity)])
}

function requiredConfirmation(action: () => void): PrivacyConfirmationRequiredError {
  try {
    action()
  } catch (error) {
    if (error instanceof PrivacyConfirmationRequiredError) {
      return error
    }

    throw error
  }

  throw new Error("Expected privacy confirmation to be required")
}

describe("privacy guard service", () => {
  it("requires a one-use confirmation for high findings even when warnings are disabled", () => {
    // Given: disabled LLM/export warnings and a high-risk exact LLM payload.
    const sessions = createPrivacyConfirmationSessionStore({
      createId: () => "00000000-0000-4000-8000-000000000401",
    })
    const scannedPayloads: string[] = []
    const guard = createPrivacyGuardService({
      getPrivacySettings: () => safeSettings,
      sessions,
      scan: (input) => {
        scannedPayloads.push(input.payload)
        return scanResult("high")
      },
    })
    const payload = "resolved compiler request"

    // When: a caller attempts the protected action without a confirmation session.
    const error = requiredConfirmation(() =>
      guard.assertAuthorized({ action: "llm_compile", payload }),
    )

    // Then: only the masked result/session is exposed and the exact downstream payload was scanned.
    expect(scannedPayloads).toEqual([payload])
    expect(error.privacyConfirmationSessionId).toBe("00000000-0000-4000-8000-000000000401")
    expect(error.scanResult.highCount).toBe(1)
    expect(error).not.toHaveProperty("payload")
    expect(error).not.toHaveProperty("action")
  })

  it("uses the action setting for medium and low findings", () => {
    // Given: one guard with warnings disabled and one with export warnings enabled.
    const disabledGuard = createPrivacyGuardService({
      getPrivacySettings: () => safeSettings,
      scan: () => scanResult("medium"),
    })
    const enabledGuard = createPrivacyGuardService({
      getPrivacySettings: () => ({ ...safeSettings, warnBeforeExport: true }),
      scan: () => scanResult("low"),
    })

    // When: equivalent medium/low payloads cross the export boundary.
    disabledGuard.assertAuthorized({ action: "prompt_export", payload: "medium export" })
    const error = requiredConfirmation(() =>
      enabledGuard.assertAuthorized({ action: "prompt_export", payload: "low export" }),
    )

    // Then: settings control only medium/low confirmation requirements.
    expect(error.scanResult.lowCount).toBe(1)
  })

  it("rejects payload drift before consuming authorization and blocks replay after downstream work", () => {
    // Given: a high-risk clipboard payload awaiting confirmation.
    const sessions = createPrivacyConfirmationSessionStore({
      createId: () => "00000000-0000-4000-8000-000000000402",
    })
    const guard = createPrivacyGuardService({
      getPrivacySettings: () => safeSettings,
      sessions,
      scan: () => scanResult("high"),
    })
    const initial = requiredConfirmation(() =>
      guard.assertAuthorized({ action: "clipboard_copy", payload: "copy this" }),
    )

    let driftFailure: PrivacyConfirmationSessionUnavailableError | null = null
    try {
      guard.assertAuthorized({
        action: "clipboard_copy",
        payload: "changed copy",
        privacyConfirmationSessionId: initial.privacyConfirmationSessionId,
      })
    } catch (error) {
      if (error instanceof PrivacyConfirmationSessionUnavailableError) {
        driftFailure = error
      } else {
        throw error
      }
    }

    // When: the original confirmation is used once, then replayed after downstream work.
    guard.assertAuthorized({
      action: "clipboard_copy",
      payload: "copy this",
      privacyConfirmationSessionId: initial.privacyConfirmationSessionId,
    })

    // Then: payload drift does not consume the valid session, which can authorize one original call.
    expect(driftFailure?.failure.code).toBe("session_payload_mismatch")
    expect(() =>
      guard.assertAuthorized({
        action: "clipboard_copy",
        payload: "copy this",
        privacyConfirmationSessionId: initial.privacyConfirmationSessionId,
      }),
    ).toThrow(PrivacyConfirmationSessionUnavailableError)
  })

  it("rejects cancelled and expired confirmations before work can proceed", () => {
    // Given: ready sessions backed by cancellable and expiring stores.
    const cancelledSessions = createPrivacyConfirmationSessionStore({
      createId: () => "00000000-0000-4000-8000-000000000403",
    })
    const clock = { now: 1_000 }
    const expiringSessions = createPrivacyConfirmationSessionStore({
      now: () => clock.now,
      createId: () => "00000000-0000-4000-8000-000000000404",
      ttlMs: 10,
    })
    const cancelledGuard = createPrivacyGuardService({
      getPrivacySettings: () => safeSettings,
      sessions: cancelledSessions,
      scan: () => scanResult("critical"),
    })
    const expiringGuard = createPrivacyGuardService({
      getPrivacySettings: () => safeSettings,
      sessions: expiringSessions,
      scan: () => scanResult("critical"),
    })
    const cancelled = requiredConfirmation(() =>
      cancelledGuard.assertAuthorized({ action: "llm_analyze", payload: "cancelled" }),
    )
    const expiring = requiredConfirmation(() =>
      expiringGuard.assertAuthorized({ action: "llm_analyze", payload: "expired" }),
    )
    cancelledSessions.cancelPrivacyConfirmationSession(cancelled.privacyConfirmationSessionId)
    clock.now = 1_010

    // When: the cancelled and expired session IDs are submitted for their original payloads.
    const cancelledWork = () =>
      cancelledGuard.assertAuthorized({
        action: "llm_analyze",
        payload: "cancelled",
        privacyConfirmationSessionId: cancelled.privacyConfirmationSessionId,
      })
    const expiredWork = () =>
      expiringGuard.assertAuthorized({
        action: "llm_analyze",
        payload: "expired",
        privacyConfirmationSessionId: expiring.privacyConfirmationSessionId,
      })

    // Then: both terminal states block the protected action.
    expect(cancelledWork).toThrow(PrivacyConfirmationSessionUnavailableError)
    expect(expiredWork).toThrow(PrivacyConfirmationSessionUnavailableError)
  })
})
