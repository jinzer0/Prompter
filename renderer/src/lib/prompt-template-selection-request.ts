import type { PromptTemplate } from "../../../electron/ipc-types"
import type { InsightsSelectionRequest } from "../hooks/use-insights-workspace-navigation"
import type { PromptTemplateLoadResult } from "../hooks/use-prompt-templates"

export type PromptTemplateSelectionContinuation = {
  readonly getCurrentRequest: () => InsightsSelectionRequest | null
  readonly loadTemplate: (id: string) => Promise<PromptTemplateLoadResult<PromptTemplate>>
  readonly onApplied: (requestId: number) => void
}

function assertNever(result: never): never {
  throw new TypeError(`Unexpected prompt template load result: ${JSON.stringify(result)}`)
}

export async function continuePromptTemplateSelection(
  request: InsightsSelectionRequest,
  continuation: PromptTemplateSelectionContinuation,
): Promise<PromptTemplateLoadResult<PromptTemplate>> {
  const result = await continuation.loadTemplate(request.id)

  switch (result.kind) {
    case "failed":
    case "stale":
      return result
    case "applied": {
      const currentRequest = continuation.getCurrentRequest()
      if (
        currentRequest?.requestId !== request.requestId ||
        currentRequest.id !== request.id ||
        result.value.id !== request.id
      ) {
        return { kind: "stale" }
      }
      continuation.onApplied(request.requestId)
      return result
    }
    default:
      return assertNever(result)
  }
}
