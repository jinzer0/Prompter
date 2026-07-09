import { useCallback, useEffect, useRef, useState } from "react"

import type {
  CreateNextPromptVersionInput,
  CreatePromptAssetInput,
  CreatePromptVersionInput,
  PromptVersion,
} from "../../../electron/ipc-types"
import type { ScopedPromptVersions } from "../lib/prompt-scope"
import {
  comparePromptVersions,
  createNextPromptVersionState,
  createPromptWithVersion,
  errorMessage,
  type LoadStatus,
  loadPromptAssets,
  type ScopedPromptAssets,
  type ScopedPromptVersionSummaries,
  selectedAssetId,
  selectedPromptVersionId,
  setCurrentPromptVersionState,
} from "./prompt-library-data"
import { promptSelectionState } from "./prompt-selection-state"

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

  const applyAssets = useCallback(
    (activeProjectId: string, snapshot: ScopedPromptVersionSummaries): void => {
      setScopedVersionSummaries(snapshot)
      setAssetScopeProjectId(activeProjectId)
      setAssetStatus("ready")
    },
    [],
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
          applyAssets(activeProjectId, {
            projectId: activeProjectId,
            summaries: snapshot.summaries,
          })
          setAssetId(selectedAssetId(null, snapshot.assets))
        }
      } catch (error) {
        if (isActive && projectIdRef.current === activeProjectId) {
          setAssetScopeProjectId(activeProjectId)
          setAssetError(errorMessage(error))
          setAssetStatus("error")
        }
      }
    }

    void loadProjectAssets()

    return () => {
      isActive = false
    }
  }, [applyAssets, clearPromptScope, projectId])

  useEffect(() => {
    if (assetId === null) {
      setScopedVersions(null)
      setVersionScopeAssetId(null)
      setVersionId(null)
      setVersionStatus("ready")
      setVersionError(null)
      return
    }

    const selectedPromptAssetId = assetId
    const selectedPromptAsset = scopedAssets?.assets.find(
      (asset) => asset.id === selectedPromptAssetId,
    )
    let isActive = true

    if (selectedPromptAsset === undefined) {
      setScopedVersions(null)
      setVersionScopeAssetId(null)
      setVersionId(null)
      setVersionStatus("ready")
      setVersionError(null)
      return
    }

    const activePromptAsset = selectedPromptAsset

    async function loadVersions(): Promise<void> {
      setScopedVersions(null)
      setVersionScopeAssetId(selectedPromptAssetId)
      setVersionStatus("loading")
      setVersionError(null)

      try {
        const loadedVersions = await window.prompter.prompts.listVersions(selectedPromptAssetId)

        if (isActive) {
          setScopedVersions({ assetId: selectedPromptAssetId, versions: loadedVersions })
          setVersionScopeAssetId(selectedPromptAssetId)
          setVersionId((current) =>
            selectedPromptVersionId(current, activePromptAsset, loadedVersions),
          )
          setVersionStatus("ready")
        }
      } catch (error) {
        if (isActive) {
          setVersionScopeAssetId(selectedPromptAssetId)
          setVersionError(errorMessage(error))
          setVersionStatus("error")
        }
      }
    }

    void loadVersions()

    return () => {
      isActive = false
    }
  }, [assetId, scopedAssets])

  const createPrompt = useCallback(
    async (
      assetInput: CreatePromptAssetInput,
      versionInput: Omit<CreatePromptVersionInput, "promptAssetId">,
    ) => {
      const activeProjectId = projectId

      if (activeProjectId === null || assetInput.projectId !== activeProjectId) {
        throw new TypeError("Prompt project scope changed before save")
      }

      const snapshot = await createPromptWithVersion(activeProjectId, assetInput, versionInput)

      if (projectIdRef.current === activeProjectId) {
        setScopedAssets({ projectId: activeProjectId, assets: snapshot.assets })
        applyAssets(activeProjectId, {
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

      return snapshot.asset
    },
    [applyAssets, projectId],
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
        applyAssets(activeProjectId, {
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
    [applyAssets, projectId],
  )

  const setCurrentVersion = useCallback(
    async (promptAssetId: string, promptVersionId: string): Promise<void> => {
      const activeProjectId = projectId

      if (activeProjectId === null) {
        throw new TypeError("Prompt project scope changed before current version update")
      }

      const snapshot = await setCurrentPromptVersionState(
        activeProjectId,
        promptAssetId,
        promptVersionId,
      )

      if (projectIdRef.current === activeProjectId) {
        setScopedAssets({ projectId: activeProjectId, assets: snapshot.assets })
        applyAssets(activeProjectId, {
          projectId: activeProjectId,
          summaries: snapshot.summaries,
        })
        setAssetId(snapshot.asset.id)
        setScopedVersions({ assetId: snapshot.asset.id, versions: snapshot.versions })
        setVersionScopeAssetId(snapshot.asset.id)
        setVersionId(promptVersionId)
        setVersionStatus("ready")
        setVersionError(null)
      }
    },
    [applyAssets, projectId],
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
    createNextVersion,
    createPrompt,
    ...selection,
    selectAsset,
    selectVersion: setVersionId,
    setCurrentVersion,
  }
}
