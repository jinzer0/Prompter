import { describe, expect, it, vi } from "vitest"

import type { ExportFormat, ExportPromptInput } from "../electron/ipc-types.js"
import {
  createPrivacyGuardService,
  PrivacyConfirmationRequiredError,
} from "../electron/privacy/privacy-guard-service.js"
import { privacySettingsSchema } from "../electron/privacy/privacy-schemas.js"
import { scanSensitiveText } from "../electron/privacy/scan-sensitive-text.js"
import { formatPromptExport } from "../electron/prompt-export-formatters.js"
import { createPromptExportNativeService } from "../electron/prompt-export-native.js"

const exportInput = {
  promptVersionId: "00000000-0000-4000-8000-000000000521",
  title: "Format coverage",
  scenario: "feature",
  targetAgent: "codex",
  originalInput: "Original export input",
  compiledPrompt: "Compiled export payload",
  format: "markdown",
} as const satisfies ExportPromptInput

const formats = [
  "markdown",
  "codex",
  "claude_code",
  "cursor",
  "generic_agent",
  "agents_md",
  "skill_md",
] as const satisfies readonly ExportFormat[]

describe("privacy guard export formats", () => {
  it("formats every file export before its exact final bytes are gated", async () => {
    // Given: all supported file formats and a guard that requires confirmation for each output.
    const scannedPayloads: string[] = []
    const showSaveDialog = vi.fn(async () => ({
      canceled: false as const,
      filePath: "/tmp/export.md",
    }))
    const writeFile = vi.fn(async () => undefined)
    const service = createPromptExportNativeService({
      showSaveDialog,
      writeFile,
      copyText: () => undefined,
      readText: () => "",
      privacyGuard: createPrivacyGuardService({
        getPrivacySettings: () => privacySettingsSchema.parse({}),
        scan: (input) => {
          scannedPayloads.push(input.payload)
          return scanSensitiveText({
            source: "export",
            text: "Bearer test-token-for-privacy-guard-only",
          })
        },
      }),
    })

    // When: every format retries its initial gate response with the one-use session ID.
    for (const format of formats) {
      let confirmation: PrivacyConfirmationRequiredError | null = null
      try {
        await service.savePromptToFile({ ...exportInput, format })
      } catch (error) {
        if (error instanceof PrivacyConfirmationRequiredError) {
          confirmation = error
        } else {
          throw error
        }
      }
      if (confirmation === null) {
        throw new Error("Expected privacy confirmation to be required")
      }
      await service.savePromptToFile({
        ...exportInput,
        format,
        privacyConfirmationSessionId: confirmation.privacyConfirmationSessionId,
      })
    }

    // Then: every exact formatted output is scanned before its normal native export behavior.
    expect(scannedPayloads).toEqual(
      formats.flatMap((format) => {
        const content = formatPromptExport({ ...exportInput, format }).content
        return [content, content]
      }),
    )
    expect(showSaveDialog).toHaveBeenCalledTimes(formats.length)
    expect(writeFile).toHaveBeenCalledTimes(formats.length)
  })
})
