import type { PromptCompilerInput } from "./types"

const staleStateDraftFields = [
  "title",
  "originalInput",
  "scenario",
  "targetAgent",
  "harnessTemplateId",
  "projectContextProfileId",
  "includeProjectContextProfile",
  "projectContext",
  "techStack",
  "constraints",
  "acceptanceCriteria",
  "validationCommands",
  "additionalNotes",
] as const satisfies readonly (keyof PromptCompilerInput)[]

export function promptCompilerDraftChangeResetsStaleState(
  current: PromptCompilerInput,
  next: PromptCompilerInput,
): boolean {
  return staleStateDraftFields.some((field) => current[field] !== next[field])
}
