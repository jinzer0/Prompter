import type { Project, ProjectContextCompilerBuildResult } from "../../../electron/ipc-types"
import type { CompiledPromptResult, PromptCompilerInput } from "../lib/prompt-compiler/types"
import { exportBaseFromCompiled } from "../lib/prompt-export"
import { CompiledPromptPreview } from "./compiled-prompt-preview"
import { PromptCompilerDraftReview } from "./prompt-compiler-draft-review"
import { PromptExportActions } from "./prompt-export-actions"

type PromptCompilerOutputPanelProps = {
  readonly canEditOutput: boolean
  readonly canSaveToFile: boolean
  readonly compiled: CompiledPromptResult | null
  readonly draft: PromptCompilerInput
  readonly editablePrompt: string
  readonly guardDescriptionId: string
  readonly outputRevision: number
  readonly projectContextPreview: ProjectContextCompilerBuildResult | null
  readonly selectedProject: Project | null
  readonly onEditablePromptChange: (prompt: string) => void
}

export function PromptCompilerOutputPanel({
  canEditOutput,
  canSaveToFile,
  compiled,
  draft,
  editablePrompt,
  guardDescriptionId,
  outputRevision,
  projectContextPreview,
  selectedProject,
  onEditablePromptChange,
}: PromptCompilerOutputPanelProps) {
  const compiledExportBase =
    compiled === null
      ? null
      : exportBaseFromCompiled(compiled, editablePrompt, canEditOutput ? selectedProject : null)

  return (
    <>
      <CompiledPromptPreview
        canEditOutput={canEditOutput}
        guardDescriptionId={guardDescriptionId}
        value={editablePrompt}
        onChange={onEditablePromptChange}
      />
      <PromptCompilerDraftReview
        canEditOutput={canEditOutput}
        compiled={compiled}
        draft={draft}
        editablePrompt={editablePrompt}
        guardDescriptionId={guardDescriptionId}
        outputRevision={outputRevision}
        projectContextPreview={projectContextPreview}
        onUseImprovedPrompt={onEditablePromptChange}
      />
      <PromptExportActions
        canSaveToFile={canSaveToFile}
        copyButtonLabel="Copy compiled export"
        exportBase={compiledExportBase}
        formatLabel="Compiled preview export format"
        rawContent={editablePrompt}
        saveButtonLabel="Save compiled export"
        saveDisabledDescriptionId={guardDescriptionId}
        title="Compiled preview export"
      />
    </>
  )
}
