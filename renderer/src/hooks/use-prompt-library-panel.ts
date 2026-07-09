import { useEffect, useMemo, useState } from "react"

import type {
  CreatePromptAssetInput,
  CreatePromptVersionInput,
  Project,
  PromptAsset,
  PromptSearchResultItem,
  PromptVersion,
  TagWithCount,
} from "../../../electron/ipc-types"
import type { PromptDraft } from "../components/prompt-library-new-prompt-form"
import { emptyPromptDraft } from "../components/prompt-library-new-prompt-form"
import type { ScenarioFilter, TargetAgentFilter } from "../components/prompt-library-filters"
import type { LoadStatus, PromptVersionSummary } from "./prompt-library-data"

type CreatePrompt = (
  assetInput: CreatePromptAssetInput,
  versionInput: Omit<CreatePromptVersionInput, "promptAssetId">,
) => Promise<PromptAsset>

type VisiblePromptAsset = {
  readonly asset: PromptAsset
  readonly currentVersion: PromptVersion | null
}

type UsePromptLibraryPanelConfig = {
  readonly assets: readonly PromptAsset[]
  readonly createPrompt: CreatePrompt
  readonly currentVersionSummaries: readonly PromptVersionSummary[]
  readonly selectedProject: Project | null
  readonly status: LoadStatus
  readonly tagRefreshSignal: number
}

export function usePromptLibraryPanel({
  assets,
  createPrompt,
  currentVersionSummaries,
  selectedProject,
  status,
  tagRefreshSignal,
}: UsePromptLibraryPanelConfig) {
  const [draft, setDraft] = useState<PromptDraft>(emptyPromptDraft)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [scenarioFilter, setScenarioFilter] = useState<ScenarioFilter>("")
  const [targetAgentFilter, setTargetAgentFilter] = useState<TargetAgentFilter>("")
  const [selectedTagIds, setSelectedTagIds] = useState<readonly string[]>([])
  const [tagCounts, setTagCounts] = useState<readonly TagWithCount[]>([])
  const [searchResults, setSearchResults] = useState<readonly PromptSearchResultItem[] | null>(null)
  const [searchStatus, setSearchStatus] = useState<LoadStatus>("ready")
  const [searchError, setSearchError] = useState<string | null>(null)

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    scenarioFilter !== "" ||
    targetAgentFilter !== "" ||
    selectedTagIds.length > 0

  const defaultItems = useMemo<readonly VisiblePromptAsset[]>(
    () =>
      assets.map((asset) => ({
        asset,
        currentVersion:
          currentVersionSummaries.find((summary) => summary.assetId === asset.id)?.version ?? null,
      })),
    [assets, currentVersionSummaries],
  )

  useEffect(() => {
    if (selectedProject === null || status !== "ready") {
      setTagCounts([])
      return
    }

    let isActive = true

    async function loadTagCounts(): Promise<void> {
      const nextTagCounts = await window.prompter.tags.listWithCounts()

      if (isActive) {
        setTagCounts(nextTagCounts)
      }
    }

    void loadTagCounts()

    return () => {
      isActive = false
    }
  }, [selectedProject, status, tagRefreshSignal])

  useEffect(() => {
    if (selectedProject === null || status !== "ready" || !hasActiveFilters) {
      setSearchResults(null)
      setSearchStatus("ready")
      setSearchError(null)
      return
    }

    const activeProjectId = selectedProject.id
    let isActive = true

    async function searchPrompts(): Promise<void> {
      setSearchStatus("loading")
      setSearchError(null)

      try {
        const results = await window.prompter.search.searchPrompts({
          projectId: activeProjectId,
          query: searchQuery,
          limit: 100,
          ...(scenarioFilter === "" ? {} : { scenario: scenarioFilter }),
          ...(targetAgentFilter === "" ? {} : { targetAgent: targetAgentFilter }),
          ...(selectedTagIds.length === 0 ? {} : { tagIds: [...selectedTagIds] }),
        })

        if (isActive) {
          setSearchResults(results.items)
          setSearchStatus("ready")
        }
      } catch (error) {
        if (isActive) {
          setSearchError(error instanceof Error ? error.message : "Prompt search failed")
          setSearchStatus("error")
        }
      }
    }

    void searchPrompts()

    return () => {
      isActive = false
    }
  }, [
    hasActiveFilters,
    scenarioFilter,
    searchQuery,
    selectedProject,
    selectedTagIds,
    status,
    tagRefreshSignal,
    targetAgentFilter,
  ])

  async function submitPrompt(): Promise<void> {
    if (selectedProject === null) {
      setMessage("Select a project before saving prompt")
      return
    }

    const title = draft.title.trim()
    const originalInput = draft.originalInput.trim()
    const compiledPrompt = draft.compiledPrompt.trim()

    if (title.length === 0) {
      setMessage("Prompt title is required")
      return
    }

    if (originalInput.length === 0) {
      setMessage("Original input is required")
      return
    }

    if (compiledPrompt.length === 0) {
      setMessage("Compiled prompt is required")
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      await createPrompt(
        {
          projectId: selectedProject.id,
          title,
          scenario: draft.scenario,
          targetAgent: draft.targetAgent,
        },
        { originalInput, compiledPrompt },
      )
      await window.prompter.search.rebuildIndex()
      setDraft(emptyPromptDraft)
      setIsFormOpen(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Prompt could not be saved")
    } finally {
      setIsSaving(false)
    }
  }

  function clearFilters(): void {
    setSearchQuery("")
    setScenarioFilter("")
    setTargetAgentFilter("")
    setSelectedTagIds([])
    setSearchResults(null)
  }

  function toggleTagFilter(tagId: string): void {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((currentTagId) => currentTagId !== tagId)
        : [...current, tagId],
    )
  }

  return {
    clearFilters,
    defaultItems,
    draft,
    hasActiveFilters,
    isFormOpen,
    isSaving,
    message,
    scenarioFilter,
    searchError,
    searchQuery,
    searchResults,
    searchStatus,
    selectedTagIds,
    setDraft,
    setIsFormOpen,
    setScenarioFilter,
    setSearchQuery,
    setTargetAgentFilter,
    submitPrompt,
    tagCounts,
    targetAgentFilter,
    toggleTagFilter,
  }
}
