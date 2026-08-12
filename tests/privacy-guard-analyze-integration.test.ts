import { describe, expect, it, vi } from "vitest"

import type { PrivacySettings, PromptCompilerAnalyzeInput } from "../electron/ipc-types.js"
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
import { buildAnalyzePrompt } from "../electron/prompt-compiler/prompts.js"

const privacySettings = {
  warnBeforeLLM: false,
  warnBeforeExport: false,
  warnBeforeBackup: true,
  enableLibraryScan: true,
} as const satisfies PrivacySettings

const analyzeInput = {
  originalInput: "Original analyze input",
  scenario: "feature",
  targetAgent: "codex",
  projectContext: "Manual analyze context",
  techStack: "TypeScript",
  constraints: "Manual analyze constraints",
  acceptanceCriteria: "Manual analyze acceptance criteria",
  validationCommands: "npm run typecheck",
  additionalNotes: "Manual analyze notes",
  projectId: "00000000-0000-4000-8000-000000000541",
  projectContextProfileId: "00000000-0000-4000-8000-000000000542",
  includeProjectContextProfile: true,
  harnessTemplateId: "00000000-0000-4000-8000-000000000543",
} as const satisfies PromptCompilerAnalyzeInput

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

describe("privacy-guarded compiler analysis", () => {
  it("gates the resolved analyze payload before key lookup and forwards the same payload after confirmation", async () => {
    // Given: an analyze request with manual, selected-harness, and resolved-profile context.
    const sessions = createPrivacyConfirmationSessionStore({
      createId: () => "00000000-0000-4000-8000-000000000544",
    })
    const scannedPayloads: string[] = []
    const guard = createPrivacyGuardService({
      getPrivacySettings: () => privacySettings,
      sessions,
      scan: (input) => {
        scannedPayloads.push(input.payload)
        return scanSensitiveText({
          source: "draft",
          text: "Bearer test-token-for-analyze-guard-only",
        })
      },
    })
    const keyLookup = vi.fn<() => Promise<string | null>>().mockResolvedValue("test-key")
    const requests: PromptCompilerLLMRequest[] = []
    const harnessText = "Resolved analyze harness"
    const profileText = "Resolved analyze profile"
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
        id: analyzeInput.harnessTemplateId,
        name: "Analyze Harness",
        scenario: "feature",
        targetAgent: "codex",
        templateBody: harnessText,
        requiredFields: "[]",
        clarificationPolicy: "[]",
        createdAt: 0,
        updatedAt: 0,
      }),
      getProjectContextProfileForCompiler: () => ({
        profileId: analyzeInput.projectContextProfileId,
        profileName: "Analyze Profile",
        context: profileText,
        sectionNames: [],
        warnings: [],
      }),
      createClient: () => ({
        createStructuredResponse: async (request) => {
          requests.push(request)
          return JSON.stringify({
            detectedScenario: "feature",
            detectedTargetAgent: "codex",
            summary: "Analyzed summary",
            clarificationNeeded: false,
            questions: [],
            assumptions: [],
            suggestedTags: [],
            riskLevel: "low",
          })
        },
      }),
      privacyGuard: guard,
    })

    // When: analysis resumes using the one-use confirmation from the initial gate response.
    const confirmation = await requiredConfirmation(() => service.analyze(analyzeInput))
    const result = await service.analyze({
      ...analyzeInput,
      privacyConfirmationSessionId: confirmation.privacyConfirmationSessionId,
    })

    // Then: the key is read only after consent and the scanned payload is the LLM request body.
    expect(keyLookup).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(true)
    expect(scannedPayloads).toEqual([
      buildAnalyzePrompt(analyzeInput, harnessText, profileText),
      requests[0]?.userPrompt,
    ])
  })
})
