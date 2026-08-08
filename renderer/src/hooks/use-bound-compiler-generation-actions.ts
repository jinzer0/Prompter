import type { Dispatch, SetStateAction } from "react"

import type { ProjectContextCompilerBuildResult } from "../../../electron/ipc-types"
import { COMPILER_PROJECT_REBIND_REQUIRED_MESSAGE } from "../lib/compiler-project-binding"
import type { OutputRevisionGate } from "../lib/prompt-compiler/output-revision"
import { compileStaticPrompt } from "../lib/prompt-compiler/static-prompt-compiler"
import type {
  CompiledPromptResult,
  LoadedHarnessTemplate,
  PromptCompilerInput,
} from "../lib/prompt-compiler/types"
import type { useCompilerProjectBinding } from "./use-compiler-project-binding"
import type { useCompilerTemplateDraftController } from "./use-compiler-template-draft-controller"

type BoundCompilerGenerationConfig = {
  readonly acceptCompiled: (result: CompiledPromptResult) => void
  readonly binding: ReturnType<typeof useCompilerProjectBinding>
  readonly clearLlmState: () => void
  readonly clearSuggestedTags: () => void
  readonly draft: PromptCompilerInput
  readonly outputRevisionGate: OutputRevisionGate
  readonly replaceEditablePrompt: (prompt: string) => number
  readonly setCompiled: Dispatch<SetStateAction<CompiledPromptResult | null>>
  readonly setMessage: Dispatch<SetStateAction<string | null>>
  readonly template: ReturnType<typeof useCompilerTemplateDraftController>
}

export function useBoundCompilerGenerationActions(config: BoundCompilerGenerationConfig) {
  function canGenerate(): boolean {
    if (config.binding.actionIsAllowed("template_apply")) {
      return true
    }
    config.setMessage(COMPILER_PROJECT_REBIND_REQUIRED_MESSAGE)
    return false
  }

  function compileStatic(
    selectedHarnessTemplate: LoadedHarnessTemplate | null,
    projectContextProfileBuildResult: ProjectContextCompilerBuildResult | null,
  ): void {
    if (!config.binding.actionIsAllowed("compile_static")) {
      config.setMessage(COMPILER_PROJECT_REBIND_REQUIRED_MESSAGE)
      return
    }
    if (config.draft.originalInput.trim().length === 0) {
      config.setMessage("Original request is required")
      return
    }
    config.acceptCompiled(
      compileStaticPrompt(
        { ...config.draft, projectContextProfileBuildResult },
        selectedHarnessTemplate,
      ),
    )
    config.setMessage("Compiled prompt is ready to review.")
  }

  function confirmTemplateApply(): void {
    if (!canGenerate()) return
    const applied = config.template.createAppliedOutput(
      config.draft,
      config.outputRevisionGate.current(),
    )
    if (applied === null) return
    config.clearLlmState()
    config.setCompiled(applied.compiled)
    config.replaceEditablePrompt(applied.editablePrompt)
    config.clearSuggestedTags()
    config.template.commitTemplateApplication(applied.provenance)
    config.setMessage("Template output applied to the compiled prompt draft.")
  }

  return {
    compileStatic,
    confirmTemplateApply,
    previewTemplate: () => {
      if (canGenerate()) config.template.previewTemplate()
    },
    requestTemplateApply: () => {
      if (canGenerate()) config.template.requestTemplateApply()
    },
  }
}
