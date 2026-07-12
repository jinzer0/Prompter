import type { Project, ProjectContextCompilerBuildResult } from "../../../electron/ipc-types"
import type { CompiledPromptResult, PromptCompilerInput } from "../lib/prompt-compiler/types"
import { exportBaseFromCompiled } from "../lib/prompt-export"
import { CompiledPromptPreview } from "./compiled-prompt-preview"
import { PromptCompilerDraftReview } from "./prompt-compiler-draft-review"
import { PromptExportActions } from "./prompt-export-actions"

type PromptCompilerOutputPanelProps = {
  readonly compiled: CompiledPromptResult | null
  readonly draft: PromptCompilerInput
  readonly editablePrompt: string
  readonly projectContextPreview: ProjectContextCompilerBuildResult | null
  readonly selectedProject: Project | null
  readonly onEditablePromptChange: (prompt: string) => void
}

export function PromptCompilerOutputPanel({
  compiled,
  draft,
  editablePrompt,
  projectContextPreview,
  selectedProject,
  onEditablePromptChange,
}: PromptCompilerOutputPanelProps) {
  const compiledExportBase =
    compiled === null ? null : exportBaseFromCompiled(compiled, editablePrompt, selectedProject)

  return (
    <>
      <CompiledPromptPreview value={editablePrompt} onChange={onEditablePromptChange} />
      <PromptCompilerDraftReview
        compiled={compiled}
        draft={draft}
        editablePrompt={editablePrompt}
        projectContextPreview={projectContextPreview}
        onUseImprovedPrompt={onEditablePromptChange}
      />
      <PromptExportActions
        copyButtonLabel="Copy compiled export"
        exportBase={compiledExportBase}
        formatLabel="Compiled preview export format"
        rawContent={editablePrompt}
        saveButtonLabel="Save compiled export"
        title="Compiled preview export"
      />
    </>
  )
}
