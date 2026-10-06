import type {
  HarnessTemplate,
  Project,
  ProjectContextCompilerBuildResult,
} from "../../../electron/ipc-types"
import type { usePromptCompilerPanel } from "../hooks/use-prompt-compiler-panel"
import { COMPILER_PROJECT_REBIND_DESCRIPTION_ID } from "../lib/compiler-project-binding"
import { PromptCompilerAnalysis } from "./prompt-compiler-analysis"
import { PromptCompilerOutputPanel } from "./prompt-compiler-output-panel"
import { PromptCompilerPrivacyScan } from "./prompt-compiler-privacy-scan"
import { PromptTemplateProvenancePanel } from "./prompt-template-provenance-panel"

type PromptCompilerOutputWorkspaceProps = {
  readonly compiler: ReturnType<typeof usePromptCompilerPanel>
  readonly projectContextPreview: ProjectContextCompilerBuildResult | null
  readonly selectedHarnessTemplate: HarnessTemplate | null
  readonly selectedProject: Project | null
}

export function PromptCompilerOutputWorkspace({
  compiler,
  projectContextPreview,
  selectedHarnessTemplate,
  selectedProject,
}: PromptCompilerOutputWorkspaceProps) {
  return (
    <>
      <PromptCompilerPrivacyScan
        content={{
          answers: compiler.answers,
          draft: compiler.draft,
          editablePrompt: compiler.editablePrompt,
          includedProjectContext:
            compiler.draft.includeProjectContextProfile === true
              ? (projectContextPreview?.context ?? null)
              : null,
          selectedHarnessTemplate: selectedHarnessTemplate?.templateBody ?? null,
          selectedPromptTemplate: compiler.pendingTemplate?.templateBody ?? null,
        }}
      />
      <PromptCompilerAnalysis
        analysis={compiler.analysis}
        answers={compiler.answers}
        compiled={compiler.compiled}
        onAnswerChange={compiler.setAnswer}
        onSuggestedTagChange={compiler.setSuggestedTagSelection}
        selectedSuggestedTags={compiler.selectedSuggestedTags}
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
