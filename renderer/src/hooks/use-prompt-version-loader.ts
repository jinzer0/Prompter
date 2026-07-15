import { type Dispatch, type SetStateAction, useEffect } from "react"

import type { PromptAsset } from "../../../electron/ipc-types"
import type { ScopedPromptVersions } from "../lib/prompt-scope"
import {
  type LoadStatus,
  type ScopedPromptAssets,
  selectedPromptVersionId,
} from "./prompt-library-data"

type PromptVersionLoaderConfig = {
  readonly assetId: string | null
  readonly scopedAssets: ScopedPromptAssets | null
  readonly setScopedVersions: Dispatch<SetStateAction<ScopedPromptVersions | null>>
  readonly setVersionError: Dispatch<SetStateAction<string | null>>
  readonly setVersionId: Dispatch<SetStateAction<string | null>>
  readonly setVersionScopeAssetId: Dispatch<SetStateAction<string | null>>
  readonly setVersionStatus: Dispatch<SetStateAction<LoadStatus>>
}

export function usePromptVersionLoader({
  assetId,
  scopedAssets,
  setScopedVersions,
  setVersionError,
  setVersionId,
  setVersionScopeAssetId,
  setVersionStatus,
}: PromptVersionLoaderConfig): void {
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

    async function loadVersions(promptAsset: PromptAsset): Promise<void> {
      setScopedVersions(null)
      setVersionScopeAssetId(selectedPromptAssetId)
      setVersionStatus("loading")
      setVersionError(null)

      try {
        const loadedVersions = await window.prompter.prompts.listVersions(selectedPromptAssetId)

        if (isActive) {
          setScopedVersions({ assetId: selectedPromptAssetId, versions: loadedVersions })
          setVersionScopeAssetId(selectedPromptAssetId)
          setVersionId((current) => selectedPromptVersionId(current, promptAsset, loadedVersions))
          setVersionStatus("ready")
        }
      } catch (error) {
        if (isActive) {
          setVersionScopeAssetId(selectedPromptAssetId)
          setVersionError(error instanceof Error ? error.message : "Unexpected persistence error")
          setVersionStatus("error")
        }
      }
    }

    void loadVersions(activePromptAsset)

    return () => {
      isActive = false
    }
  }, [
    assetId,
    scopedAssets,
    setScopedVersions,
    setVersionError,
    setVersionId,
    setVersionScopeAssetId,
    setVersionStatus,
  ])
}
