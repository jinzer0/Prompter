import { type Dispatch, type SetStateAction, useCallback } from "react"

import type {
  CreateDerivedPromptAssetInput,
  CreatePromptWithInitialVersionResult,
  DuplicatePromptAssetInput,
} from "../../../electron/ipc-types"
import type { ScopedPromptVersions } from "../lib/prompt-scope"
import {
  type CreatedPromptVersionSnapshot,
  createDerivedPromptAssetState,
  duplicatePromptAssetState,
  type LoadStatus,
  type ScopedPromptAssets,
  type ScopedPromptVersionSummaries,
  setCurrentPromptVersionState,
} from "./prompt-library-data"

type ProjectPromptMutationState = {
  readonly setAssetId: Dispatch<SetStateAction<string | null>>
  readonly setAssetScopeProjectId: Dispatch<SetStateAction<string | null>>
  readonly setAssetStatus: Dispatch<SetStateAction<LoadStatus>>
  readonly setScopedAssets: Dispatch<SetStateAction<ScopedPromptAssets | null>>
  readonly setScopedVersionSummaries: Dispatch<SetStateAction<ScopedPromptVersionSummaries | null>>
  readonly setScopedVersions: Dispatch<SetStateAction<ScopedPromptVersions | null>>
  readonly setVersionError: Dispatch<SetStateAction<string | null>>
  readonly setVersionId: Dispatch<SetStateAction<string | null>>
  readonly setVersionScopeAssetId: Dispatch<SetStateAction<string | null>>
  readonly setVersionStatus: Dispatch<SetStateAction<LoadStatus>>
}

type UseProjectPromptMutationsConfig = {
  readonly projectId: string | null
  readonly projectIdRef: { current: string | null }
  readonly state: ProjectPromptMutationState
}

export function useProjectPromptMutations({
  projectId,
  projectIdRef,
  state,
}: UseProjectPromptMutationsConfig) {
  const applyAssets = useCallback(
    (activeProjectId: string, snapshot: ScopedPromptVersionSummaries): void => {
      state.setScopedVersionSummaries(snapshot)
      state.setAssetScopeProjectId(activeProjectId)
      state.setAssetStatus("ready")
    },
    [state],
  )

  const applyCreatedPromptSnapshot = useCallback(
    (activeProjectId: string, snapshot: CreatedPromptVersionSnapshot): void => {
      state.setScopedAssets({ projectId: activeProjectId, assets: snapshot.assets })
      applyAssets(activeProjectId, {
        projectId: activeProjectId,
        summaries: snapshot.summaries,
      })
      state.setAssetId(snapshot.asset.id)
      state.setVersionId(snapshot.version.id)
      state.setScopedVersions({ assetId: snapshot.asset.id, versions: [snapshot.version] })
      state.setVersionScopeAssetId(snapshot.asset.id)
      state.setVersionStatus("ready")
      state.setVersionError(null)
    },
    [applyAssets, state],
  )

  const duplicateAsset = useCallback(
    async (input: DuplicatePromptAssetInput): Promise<CreatePromptWithInitialVersionResult> => {
      const activeProjectId = projectId

      if (activeProjectId === null) {
        throw new TypeError("Prompt project scope changed before duplicate")
      }

      const snapshot = await duplicatePromptAssetState(activeProjectId, input)

      if (projectIdRef.current === activeProjectId) {
        applyCreatedPromptSnapshot(activeProjectId, snapshot)
      }

      return { asset: snapshot.asset, version: snapshot.version }
    },
    [applyCreatedPromptSnapshot, projectId, projectIdRef],
  )

  const createDerivedAsset = useCallback(
    async (input: CreateDerivedPromptAssetInput): Promise<CreatePromptWithInitialVersionResult> => {
      const activeProjectId = projectId

      if (activeProjectId === null) {
        throw new TypeError("Prompt project scope changed before derived save")
      }

      const snapshot = await createDerivedPromptAssetState(activeProjectId, input)

      if (projectIdRef.current === activeProjectId) {
        applyCreatedPromptSnapshot(activeProjectId, snapshot)
      }

      return { asset: snapshot.asset, version: snapshot.version }
    },
    [applyCreatedPromptSnapshot, projectId, projectIdRef],
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
        state.setScopedAssets({ projectId: activeProjectId, assets: snapshot.assets })
        applyAssets(activeProjectId, {
          projectId: activeProjectId,
          summaries: snapshot.summaries,
        })
        state.setAssetId(snapshot.asset.id)
        state.setScopedVersions({ assetId: snapshot.asset.id, versions: snapshot.versions })
        state.setVersionScopeAssetId(snapshot.asset.id)
        state.setVersionId(promptVersionId)
        state.setVersionStatus("ready")
        state.setVersionError(null)
      }
    },
    [applyAssets, projectId, projectIdRef, state],
  )

  return { applyAssets, createDerivedAsset, duplicateAsset, setCurrentVersion }
}
