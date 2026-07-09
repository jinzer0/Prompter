import OpenAI from "openai"

import type {
  PromptCompilerLLMClient,
  PromptCompilerLLMRequest,
} from "./prompt-compiler-service.js"

export function createOpenAIResponseClient(apiKey: string): PromptCompilerLLMClient {
  const client = new OpenAI({ apiKey, timeout: 30_000 })

  return {
    async createStructuredResponse(request: PromptCompilerLLMRequest) {
      const response = await client.responses.create({
        model: request.model,
        input: `${request.systemPrompt}\n\n${request.userPrompt}`,
        text: {
          format: {
            type: "json_schema",
            name: request.schemaName,
            strict: true,
            schema: request.jsonSchema,
          },
        },
      })

      return response.output_text
    },
  }
}
