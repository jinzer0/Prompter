import type { CreatePromptVersionInput } from "../../../../electron/ipc-types"
import type { CompiledPromptResult } from "./types"

export function versionInputFromCompiled(
  compiled: CompiledPromptResult,
  compiledPrompt: string,
): Omit<CreatePromptVersionInput, "promptAssetId"> {
  return {
    originalInput: compiled.originalInput,
    compiledPrompt,
    assumptions: JSON.stringify(compiled.assumptions),
    questions: JSON.stringify(compiled.questions ?? []),
    answers: JSON.stringify(compiled.answers ?? []),
    acceptanceCriteria: compiled.acceptanceCriteria.join("\n"),
    validationCommands: compiled.validationCommands.join("\n"),
  }
}
