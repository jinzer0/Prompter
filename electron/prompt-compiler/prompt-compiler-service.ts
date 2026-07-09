import {
  promptCompilerAnalyzeOutputSchema,
  promptCompilerCompileOutputSchema,
  promptCompilerErrorSchema,
} from "../ipc-contract.js"
import type {
  PromptCompilerAnalyzeInput,
  PromptCompilerAnalyzeResult,
  PromptCompilerCompileInput,
  PromptCompilerCompileResult,
  PromptCompilerError,
  SettingsDefaults,
} from "../ipc-types.js"
import { createOpenAIResponseClient } from "./open-ai-client.js"
import {
  analyzeResponseJsonSchema,
  buildAnalyzePrompt,
  buildCompilePrompt,
  compileResponseJsonSchema,
  promptCompilerSystemPrompt,
} from "./prompts.js"

export type PromptCompilerSchemaName = "prompt_compiler_analyze" | "prompt_compiler_compile"

export type PromptCompilerLLMRequest = {
  readonly model: string
  readonly systemPrompt: string
  readonly userPrompt: string
  readonly schemaName: PromptCompilerSchemaName
  readonly jsonSchema: Record<string, unknown>
}

export type PromptCompilerLLMClient = {
  readonly createStructuredResponse: (request: PromptCompilerLLMRequest) => Promise<string>
}

export type PromptCompilerClientFactory = (apiKey: string) => PromptCompilerLLMClient

export type PromptCompilerService = {
  readonly promptCompilerAnalyze: (
    input: PromptCompilerAnalyzeInput,
  ) => Promise<PromptCompilerAnalyzeResult>
  readonly promptCompilerCompile: (
    input: PromptCompilerCompileInput,
  ) => Promise<PromptCompilerCompileResult>
  readonly analyze: (input: PromptCompilerAnalyzeInput) => Promise<PromptCompilerAnalyzeResult>
  readonly compile: (input: PromptCompilerCompileInput) => Promise<PromptCompilerCompileResult>
}

export type PromptCompilerServiceConfig = {
  readonly getDefaults: () => SettingsDefaults
  readonly getOpenAIKeyForMainProcessOnly: () => Promise<string | null>
  readonly createClient?: PromptCompilerClientFactory
}

type PromptCompilerResponseSchema =
  | typeof promptCompilerAnalyzeOutputSchema
  | typeof promptCompilerCompileOutputSchema
type PromptCompilerRunConfig = {
  readonly serviceConfig: PromptCompilerServiceConfig
  readonly schema: PromptCompilerResponseSchema
  readonly schemaName: PromptCompilerSchemaName
  readonly jsonSchema: Record<string, unknown>
  readonly userPrompt: string
}

function compilerError(code: PromptCompilerError["code"], message: string): PromptCompilerError {
  return { ok: false, code, message }
}

function isCompilerError(output: unknown): output is PromptCompilerError {
  return promptCompilerErrorSchema.safeParse(output).success
}

function parseModelOutput(text: string): unknown | null {
  try {
    return JSON.parse(text)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null
    }

    throw error
  }
}

async function loadAPIKey(
  config: PromptCompilerServiceConfig,
): Promise<string | PromptCompilerError> {
  try {
    const apiKey = await config.getOpenAIKeyForMainProcessOnly()
    return apiKey === null
      ? compilerError(
          "missing_openai_key",
          "Add an OpenAI API key in Settings before using LLM prompt compilation.",
        )
      : apiKey
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error
    }

    return compilerError(
      "openai_key_unavailable",
      "OpenAI API key could not be read. Save the key again in Settings.",
    )
  }
}

async function runCompilerRequest(
  config: PromptCompilerRunConfig,
): Promise<unknown | PromptCompilerError> {
  const apiKey = await loadAPIKey(config.serviceConfig)

  if (typeof apiKey !== "string") {
    return apiKey
  }

  const createClient = config.serviceConfig.createClient ?? createOpenAIResponseClient
  const defaults = config.serviceConfig.getDefaults()

  try {
    const rawText = await createClient(apiKey).createStructuredResponse({
      model: defaults.defaultModel,
      systemPrompt: promptCompilerSystemPrompt,
      userPrompt: config.userPrompt,
      schemaName: config.schemaName,
      jsonSchema: config.jsonSchema,
    })
    const parsed = parseModelOutput(rawText)

    if (parsed === null) {
      return compilerError(
        "invalid_llm_output",
        "The model response was not valid JSON. Try compiling again.",
      )
    }

    const validated = config.schema.safeParse(parsed)
    return validated.success
      ? validated.data
      : compilerError(
          "invalid_llm_output",
          "The model response did not match the prompt compiler schema. Try compiling again.",
        )
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error
    }

    return compilerError(
      "openai_request_failed",
      "OpenAI request failed. Check your key, model, and network connection, then try again.",
    )
  }
}

export function createPromptCompilerService(
  config: PromptCompilerServiceConfig,
): PromptCompilerService {
  async function analyze(input: PromptCompilerAnalyzeInput): Promise<PromptCompilerAnalyzeResult> {
    const output = await runCompilerRequest({
      serviceConfig: config,
      schema: promptCompilerAnalyzeOutputSchema,
      schemaName: "prompt_compiler_analyze",
      jsonSchema: analyzeResponseJsonSchema,
      userPrompt: buildAnalyzePrompt(input),
    })
    const parsed = promptCompilerAnalyzeOutputSchema.safeParse(output)

    if (parsed.success) {
      return { ok: true, value: parsed.data }
    }

    return isCompilerError(output)
      ? output
      : compilerError(
          "invalid_llm_output",
          "The model response did not match the prompt compiler schema. Try compiling again.",
        )
  }

  async function compile(input: PromptCompilerCompileInput): Promise<PromptCompilerCompileResult> {
    const output = await runCompilerRequest({
      serviceConfig: config,
      schema: promptCompilerCompileOutputSchema,
      schemaName: "prompt_compiler_compile",
      jsonSchema: compileResponseJsonSchema,
      userPrompt: buildCompilePrompt(input),
    })
    const parsed = promptCompilerCompileOutputSchema.safeParse(output)

    if (parsed.success) {
      return { ok: true, value: parsed.data }
    }

    return isCompilerError(output)
      ? output
      : compilerError(
          "invalid_llm_output",
          "The model response did not match the prompt compiler schema. Try compiling again.",
        )
  }

  return {
    analyze,
    compile,
    promptCompilerAnalyze: analyze,
    promptCompilerCompile: compile,
  }
}
