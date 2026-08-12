import type {
  PromptCompilerAnalyzeInput,
  PromptCompilerAnalyzeResponse,
  PromptCompilerCompileInput,
  PromptCompilerCompileResponse,
} from "../../../../electron/ipc-types"

type CompilerPrivacyConfirmation = Extract<
  PromptCompilerAnalyzeResponse | PromptCompilerCompileResponse,
  { readonly status: "confirmation_required" }
>

export function compilerResponseNeedsConfirmation(
  response: PromptCompilerAnalyzeResponse | PromptCompilerCompileResponse,
): response is CompilerPrivacyConfirmation {
  return "status" in response && response.status === "confirmation_required"
}

export function confirmedAnalyzeRequest(
  request: PromptCompilerAnalyzeInput,
  privacyConfirmationSessionId: string,
): PromptCompilerAnalyzeInput {
  return { ...request, privacyConfirmationSessionId }
}

export function confirmedCompileRequest(
  request: PromptCompilerCompileInput,
  privacyConfirmationSessionId: string,
): PromptCompilerCompileInput {
  return { ...request, privacyConfirmationSessionId }
}
