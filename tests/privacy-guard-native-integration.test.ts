import { describe, expect, it, vi } from "vitest"

import type { ExportPromptInput, PrivacySettings } from "../electron/ipc-types.js"
import { createPrivacyConfirmationSessionStore } from "../electron/privacy/privacy-confirmation-session-store.js"
import {
  createPrivacyGuardService,
  PrivacyConfirmationRequiredError,
} from "../electron/privacy/privacy-guard-service.js"
import { scanSensitiveText } from "../electron/privacy/scan-sensitive-text.js"
import { formatPromptExport } from "../electron/prompt-export-formatters.js"
import { createPromptExportNativeService } from "../electron/prompt-export-native.js"

const privacySettings = {
  warnBeforeLLM: false,
  warnBeforeExport: false,
  warnBeforeBackup: true,
  enableLibraryScan: true,
} as const satisfies PrivacySettings

const exportInput = {
  promptVersionId: "00000000-0000-4000-8000-000000000514",
  title: "Export title",
  scenario: "feature",
  targetAgent: "codex",
  originalInput: "Export original input",
  compiledPrompt: "Export compiled content",
  format: "codex",
} as const satisfies ExportPromptInput

function requiredConfirmation(
  action: () => Promise<unknown>,
): Promise<PrivacyConfirmationRequiredError> {
  return action().then(
    () => {
      throw new Error("Expected privacy confirmation to be required")
    },
    (error: unknown) => {
      if (error instanceof PrivacyConfirmationRequiredError) {
        return error
      }

      throw error
    },
  )
}

describe("privacy-guarded native exports", () => {
  it("formats before gating file output and gates clipboard mutation before it occurs", async () => {
    // Given: protected native export dependencies and a high-risk guard.
    const sessions = createPrivacyConfirmationSessionStore({
      createId: () => "00000000-0000-4000-8000-000000000517",
    })
    const scannedPayloads: string[] = []
    const guard = createPrivacyGuardService({
      getPrivacySettings: () => privacySettings,
      sessions,
      scan: (input) => {
        scannedPayloads.push(input.payload)
        return scanSensitiveText({
          source: "export",
          text: "Bearer test-token-for-native-guard-only",
        })
      },
    })
    const showSaveDialog = vi.fn(async () => ({
      canceled: false as const,
      filePath: "/tmp/export.md",
    }))
    const writeFile = vi.fn(async () => undefined)
    const copyText = vi.fn()
    const service = createPromptExportNativeService({
      showSaveDialog,
      writeFile,
      copyText,
      readText: () => "",
      privacyGuard: guard,
    })

    // When: file export and clipboard copy are first attempted, then confirmed independently.
    const fileConfirmation = await requiredConfirmation(() => service.savePromptToFile(exportInput))
    await service.savePromptToFile({
      ...exportInput,
      privacyConfirmationSessionId: fileConfirmation.privacyConfirmationSessionId,
    })
    const copyConfirmation = await requiredConfirmation(() =>
      service.copyText({ text: "Clipboard body" }),
    )
    await service.copyText({
      text: "Clipboard body",
      privacyConfirmationSessionId: copyConfirmation.privacyConfirmationSessionId,
    })

    // Then: dialogs and clipboard writes occur only after confirmation over their exact output text.
    expect(scannedPayloads).toEqual([
      formatPromptExport(exportInput).content,
      formatPromptExport(exportInput).content,
      "Clipboard body",
      "Clipboard body",
    ])
    expect(showSaveDialog).toHaveBeenCalledTimes(1)
    expect(writeFile).toHaveBeenCalledWith(
      "/tmp/export.md",
      formatPromptExport(exportInput).content,
    )
    expect(copyText).toHaveBeenCalledWith("Clipboard body")
  })
})
