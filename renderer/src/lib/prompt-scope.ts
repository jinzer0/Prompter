import type { PromptAsset, PromptVersion } from "../../../electron/ipc-types"

export type ScopedPromptVersions = {
  readonly assetId: string
  readonly versions: readonly PromptVersion[]
}

export function currentVersionForAsset(
  asset: PromptAsset | null,
  scopedVersions: ScopedPromptVersions | null,
  fallbackVersion: PromptVersion | null = null,
): PromptVersion | null {
  if (asset === null) {
    return fallbackVersion
  }

  if (scopedVersions === null || scopedVersions.assetId !== asset.id) {
    return fallbackVersion
  }

  return (
    scopedVersions.versions.find((version) => version.id === asset.currentVersionId) ??
    fallbackVersion ??
    scopedVersions.versions[0] ??
    null
  )
}
