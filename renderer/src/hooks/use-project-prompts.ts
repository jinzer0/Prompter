import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type {
  CreateNextPromptVersionInput,
  CreateNextPromptVersionResult,
  CreatePromptWithInitialVersionInput,
  CreatePromptWithInitialVersionResult,
  PromptVersion,
} from "../../../electron/ipc-types"
import type { ScopedPromptVersions } from "../lib/prompt-scope"
import { reloadProjectPromptAssets } from "./project-prompt-reload"
import {
  comparePromptVersions,
  type LoadStatus,
  loadPromptAssets,
  type ScopedPromptAssets,
  type ScopedPromptVersionSummaries,
  selectedAssetId,
} from "./prompt-library-data"
import { promptSelectionState } from "./prompt-selection-state"
import { useProjectPromptMutations } from "./use-project-prompt-mutations"
import { usePromptVersionLoader } from "./use-prompt-version-loader"

type RestoredPromptSelection = {
  readonly projectId: string
  readonly assetId: string
  readonly versionId: string
}

export function useProjectPrompts(
  projectId: string | null,
  restoredSelection: RestoredPromptSelection | null = null,
) {
  const projectIdRef = useRef(projectId)
  const restoredSelectionRef = useRef(restoredSelection)
  const [scopedAssets, setScopedAssets] = useState<ScopedPromptAssets | null>(null)
  const [assetScopeProjectId, setAssetScopeProjectId] = useState<string | null>(null)
  const [assetStatus, setAssetStatus] = useState<LoadStatus>("ready")
  const [assetError, setAssetError] = useState<string | null>(null)
  const [assetId, setAssetId] = useState<string | null>(null)
  const [versionId, setVersionId] = useState<string | null>(null)
  const [scopedVersions, setScopedVersions] = useState<ScopedPromptVersions | null>(null)
  const [scopedVersionSummaries, setScopedVersionSummaries] =
    useState<ScopedPromptVersionSummaries | null>(null)
  const [versionScopeAssetId, setVersionScopeAssetId] = useState<string | null>(null)
  const [versionStatus, setVersionStatus] = useState<LoadStatus>("ready")
  const [versionError, setVersionError] = useState<string | null>(null)

  const clearPromptScope = useCallback((): void => {
    setScopedAssets(null)
    setAssetScopeProjectId(null)
    setAssetId(null)
    setVersionId(null)
    setScopedVersions(null)
    setScopedVersionSummaries(null)
    setVersionScopeAssetId(null)
    setAssetStatus("ready")
    setAssetError(null)
    setVersionStatus("ready")
    setVersionError(null)
  }, [])

  const acceptPersistedPrompt = useCallback(
    (result: CreateNextPromptVersionResult, select: boolean): void => {
      const activeProjectId = projectIdRef.current
      if (activeProjectId === null || result.asset.projectId !== activeProjectId) return
      setScopedAssets((current) => ({
        projectId: activeProjectId,
        assets: [
          result.asset,
          ...(current?.projectId === activeProjectId
            ? current.assets.filter((asset) => asset.id !== result.asset.id)
            : []),
        ],
      }))
      setScopedVersionSummaries((current) => ({
        projectId: activeProjectId,
        summaries: [
          { assetId: result.asset.id, version: result.version },
          ...(current?.projectId === activeProjectId
            ? current.summaries.filter((summary) => summary.assetId !== result.asset.id)
            : []),
        ],
      }))
      setAssetScopeProjectId(activeProjectId)
      setAssetStatus("ready")
      if (!select) return
      setAssetId(result.asset.id)
      setVersionId(result.version.id)
      setScopedVersions((current) => ({
        assetId: result.asset.id,
        versions: [
          result.version,
          ...(current?.assetId === result.asset.id
            ? current.versions.filter((version) => version.id !== result.version.id)
            : []),
        ],
      }))
      setVersionScopeAssetId(result.asset.id)
      setVersionStatus("ready")
      setVersionError(null)
    },
    [],
  )

  const refreshPersistedPrompt = useCallback(
    async (result: CreateNextPromptVersionResult, select: boolean): Promise<void> => {
      acceptPersistedPrompt(result, select)
      const activeProjectId = result.asset.projectId
      if (activeProjectId === null || projectIdRef.current !== activeProjectId) return
      const snapshot = await loadPromptAssets(activeProjectId)
      if (projectIdRef.current !== activeProjectId) return
      setScopedAssets({ projectId: activeProjectId, assets: snapshot.assets })
      setScopedVersionSummaries({ projectId: activeProjectId, summaries: snapshot.summaries })
    },
    [acceptPersistedPrompt],
  )

  const mutationState = useMemo(
    () => ({
      setAssetId,
      setAssetScopeProjectId,
      setAssetStatus,
      setScopedAssets,
      setScopedVersionSummaries,
      setScopedVersions,
      setVersionError,
      setVersionId,
      setVersionScopeAssetId,
      setVersionStatus,
    }),
    [],
  )
  const mutations = useProjectPromptMutations({
    projectId,
    projectIdRef,
    state: mutationState,
  })

  const reloadAssets = useCallback(
    async (options: { readonly preserveSelection?: boolean } = {}): Promise<void> => {
      await reloadProjectPromptAssets({
        applyAssets: mutations.applyAssets,
        clearPromptScope,
        options,
        projectIdRef,
        state: {
          setAssetError,
          setAssetId,
          setAssetScopeProjectId,
          setAssetStatus,
          setScopedAssets,
        },
      })
    },
    [clearPromptScope, mutations.applyAssets],
  )

  useEffect(() => {
    projectIdRef.current = projectId

    if (projectId === null) {
      clearPromptScope()
      return
    }

    const activeProjectId = projectId
    let isActive = true

    clearPromptScope()
    setAssetScopeProjectId(activeProjectId)
    setAssetStatus("loading")

    async function loadProjectAssets(): Promise<void> {
      try {
        const snapshot = await loadPromptAssets(activeProjectId)

        if (isActive && projectIdRef.current === activeProjectId) {
          setScopedAssets({ projectId: activeProjectId, assets: snapshot.assets })
          mutations.applyAssets(activeProjectId, {
            projectId: activeProjectId,
            summaries: snapshot.summaries,
          })
          const restored = restoredSelectionRef.current
          const canRestore = restored?.projectId === activeProjectId
          setAssetId(selectedAssetId(canRestore ? restored.assetId : null, snapshot.assets))
          if (canRestore) setVersionId(restored.versionId)
          restoredSelectionRef.current = null
          setAssetStatus("ready")
        }
      } catch (error) {
        if (isActive && projectIdRef.current === activeProjectId) {
          setAssetScopeProjectId(activeProjectId)
          setAssetError(error instanceof Error ? error.message : "Unexpected persistence error")
          setAssetStatus("error")
        }
      }
    }

    void loadProjectAssets()

    return () => {
      isActive = false
    }
  }, [clearPromptScope, mutations.applyAssets, projectId])

  usePromptVersionLoader({
    assetId,
    loadedVersions: scopedVersions,
    scopedAssets,
    setScopedVersions,
    setVersionError,
    setVersionId,
    setVersionScopeAssetId,
    setVersionStatus,
  })

  const createPrompt = useCallback(
    async (
      input: CreatePromptWithInitialVersionInput,
    ): Promise<CreatePromptWithInitialVersionResult> => {
      const activeProjectId = projectId

      if (activeProjectId === null || input.projectId !== activeProjectId) {
        throw new TypeError("Prompt project scope changed before save")
      }

      const result = await window.prompter.prompts.createWithInitialVersion(input)
      try {
        await refreshPersistedPrompt(result, true)
      } catch (error) {
        setAssetError(
          `프롬프트는 저장되었지만 목록을 갱신하지 못했습니다: ${error instanceof Error ? error.message : "갱신 실패"}`,
        )
      }
      return result
    },
    [refreshPersistedPrompt, projectId],
  )

  const createNextVersion = useCallback(
    async (input: CreateNextPromptVersionInput): Promise<PromptVersion> => {
      const activeProjectId = projectId

      if (activeProjectId === null) {
        throw new TypeError("Prompt project scope changed before version save")
      }

      const result = await window.prompter.prompts.createNextVersion(input)
      try {
        await refreshPersistedPrompt(result, true)
      } catch (error) {
        setAssetError(
          `버전은 저장되었지만 목록을 갱신하지 못했습니다: ${error instanceof Error ? error.message : "갱신 실패"}`,
        )
      }
      return result.version
    },
    [refreshPersistedPrompt, projectId],
  )

  const selection = promptSelectionState({
    assetError,
    assetId,
    assetScopeProjectId,
    assetStatus,
    projectId,
    scopedAssets,
    scopedVersions,
    scopedVersionSummaries,
    versionError,
    versionId,
    versionScopeAssetId,
    versionStatus,
  })
  const selectAsset = useCallback((id: string): void => {
    setAssetId(id)
    setVersionId(null)
  }, [])

  return {
    compareVersions: comparePromptVersions,
    createDerivedAsset: mutations.createDerivedAsset,
    createNextVersion,
    createPrompt,
    duplicateAsset: mutations.duplicateAsset,
    ...selection,
    acceptPersistedPrompt,
    refreshPersistedPrompt,
    reloadAssets,
    selectAsset,
    selectVersion: setVersionId,
    setCurrentVersion: mutations.setCurrentVersion,
  }
}
