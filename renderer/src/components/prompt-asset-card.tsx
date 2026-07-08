import type { PromptAsset } from "../../../electron/ipc-types"
import { formatTimestamp } from "../lib/format-timestamp"
import { scenarioLabel, targetAgentLabel } from "../lib/prompter-options"
import { cn } from "../lib/utils"
import { Badge } from "./ui/badge"

type PromptAssetCardProps = {
  readonly asset: PromptAsset
  readonly isSelected: boolean
  readonly onSelect: () => void
}

export function PromptAssetCard({ asset, isSelected, onSelect }: PromptAssetCardProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={cn(
        "rounded-card border bg-panel-elevated p-4 text-left transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45",
        isSelected ? "border-accent/35" : "border-border hover:border-border-subtle",
      )}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-[14px] font-semibold text-foreground">{asset.title}</span>
        <Badge variant={asset.currentVersionId === null ? "neutral" : "accent"}>
          {asset.currentVersionId === null ? "No version" : "Current"}
        </Badge>
      </span>
      <span className="mt-2 flex flex-wrap gap-2 text-[12px] text-muted">
        <span>{scenarioLabel(asset.scenario)}</span>
        <span>{targetAgentLabel(asset.targetAgent)}</span>
        <span>Updated {formatTimestamp(asset.updatedAt)}</span>
      </span>
    </button>
  )
}
