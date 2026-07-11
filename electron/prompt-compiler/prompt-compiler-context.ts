import type {
  HarnessTemplate,
  PromptCompilerAnalyzeInput,
  PromptCompilerAnalyzeOutput,
  PromptCompilerCompileInput,
  PromptCompilerCompileOutput,
} from "../ipc-types.js"
import type { PromptCompilerServiceConfig } from "./prompt-compiler-service.js"

type HarnessResolution = {
  readonly harnessTemplate: HarnessTemplate | null
  readonly warnings: readonly string[]
}

type ProjectContextProfileResolution = {
  readonly context: string | null
  readonly warnings: readonly string[]
}

const harnessTemplateUnavailableWarning =
  "Selected harness template is unavailable; using the default compiler flow."
const harnessTemplateUntrustedGuidanceWarning =
  "Harness template was included as untrusted additional guidance."
const projectContextProfileInputMissingWarning =
  "Project context profile inclusion requires a project and profile; profile context was excluded."
const projectContextProfileUnavailableWarning =
  "Selected project context profile is unavailable; profile context was excluded."

export async function resolveHarnessTemplate(
  config: PromptCompilerServiceConfig,
  harnessTemplateId: string | null | undefined,
): Promise<HarnessResolution> {
  if (harnessTemplateId === undefined || harnessTemplateId === null) {
    return { harnessTemplate: null, warnings: [] }
  }

  const harnessTemplate = (await config.getHarnessTemplate?.(harnessTemplateId)) ?? null

  return harnessTemplate === null
    ? { harnessTemplate, warnings: [harnessTemplateUnavailableWarning] }
    : { harnessTemplate, warnings: [harnessTemplateUntrustedGuidanceWarning] }
}

export async function resolveProjectContextProfile(
  config: PromptCompilerServiceConfig,
  input: PromptCompilerAnalyzeInput | PromptCompilerCompileInput,
): Promise<ProjectContextProfileResolution> {
  if (input.includeProjectContextProfile !== true) {
    return { context: null, warnings: [] }
  }

  if (input.projectId === undefined || input.projectId === null) {
    return { context: null, warnings: [projectContextProfileInputMissingWarning] }
  }

  if (input.projectContextProfileId === undefined || input.projectContextProfileId === null) {
    return { context: null, warnings: [projectContextProfileInputMissingWarning] }
  }

  const buildResult =
    (await config.getProjectContextProfileForCompiler?.({
      projectId: input.projectId,
      profileId: input.projectContextProfileId,
    })) ?? null

  if (buildResult === null) {
    return { context: null, warnings: [projectContextProfileUnavailableWarning] }
  }

  return { context: buildResult.context, warnings: buildResult.warnings }
}

export function appendAnalyzeWarnings(
  output: PromptCompilerAnalyzeOutput,
  warnings: readonly string[],
): PromptCompilerAnalyzeOutput {
  return { ...output, warnings: [...(output.warnings ?? []), ...warnings] }
}

export function appendCompileWarnings(
  output: PromptCompilerCompileOutput,
  warnings: readonly string[],
): PromptCompilerCompileOutput {
  return { ...output, warnings: [...output.warnings, ...warnings] }
}
