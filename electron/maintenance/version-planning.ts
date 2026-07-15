import {
  type MaintenancePromptAssetRow,
  type MaintenancePromptVersionRow,
  projectCurrentVersions,
} from "./current-version-projection.js"

export type CurrentVersionRepairReason =
  | "null_current_version"
  | "missing_current_version"
  | "wrong_asset_current_version"

export type CurrentVersionRepair = {
  readonly promptAssetId: string
  readonly replacementVersionId: string
  readonly reason: CurrentVersionRepairReason
}

export type CurrentVersionRepairPreview = CurrentVersionRepair & {
  readonly currentVersionId: string | null
  readonly replacementVersionNumber: number
}

export type CurrentVersionRepairPlan = {
  readonly repairs: readonly CurrentVersionRepair[]
  readonly emptyAssetFindings: readonly {
    readonly promptAssetId: string
    readonly findingType: "empty_prompt_asset"
  }[]
}

export type SearchIndexRow = {
  readonly promptAssetId: string
  readonly title: string
  readonly originalInput: string
  readonly compiledPrompt: string
}

export type SearchIndexHealthPlan = {
  readonly expectedRows: readonly SearchIndexRow[]
  readonly missingPromptAssetIds: readonly string[]
  readonly extraPromptAssetIds: readonly string[]
  readonly stalePromptAssetIds: readonly string[]
}

export function planCurrentVersionRepairs(
  assets: readonly MaintenancePromptAssetRow[],
  versions: readonly MaintenancePromptVersionRow[],
): CurrentVersionRepairPlan {
  const versionsById = new Map(versions.map((version) => [version.id, version]))
  const highestVersionByAsset = new Map<string, MaintenancePromptVersionRow>()
  for (const version of versions) {
    const highest = highestVersionByAsset.get(version.promptAssetId)
    if (highest === undefined || version.versionNumber > highest.versionNumber) {
      highestVersionByAsset.set(version.promptAssetId, version)
    }
  }

  const repairs: CurrentVersionRepair[] = []
  const emptyAssetFindings: CurrentVersionRepairPlan["emptyAssetFindings"][number][] = []
  for (const asset of assets) {
    const highest = highestVersionByAsset.get(asset.id)
    if (highest === undefined) {
      emptyAssetFindings.push({ promptAssetId: asset.id, findingType: "empty_prompt_asset" })
      continue
    }

    const current =
      asset.currentVersionId === null ? undefined : versionsById.get(asset.currentVersionId)
    if (current?.promptAssetId === asset.id) {
      continue
    }

    const reason: CurrentVersionRepairReason =
      asset.currentVersionId === null
        ? "null_current_version"
        : current === undefined
          ? "missing_current_version"
          : "wrong_asset_current_version"
    repairs.push({ promptAssetId: asset.id, replacementVersionId: highest.id, reason })
  }

  return { repairs, emptyAssetFindings }
}

export function planSelectedCurrentVersionRepairPreviews(
  assets: readonly MaintenancePromptAssetRow[],
  versions: readonly MaintenancePromptVersionRow[],
  selectedPromptAssetIds: readonly string[],
): readonly CurrentVersionRepairPreview[] {
  const selectedIds = new Set(selectedPromptAssetIds)
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]))
  const versionsById = new Map(versions.map((version) => [version.id, version]))

  return planCurrentVersionRepairs(assets, versions).repairs.flatMap((repair) => {
    if (!selectedIds.has(repair.promptAssetId)) {
      return []
    }
    const asset = assetsById.get(repair.promptAssetId)
    const replacement = versionsById.get(repair.replacementVersionId)
    return asset === undefined || replacement === undefined
      ? []
      : [
          {
            ...repair,
            currentVersionId: asset.currentVersionId,
            replacementVersionNumber: replacement.versionNumber,
          },
        ]
  })
}

export function planSearchIndexHealth(
  assets: readonly MaintenancePromptAssetRow[],
  versions: readonly MaintenancePromptVersionRow[],
  indexedRows: readonly SearchIndexRow[],
): SearchIndexHealthPlan {
  const expectedRows = projectCurrentVersions(assets, versions).map(({ asset, version }) => ({
    promptAssetId: asset.id,
    title: asset.title,
    originalInput: version.originalInput,
    compiledPrompt: version.compiledPrompt,
  }))
  const expectedById = new Map(expectedRows.map((row) => [row.promptAssetId, row]))
  const indexedById = new Map(indexedRows.map((row) => [row.promptAssetId, row]))
  const missingPromptAssetIds = expectedRows.flatMap((row) =>
    indexedById.has(row.promptAssetId) ? [] : [row.promptAssetId],
  )
  const extraPromptAssetIds = indexedRows.flatMap((row) =>
    expectedById.has(row.promptAssetId) ? [] : [row.promptAssetId],
  )
  const stalePromptAssetIds = expectedRows.flatMap((expected) => {
    const indexed = indexedById.get(expected.promptAssetId)
    return indexed !== undefined &&
      (indexed.title !== expected.title ||
        indexed.originalInput !== expected.originalInput ||
        indexed.compiledPrompt !== expected.compiledPrompt)
      ? [expected.promptAssetId]
      : []
  })

  return { expectedRows, missingPromptAssetIds, extraPromptAssetIds, stalePromptAssetIds }
}
