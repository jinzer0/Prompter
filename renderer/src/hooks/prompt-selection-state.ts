import type { PromptAsset, PromptVersion } from "../../../electron/ipc-types"
import { currentVersionForAsset, type ScopedPromptVersions } from "../lib/prompt-scope"
import type {
  LoadStatus,
  PromptVersionSummary,
  ScopedPromptAssets,
  ScopedPromptVersionSummaries,
} from "./prompt-library-data"

type PromptSelectionStateInput = {
  readonly assetError: string | null
  readonly assetId: string | null
  readonly assetScopeProjectId: string | null
  readonly assetStatus: LoadStatus
  readonly projectId: string | null
  readonly scopedAssets: ScopedPromptAssets | null
  readonly scopedVersions: ScopedPromptVersions | null
  readonly scopedVersionSummaries: ScopedPromptVersionSummaries | null
  readonly versionError: string | null
  readonly versionId: string | null
  readonly versionScopeAssetId: string | null
  readonly versionStatus: LoadStatus
}

type PromptSelectionState = {
  readonly assetError: string | null
  readonly assets: readonly PromptAsset[]
  readonly assetStatus: LoadStatus
  readonly currentVersion: PromptVersion | null
  readonly currentVersionSummaries: readonly PromptVersionSummary[]
  readonly selectedAsset: PromptAsset | null
  readonly selectedVersion: PromptVersion | null
  readonly versionError: string | null
  readonly versions: readonly PromptVersion[]
  readonly versionStatus: LoadStatus
}

export function promptSelectionState(input: PromptSelectionStateInput): PromptSelectionState {
  const assets =
    input.projectId !== null && input.scopedAssets?.projectId === input.projectId
      ? input.scopedAssets.assets
      : []
  const selectedAsset = assets.find((asset) => asset.id === input.assetId) ?? null
  const currentVersionSummaries =
    input.scopedVersionSummaries !== null &&
    input.scopedVersionSummaries.projectId === input.projectId
      ? input.scopedVersionSummaries.summaries
      : []
  const selectedAssetCurrentSummary =
    currentVersionSummaries.find((summary) => summary.assetId === selectedAsset?.id)?.version ??
    null
  const currentVersion = currentVersionForAsset(
    selectedAsset,
    input.scopedVersions,
    selectedAssetCurrentSummary,
  )
  const versions =
    input.scopedVersions !== null && input.scopedVersions.assetId === selectedAsset?.id
      ? input.scopedVersions.versions
      : []

  return {
    assetError: input.assetScopeProjectId === input.projectId ? input.assetError : null,
    assets,
    assetStatus:
      input.projectId === null || input.assetScopeProjectId === input.projectId
        ? input.assetStatus
        : "loading",
    currentVersion,
    currentVersionSummaries,
    selectedAsset,
    selectedVersion:
      versions.find((version) => version.id === input.versionId) ??
      currentVersion ??
      versions[0] ??
      null,
    versionError: input.versionScopeAssetId === selectedAsset?.id ? input.versionError : null,
    versions,
    versionStatus:
      selectedAsset === null || input.versionScopeAssetId === selectedAsset.id
        ? input.versionStatus
        : "loading",
  }
}
