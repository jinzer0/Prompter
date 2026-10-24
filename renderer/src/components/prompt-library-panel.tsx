import type { Project, PromptAsset } from "../../../electron/ipc-types"
import type { CreatePrompt } from "../hooks/prompt-library-data"
import type { InsightsSelectionRequest } from "../hooks/use-insights-workspace-navigation"
import { usePromptLibraryPanel } from "../hooks/use-prompt-library-panel"
import type { LoadStatus, PromptVersionSummary } from "../hooks/use-prompter-library"
import { PromptAssetCard } from "./prompt-asset-card"
import { PromptLibraryFilters } from "./prompt-library-filters"
import { PromptLibraryNewPromptForm } from "./prompt-library-new-prompt-form"
import { PromptSearchResultCard } from "./prompt-search-result-card"
import { PromptTagAttachmentForm } from "./prompt-tag-attachment-form"
import { Panel } from "./shell/panel"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { EmptyState } from "./ui/empty-state"

type PromptLibraryPanelProps = {
  readonly assets: readonly PromptAsset[]
  readonly currentVersionSummaries: readonly PromptVersionSummary[]
  readonly createPrompt: CreatePrompt
  readonly error: string | null
  readonly onTagsChanged: () => void
  readonly selectAsset: (id: string) => void
  readonly selectedAsset: PromptAsset | null
  readonly selectedProject: Project | null
  readonly status: LoadStatus
  readonly tagRefreshSignal: number
  readonly tagRequest: InsightsSelectionRequest | null
}

export function PromptLibraryPanel({
  assets,
  currentVersionSummaries,
  createPrompt,
  error,
  onTagsChanged,
  selectAsset,
  selectedAsset,
  selectedProject,
  status,
  tagRefreshSignal,
  tagRequest,
}: PromptLibraryPanelProps) {
  const library = usePromptLibraryPanel({
    assets,
    createPrompt,
    currentVersionSummaries,
    selectedProject,
    status,
    tagRefreshSignal,
    tagRequest,
  })

  return (
    <Panel
      data-testid="prompt-library"
      data-insights-target="prompt-library"
      tabIndex={-1}
      headingId="prompt-library-heading"
      className="prompter-prompt-list"
    >
      <header className="flex items-start justify-between gap-2 pb-3">
        <div className="min-w-0 flex-1">
          <h1 id="prompt-library-heading" className="text-[16px] font-semibold tracking-tight">
            Prompt Library
          </h1>
          <p className="mt-1 text-[12px] text-muted">
            {selectedProject === null
              ? "Create or select a project to view prompts."
              : `Prompts for ${selectedProject.name}`}
          </p>
        </div>
        <Button
          data-menu-action-target="new-prompt"
          aria-label="New Prompt"
          title="새 프롬프트"
          size="sm"
          variant="ghost"
          disabled={selectedProject === null}
          onClick={() => library.setIsFormOpen(true)}
        >
          +
        </Button>
      </header>

      {library.isFormOpen && selectedProject !== null && (
        <PromptLibraryNewPromptForm
          draft={library.draft}
          isSaving={library.isSaving}
          message={library.message}
          onChange={library.setDraft}
          onSubmit={library.submitPrompt}
        />
      )}

      {selectedProject !== null && (
        <PromptLibraryFilters
          query={library.searchQuery}
          scenario={library.scenarioFilter}
          selectedTagIds={library.selectedTagIds}
          tagCounts={library.tagCounts}
          targetAgent={library.targetAgentFilter}
          onClear={library.clearFilters}
          onQueryChange={library.setSearchQuery}
          onScenarioChange={library.setScenarioFilter}
          onTagToggle={library.toggleTagFilter}
          onTargetAgentChange={library.setTargetAgentFilter}
        />
      )}

      <div className="mt-4 flex flex-1 flex-col gap-3">
        {selectedProject === null && (
          <Card>
            <CardHeader>
              <CardTitle>Select a project to view prompts</CardTitle>
              <CardDescription>Prompt assets are scoped to the active project.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                label="Prompt scope"
                title="No project selected"
                description="Create a project or select one from the sidebar."
              />
            </CardContent>
          </Card>
        )}

        {selectedProject !== null && status === "loading" && (
          <p className="text-[12px] text-muted">Loading prompts...</p>
        )}
        {selectedProject !== null && status === "error" && (
          <p className="text-[12px] text-muted-strong">{error}</p>
        )}
        {selectedProject !== null && library.searchStatus === "loading" && (
          <p className="text-[12px] text-muted">Searching prompts...</p>
        )}
        {selectedProject !== null && library.searchStatus === "error" && (
          <p className="text-[12px] text-muted-strong">{library.searchError}</p>
        )}
        {selectedProject !== null &&
          status === "ready" &&
          assets.length === 0 &&
          !library.hasActiveFilters && (
            <EmptyState
              label="Library state"
              title="No prompts yet"
              description="Create a prompt to save its first version."
            />
          )}
        {selectedProject !== null &&
          status === "ready" &&
          library.hasActiveFilters &&
          library.searchStatus === "ready" &&
          library.searchResults !== null &&
          library.searchResults.length === 0 && (
            <EmptyState
              label="Library state"
              title="No prompts match your filters"
              description="Clear search filters or adjust the query."
            />
          )}

        {library.searchResults === null &&
          library.defaultItems.map(({ asset, currentVersion }) => (
            <PromptAssetCard
              key={asset.id}
              asset={asset}
              currentVersion={currentVersion}
              isSelected={asset.id === selectedAsset?.id}
              onSelect={() => selectAsset(asset.id)}
            />
          ))}
        {library.searchResults?.map((item) => (
          <PromptSearchResultCard
            key={item.promptAssetId}
            item={item}
            isSelected={item.promptAssetId === selectedAsset?.id}
            onSelect={() => selectAsset(item.promptAssetId)}
          />
        ))}
      </div>
      {selectedProject !== null && (
        <details className="mt-4 text-[12px] text-muted">
          <summary className="cursor-pointer py-2">태그 편집</summary>
          <PromptTagAttachmentForm selectedAsset={selectedAsset} onTagsChanged={onTagsChanged} />
        </details>
      )}
    </Panel>
  )
}
