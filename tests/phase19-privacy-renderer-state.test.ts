import { describe, expect, it, vi } from "vitest"

import type {
  PrivacyBridge,
  PrivacySettings,
  PromptCompilerAnalyzeInput,
  PromptCompilerCompileInput,
  PromptQualityReviewSnapshot,
  SensitiveFinding,
  SensitiveScanResult,
} from "../electron/ipc-types"
import {
  confirmedAnalyzeRequest,
  confirmedCompileRequest,
} from "../renderer/src/hooks/use-compiler-llm-actions"
import {
  createInitialPrivacyScanState,
  type PrivacyScanEvent,
  runPrivacyScan,
} from "../renderer/src/hooks/use-privacy-scan"
import {
  DEFAULT_PRIVACY_SETTINGS,
  type PrivacySettingsEvent,
  persistPrivacySettings,
} from "../renderer/src/hooks/use-privacy-settings"
import {
  cancelPrivacyWarning,
  confirmPrivacyWarning,
  openPrivacyWarning,
  type PrivacyWarningPendingRef,
  type PrivacyWarningState,
} from "../renderer/src/hooks/use-privacy-warning"
import { confirmedPromptQualityRequest } from "../renderer/src/hooks/use-prompt-quality"
import {
  type CompilerDraftPrivacyContent,
  scanCompilerDraftPrivacy,
} from "../renderer/src/lib/prompt-compiler/compiler-privacy-scan"
import { emptyCompilerInput } from "../renderer/src/lib/prompt-compiler/llm-compiler-flow"

const finding = {
  id: "openai-key-candidate",
  severity: "high",
  category: "openai_api_key",
  label: "OpenAI API key candidate",
  description: "A key-shaped value needs review.",
  location: {
    entityType: "prompt_version",
    entityId: "8f529b76-09d2-45ee-8f16-57910a1dfa26",
    field: "originalInput",
    previewLabel: "Draft request",
  },
  evidenceMasked: "sk-proj-...abcd",
  confidence: "high",
  recommendation: "Remove the value before sharing this content.",
} satisfies SensitiveFinding

const scanResult = {
  scannedAt: 1_000,
  source: "draft",
  findingCount: 1,
  criticalCount: 0,
  highCount: 1,
  mediumCount: 0,
  lowCount: 0,
  findings: [finding],
  safeToProceed: false,
  warnings: ["High-risk findings require confirmation."],
} satisfies SensitiveScanResult

describe("Phase 19 privacy renderer state", () => {
  it("scans every current compiler text only when the explicit command runs", async () => {
    // Given: exact compiler bytes and an injected privacy bridge.
    const baseResult = {
      ...scanResult,
      findingCount: 0,
      highCount: 0,
      findings: [],
      safeToProceed: true,
    }
    const scanDraft = vi.fn<PrivacyBridge["scanDraft"]>().mockResolvedValue(baseResult)
    const scanText = vi.fn<PrivacyBridge["scanText"]>().mockResolvedValue(baseResult)
    const bridge = { scanDraft, scanText } satisfies Pick<PrivacyBridge, "scanDraft" | "scanText">
    const content = {
      answers: { question: "  clarification answer  " },
      draft: {
        ...emptyCompilerInput,
        originalInput: "  original bytes  ",
        projectContext: "  manual context  ",
        techStack: "TypeScript",
        constraints: "  constraints  ",
        acceptanceCriteria: "  acceptance  ",
        validationCommands: "  npm test  ",
        additionalNotes: "  notes  ",
        includeProjectContextProfile: true,
      },
      editablePrompt: "  editable output  ",
      includedProjectContext: "  included profile  ",
      selectedHarnessTemplate: "  harness text  ",
      selectedPromptTemplate: "  prompt template text  ",
    } satisfies CompilerDraftPrivacyContent

    // When: no action runs, then the explicit scan command receives the captured content.
    expect(scanDraft).not.toHaveBeenCalled()
    expect(scanText).not.toHaveBeenCalled()
    await scanCompilerDraftPrivacy(bridge, content)

    // Then: base and included text preserve bytes without changing the source content.
    expect(scanDraft).toHaveBeenCalledWith({
      acceptanceCriteria: "  acceptance  ",
      additionalNotes: "  notes  ",
      compiledPrompt: "  editable output  ",
      constraints: "  constraints  ",
      originalInput: "  original bytes  ",
      projectContext: "  manual context  ",
      techStack: "TypeScript",
      validationCommands: "  npm test  ",
    })
    expect(scanText.mock.calls.map(([input]) => [input.location?.field, input.text])).toEqual([
      ["projectContextProfile", "  included profile  "],
      ["harnessTemplate", "  harness text  "],
      ["promptTemplate", "  prompt template text  "],
      ["clarificationAnswer:question", "  clarification answer  "],
    ])
    expect(content.draft.originalInput).toBe("  original bytes  ")
    expect(content.editablePrompt).toBe("  editable output  ")
  })

  it("adds one confirmation session to exact captured compiler and quality requests", () => {
    // Given: captured requests whose prompt-bearing fields contain significant whitespace.
    const sessionId = "11111111-1111-4111-8111-111111111111"
    const analyzeRequest = {
      originalInput: "  analyze bytes  ",
      scenario: "feature",
      targetAgent: "codex",
      additionalNotes: "  analyze notes  ",
    } satisfies PromptCompilerAnalyzeInput
    const compileRequest = {
      ...analyzeRequest,
      clarificationAnswers: [
        { questionId: "q1", question: "Question", answer: "  exact answer  " },
      ],
    } satisfies PromptCompilerCompileInput
    const qualitySnapshot = {
      compiledPrompt: "  compiled review bytes  ",
      originalInput: "  original review bytes  ",
      scenario: "feature",
      targetAgent: "codex",
      harnessTemplateId: null,
      projectContextProfileId: null,
      includeProjectContextProfile: false,
      projectContext: "  review context  ",
      constraints: null,
      acceptanceCriteria: null,
      validationCommands: null,
    } satisfies PromptQualityReviewSnapshot

    // When: confirmation retry inputs are created from the captured requests.
    const confirmedAnalyze = confirmedAnalyzeRequest(analyzeRequest, sessionId)
    const confirmedCompile = confirmedCompileRequest(compileRequest, sessionId)
    const confirmedQuality = confirmedPromptQualityRequest(qualitySnapshot, sessionId)

    // Then: only the one-use session ID is added to each exact captured request.
    expect(confirmedAnalyze).toEqual({ ...analyzeRequest, privacyConfirmationSessionId: sessionId })
    expect(confirmedCompile).toEqual({ ...compileRequest, privacyConfirmationSessionId: sessionId })
    expect(confirmedQuality).toEqual({
      ...qualitySnapshot,
      privacyConfirmationSessionId: sessionId,
    })
    expect(analyzeRequest).not.toHaveProperty("privacyConfirmationSessionId")
    expect(compileRequest).not.toHaveProperty("privacyConfirmationSessionId")
    expect(qualitySnapshot).not.toHaveProperty("privacyConfirmationSessionId")
  })

  it("keeps scans idle until a manual command runs", async () => {
    // Given: an injected scanner and untouched scan state.
    const scan =
      vi.fn<
        (input: { readonly source: "draft"; readonly text: string }) => Promise<SensitiveScanResult>
      >()
    scan.mockResolvedValue(scanResult)
    const events: PrivacyScanEvent[] = []
    const busy = { current: false }

    // When: initial state is inspected before manually running the command.
    const initial = createInitialPrivacyScanState()

    // Then: no scan occurs until the explicit command, which emits its complete state cycle.
    expect(initial).toEqual({ kind: "idle" })
    expect(scan).not.toHaveBeenCalled()

    await runPrivacyScan({
      busy,
      dispatch: (event) => events.push(event),
      input: { source: "draft", text: "manually scanned draft" },
      scan,
    })
    expect(events).toEqual([
      { type: "scan_started" },
      { type: "scan_succeeded", result: scanResult },
    ])
  })

  it("clears a pending warning before awaiting one immutable retry", async () => {
    // Given: a pending warning with a retry that remains unresolved.
    const retryResolvers: Array<() => void> = []
    const retry = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          retryResolvers.push(resolve)
        }),
    )
    const pending: PrivacyWarningPendingRef = { current: null }
    const states: PrivacyWarningState[] = []
    openPrivacyWarning(pending, (state) => states.push(state), { scanResult, retry })

    // When: confirm is submitted twice before the first retry settles.
    const firstConfirmation = confirmPrivacyWarning(pending, (state) => states.push(state))
    const duplicateConfirmation = confirmPrivacyWarning(pending, (state) => states.push(state))

    // Then: pending is cleared synchronously and retry runs only once.
    expect(pending.current).toBeNull()
    expect(states.at(-1)).toEqual({ kind: "idle" })
    expect(retry).toHaveBeenCalledTimes(1)
    const resolveRetry = retryResolvers[0]
    if (resolveRetry === undefined) throw new TypeError("Expected retry to be pending")
    resolveRetry()
    await Promise.all([firstConfirmation, duplicateConfirmation])
  })

  it("cancels without retrying and invokes the optional cancellation callback", async () => {
    // Given: a pending confirmation with retry and cancellation callbacks.
    const retry = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const onCancel = vi.fn<() => void>()
    const pending: PrivacyWarningPendingRef = { current: null }
    const states: PrivacyWarningState[] = []
    openPrivacyWarning(pending, (state) => states.push(state), {
      scanResult,
      retry,
      onCancel,
    })

    // When: cancellation is requested.
    await cancelPrivacyWarning(pending, (state) => states.push(state))

    // Then: only cancellation runs and the warning closes.
    expect(retry).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(states.at(-1)).toEqual({ kind: "idle" })
  })

  it("persists safe defaults only through the injected typed privacy bridge", async () => {
    // Given: a typed bridge fake and the safe renderer defaults.
    const updated = {
      ...DEFAULT_PRIVACY_SETTINGS,
      enableLibraryScan: false,
    } satisfies PrivacySettings
    const updateSettings = vi.fn<PrivacyBridge["updateSettings"]>().mockResolvedValue(updated)
    const bridge = {
      updateSettings,
    } satisfies Pick<PrivacyBridge, "updateSettings">
    const events: PrivacySettingsEvent[] = []

    // When: settings are explicitly persisted.
    await persistPrivacySettings({
      bridge,
      dispatch: (event) => events.push(event),
      settings: updated,
    })

    // Then: the bridge receives the typed settings and reports the persisted result.
    expect(DEFAULT_PRIVACY_SETTINGS).toEqual({
      warnBeforeLLM: true,
      warnBeforeExport: true,
      warnBeforeBackup: true,
      enableLibraryScan: true,
    })
    expect(updateSettings).toHaveBeenCalledWith(updated)
    expect(events).toEqual([
      { type: "save_started" },
      { type: "save_succeeded", settings: updated },
    ])
  })
})
