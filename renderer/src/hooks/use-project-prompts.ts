import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type {
  CreateNextPromptVersionInput,
  CreatePromptWithInitialVersionInput,
  CreatePromptWithInitialVersionResult,
  PromptVersion,
} from "../../../electron/ipc-types"
import type { ScopedPromptVersions } from "../lib/prompt-scope"
import { reloadProjectPromptAssets } from "./project-prompt-reload"
import {
  comparePromptVersions,
  createNextPromptVersionState,
  createPromptWithVersion,
  type LoadStatus,
  loadPromptAssets,
  type ScopedPromptAssets,
  type ScopedPromptVersionSummaries,
  selectedAssetId,
} from "./prompt-library-data"
import { promptSelectionState } from "./prompt-selection-state"
import { useProjectPromptMutations } from "./use-project-prompt-mutations"
import { usePromptVersionLoader } from "./use-prompt-version-loader"

export function useProjectPrompts(projectId: string | null) {
  const projectIdRef = useRef(projectId)
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
          setAssetId(selectedAssetId(null, snapshot.assets))
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

      const snapshot = await createPromptWithVersion(activeProjectId, input)

      if (projectIdRef.current === activeProjectId) {
        setScopedAssets({ projectId: activeProjectId, assets: snapshot.assets })
        mutations.applyAssets(activeProjectId, {
          projectId: activeProjectId,
          summaries: snapshot.summaries,
        })
        setAssetId(snapshot.asset.id)
        setVersionId(snapshot.version.id)
        setScopedVersions({ assetId: snapshot.asset.id, versions: [snapshot.version] })
        setVersionScopeAssetId(snapshot.asset.id)
        setVersionStatus("ready")
        setVersionError(null)
      }

      return { asset: snapshot.asset, version: snapshot.version }
    },
    [mutations.applyAssets, projectId],
  )

  const createNextVersion = useCallback(
    async (input: CreateNextPromptVersionInput): Promise<PromptVersion> => {
      const activeProjectId = projectId

      if (activeProjectId === null) {
        throw new TypeError("Prompt project scope changed before version save")
      }

      const snapshot = await createNextPromptVersionState(activeProjectId, input)

      if (projectIdRef.current === activeProjectId) {
        setScopedAssets({ projectId: activeProjectId, assets: snapshot.assets })
        mutations.applyAssets(activeProjectId, {
          projectId: activeProjectId,
          summaries: snapshot.summaries,
        })
        setAssetId(snapshot.asset.id)
        setScopedVersions({ assetId: snapshot.asset.id, versions: snapshot.versions })
        setVersionScopeAssetId(snapshot.asset.id)
        setVersionId(snapshot.version.id)
        setVersionStatus("ready")
        setVersionError(null)
      }

      return snapshot.version
    },
    [mutations.applyAssets, projectId],
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
    reloadAssets,
    selectAsset,
    selectVersion: setVersionId,
    setCurrentVersion: mutations.setCurrentVersion,
  }
}
