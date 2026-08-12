import { createHash, randomUUID } from "node:crypto"

import type { SensitiveScanResult } from "../ipc-types.js"

export const PRIVACY_CONFIRMATION_SESSION_TTL_MS = 15 * 60 * 1_000

type PrivacyConfirmationSessionStatus = "ready" | "cancelled" | "consumed" | "expired"
type TerminalPrivacyConfirmationSessionStatus = Exclude<PrivacyConfirmationSessionStatus, "ready">

export type PrivacyConfirmationSession = {
  readonly id: string
  readonly action: string
  readonly payloadHash: string
  readonly maskedResult: SensitiveScanResult
  readonly createdAt: number
  readonly expiresAt: number
  status: PrivacyConfirmationSessionStatus
}

type CreatePrivacyConfirmationSessionInput = {
  readonly action: string
  readonly payload: string
  readonly maskedResult: SensitiveScanResult
}

type ConsumePrivacyConfirmationSessionInput = {
  readonly privacyConfirmationSessionId: string
  readonly action: string
  readonly payload: string
}

type PrivacyConfirmationSessionStoreDependencies = {
  readonly now?: () => number
  readonly createId?: () => string
  readonly hashPayload?: (payload: string) => string
  readonly ttlMs?: number
}

export type PrivacyConfirmationSessionFailure = {
  readonly code:
    | "session_not_found"
    | "session_cancelled"
    | "session_consumed"
    | "session_expired"
    | "session_action_mismatch"
    | "session_payload_mismatch"
  readonly message: "Privacy confirmation session is unavailable."
}

const unavailableMessage = "Privacy confirmation session is unavailable." as const
const failureCodeByStatus = {
  cancelled: "session_cancelled",
  consumed: "session_consumed",
  expired: "session_expired",
} as const satisfies Record<
  TerminalPrivacyConfirmationSessionStatus,
  PrivacyConfirmationSessionFailure["code"]
>

export class PrivacyConfirmationSessionUnavailableError extends Error {
  readonly name = "PrivacyConfirmationSessionUnavailableError"
  readonly failure: PrivacyConfirmationSessionFailure

  constructor(code: PrivacyConfirmationSessionFailure["code"]) {
    super(unavailableMessage)
    this.failure = { code, message: unavailableMessage }
  }
}

function detachMaskedResult(result: SensitiveScanResult): SensitiveScanResult {
  return Object.freeze({
    ...result,
    findings: Object.freeze(
      result.findings.map((finding) =>
        Object.freeze({ ...finding, location: Object.freeze({ ...finding.location }) }),
      ),
    ),
    warnings: Object.freeze([...result.warnings]),
  })
}

export function createPrivacyConfirmationSessionStore(
  dependencies: PrivacyConfirmationSessionStoreDependencies = {},
) {
  const sessions = new Map<string, PrivacyConfirmationSession>()
  const now = dependencies.now ?? Date.now
  const createId = dependencies.createId ?? randomUUID
  const hashPayload =
    dependencies.hashPayload ??
    ((payload: string) => createHash("sha256").update(payload).digest("hex"))
  const ttlMs = dependencies.ttlMs ?? PRIVACY_CONFIRMATION_SESSION_TTL_MS

  function expirePrivacyConfirmationSessions(): void {
    const currentTime = now()
    for (const session of sessions.values()) {
      if (session.status === "ready" && session.expiresAt <= currentTime) {
        session.status = "expired"
      }
    }
  }

  function requireReadyPrivacyConfirmationSession(
    privacyConfirmationSessionId: string,
  ): PrivacyConfirmationSession {
    expirePrivacyConfirmationSessions()
    const session = sessions.get(privacyConfirmationSessionId)
    if (session === undefined) {
      throw new PrivacyConfirmationSessionUnavailableError("session_not_found")
    }
    if (session.status !== "ready") {
      throw new PrivacyConfirmationSessionUnavailableError(failureCodeByStatus[session.status])
    }
    return session
  }

  return {
    createPrivacyConfirmationSession(
      input: CreatePrivacyConfirmationSessionInput,
    ): PrivacyConfirmationSession {
      expirePrivacyConfirmationSessions()
      const createdAt = now()
      const session: PrivacyConfirmationSession = {
        id: createId(),
        action: input.action,
        payloadHash: hashPayload(input.payload),
        maskedResult: detachMaskedResult(input.maskedResult),
        createdAt,
        expiresAt: createdAt + ttlMs,
        status: "ready",
      }
      sessions.set(session.id, session)
      return session
    },
    getPrivacyConfirmationSession(
      privacyConfirmationSessionId: string,
    ): PrivacyConfirmationSession | null {
      return sessions.get(privacyConfirmationSessionId) ?? null
    },
    requireReadyPrivacyConfirmationSession,
    consumePrivacyConfirmationSession(
      input: ConsumePrivacyConfirmationSessionInput,
    ): PrivacyConfirmationSession {
      const session = requireReadyPrivacyConfirmationSession(input.privacyConfirmationSessionId)
      if (session.action !== input.action) {
        throw new PrivacyConfirmationSessionUnavailableError("session_action_mismatch")
      }
      if (session.payloadHash !== hashPayload(input.payload)) {
        throw new PrivacyConfirmationSessionUnavailableError("session_payload_mismatch")
      }
      session.status = "consumed"
      return session
    },
    cancelPrivacyConfirmationSession(privacyConfirmationSessionId: string): void {
      requireReadyPrivacyConfirmationSession(privacyConfirmationSessionId).status = "cancelled"
    },
    expirePrivacyConfirmationSessions,
  }
}

export type PrivacyConfirmationSessionStore = ReturnType<
  typeof createPrivacyConfirmationSessionStore
>
