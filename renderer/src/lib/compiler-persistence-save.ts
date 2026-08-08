import type { Project } from "../../../electron/ipc-types"
import type { CreatePrompt } from "../hooks/prompt-library-data"
import type { CompilerProjectBinding } from "./compiler-project-binding"
import {
  COMPILER_PROJECT_REBIND_REQUIRED_MESSAGE,
  executeGuardedCompilerPersistence,
} from "./compiler-project-binding"
import type { CompiledPromptResult } from "./prompt-compiler/types"
import { versionInputFromCompiled } from "./prompt-compiler/version-input"

type ExecuteCompiledPromptSaveInput = {
  readonly binding: CompilerProjectBinding
  readonly compiled: CompiledPromptResult | null
  readonly editablePrompt: string
  readonly selectedProject: Project | null
  readonly tagNames: readonly string[]
}

export type ExecuteCompiledPromptSaveActions = {
  readonly createPrompt: CreatePrompt
  readonly onTagsChanged: () => void
  readonly setIsSaving: (isSaving: boolean) => void
  readonly setMessage: (message: string | null) => void
}

export async function executeCompiledPromptSave(
  input: ExecuteCompiledPromptSaveInput,
  actions: ExecuteCompiledPromptSaveActions,
): Promise<void> {
  const guardResult = await executeGuardedCompilerPersistence(
    {
      action: "save_prompt",
      binding: input.binding,
      currentProjectId: input.selectedProject?.id ?? null,
    },
    () => undefined,
  )
  if (guardResult === "blocked") {
    actions.setMessage(COMPILER_PROJECT_REBIND_REQUIRED_MESSAGE)
    return
  }
  if (input.selectedProject === null) {
    actions.setMessage("Select a project before saving compiled prompt")
    return
  }
  if (input.compiled === null) {
    actions.setMessage("Compile a prompt before saving")
    return
  }

  const [disabledReason] = promptSaveDisabledReasons(input)
  if (disabledReason !== undefined) {
    actions.setMessage(disabledReason)
    return
  }

  const { compiled, selectedProject } = input
  actions.setIsSaving(true)
  actions.setMessage(null)

  try {
    await actions.createPrompt({
      projectId: selectedProject.id,
      title: compiled.title,
      scenario: compiled.scenario,
      targetAgent: compiled.targetAgent,
      ...versionInputFromCompiled(compiled, input.editablePrompt.trim()),
      tagNames: [...input.tagNames],
    })
    if (input.tagNames.length > 0) {
      actions.onTagsChanged()
    }
    actions.setMessage("Compiled prompt saved.")
  } catch (error) {
    actions.setMessage(
      error instanceof Error ? error.message : "Compiled prompt could not be saved",
    )
  } finally {
    actions.setIsSaving(false)
  }
}

export function promptSaveDisabledReasons(
  input: Pick<ExecuteCompiledPromptSaveInput, "compiled" | "editablePrompt" | "selectedProject">,
): readonly string[] {
  const reasons: string[] = []
  if (input.selectedProject === null) {
    reasons.push("Select a project before saving compiled prompt")
  }
  if (input.compiled === null) {
    reasons.push("Compile a prompt before saving")
    return reasons
  }
  if (input.compiled.title.trim().length === 0) {
    reasons.push("Prompt title is required")
  }
  if (input.compiled.originalInput.trim().length === 0) {
    reasons.push("Original request is required")
  }
  if (input.editablePrompt.trim().length === 0) {
    reasons.push("Compiled prompt output is required")
  }
  return reasons
}
