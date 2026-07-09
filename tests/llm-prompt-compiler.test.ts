import { describe, expect, it } from "vitest"

import type { SettingsDefaults } from "../electron/ipc-types"
import {
  createPromptCompilerService,
  type PromptCompilerLLMClient,
  type PromptCompilerLLMRequest,
} from "../electron/prompt-compiler/prompt-compiler-service"

const settingsDefaults = {
  defaultModel: "gpt-4.1-mini",
  defaultTargetAgent: "codex",
  defaultProjectId: null,
  defaultScenario: "feature",
  appTheme: "system",
  compilerDefaultLanguage: "ko",
} as const satisfies SettingsDefaults

const requiredSections = [
  "# Objective",
  "# Context",
  "# Task",
  "# Scope",
  "# Constraints",
  "# Acceptance Criteria",
  "# Validation",
  "# Working Instructions",
  "# Final Response Format",
] as const

const compiledPrompt = requiredSections
  .map((section) => `${section}\nPhase 5 content for ${section.slice(2).toLowerCase()}.`)
  .join("\n\n")

type FakeServiceConfig = {
  readonly apiKey: string | null
  readonly responseText: string
  readonly failWithSecret?: string
}

function createFakeService(config: FakeServiceConfig) {
  const requests: PromptCompilerLLMRequest[] = []
  const client: PromptCompilerLLMClient = {
    async createStructuredResponse(request) {
      requests.push(request)

      if (config.failWithSecret !== undefined) {
        throw new Error(`upstream rejected ${config.failWithSecret}`)
      }

      return config.responseText
    },
  }

  const service = createPromptCompilerService({
    getDefaults: () => settingsDefaults,
    getOpenAIKeyForMainProcessOnly: async () => config.apiKey,
    createClient: () => client,
  })

  return { requests, service }
}

describe("LLM prompt compiler service", () => {
  it("analyzes original input with a stored OpenAI key and validates the structured response", async () => {
    const { requests, service } = createFakeService({
      apiKey: "sk-proj-service-secret-value-1234",
      responseText: JSON.stringify({
        detectedScenario: "bugfix",
        detectedTargetAgent: "codex",
        summary: "The request needs a focused regression fix.",
        clarificationNeeded: true,
        questions: [
          {
            id: "reproduction",
            question: "Which action reproduces the bug?",
            whyItMatters: "The agent needs a deterministic failing path.",
            options: ["Project switching", "Prompt saving"],
            required: true,
          },
        ],
        assumptions: ["The app remains local-first."],
        suggestedTags: ["bugfix"],
        riskLevel: "medium",
      }),
    })

    const result = await service.analyze({
      originalInput: "Fix stale prompts after project switching.",
      scenario: "bugfix",
      targetAgent: "codex",
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.value.questions).toHaveLength(1)
      expect(result.value.questions[0]?.id).toBe("reproduction")
      expect(result.value.riskLevel).toBe("medium")
    }

    expect(requests[0]?.model).toBe("gpt-4.1-mini")
    expect(requests[0]?.schemaName).toBe("prompt_compiler_analyze")
  })

  it("compiles answered clarifications into markdown with every required section", async () => {
    const { requests, service } = createFakeService({
      apiKey: "sk-proj-service-secret-value-5678",
      responseText: JSON.stringify({
        title: "Fix stale prompt list",
        scenario: "bugfix",
        targetAgent: "codex",
        summary: "Repair stale project-scoped prompts.",
        compiledPrompt,
        assumptions: ["The repository has existing prompt library tests."],
        questions: [],
        answers: [
          {
            questionId: "reproduction",
            question: "Which action reproduces the bug?",
            answer: "Switch from Project Alpha to Project Beta.",
          },
        ],
        acceptanceCriteria: ["Project Beta never shows Project Alpha prompts."],
        validationCommands: ["npm run test:smoke"],
        suggestedTags: ["bugfix", "regression"],
        qualityScore: 87,
        warnings: [],
      }),
    })

    const result = await service.compile({
      originalInput: "Fix stale prompts after project switching.",
      scenario: "bugfix",
      targetAgent: "codex",
      clarificationAnswers: [
        {
          questionId: "reproduction",
          question: "Which action reproduces the bug?",
          answer: "Switch from Project Alpha to Project Beta.",
        },
      ],
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      for (const section of requiredSections) {
        expect(result.value.compiledPrompt).toContain(section)
      }

      expect(result.value.qualityScore).toBe(87)
      expect(result.value.validationCommands).toEqual(["npm run test:smoke"])
    }

    expect(requests[0]?.schemaName).toBe("prompt_compiler_compile")
  })

  it("returns a recoverable missing-key error before creating an OpenAI client", async () => {
    const { requests, service } = createFakeService({
      apiKey: null,
      responseText: "{}",
    })

    const result = await service.analyze({ originalInput: "Add a prompt compiler." })

    expect(result).toEqual({
      ok: false,
      code: "missing_openai_key",
      message: "Add an OpenAI API key in Settings before using LLM prompt compilation.",
    })
    expect(requests).toHaveLength(0)
  })

  it("returns recoverable invalid-output errors for malformed JSON or schema violations", async () => {
    const malformed = createFakeService({
      apiKey: "sk-proj-service-secret-value-9012",
      responseText: "not json",
    })
    const tooManyQuestions = createFakeService({
      apiKey: "sk-proj-service-secret-value-9012",
      responseText: JSON.stringify({
        detectedScenario: "feature",
        detectedTargetAgent: "codex",
        summary: "Too many questions.",
        clarificationNeeded: true,
        questions: ["one", "two", "three", "four"].map((id) => ({
          id,
          question: `Question ${id}?`,
          whyItMatters: "It changes implementation quality.",
          required: true,
        })),
        assumptions: [],
        suggestedTags: [],
        riskLevel: "low",
      }),
    })

    await expect(
      malformed.service.compile({
        originalInput: "Compile this request.",
        scenario: "feature",
        targetAgent: "codex",
      }),
    ).resolves.toMatchObject({ ok: false, code: "invalid_llm_output" })
    await expect(
      tooManyQuestions.service.analyze({
        originalInput: "Analyze this request.",
      }),
    ).resolves.toMatchObject({ ok: false, code: "invalid_llm_output" })
  })

  it("sanitizes OpenAI request failures without leaking plaintext API keys", async () => {
    const plaintextKey = "sk-proj-service-secret-value-leak-check"
    const { service } = createFakeService({
      apiKey: plaintextKey,
      responseText: "{}",
      failWithSecret: plaintextKey,
    })

    const result = await service.compile({
      originalInput: "Compile this request.",
      scenario: "feature",
      targetAgent: "codex",
    })

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.code).toBe("openai_request_failed")
      expect(result.message).not.toContain(plaintextKey)
    }
  })
})
