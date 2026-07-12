import { type FormEvent, useEffect, useRef } from "react"
import type {
  ComparePromptVersionsResult,
  CreateNextPromptVersionInput,
  CreatePromptAssetInput,
  CreatePromptVersionInput,
  Project,
  PromptAsset,
  PromptVersion,
} from "../../../electron/ipc-types"
import { useAvailableHarnessTemplates } from "../hooks/use-available-harness-templates"
import { useCompilerProjectContext } from "../hooks/use-compiler-project-context"
import { useHarnessTemplates } from "../hooks/use-harness-templates"
import { usePromptCompilerPanel } from "../hooks/use-prompt-compiler-panel"
import type { LoadStatus } from "../hooks/use-prompter-library"
import { HarnessTemplateSelector } from "./harness-template-selector"
import { ProjectContextProfileSelector } from "./project-context-profile-selector"
import { PromptCompilerActions } from "./prompt-compiler-actions"
import { PromptCompilerAnalysis } from "./prompt-compiler-analysis"
import { PromptCompilerClipboardImportCard } from "./prompt-compiler-clipboard-import-card"
import { PromptCompilerForm } from "./prompt-compiler-form"
import { PromptCompilerHeader } from "./prompt-compiler-header"
import { PromptCompilerOutputPanel } from "./prompt-compiler-output-panel"
import { PromptVersionManagement } from "./prompt-version-management"
import { Panel } from "./shell/panel"
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { EmptyState } from "./ui/empty-state"

type PromptCompilerPanelProps = {
  readonly compareVersions: (
    baseVersionId: string,
    compareVersionId: string,
  ) => Promise<ComparePromptVersionsResult>
  readonly createNextVersion: (input: CreateNextPromptVersionInput) => Promise<PromptVersion>
  readonly createPrompt: (
    assetInput: CreatePromptAssetInput,
    versionInput: Omit<CreatePromptVersionInput, "promptAssetId">,
  ) => Promise<PromptAsset>
  readonly changedProjectContextProfileId: string | null
  readonly currentVersion: PromptVersion | null
  readonly deletedHarnessTemplateIds: readonly string[]
  readonly deletedProjectContextProfileIds: readonly string[]
  readonly error: string | null
  readonly harnessTemplateRefreshSignal: number
  readonly projectContextProfileRefreshSignal: number
  readonly selectedAsset: PromptAsset | null
  readonly selectedVersion: PromptVersion | null
  readonly selectedProject: Project | null
  readonly selectVersion: (id: string) => void
  readonly setCurrentVersion: (promptAssetId: string, versionId: string) => Promise<void>
  readonly status: LoadStatus
  readonly versions: readonly PromptVersion[]
  readonly onTagsChanged: () => void
}

export function PromptCompilerPanel({
  compareVersions,
  createNextVersion,
  createPrompt,
  changedProjectContextProfileId,
  currentVersion,
  deletedHarnessTemplateIds,
  deletedProjectContextProfileIds,
  error,
  harnessTemplateRefreshSignal,
  projectContextProfileRefreshSignal,
  selectedAsset,
  selectedVersion,
  selectedProject,
  selectVersion,
  setCurrentVersion,
  status,
  versions,
  onTagsChanged,
}: PromptCompilerPanelProps) {
  const harnessTemplates = useHarnessTemplates()
  const compiler = usePromptCompilerPanel({
    createNextVersion,
    createPrompt,
    onTagsChanged,
    selectedAsset,
    selectedProject,
  })
  const originalRequestRef = useRef<HTMLTextAreaElement>(null)
  const projectContext = useCompilerProjectContext({
    changedProjectContextProfileId,
    deletedProjectContextProfileIds,
    draft: compiler.draft,
    onIncludedProfileChanged: compiler.clearStaleOutput,
    projectContextProfileRefreshSignal,
    selectedProject,
    setDraft: compiler.setDraft,
  })
  const { availableTemplates, selectedTemplate } = useAvailableHarnessTemplates({
    deletedHarnessTemplateIds,
    harnessTemplateRefreshSignal,
    harnessTemplates,
    selectedTemplateId: compiler.draft.harnessTemplateId ?? null,
    selectTemplate: compiler.setHarnessTemplateId,
  })

  useEffect(() => {
    if (harnessTemplates.status === "idle") {
      void harnessTemplates.loadTemplates({})
    }
  }, [harnessTemplates.loadTemplates, harnessTemplates.status])

  useEffect(() => {
    if (compiler.originalRequestFocusSignal > 0) {
      originalRequestRef.current?.focus()
    }
  }, [compiler.originalRequestFocusSignal])

  function compileStaticPrompt(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const profileBuildResult =
      projectContext.previewStatus === "ready" ? projectContext.preview : null
    compiler.compileStatic(selectedTemplate, profileBuildResult)
  }

  return (
    <Panel data-testid="prompt-compiler" headingId="prompt-compiler-heading">
      <PromptCompilerHeader />

      <form
        className="mt-4 space-y-4 rounded-card border border-border bg-panel-elevated p-4"
        onSubmit={compileStaticPrompt}
      >
        <PromptCompilerForm
          draft={compiler.draft}
          originalRequestRef={originalRequestRef}
          onChange={compiler.setDraft}
        />
        <HarnessTemplateSelector
          error={harnessTemplates.error}
          scenario={compiler.draft.scenario}
          selectedTemplateId={compiler.draft.harnessTemplateId ?? null}
          status={harnessTemplates.status}
          targetAgent={compiler.draft.targetAgent}
          templates={availableTemplates}
          onChange={compiler.setHarnessTemplateId}
        />
        <ProjectContextProfileSelector
          error={projectContext.error}
          includeProjectContextProfile={projectContext.includeProjectContextProfile}
          preview={projectContext.preview}
          previewError={projectContext.previewError}
          previewStatus={projectContext.previewStatus}
          profiles={projectContext.profiles}
          projectName={selectedProject?.name ?? null}
          selectedProfileId={projectContext.selectedProfileId}
          status={projectContext.status}
          onIncludeChange={projectContext.setIncludeProjectContextProfile}
          onManageProfiles={() => document.getElementById("context-profiles-heading")?.focus()}
          onSelectProfile={projectContext.selectProfile}
        />
        {compiler.message !== null && (
          <p className="text-[12px] text-muted-strong">{compiler.message}</p>
        )}
        {compiler.pendingClipboardImport !== null && (
          <PromptCompilerClipboardImportCard
            onCancel={compiler.cancelClipboardImport}
            onConfirm={compiler.confirmClipboardImport}
          />
        )}
        <PromptCompilerActions
          canCopy={compiler.editablePrompt.trim().length > 0}
          canSaveNextVersion={
            selectedAsset !== null &&
            compiler.compiled !== null &&
            compiler.editablePrompt.trim().length > 0
          }
          canSavePrompt={selectedProject !== null && compiler.compiled !== null}
          isAnalyzing={compiler.isAnalyzing}
          isCompilingLLM={compiler.isCompilingLLM}
          isReadingClipboard={compiler.isReadingClipboard}
          isSaving={compiler.isSaving}
          isSavingNextVersion={compiler.isSavingNextVersion}
          onAnalyzeWithLLM={compiler.analyzeWithLLM}
          onCompileWithLLM={compiler.compileWithLLM}
          onCopyPrompt={compiler.copyPrompt}
          onImportFromClipboard={compiler.importFromClipboard}
          onSaveNextVersion={compiler.saveNextVersion}
          onSavePrompt={compiler.savePrompt}
        />
      </form>

      <div className="mt-4 flex flex-1 flex-col gap-4">
        <PromptCompilerAnalysis
          analysis={compiler.analysis}
          answers={compiler.answers}
          compiled={compiler.compiled}
          onAnswerChange={compiler.setAnswer}
          onSuggestedTagChange={compiler.setSuggestedTagSelection}
          selectedSuggestedTags={compiler.selectedSuggestedTags}
        />
        <PromptCompilerOutputPanel
          compiled={compiler.compiled}
          draft={compiler.draft}
          editablePrompt={compiler.editablePrompt}
          projectContextPreview={
            projectContext.previewStatus === "ready" ? projectContext.preview : null
          }
          selectedProject={selectedProject}
          onEditablePromptChange={compiler.setEditablePrompt}
        />

        {selectedProject === null && (
          <EmptyState
            label="Detail state"
            title="Select a project first"
            description="Compile previews are local, but saving requires a selected project."
          />
        )}

        {selectedProject !== null && selectedAsset === null && (
          <EmptyState
            label="Detail state"
            title="Select a prompt to view details"
            description="New prompts will show their current version here."
          />
        )}

        {selectedAsset !== null && status === "loading" && (
          <p className="text-[12px] text-muted">Loading prompt detail...</p>
        )}
        {selectedAsset !== null && status === "error" && (
          <p className="text-[12px] text-muted-strong">{error}</p>
        )}

        {selectedAsset !== null && status === "ready" && currentVersion === null && (
          <Card>
            <CardHeader>
              <CardTitle>{selectedAsset.title}</CardTitle>
              <CardDescription>No current version is set for this prompt asset.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {selectedAsset !== null && status === "ready" && currentVersion !== null && (
          <PromptVersionManagement
            compareVersions={compareVersions}
            currentVersion={currentVersion}
            selectedAsset={selectedAsset}
            selectedVersion={selectedVersion}
            projectName={selectedProject?.name ?? null}
            selectVersion={selectVersion}
            setCurrentVersion={setCurrentVersion}
            versions={versions}
          />
        )}
      </div>
    </Panel>
  )
}
