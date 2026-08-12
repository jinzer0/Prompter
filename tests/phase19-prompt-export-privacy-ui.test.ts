import { describe, expect, it, vi } from "vitest"

import type {
  CopyTextResponse,
  ExportFormat,
  ExportPromptResult,
  SavePromptToFileResponse,
  SensitiveScanResult,
} from "../electron/ipc-types"
import {
  cancelPrivacyWarning,
  confirmPrivacyWarning,
  openPrivacyWarning,
  type PrivacyWarningPendingRef,
} from "../renderer/src/hooks/use-privacy-warning"
import type { PromptExportBase } from "../renderer/src/lib/prompt-export"
import {
  captureCopyPromptExportAction,
  captureSavePromptExportAction,
  executeCapturedPromptExportAction,
  type PromptExportActionBridge,
  type PromptExportSnapshot,
  promptExportSnapshotsMatch,
} from "../renderer/src/lib/prompt-export-privacy-actions"

const formats = [
  "markdown",
  "codex",
  "claude_code",
  "cursor",
  "generic_agent",
  "agents_md",
  "skill_md",
] as const satisfies readonly ExportFormat[]

const exportBase = {
  promptVersionId: "22222222-2222-4222-8222-222222222222",
  title: "Privacy export",
  scenario: "feature",
  targetAgent: "codex",
  originalInput: "Original input",
  compiledPrompt: "Previous compiled content",
} as const satisfies PromptExportBase
const rawContent = "Exact compiled content"
const privacyConfirmationSessionId = "33333333-3333-4333-8333-333333333333"
const scanResult = {
  scannedAt: 1_000,
  source: "export",
  findingCount: 1,
  criticalCount: 0,
  highCount: 1,
  mediumCount: 0,
  lowCount: 0,
  findings: [
    {
      id: "masked-export-finding",
      severity: "high",
      category: "openai_api_key",
      label: "OpenAI API key candidate",
      description: "A key-shaped value needs review.",
      location: { entityType: "export", field: "payload", previewLabel: "Prompt export" },
      evidenceMasked: "sk-proj-...abcd",
      confidence: "high",
      recommendation: "Remove the value before sharing this content.",
    },
  ],
  safeToProceed: false,
  warnings: ["High-risk findings require confirmation."],
} satisfies SensitiveScanResult

function copyConfirmationRequired(): CopyTextResponse {
  return {
    status: "confirmation_required",
    privacyConfirmationSessionId,
    scanResult,
    copied: true,
  }
}

function saveConfirmationRequired(): SavePromptToFileResponse {
  return {
    status: "confirmation_required",
    privacyConfirmationSessionId,
    scanResult,
    cancelled: true,
  }
}

describe("Phase 19 prompt export privacy UI", () => {
  it.each(
    formats,
  )("copies the exact generated %s content only after one confirmed retry", async (format) => {
    // Given: one distinct formatter result and a clipboard bridge that gates its first call.
    const exactContent = `exact-${format}-content`
    const formatPrompt = vi.fn(
      async (): Promise<ExportPromptResult> => ({
        format,
        filename: `${format}.md`,
        content: exactContent,
        mimeType: "text/markdown",
      }),
    )
    const copyText = vi
      .fn<PromptExportActionBridge["copyText"]>()
      .mockResolvedValueOnce(copyConfirmationRequired())
      .mockResolvedValueOnce({ copied: true })
    const bridge = {
      copyText,
      savePromptToFile: vi.fn<PromptExportActionBridge["savePromptToFile"]>(),
    } satisfies PromptExportActionBridge
    const action = await captureCopyPromptExportAction({
      formatPrompt,
      snapshot: { exportBase, format, label: format, rawContent },
    })
    if (action === null) throw new TypeError("Expected a captured copy action")

    // When: the typed confirmation is accepted once with its returned session ID.
    const first = await executeCapturedPromptExportAction({ action, bridge })
    if (first.kind !== "confirmation_required") {
      throw new TypeError("Expected copy confirmation")
    }
    const confirmed = await executeCapturedPromptExportAction({
      action,
      bridge,
      privacyConfirmationSessionId: first.privacyConfirmationSessionId,
    })

    // Then: formatting precedes copying and both attempts use byte-identical content.
    expect(formatPrompt).toHaveBeenCalledTimes(1)
    expect(copyText).toHaveBeenCalledTimes(2)
    expect(copyText).toHaveBeenNthCalledWith(1, { text: exactContent })
    expect(copyText).toHaveBeenNthCalledWith(2, {
      text: exactContent,
      privacyConfirmationSessionId,
    })
    expect(confirmed).toEqual({ kind: "completed", destination: "copy" })
  })

  it.each(
    formats,
  )("saves the captured %s action only after one confirmed retry", async (format) => {
    // Given: a format/content snapshot and a save bridge that gates before its native dialog.
    const savePromptToFile = vi
      .fn<PromptExportActionBridge["savePromptToFile"]>()
      .mockResolvedValueOnce(saveConfirmationRequired())
      .mockResolvedValueOnce({ cancelled: false, filePath: `/tmp/${format}.md` })
    const bridge = {
      copyText: vi.fn<PromptExportActionBridge["copyText"]>(),
      savePromptToFile,
    } satisfies PromptExportActionBridge
    const action = captureSavePromptExportAction({
      exportBase,
      format,
      label: format,
      rawContent,
    })
    if (action === null) throw new TypeError("Expected a captured save action")

    // When: the renderer retries the immutable action with the returned session ID.
    const first = await executeCapturedPromptExportAction({ action, bridge })
    if (first.kind !== "confirmation_required") {
      throw new TypeError("Expected save confirmation")
    }
    const confirmed = await executeCapturedPromptExportAction({
      action,
      bridge,
      privacyConfirmationSessionId: first.privacyConfirmationSessionId,
    })

    // Then: AGENTS.md, SKILL.md, and every peer format retain the same source snapshot.
    expect(savePromptToFile).toHaveBeenNthCalledWith(1, {
      ...exportBase,
      compiledPrompt: rawContent,
      format,
    })
    expect(savePromptToFile).toHaveBeenNthCalledWith(2, {
      ...exportBase,
      compiledPrompt: rawContent,
      format,
      privacyConfirmationSessionId,
    })
    expect(confirmed).toEqual({ kind: "completed", destination: "save" })
  })

  it("invalidates a captured action when content or format changes during review", async () => {
    // Given: a pending export warning whose retry would perform a clipboard action.
    const copyText = vi
      .fn<PromptExportActionBridge["copyText"]>()
      .mockResolvedValue({ copied: true })
    const bridge = {
      copyText,
      savePromptToFile: vi.fn<PromptExportActionBridge["savePromptToFile"]>(),
    } satisfies PromptExportActionBridge
    const action = await captureCopyPromptExportAction({
      formatPrompt: async () => ({
        format: "agents_md",
        filename: "AGENTS.snippet.md",
        content: "captured AGENTS.md content",
        mimeType: "text/markdown",
      }),
      snapshot: { exportBase, format: "agents_md", label: "AGENTS.md", rawContent },
    })
    if (action === null) throw new TypeError("Expected a captured copy action")
    const pending: PrivacyWarningPendingRef = { current: null }
    openPrivacyWarning(pending, () => undefined, {
      scanResult,
      retry: async () => {
        await executeCapturedPromptExportAction({
          action,
          bridge,
          privacyConfirmationSessionId,
        })
      },
    })

    // When: a selected format or source-content change cancels the stale warning before confirm.
    await cancelPrivacyWarning(pending, () => undefined)
    await confirmPrivacyWarning(pending, () => undefined)

    // Then: the stale session never reaches the destination.
    expect(copyText).not.toHaveBeenCalled()
  })

  it("rejects stale format, content, and export-base snapshots", () => {
    // Given: the immutable snapshot that started a protected export.
    const captured = {
      exportBase,
      format: "agents_md",
      label: "AGENTS.md",
      rawContent,
    } satisfies PromptExportSnapshot

    // When: each input that affects generated bytes changes independently.
    // Then: only the byte-identical current snapshot remains eligible for confirmation.
    expect(promptExportSnapshotsMatch(captured, captured)).toBe(true)
    expect(
      promptExportSnapshotsMatch(captured, { ...captured, exportBase: { ...exportBase } }),
    ).toBe(true)
    expect(promptExportSnapshotsMatch(captured, { ...captured, format: "skill_md" })).toBe(false)
    expect(promptExportSnapshotsMatch(captured, { ...captured, rawContent: "Changed" })).toBe(false)
    expect(
      promptExportSnapshotsMatch(captured, {
        ...captured,
        exportBase: { ...exportBase, title: "Changed title" },
      }),
    ).toBe(false)
  })

  it("distinguishes native save-dialog cancellation from privacy review cancellation", async () => {
    // Given: a captured SKILL.md save whose confirmed native dialog is cancelled.
    const savePromptToFile = vi
      .fn<PromptExportActionBridge["savePromptToFile"]>()
      .mockResolvedValue({ cancelled: true })
    const bridge = {
      copyText: vi.fn<PromptExportActionBridge["copyText"]>(),
      savePromptToFile,
    } satisfies PromptExportActionBridge
    const action = captureSavePromptExportAction({
      exportBase,
      format: "skill_md",
      label: "SKILL.md",
      rawContent,
    })
    if (action === null) throw new TypeError("Expected a captured save action")

    // When: the protected save reaches the native cancellation result.
    const result = await executeCapturedPromptExportAction({ action, bridge })

    // Then: native cancellation has its own outcome and no privacy confirmation is reported.
    expect(result).toEqual({ kind: "native_save_cancelled" })
  })
})
