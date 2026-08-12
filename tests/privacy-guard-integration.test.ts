import { describe, expect, it, vi } from "vitest"

import type { PrivacySettings, PromptCompilerCompileInput } from "../electron/ipc-types.js"
import { createPrivacyConfirmationSessionStore } from "../electron/privacy/privacy-confirmation-session-store.js"
import {
  createPrivacyGuardService,
  PrivacyConfirmationRequiredError,
} from "../electron/privacy/privacy-guard-service.js"
import { scanSensitiveText } from "../electron/privacy/scan-sensitive-text.js"
import {
  createPromptCompilerService,
  type PromptCompilerLLMRequest,
} from "../electron/prompt-compiler/prompt-compiler-service.js"
import { buildCompilePrompt } from "../electron/prompt-compiler/prompts.js"

const privacySettings = {
  warnBeforeLLM: false,
  warnBeforeExport: false,
  warnBeforeBackup: true,
  enableLibraryScan: true,
} as const satisfies PrivacySettings

const compilerInput = {
  originalInput: "Original compiler input",
  scenario: "feature",
  targetAgent: "codex",
  projectContext: "Manual project context",
  techStack: "TypeScript",
  constraints: "Manual constraints",
  acceptanceCriteria: "Manual acceptance criteria",
  validationCommands: "npm run typecheck",
  additionalNotes: "Manual notes",
  projectId: "00000000-0000-4000-8000-000000000511",
  projectContextProfileId: "00000000-0000-4000-8000-000000000512",
  includeProjectContextProfile: true,
  harnessTemplateId: "00000000-0000-4000-8000-000000000513",
  clarificationAnswers: [
    { questionId: "scope", question: "Which scope?", answer: "Only the requested scope." },
  ],
  assumptions: ["Preserve current behavior."],
} as const satisfies PromptCompilerCompileInput

function highRiskScan() {
  return scanSensitiveText({
    source: "draft",
    text: "Bearer test-token-without-any-production-secret",
  })
}

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

describe("privacy-guarded compiler", () => {
  it("gates the resolved compiler payload before key lookup and preserves compilation after confirmation", async () => {
    // Given: a compiler input with manual, resolved-profile, and selected-harness context.
    const sessions = createPrivacyConfirmationSessionStore({
      createId: () => "00000000-0000-4000-8000-000000000515",
    })
    const scannedPayloads: string[] = []
    const guard = createPrivacyGuardService({
      getPrivacySettings: () => privacySettings,
      sessions,
      scan: (input) => {
        scannedPayloads.push(input.payload)
        return highRiskScan()
      },
    })
    const keyLookup = vi.fn<() => Promise<string | null>>().mockResolvedValue("test-key")
    const requests: PromptCompilerLLMRequest[] = []
    const service = createPromptCompilerService({
      getDefaults: () => ({
        defaultModel: "gpt-4.1",
        defaultTargetAgent: "codex",
        defaultProjectId: null,
        defaultScenario: "feature",
        appTheme: "system",
        compilerDefaultLanguage: "ko",
      }),
      getOpenAIKeyForMainProcessOnly: keyLookup,
      getHarnessTemplate: () => ({
        id: compilerInput.harnessTemplateId,
        name: "Harness",
        scenario: "feature",
        targetAgent: "codex",
        templateBody: "Resolved harness context",
        requiredFields: "[]",
        clarificationPolicy: "[]",
        createdAt: 0,
        updatedAt: 0,
      }),
      getProjectContextProfileForCompiler: () => ({
        profileId: compilerInput.projectContextProfileId,
        profileName: "Profile",
        context: "Resolved profile context",
        sectionNames: [],
        warnings: [],
      }),
      createClient: () => ({
        createStructuredResponse: async (request) => {
          requests.push(request)
          return JSON.stringify({
            title: "Compiled title",
            scenario: "feature",
            targetAgent: "codex",
            summary: "Compiled summary",
            compiledPrompt: [
              "# Objective\nvalue",
              "# Context\nvalue",
              "# Task\nvalue",
              "# Scope\nvalue",
              "# Constraints\nvalue",
              "# Acceptance Criteria\nvalue",
              "# Validation\nvalue",
              "# Working Instructions\nvalue",
              "# Final Response Format\nvalue",
            ].join("\n\n"),
            assumptions: [],
            questions: [],
            answers: [],
            acceptanceCriteria: [],
            validationCommands: [],
            suggestedTags: [],
            qualityScore: 80,
            warnings: [],
          })
        },
      }),
      privacyGuard: guard,
    })

    // When: compilation is retried with the one-use confirmation from the initial rejection.
    const confirmation = await requiredConfirmation(() => service.compile(compilerInput))
    const result = await service.compile({
      ...compilerInput,
      privacyConfirmationSessionId: confirmation.privacyConfirmationSessionId,
    })

    // Then: no key is read before consent, and the exact LLM payload is scanned before compiling.
    expect(keyLookup).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(true)
    expect(scannedPayloads).toEqual([
      buildCompilePrompt(compilerInput, "Resolved harness context", "Resolved profile context"),
      requests[0]?.userPrompt,
    ])
  })
})
