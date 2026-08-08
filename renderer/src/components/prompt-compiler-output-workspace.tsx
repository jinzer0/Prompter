import type { Project, ProjectContextCompilerBuildResult } from "../../../electron/ipc-types"
import type { usePromptCompilerPanel } from "../hooks/use-prompt-compiler-panel"
import type { usePromptTemplates } from "../hooks/use-prompt-templates"
import { COMPILER_PROJECT_REBIND_DESCRIPTION_ID } from "../lib/compiler-project-binding"
import { PromptCompilerAnalysis } from "./prompt-compiler-analysis"
import { PromptCompilerOutputPanel } from "./prompt-compiler-output-panel"
import { PromptTemplateProvenancePanel } from "./prompt-template-provenance-panel"
import { PromptTemplateSelector } from "./prompt-template-selector"

type PromptCompilerOutputWorkspaceProps = {
  readonly compiler: ReturnType<typeof usePromptCompilerPanel>
  readonly projectContextPreview: ProjectContextCompilerBuildResult | null
  readonly promptTemplates: ReturnType<typeof usePromptTemplates>
  readonly selectedProject: Project | null
}

export function PromptCompilerOutputWorkspace({
  compiler,
  projectContextPreview,
  promptTemplates,
  selectedProject,
}: PromptCompilerOutputWorkspaceProps) {
  return (
    <>
      <PromptCompilerAnalysis
        analysis={compiler.analysis}
        answers={compiler.answers}
        compiled={compiler.compiled}
        onAnswerChange={compiler.setAnswer}
        onSuggestedTagChange={compiler.setSuggestedTagSelection}
        selectedSuggestedTags={compiler.selectedSuggestedTags}
      />
      <PromptTemplateSelector
        canApply={compiler.compilerActionsEnabled}
        guardDescriptionId={COMPILER_PROJECT_REBIND_DESCRIPTION_ID}
        isConfirmationPending={compiler.isTemplateApplyConfirmationPending}
        pendingTemplate={compiler.pendingTemplate}
        preview={compiler.templatePreview}
        templates={promptTemplates.templates}
        variableNames={compiler.templateVariableNames}
        variableValues={compiler.templateVariableValues}
        onCancelApply={compiler.cancelTemplateApply}
        onConfirmApply={compiler.confirmTemplateApply}
        onPreview={compiler.previewTemplate}
        onRequestApply={compiler.requestTemplateApply}
        onSelectTemplate={compiler.selectPromptTemplate}
        onVariableChange={compiler.setTemplateVariable}
      />
      <PromptCompilerOutputPanel
        canEditOutput={compiler.canEditOutput}
        canSaveToFile={compiler.canSaveExportToFile}
        compiled={compiler.compiled}
        draft={compiler.draft}
        editablePrompt={compiler.editablePrompt}
        guardDescriptionId={COMPILER_PROJECT_REBIND_DESCRIPTION_ID}
        outputRevision={compiler.outputRevision}
        projectContextPreview={projectContextPreview}
        selectedProject={selectedProject}
        onEditablePromptChange={compiler.setEditablePrompt}
      />
      <PromptTemplateProvenancePanel
        derivedPromptSourceTitle={compiler.derivedPromptSourceTitle}
        provenance={compiler.templateProvenance}
        onClearProvenance={compiler.clearTemplateProvenance}
      />
    </>
  )
}
