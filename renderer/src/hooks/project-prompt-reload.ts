import type { Dispatch, RefObject, SetStateAction } from "react"

import type { PromptAsset } from "../../../electron/ipc-types"
import {
  type LoadStatus,
  loadPromptAssets,
  type ScopedPromptAssets,
  type ScopedPromptVersionSummaries,
  type SelectionOptions,
  selectedAssetId,
} from "./prompt-library-data"

type ProjectPromptReloadState = {
  readonly setAssetError: Dispatch<SetStateAction<string | null>>
  readonly setAssetId: Dispatch<SetStateAction<string | null>>
  readonly setAssetScopeProjectId: Dispatch<SetStateAction<string | null>>
  readonly setAssetStatus: Dispatch<SetStateAction<LoadStatus>>
  readonly setScopedAssets: Dispatch<SetStateAction<ScopedPromptAssets | null>>
}

export type ProjectPromptAssetReloadConfig = {
  readonly applyAssets: (projectId: string, summaries: ScopedPromptVersionSummaries) => void
  readonly clearPromptScope: () => void
  readonly options?: SelectionOptions
  readonly projectIdRef: RefObject<string | null>
  readonly state: ProjectPromptReloadState
}

type LoadedAssetsUpdate = {
  readonly activeProjectId: string
  readonly assets: readonly PromptAsset[]
  readonly config: ProjectPromptAssetReloadConfig
  readonly summaries: ScopedPromptVersionSummaries
}

function applyLoadedAssets(update: LoadedAssetsUpdate): void {
  update.config.state.setScopedAssets({
    projectId: update.activeProjectId,
    assets: update.assets,
  })
  update.config.applyAssets(update.activeProjectId, update.summaries)
  update.config.state.setAssetId((current) =>
    selectedAssetId(current, update.assets, update.config.options),
  )
  update.config.state.setAssetStatus("ready")
}

export async function reloadProjectPromptAssets(
  config: ProjectPromptAssetReloadConfig,
): Promise<void> {
  const activeProjectId = config.projectIdRef.current

  if (activeProjectId === null) {
    config.clearPromptScope()
    return
  }

  config.state.setAssetScopeProjectId(activeProjectId)
  config.state.setAssetStatus("loading")
  config.state.setAssetError(null)

  try {
    const snapshot = await loadPromptAssets(activeProjectId)

    if (config.projectIdRef.current === activeProjectId) {
      applyLoadedAssets({
        activeProjectId,
        assets: snapshot.assets,
        config,
        summaries: {
          projectId: activeProjectId,
          summaries: snapshot.summaries,
        },
      })
    }
  } catch (error) {
    if (config.projectIdRef.current === activeProjectId) {
      config.state.setAssetScopeProjectId(activeProjectId)
      config.state.setAssetError(
        error instanceof Error ? error.message : "Unexpected persistence error",
      )
      config.state.setAssetStatus("error")
    }
  }
}
