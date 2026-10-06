import { type FormEvent, useEffect, useRef } from "react"
import { useAvailableHarnessTemplates } from "../hooks/use-available-harness-templates"
import { useCompilerProjectContext } from "../hooks/use-compiler-project-context"
import { useHarnessTemplates } from "../hooks/use-harness-templates"
import { usePromptCompilerPanel } from "../hooks/use-prompt-compiler-panel"
import { usePromptTemplates } from "../hooks/use-prompt-templates"
import { COMPILER_PROJECT_REBIND_DESCRIPTION_ID } from "../lib/compiler-project-binding"
import { versionInputFromCompiled } from "../lib/prompt-compiler/version-input"
import { buildDerivedPromptDraft } from "../lib/prompt-derivation"
import { CompilerProjectBindingNotice } from "./compiler-project-binding-notice"
import { HarnessTemplateSelector } from "./harness-template-selector"
import { PrivacyWarningDialog } from "./privacy/privacy-warning-dialog"
import { ProjectContextProfileSelector } from "./project-context-profile-selector"
import { PromptCompilerActions } from "./prompt-compiler-actions"
import { PromptCompilerClipboardImportCard } from "./prompt-compiler-clipboard-import-card"
import { PromptCompilerDetailSection } from "./prompt-compiler-detail-section"
import { PromptCompilerForm } from "./prompt-compiler-form"
import { PromptCompilerHeader } from "./prompt-compiler-header"
import { PromptCompilerOutputWorkspace } from "./prompt-compiler-output-workspace"
import type { PromptCompilerPanelProps } from "./prompt-compiler-panel-types"
import { PromptEditor } from "./prompt-editor"
import { usePromptEditorContext } from "./prompt-editor-provider"
import { PromptTemplateSelector } from "./prompt-template-selector"
import { Panel } from "./shell/panel"
import { Button } from "./ui/button"

type PromptCompilerWorkspaceProps = PromptCompilerPanelProps & {
  readonly onOpenManager: (destination: "context" | "templates" | "harnesses") => void
}

export function PromptCompilerPanel({
  assets,
  compareVersions,
  compilerMemory,
  createDerivedAsset,
  createNextVersion,
  createPrompt,
  changedProjectContextProfileId,
  compilerStatePreservationRequest,
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
  onOpenManager,
  onPromptTemplatesChanged,
  onTagsChanged,
}: PromptCompilerWorkspaceProps) {
  const editor = usePromptEditorContext()
  const harnessTemplates = useHarnessTemplates()
  const promptTemplates = usePromptTemplates()
  const compiler = usePromptCompilerPanel({
    createDerivedAsset,
    createNextVersion,
    createPrompt,
    compilerMemory,
    onTagsChanged,
    selectedAsset,
    selectedProject,
  })
  const originalRequestRef = useRef<HTMLTextAreaElement>(null)
  const projectContext = useCompilerProjectContext({
    changedProjectContextProfileId,
    compilerStatePreservationRequest,
    deletedProjectContextProfileIds,
    draft: compiler.draft,
    onIncludedProfileChanged: compiler.clearStaleOutput,
    onProjectTransition: compiler.handleProjectTransition,
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

  return (
    <Panel data-testid="prompt-compiler" headingId="prompt-detail-heading">
      <h2 id="prompt-detail-heading" className="text-[16px] font-medium">
        프롬프트 상세
      </h2>
      <PromptEditor />
      <div className="mt-3 space-y-4">
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
          onDerivePrompt={(asset, version) =>
            compiler.seedDerivedPrompt(buildDerivedPromptDraft(asset, version))
          }
          onNavigatePrompt={selectAsset}
          onPromptTemplatesChanged={onPromptTemplatesChanged}
          onSelectVersion={selectVersion}
          onSetCurrentVersion={setCurrentVersion}
        />
      </div>
      <section
        aria-labelledby="prompt-compiler-heading"
        className="mt-6 border-t border-border-subtle pt-4"
      >
        <PromptCompilerHeader />

        <form className="mt-3 space-y-4" onSubmit={compileStaticPrompt}>
          {selectedProject !== null && (
            <CompilerProjectBindingNotice
              binding={compiler.projectBinding}
              projectName={selectedProject.name}
              onRebind={() => {
                if (compiler.rebindProject()) {
                  projectContext.releasePreservedProjectContext()
                }
              }}
            />
          )}
          <PromptCompilerForm
            draft={compiler.draft}
            originalRequestRef={originalRequestRef}
            onChange={compiler.setDraft}
          >
            <div data-privacy-field="harnessTemplate" tabIndex={-1}>
              <Button
                className="mb-2"
                size="sm"
                variant="ghost"
                onClick={() => onOpenManager("harnesses")}
              >
                하네스 관리
              </Button>
              <HarnessTemplateSelector
                error={harnessTemplates.error}
                scenario={compiler.draft.scenario}
                selectedTemplateId={compiler.draft.harnessTemplateId ?? null}
                status={harnessTemplates.status}
                targetAgent={compiler.draft.targetAgent}
                templates={availableTemplates}
                onChange={compiler.setHarnessTemplateId}
              />
            </div>
            <div data-privacy-field="projectContextProfile" tabIndex={-1}>
              <ProjectContextProfileSelector
                error={projectContext.error}
                includeProjectContextProfile={projectContext.includeProjectContextProfile}
                isSelectedProfileUnavailable={projectContext.isSelectedProfileUnavailable}
                preview={projectContext.preview}
                previewError={projectContext.previewError}
                previewStatus={projectContext.previewStatus}
                profiles={projectContext.profiles}
                projectName={selectedProject?.name ?? null}
                selectedProfileId={projectContext.selectedProfileId}
                status={projectContext.status}
                onIncludeChange={projectContext.setIncludeProjectContextProfile}
                onManageProfiles={() => onOpenManager("context")}
                onSelectProfile={projectContext.selectProfile}
              />
            </div>
            <div data-privacy-field="promptTemplate" tabIndex={-1}>
              <Button
                className="mb-2"
                size="sm"
                variant="ghost"
                onClick={() => onOpenManager("templates")}
              >
                템플릿 관리
              </Button>
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
            </div>
          </PromptCompilerForm>
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
            compilerActionsEnabled={compiler.compilerActionsEnabled}
            guardDescriptionId={COMPILER_PROJECT_REBIND_DESCRIPTION_ID}
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
          <Button
            type="button"
            disabled={
              !compiler.canEditOutput ||
              compiler.compiled === null ||
              compiler.editablePrompt.trim().length === 0 ||
              editor.snapshot.selection === null ||
              editor.snapshot.isSaving ||
              selectedProject === null
            }
            onClick={() => {
              if (compiler.compiled === null || selectedProject === null || !compiler.canEditOutput)
                return
              editor.requestApply(
                versionInputFromCompiled(compiler.compiled, compiler.editablePrompt),
                selectedProject.id,
              )
            }}
          >
            편집에 적용
          </Button>
          {compiler.hasPendingSavedRefresh && (
            <Button
              disabled={compiler.isSavingNextVersion}
              variant="secondary"
              onClick={() => void compiler.retrySavedRefresh()}
            >
              저장 후 목록·태그 갱신 재시도
            </Button>
          )}
        </form>

        <div className="mt-4 flex flex-1 flex-col gap-4">
          <PromptCompilerOutputWorkspace
            compiler={compiler}
            projectContextPreview={
              projectContext.previewStatus === "ready" ? projectContext.preview : null
            }
            selectedHarnessTemplate={selectedTemplate}
            selectedProject={selectedProject}
          />
        </div>
      </section>
      <PrivacyWarningDialog
        confirmLabel="Send to OpenAI"
        onCancel={compiler.privacyWarning.cancel}
        onConfirm={compiler.privacyWarning.confirm}
        state={compiler.privacyWarning.state}
      />
    </Panel>
  )
}
