import { describe, expect, it } from "vitest"

import type {
  HarnessTemplate,
  ProjectContextCompilerBuildResult,
  PromptCompilerAnalyzeOutput,
  PromptCompilerCompileOutput,
  SettingsDefaults,
} from "../electron/ipc-types"
import {
  createPromptCompilerService,
  type PromptCompilerLLMClient,
  type PromptCompilerLLMRequest,
} from "../electron/prompt-compiler/prompt-compiler-service"
import { registerHarnessPromptCompilerCases } from "./llm-prompt-compiler-harness-cases"

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
  readonly harnessTemplate?: HarnessTemplate | null
  readonly projectContextProfile?: ProjectContextCompilerBuildResult | null
}

type ProjectContextProfileRequest = {
  readonly projectId: string
  readonly profileId: string
}

const projectId = "44444444-4444-4444-8444-444444444444"
const projectContextProfileId = "66666666-6666-4666-8666-666666666666"
const resolvedProfileContext = [
  "## Project Context Profile",
  "### Summary",
  "Prompter is a local-first Electron prompt library.",
  "### Forbidden Actions",
  "Do not add prompt run storage.",
].join("\n")
const missingProfileWarning =
  "Selected project context profile is unavailable; profile context was excluded."
const missingProfileInputWarning =
  "Project context profile inclusion requires a project and profile; profile context was excluded."

function projectContextProfileResolution(
  context: string | null,
  warnings: readonly string[] = [],
): ProjectContextCompilerBuildResult {
  return {
    profileId: context === null ? null : projectContextProfileId,
    profileName: context === null ? null : "Default Context",
    context,
    sectionNames: context === null ? [] : ["## Project Context Profile"],
    warnings: [...warnings],
  }
}

function analyzeResponse(
  overrides: Partial<PromptCompilerAnalyzeOutput> = {},
): PromptCompilerAnalyzeOutput {
  return {
    detectedScenario: "bugfix",
    detectedTargetAgent: "codex",
    summary: "The request needs a focused regression fix.",
    clarificationNeeded: false,
    questions: [],
    assumptions: [],
    suggestedTags: [],
    riskLevel: "medium",
    ...overrides,
  }
}

function compileResponse(
  overrides: Partial<PromptCompilerCompileOutput> = {},
): PromptCompilerCompileOutput {
  return {
    title: "Fix stale prompt list",
    scenario: "bugfix",
    targetAgent: "codex",
    summary: "Repair stale project-scoped prompts.",
    compiledPrompt,
    assumptions: [],
    questions: [],
    answers: [],
    acceptanceCriteria: [],
    validationCommands: [],
    suggestedTags: [],
    qualityScore: 87,
    warnings: [],
    ...overrides,
  }
}

function createFakeService(config: FakeServiceConfig) {
  const requests: PromptCompilerLLMRequest[] = []
  const profileRequests: ProjectContextProfileRequest[] = []
  const client: PromptCompilerLLMClient = {
    async createStructuredResponse(request) {
      requests.push(request)

      if (config.failWithSecret !== undefined) {
        throw new Error(`upstream rejected ${config.failWithSecret}`)
      }

      return config.responseText
    },
  }

  const serviceConfig = {
    getDefaults: () => settingsDefaults,
    getOpenAIKeyForMainProcessOnly: async () => config.apiKey,
    getHarnessTemplate: () => config.harnessTemplate ?? null,
    createClient: () => client,
    getProjectContextProfileForCompiler: async (input: ProjectContextProfileRequest) => {
      profileRequests.push(input)
      return (
        config.projectContextProfile ??
        projectContextProfileResolution(null, [missingProfileWarning])
      )
    },
  }
  const service = createPromptCompilerService(serviceConfig)

  return { profileRequests, requests, service }
}

describe("LLM prompt compiler service", () => {
  it("analyzes original input with a stored OpenAI key and validates the structured response", async () => {
    const { requests, service } = createFakeService({
      apiKey: "sk-proj-service-secret-value-1234",
      responseText: JSON.stringify(
        analyzeResponse({
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
        }),
      ),
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
    expect(requests[0]?.jsonSchema).toMatchObject({ type: "object" })
  })

  it("compiles answered clarifications into markdown with every required section", async () => {
    const { requests, service } = createFakeService({
      apiKey: "sk-proj-service-secret-value-5678",
      responseText: JSON.stringify(
        compileResponse({
          assumptions: ["The repository has existing prompt library tests."],
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
        }),
      ),
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
    expect(requests[0]?.jsonSchema).toMatchObject({ type: "object" })
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
      responseText: JSON.stringify(
        analyzeResponse({
          detectedScenario: "feature",
          summary: "Too many questions.",
          clarificationNeeded: true,
          questions: ["one", "two", "three", "four"].map((id) => ({
            id,
            question: `Question ${id}?`,
            whyItMatters: "It changes implementation quality.",
            required: true,
          })),
          riskLevel: "low",
        }),
      ),
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

  it("keeps profile selector and include state inert until analyze or compile is invoked", () => {
    const { profileRequests, requests } = createFakeService({
      apiKey: "sk-proj-service-secret-value-inert-profile",
      projectContextProfile: projectContextProfileResolution(resolvedProfileContext),
      responseText: JSON.stringify(analyzeResponse()),
    })
    const selectionOnlyState = {
      projectId,
      projectContextProfileId,
      includeProjectContextProfile: true,
    }

    expect(selectionOnlyState.includeProjectContextProfile).toBe(true)
    expect(profileRequests).toHaveLength(0)
    expect(requests).toHaveLength(0)
  })

  it("excludes project context profile text from analyze prompts when inclusion is false", async () => {
    const { profileRequests, requests, service } = createFakeService({
      apiKey: "sk-proj-service-secret-value-profile-excluded",
      projectContextProfile: projectContextProfileResolution(resolvedProfileContext),
      responseText: JSON.stringify(analyzeResponse()),
    })
    const input = {
      originalInput: "Analyze profile-disabled request.",
      projectId,
      projectContextProfileId,
      includeProjectContextProfile: false,
    }

    const result = await service.analyze(input)

    expect(result.ok).toBe(true)
    expect(profileRequests).toHaveLength(0)
    expect(requests[0]?.systemPrompt).not.toContain(resolvedProfileContext)
    expect(requests[0]?.userPrompt).not.toContain("BEGIN UNTRUSTED PROJECT CONTEXT PROFILE")
    expect(requests[0]?.userPrompt).not.toContain(
      "Prompter is a local-first Electron prompt library.",
    )
  })

  it("excludes project context profile text from compile prompts when inclusion is omitted", async () => {
    const { profileRequests, requests, service } = createFakeService({
      apiKey: "sk-proj-service-secret-value-profile-omitted",
      projectContextProfile: projectContextProfileResolution(resolvedProfileContext),
      responseText: JSON.stringify(compileResponse()),
    })

    const result = await service.compile({
      originalInput: "Compile profile-omitted request.",
      scenario: "feature",
      targetAgent: "codex",
      projectId,
      projectContextProfileId,
    })

    expect(result.ok).toBe(true)
    expect(profileRequests).toHaveLength(0)
    expect(requests[0]?.userPrompt).not.toContain("BEGIN UNTRUSTED PROJECT CONTEXT PROFILE")
    expect(requests[0]?.userPrompt).not.toContain(
      "Prompter is a local-first Electron prompt library.",
    )
  })

  it("includes resolved project context profile text in analyze prompts after explicit inclusion", async () => {
    const { profileRequests, requests, service } = createFakeService({
      apiKey: "sk-proj-service-secret-value-profile-included",
      projectContextProfile: projectContextProfileResolution(resolvedProfileContext),
      responseText: JSON.stringify(analyzeResponse()),
    })
    const input = {
      originalInput: "Analyze profile-enabled request.",
      projectId,
      projectContextProfileId,
      includeProjectContextProfile: true,
    }

    const result = await service.analyze(input)

    expect(result.ok).toBe(true)
    expect(profileRequests).toEqual([{ projectId, profileId: projectContextProfileId }])
    expect(requests[0]?.systemPrompt).not.toContain(resolvedProfileContext)
    expect(requests[0]?.userPrompt).toContain("BEGIN UNTRUSTED PROJECT CONTEXT PROFILE")
    expect(requests[0]?.userPrompt).toContain("## Project Context Profile")
    expect(requests[0]?.userPrompt).toContain("Prompter is a local-first Electron prompt library.")
  })

  it("warns and excludes missing or cross-project profile text without crashing", async () => {
    const { requests, service } = createFakeService({
      apiKey: "sk-proj-service-secret-value-profile-missing",
      projectContextProfile: projectContextProfileResolution(null, [missingProfileWarning]),
      responseText: JSON.stringify(analyzeResponse({ warnings: [] })),
    })
    const input = {
      originalInput: "Analyze request with deleted profile.",
      projectId,
      projectContextProfileId,
      includeProjectContextProfile: true,
    }

    const result = await service.analyze(input)

    expect(result).toMatchObject({ ok: true, value: { warnings: [missingProfileWarning] } })
    expect(requests[0]?.userPrompt).not.toContain("BEGIN UNTRUSTED PROJECT CONTEXT PROFILE")
    expect(requests[0]?.userPrompt).not.toContain(
      "Prompter is a local-first Electron prompt library.",
    )
  })

  it("warns and excludes profile context when explicit inclusion lacks project ownership input", async () => {
    const { profileRequests, requests, service } = createFakeService({
      apiKey: "sk-proj-service-secret-value-profile-input-missing",
      projectContextProfile: projectContextProfileResolution(resolvedProfileContext),
      responseText: JSON.stringify(analyzeResponse({ warnings: [] })),
    })

    const result = await service.analyze({
      originalInput: "Analyze request with incomplete profile selection.",
      projectContextProfileId,
      includeProjectContextProfile: true,
    })

    expect(result).toMatchObject({ ok: true, value: { warnings: [missingProfileInputWarning] } })
    expect(profileRequests).toHaveLength(0)
    expect(requests[0]?.userPrompt).not.toContain("BEGIN UNTRUSTED PROJECT CONTEXT PROFILE")
    expect(requests[0]?.userPrompt).not.toContain(
      "Prompter is a local-first Electron prompt library.",
    )
  })

  registerHarnessPromptCompilerCases(createFakeService, compiledPrompt, requiredSections)
})
