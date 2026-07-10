import type { FormEvent } from "react"
import type {
  ComparePromptVersionsResult,
  CreateNextPromptVersionInput,
  CreatePromptAssetInput,
  CreatePromptVersionInput,
  Project,
  PromptAsset,
  PromptVersion,
} from "../../../electron/ipc-types"
import { usePromptCompilerPanel } from "../hooks/use-prompt-compiler-panel"
import type { LoadStatus } from "../hooks/use-prompter-library"
import { exportBaseFromCompiled } from "../lib/prompt-export"
import { CompiledPromptPreview } from "./compiled-prompt-preview"
import { PromptCompilerAnalysis } from "./prompt-compiler-analysis"
import { PromptCompilerForm } from "./prompt-compiler-form"
import { PromptExportActions } from "./prompt-export-actions"
import { PromptVersionManagement } from "./prompt-version-management"
import { Panel } from "./shell/panel"
import { Button } from "./ui/button"
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
  readonly currentVersion: PromptVersion | null
  readonly error: string | null
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
  currentVersion,
  error,
  selectedAsset,
  selectedVersion,
  selectedProject,
  selectVersion,
  setCurrentVersion,
  status,
  versions,
  onTagsChanged,
}: PromptCompilerPanelProps) {
  const compiler = usePromptCompilerPanel({
    createNextVersion,
    createPrompt,
    onTagsChanged,
    selectedAsset,
    selectedProject,
  })
  const compiledExportBase =
    compiler.compiled === null
      ? null
      : exportBaseFromCompiled(compiler.compiled, compiler.editablePrompt, selectedProject)

  function compileStaticPrompt(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    compiler.compileStatic()
  }

  return (
    <Panel data-testid="prompt-compiler" headingId="prompt-compiler-heading">
      <header className="border-b border-border-subtle pb-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Detail</p>
        <h2
          id="prompt-compiler-heading"
          className="mt-2 text-[24px] font-medium tracking-[-0.012em]"
        >
          Prompt Compiler
        </h2>
        <p className="mt-1 text-[14px] text-muted">
          Analyze requests with LLMs or generate local template prompts.
        </p>
      </header>

      <form
        className="mt-4 space-y-4 rounded-card border border-border bg-panel-elevated p-4"
        onSubmit={compileStaticPrompt}
      >
        <PromptCompilerForm draft={compiler.draft} onChange={compiler.setDraft} />
        {compiler.message !== null && (
          <p className="text-[12px] text-muted-strong">{compiler.message}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit">프롬프트 컴파일</Button>
          <Button
            type="button"
            variant="secondary"
            disabled={compiler.isAnalyzing || compiler.isCompilingLLM}
            onClick={compiler.analyzeWithLLM}
          >
            {compiler.isAnalyzing ? "분석 중..." : "분석하기"}
          </Button>
          <Button
            data-menu-action-target="save-compiled-prompt"
            type="button"
            variant="secondary"
            disabled={compiler.isAnalyzing || compiler.isCompilingLLM}
            onClick={compiler.compileWithLLM}
          >
            {compiler.isCompilingLLM ? "생성 중..." : "최종 프롬프트 생성"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={selectedProject === null || compiler.compiled === null || compiler.isSaving}
            onClick={compiler.savePrompt}
          >
            {compiler.isSaving ? "Saving..." : "Save compiled prompt"}
          </Button>
          {selectedAsset !== null && compiler.compiled !== null && (
            <Button
              type="button"
              variant="secondary"
              disabled={compiler.isSavingNextVersion || compiler.editablePrompt.trim().length === 0}
              onClick={compiler.saveNextVersion}
            >
              {compiler.isSavingNextVersion ? "Saving..." : "Save as new version"}
            </Button>
          )}
          <Button
            data-menu-action-target="copy-compiled-prompt"
            type="button"
            variant="ghost"
            disabled={compiler.editablePrompt.trim().length === 0}
            onClick={compiler.copyPrompt}
          >
            Copy
          </Button>
        </div>
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
        <CompiledPromptPreview
          value={compiler.editablePrompt}
          onChange={compiler.setEditablePrompt}
        />
        <PromptExportActions
          copyButtonLabel="Copy compiled export"
          exportBase={compiledExportBase}
          formatLabel="Compiled preview export format"
          rawContent={compiler.editablePrompt}
          saveButtonLabel="Save compiled export"
          title="Compiled preview export"
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
