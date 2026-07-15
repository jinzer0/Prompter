import type { PromptAsset, PromptLineage, PromptLineageSummary } from "../../../electron/ipc-types"

export type LineageNavigationSummary = PromptLineageSummary & {
  readonly canNavigate: boolean
}

export type LineageParentState =
  | { readonly kind: "none" }
  | { readonly kind: "active"; readonly parent: LineageNavigationSummary }
  | { readonly kind: "deleted" }

export type PromptLineageView = {
  readonly parent: LineageParentState
  readonly children: readonly LineageNavigationSummary[]
}

function canNavigateTo(promptAssetId: string, sameProjectAssets: readonly PromptAsset[]): boolean {
  return sameProjectAssets.some((asset) => asset.id === promptAssetId)
}

function navigableSummary(
  summary: PromptLineageSummary,
  sameProjectAssets: readonly PromptAsset[],
): LineageNavigationSummary {
  return { ...summary, canNavigate: canNavigateTo(summary.promptAssetId, sameProjectAssets) }
}

export function buildPromptLineageView(
  selectedAsset: PromptAsset,
  lineage: PromptLineage,
  sameProjectAssets: readonly PromptAsset[],
): PromptLineageView {
  const children = lineage.children.map((child) => navigableSummary(child, sameProjectAssets))

  if (lineage.parent !== null) {
    return {
      parent: { kind: "active", parent: navigableSummary(lineage.parent, sameProjectAssets) },
      children,
    }
  }

  if (selectedAsset.derivationType !== null) {
    return { parent: { kind: "deleted" }, children }
  }

  return { parent: { kind: "none" }, children }
}
