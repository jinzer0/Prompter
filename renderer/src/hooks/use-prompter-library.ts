import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type {
  CreateProjectInput,
  CreatePromptAssetInput,
  CreatePromptVersionInput,
  Project,
  PromptAsset,
} from "../../../electron/ipc-types"
import { currentVersionForAsset, type ScopedPromptVersions } from "../lib/prompt-scope"

export type LoadStatus = "loading" | "ready" | "error"

type ScopedPromptAssets = {
  readonly projectId: string
  readonly assets: readonly PromptAsset[]
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected persistence error"
}

function selectedProjectId(current: string | null, projects: readonly Project[]): string | null {
  if (current !== null && projects.some((project) => project.id === current)) {
    return current
  }

  return projects[0]?.id ?? null
}

function selectedAssetId(current: string | null, assets: readonly PromptAsset[]): string | null {
  if (current !== null && assets.some((asset) => asset.id === current)) {
    return current
  }

  return assets[0]?.id ?? null
}

export function useProjects() {
  const [projects, setProjects] = useState<readonly Project[]>([])
  const [projectStatus, setProjectStatus] = useState<LoadStatus>("loading")
  const [projectError, setProjectError] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    setProjectStatus("loading")
    setProjectError(null)

    try {
      const loadedProjects = await window.prompter.projects.list()
      setProjects(loadedProjects)
      setProjectId((current) => selectedProjectId(current, loadedProjects))
      setProjectStatus("ready")
    } catch (error) {
      setProjectError(errorMessage(error))
      setProjectStatus("error")
    }
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const createProject = useCallback(async (input: CreateProjectInput): Promise<Project> => {
    const project = await window.prompter.projects.create(input)
    setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)])
    setProjectId(project.id)
    return project
  }, [])

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? null,
    [projectId, projects],
  )

  return {
    createProject,
    projectError,
    projects,
    projectStatus,
    selectProject: setProjectId,
    selectedProject,
  }
}

export function useProjectPrompts(projectId: string | null) {
  const projectIdRef = useRef(projectId)
  const [scopedAssets, setScopedAssets] = useState<ScopedPromptAssets | null>(null)
  const [assetScopeProjectId, setAssetScopeProjectId] = useState<string | null>(null)
  const [assetStatus, setAssetStatus] = useState<LoadStatus>("ready")
  const [assetError, setAssetError] = useState<string | null>(null)
  const [assetId, setAssetId] = useState<string | null>(null)
  const [scopedVersions, setScopedVersions] = useState<ScopedPromptVersions | null>(null)
  const [versionScopeAssetId, setVersionScopeAssetId] = useState<string | null>(null)
  const [versionStatus, setVersionStatus] = useState<LoadStatus>("ready")
  const [versionError, setVersionError] = useState<string | null>(null)

  useEffect(() => {
    projectIdRef.current = projectId

    if (projectId === null) {
      setScopedAssets(null)
      setAssetScopeProjectId(null)
      setAssetId(null)
      setScopedVersions(null)
      setVersionScopeAssetId(null)
      setAssetStatus("ready")
      setAssetError(null)
      setVersionStatus("ready")
      setVersionError(null)
      return
    }

    const activeProjectId = projectId
    let isActive = true

    setScopedAssets(null)
    setAssetScopeProjectId(activeProjectId)
    setAssetId(null)
    setScopedVersions(null)
    setVersionScopeAssetId(null)
    setAssetStatus("loading")
    setAssetError(null)
    setVersionStatus("ready")
    setVersionError(null)

    async function loadProjectAssets(): Promise<void> {
      try {
        const loadedAssets = await window.prompter.prompts.listAssets({
          projectId: activeProjectId,
        })

        if (isActive && projectIdRef.current === activeProjectId) {
          setScopedAssets({ projectId: activeProjectId, assets: loadedAssets })
          setAssetScopeProjectId(activeProjectId)
          setAssetId(selectedAssetId(null, loadedAssets))
          setAssetStatus("ready")
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
  }, [projectId])

  useEffect(() => {
    if (assetId === null) {
      setScopedVersions(null)
      setVersionScopeAssetId(null)
      setVersionStatus("ready")
      setVersionError(null)
      return
    }

    const selectedPromptAssetId = assetId
    let isActive = true

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
  }, [assetId])

  const createPrompt = useCallback(
    async (
      assetInput: CreatePromptAssetInput,
      versionInput: Omit<CreatePromptVersionInput, "promptAssetId">,
    ) => {
      const activeProjectId = projectId

      if (activeProjectId === null || assetInput.projectId !== activeProjectId) {
        throw new TypeError("Prompt project scope changed before save")
      }

      const asset = await window.prompter.prompts.createAsset(assetInput)
      const version = await window.prompter.prompts.createVersion({
        ...versionInput,
        promptAssetId: asset.id,
      })
      const currentAsset = await window.prompter.prompts.setCurrentVersion(asset.id, version.id)
      const loadedAssets = await window.prompter.prompts.listAssets({
        projectId: activeProjectId,
      })

      if (projectIdRef.current === activeProjectId) {
        setScopedAssets({ projectId: activeProjectId, assets: loadedAssets })
        setAssetScopeProjectId(activeProjectId)
        setAssetId(currentAsset.id)
        setScopedVersions({ assetId: currentAsset.id, versions: [version] })
        setVersionScopeAssetId(currentAsset.id)
        setVersionStatus("ready")
        setVersionError(null)
      }

      return currentAsset
    },
    [projectId],
  )

  const assets = useMemo(() => {
    if (projectId === null || scopedAssets?.projectId !== projectId) {
      return []
    }

    return scopedAssets.assets
  }, [projectId, scopedAssets])

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === assetId) ?? null,
    [assetId, assets],
  )
  const currentVersion = useMemo(
    () => currentVersionForAsset(selectedAsset, scopedVersions),
    [selectedAsset, scopedVersions],
  )
  const effectiveAssetStatus: LoadStatus =
    projectId === null || assetScopeProjectId === projectId ? assetStatus : "loading"
  const effectiveVersionStatus: LoadStatus =
    selectedAsset === null || versionScopeAssetId === selectedAsset.id ? versionStatus : "loading"
  const versions =
    scopedVersions !== null && scopedVersions.assetId === selectedAsset?.id
      ? scopedVersions.versions
      : []

  return {
    assetError: assetScopeProjectId === projectId ? assetError : null,
    assets,
    assetStatus: effectiveAssetStatus,
    createPrompt,
    currentVersion,
    selectAsset: setAssetId,
    selectedAsset,
    versionError: versionScopeAssetId === selectedAsset?.id ? versionError : null,
    versions,
    versionStatus: effectiveVersionStatus,
  }
}
