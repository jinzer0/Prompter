import type {
  PromptCompilerClientFactory,
  PromptCompilerLLMRequest,
} from "./prompt-compiler-service.js"

class MissingTestResponseError extends Error {
  readonly name = "MissingTestResponseError"
}

function assertNever(value: never): never {
  throw new MissingTestResponseError(`Unexpected schema ${value}`)
}

function responseForSchema(
  request: PromptCompilerLLMRequest,
  analyzeResponse: string | undefined,
  compileResponse: string | undefined,
): string {
  switch (request.schemaName) {
    case "prompt_compiler_analyze":
      if (analyzeResponse !== undefined) {
        return analyzeResponse
      }
      break
    case "prompt_compiler_compile":
      if (compileResponse !== undefined) {
        return compileResponse
      }
      break
    default:
      return assertNever(request.schemaName)
  }

  throw new MissingTestResponseError(`Missing test response for ${request.schemaName}`)
}

export function createTestPromptCompilerClientFactory(
  env: NodeJS.ProcessEnv,
): PromptCompilerClientFactory | undefined {
  if (env["NODE_ENV"] !== "test") {
    return undefined
  }

  const analyzeResponse = env["PROMPTER_TEST_LLM_ANALYZE_RESPONSE"]
  const compileResponse = env["PROMPTER_TEST_LLM_COMPILE_RESPONSE"]

  if (analyzeResponse === undefined && compileResponse === undefined) {
    return undefined
  }

  return () => ({
    async createStructuredResponse(request) {
      return responseForSchema(request, analyzeResponse, compileResponse)
    },
  })
}
