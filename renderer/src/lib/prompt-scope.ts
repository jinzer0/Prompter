import type { PromptAsset, PromptVersion } from "../../../electron/ipc-types"

export type ScopedPromptVersions = {
  readonly assetId: string
  readonly versions: readonly PromptVersion[]
}

export function currentVersionForAsset(
  asset: PromptAsset | null,
  scopedVersions: ScopedPromptVersions | null,
): PromptVersion | null {
  if (asset === null || scopedVersions === null || scopedVersions.assetId !== asset.id) {
    return null
  }

  return (
    scopedVersions.versions.find((version) => version.id === asset.currentVersionId) ??
    scopedVersions.versions[0] ??
    null
  )
}
