import { type FormEvent, useEffect, useRef } from "react"
import type {
  ComparePromptVersionsResult,
  CreateDerivedPromptAssetInput,
  CreateNextPromptVersionInput,
  CreatePromptWithInitialVersionResult,
  DuplicatePromptAssetInput,
  Project,
  PromptAsset,
  PromptVersion,
} from "../../../electron/ipc-types"
import type { CreatePrompt } from "../hooks/prompt-library-data"
import { useAvailableHarnessTemplates } from "../hooks/use-available-harness-templates"
import { useCompilerProjectContext } from "../hooks/use-compiler-project-context"
import { useHarnessTemplates } from "../hooks/use-harness-templates"
import { usePromptCompilerPanel } from "../hooks/use-prompt-compiler-panel"
import { usePromptTemplates } from "../hooks/use-prompt-templates"
import type { LoadStatus } from "../hooks/use-prompter-library"
import { buildDerivedPromptDraft, duplicatePromptInput } from "../lib/prompt-derivation"
import { HarnessTemplateSelector } from "./harness-template-selector"
import { ProjectContextProfileSelector } from "./project-context-profile-selector"
import { PromptCompilerActions } from "./prompt-compiler-actions"
import { PromptCompilerClipboardImportCard } from "./prompt-compiler-clipboard-import-card"
import { PromptCompilerDetailSection } from "./prompt-compiler-detail-section"
import { PromptCompilerForm } from "./prompt-compiler-form"
import { PromptCompilerHeader } from "./prompt-compiler-header"
import { PromptCompilerOutputWorkspace } from "./prompt-compiler-output-workspace"
import { Panel } from "./shell/panel"

type PromptCompilerPanelProps = {
  readonly assets: readonly PromptAsset[]
  readonly compareVersions: (
    baseVersionId: string,
    compareVersionId: string,
  ) => Promise<ComparePromptVersionsResult>
  readonly createDerivedAsset: (
    input: CreateDerivedPromptAssetInput,
  ) => Promise<CreatePromptWithInitialVersionResult>
  readonly createNextVersion: (input: CreateNextPromptVersionInput) => Promise<PromptVersion>
  readonly createPrompt: CreatePrompt
  readonly duplicateAsset: (
    input: DuplicatePromptAssetInput,
  ) => Promise<CreatePromptWithInitialVersionResult>
  readonly changedProjectContextProfileId: string | null
  readonly currentVersion: PromptVersion | null
  readonly deletedHarnessTemplateIds: readonly string[]
  readonly deletedProjectContextProfileIds: readonly string[]
  readonly error: string | null
  readonly harnessTemplateRefreshSignal: number
  readonly projectContextProfileRefreshSignal: number
  readonly promptTemplateRefreshSignal: number
  readonly selectedAsset: PromptAsset | null
  readonly selectedVersion: PromptVersion | null
  readonly selectedProject: Project | null
  readonly selectAsset: (id: string) => void
  readonly selectVersion: (id: string) => void
  readonly setCurrentVersion: (promptAssetId: string, versionId: string) => Promise<void>
  readonly status: LoadStatus
  readonly versions: readonly PromptVersion[]
  readonly onPromptTemplatesChanged: () => void
  readonly onTagsChanged: () => void
}

export function PromptCompilerPanel({
  assets,
  compareVersions,
  createDerivedAsset,
  createNextVersion,
  createPrompt,
  duplicateAsset,
  changedProjectContextProfileId,
  currentVersion,
  deletedHarnessTemplateIds,
  deletedProjectContextProfileIds,
  error,
  harnessTemplateRefreshSignal,
  projectContextProfileRefreshSignal,
  promptTemplateRefreshSignal,
  selectedAsset,
  selectedVersion,
  selectedProject,
  selectAsset,
  selectVersion,
  setCurrentVersion,
  status,
  versions,
  onPromptTemplatesChanged,
  onTagsChanged,
}: PromptCompilerPanelProps) {
  const harnessTemplates = useHarnessTemplates()
  const promptTemplates = usePromptTemplates()
  const compiler = usePromptCompilerPanel({
    createDerivedAsset,
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
    if (promptTemplates.status === "idle") {
      void promptTemplates.loadTemplates({})
    }
  }, [promptTemplates.loadTemplates, promptTemplates.status])

  useEffect(() => {
    if (promptTemplateRefreshSignal > 0) {
      void promptTemplates.loadTemplates({})
    }
  }, [promptTemplateRefreshSignal, promptTemplates.loadTemplates])

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

  async function duplicateSelectedPrompt(
    asset: PromptAsset,
    version: PromptVersion,
  ): Promise<void> {
    await duplicateAsset(duplicatePromptInput(asset.id, version.id))
  }

  function deriveSelectedPrompt(asset: PromptAsset, version: PromptVersion): void {
    compiler.seedDerivedPrompt(buildDerivedPromptDraft(asset, version))
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
          canSavePrompt={compiler.saveDisabledReasons.length === 0}
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
        <PromptCompilerOutputWorkspace
          compiler={compiler}
          projectContextPreview={
            projectContext.previewStatus === "ready" ? projectContext.preview : null
          }
          promptTemplates={promptTemplates}
          selectedProject={selectedProject}
        />

        <PromptCompilerDetailSection
          assets={assets}
          compareVersions={compareVersions}
          currentVersion={currentVersion}
          error={error}
          selectedAsset={selectedAsset}
          selectedProject={selectedProject}
          selectedVersion={selectedVersion}
          status={status}
          versions={versions}
          onDerivePrompt={deriveSelectedPrompt}
          onDuplicatePrompt={duplicateSelectedPrompt}
          onNavigatePrompt={selectAsset}
          onPromptTemplatesChanged={onPromptTemplatesChanged}
          onSelectVersion={selectVersion}
          onSetCurrentVersion={setCurrentVersion}
        />
      </div>
    </Panel>
  )
}
