export type MaintenancePromptAssetRow = {
  readonly id: string
  readonly projectId?: string | null
  readonly title: string
  readonly scenario: string
  readonly targetAgent: string
  readonly currentVersionId: string | null
}

export type MaintenancePromptVersionRow = {
  readonly id: string
  readonly promptAssetId: string
  readonly versionNumber: number
  readonly originalInput: string
  readonly compiledPrompt: string
  readonly qualityScore?: number | null
}

export type CurrentVersionProjection = {
  readonly asset: MaintenancePromptAssetRow
  readonly version: MaintenancePromptVersionRow
}

export function projectCurrentVersions(
  assets: readonly MaintenancePromptAssetRow[],
  versions: readonly MaintenancePromptVersionRow[],
): readonly CurrentVersionProjection[] {
  const versionsById = new Map(versions.map((version) => [version.id, version]))

  return assets.flatMap((asset) => {
    if (asset.currentVersionId === null) {
      return []
    }

    const version = versionsById.get(asset.currentVersionId)
    return version?.promptAssetId === asset.id ? [{ asset, version }] : []
  })
}
