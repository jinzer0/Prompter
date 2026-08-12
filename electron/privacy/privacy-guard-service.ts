import type { PrivacySettings, SensitiveScanResult } from "../ipc-types.js"
import {
  createPrivacyConfirmationSessionStore,
  type PrivacyConfirmationSessionStore,
} from "./privacy-confirmation-session-store.js"
import { scanSensitiveText } from "./scan-sensitive-text.js"

const privacyGuardActions = {
  llm_analyze: {
    setting: "warnBeforeLLM",
    source: "draft",
    previewLabel: "Prompt compiler analysis request",
  },
  llm_compile: {
    setting: "warnBeforeLLM",
    source: "draft",
    previewLabel: "Prompt compiler compilation request",
  },
  llm_review: {
    setting: "warnBeforeLLM",
    source: "draft",
    previewLabel: "Prompt quality LLM review request",
  },
  clipboard_copy: {
    setting: "warnBeforeExport",
    source: "export",
    previewLabel: "Clipboard export",
  },
  prompt_export: {
    setting: "warnBeforeExport",
    source: "export",
    previewLabel: "Prompt file export",
  },
} as const

export type PrivacyGuardAction = keyof typeof privacyGuardActions

export type PrivacyGuardScanInput = {
  readonly action: PrivacyGuardAction
  readonly payload: string
}

export type PrivacyGuardAuthorizationInput = PrivacyGuardScanInput & {
  readonly privacyConfirmationSessionId?: string | undefined
}

export type PrivacyGuardServiceConfig = {
  readonly getPrivacySettings: () => PrivacySettings
  readonly sessions?: PrivacyConfirmationSessionStore
  readonly scan?: (input: PrivacyGuardScanInput) => SensitiveScanResult
}

export class PrivacyConfirmationRequiredError extends Error {
  readonly name = "PrivacyConfirmationRequiredError"
  readonly privacyConfirmationSessionId: string
  readonly scanResult: SensitiveScanResult

  constructor(input: {
    readonly privacyConfirmationSessionId: string
    readonly scanResult: SensitiveScanResult
  }) {
    super("Privacy confirmation is required.")
    this.privacyConfirmationSessionId = input.privacyConfirmationSessionId
    this.scanResult = input.scanResult
  }
}

export function createPrivacyGuardService(config: PrivacyGuardServiceConfig) {
  const sessions = config.sessions ?? createPrivacyConfirmationSessionStore()
  const scan =
    config.scan ??
    ((input: PrivacyGuardScanInput) => {
      const action = privacyGuardActions[input.action]
      return scanSensitiveText({
        source: action.source,
        text: input.payload,
        location: {
          entityType: action.source,
          field: "payload",
          previewLabel: action.previewLabel,
        },
      })
    })

  return {
    assertAuthorized(input: PrivacyGuardAuthorizationInput): void {
      const scanResult = scan(input)
      const payload = JSON.stringify({ action: input.action, payload: input.payload })

      if (input.privacyConfirmationSessionId !== undefined) {
        sessions.consumePrivacyConfirmationSession({
          privacyConfirmationSessionId: input.privacyConfirmationSessionId,
          action: input.action,
          payload,
        })
        return
      }

      const settingEnabled = config.getPrivacySettings()[privacyGuardActions[input.action].setting]
      if (
        scanResult.criticalCount === 0 &&
        scanResult.highCount === 0 &&
        (!settingEnabled || (scanResult.mediumCount === 0 && scanResult.lowCount === 0))
      ) {
        return
      }

      const session = sessions.createPrivacyConfirmationSession({
        action: input.action,
        payload,
        maskedResult: scanResult,
      })
      throw new PrivacyConfirmationRequiredError({
        privacyConfirmationSessionId: session.id,
        scanResult: session.maskedResult,
      })
    },
  }
}

export type PrivacyGuardService = ReturnType<typeof createPrivacyGuardService>
