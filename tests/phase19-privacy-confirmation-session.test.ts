import { describe, expect, it } from "vitest"

import {
  createPrivacyConfirmationSessionStore,
  PRIVACY_CONFIRMATION_SESSION_TTL_MS,
  PrivacyConfirmationSessionUnavailableError,
} from "../electron/privacy/privacy-confirmation-session-store.js"
import { sensitiveScanResultSchema } from "../electron/privacy/privacy-schemas.js"

const maskedResult = sensitiveScanResultSchema.parse({
  scannedAt: 1_000,
  source: "backup",
  findingCount: 1,
  criticalCount: 0,
  highCount: 1,
  mediumCount: 0,
  lowCount: 0,
  findings: [
    {
      id: "masked-backup-key",
      severity: "high",
      category: "openai_api_key",
      label: "OpenAI API key candidate",
      description: "A masked value needs approval.",
      location: { entityType: "backup", field: "ciphertext" },
      evidenceMasked: "sk-proj-...abcd",
      confidence: "high",
      recommendation: "Remove the value before exporting.",
    },
  ],
  safeToProceed: false,
  warnings: ["High-risk findings require confirmation."],
})

function createStore(clock: { now: number }) {
  return createPrivacyConfirmationSessionStore({
    now: () => clock.now,
    createId: () => "00000000-0000-4000-8000-000000000195",
    hashPayload: (payload) => `sha256:${payload}`,
  })
}

function captureFailure(action: () => unknown) {
  try {
    action()
  } catch (error) {
    if (error instanceof PrivacyConfirmationSessionUnavailableError) {
      return error.failure
    }
    throw error
  }
  throw new Error("Expected privacy confirmation session to be unavailable")
}

describe("Phase 19 privacy confirmation sessions", () => {
  it("stores only action, payload hash, and masked findings before one successful confirmation", () => {
    // Given: a main-process confirmation store and masked high-risk scan result.
    const clock = { now: 10_000 }
    const store = createStore(clock)

    // When: main creates and consumes a confirmation for the original payload.
    const session = store.createPrivacyConfirmationSession({
      action: "encrypted_backup",
      payload: "backup:full:2026-08-09",
      maskedResult,
    })
    const confirmed = store.consumePrivacyConfirmationSession({
      privacyConfirmationSessionId: session.id,
      action: "encrypted_backup",
      payload: "backup:full:2026-08-09",
    })

    // Then: the session contains no raw payload and cannot be replayed.
    expect(session).toMatchObject({
      action: "encrypted_backup",
      payloadHash: "sha256:backup:full:2026-08-09",
      maskedResult,
      expiresAt: clock.now + PRIVACY_CONFIRMATION_SESSION_TTL_MS,
      status: "consumed",
    })
    expect(session).not.toHaveProperty("payload")
    expect(confirmed.maskedResult).toEqual(maskedResult)
    expect(
      captureFailure(() =>
        store.consumePrivacyConfirmationSession({
          privacyConfirmationSessionId: session.id,
          action: "encrypted_backup",
          payload: "backup:full:2026-08-09",
        }),
      ),
    ).toEqual({
      code: "session_consumed",
      message: "Privacy confirmation session is unavailable.",
    })
  })

  it("blocks forged IDs and action or payload drift without consuming the original session", () => {
    // Given: a ready confirmation bound to one action and payload hash.
    const store = createStore({ now: 20_000 })
    const session = store.createPrivacyConfirmationSession({
      action: "encrypted_backup",
      payload: "backup:full:original",
      maskedResult,
    })

    // When: callers use a forged id, a mismatched action, and changed payload.
    const forged = captureFailure(() =>
      store.consumePrivacyConfirmationSession({
        privacyConfirmationSessionId: "00000000-0000-4000-8000-000000000199",
        action: "encrypted_backup",
        payload: "backup:full:original",
      }),
    )
    const actionDrift = captureFailure(() =>
      store.consumePrivacyConfirmationSession({
        privacyConfirmationSessionId: session.id,
        action: "prompt_export",
        payload: "backup:full:original",
      }),
    )
    const payloadDrift = captureFailure(() =>
      store.consumePrivacyConfirmationSession({
        privacyConfirmationSessionId: session.id,
        action: "encrypted_backup",
        payload: "backup:full:changed",
      }),
    )

    // Then: each attack is blocked while the correct confirmation remains possible.
    expect(forged.code).toBe("session_not_found")
    expect(actionDrift.code).toBe("session_action_mismatch")
    expect(payloadDrift.code).toBe("session_payload_mismatch")
    expect(store.getPrivacyConfirmationSession(session.id)?.status).toBe("ready")
  })

  it("makes cancellation and expiry terminal confirmation states", () => {
    // Given: two ready sessions in independently advancing deterministic stores.
    const cancelledStore = createStore({ now: 30_000 })
    const expiryClock = { now: 40_000 }
    const expiringStore = createStore(expiryClock)
    const cancelled = cancelledStore.createPrivacyConfirmationSession({
      action: "encrypted_backup",
      payload: "backup:cancelled",
      maskedResult,
    })
    const expiring = expiringStore.createPrivacyConfirmationSession({
      action: "encrypted_backup",
      payload: "backup:expired",
      maskedResult,
    })

    // When: the first session is cancelled and the second reaches expiry.
    cancelledStore.cancelPrivacyConfirmationSession(cancelled.id)
    expiryClock.now = expiring.expiresAt
    const expired = captureFailure(() =>
      expiringStore.requireReadyPrivacyConfirmationSession(expiring.id),
    )

    // Then: neither terminal session can authorize subsequent work.
    expect(
      captureFailure(() => cancelledStore.requireReadyPrivacyConfirmationSession(cancelled.id)),
    ).toEqual({
      code: "session_cancelled",
      message: "Privacy confirmation session is unavailable.",
    })
    expect(expired).toEqual({
      code: "session_expired",
      message: "Privacy confirmation session is unavailable.",
    })
  })
})
