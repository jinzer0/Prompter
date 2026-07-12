import type { PromptAsset, PromptVersion } from "../../../electron/ipc-types"
import { formatTimestamp } from "../lib/format-timestamp"
import { parsePromptVersionMetadata } from "../lib/prompt-version-diff"
import { scenarioLabel, targetAgentLabel } from "../lib/prompter-options"
import { cn } from "../lib/utils"
import { Badge } from "./ui/badge"

type PromptAssetCardProps = {
  readonly asset: PromptAsset
  readonly currentVersion: PromptVersion | null
  readonly isSelected: boolean
  readonly onSelect: () => void
}

function compiledPromptPreview(version: PromptVersion | null): string {
  if (version === null) {
    return "No compiled_prompt saved yet"
  }

  const firstLine =
    version.compiledPrompt
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("#")) ?? version.compiledPrompt

  return firstLine.length > 24 ? `${firstLine.slice(0, 24).trimEnd()}...` : firstLine
}

export function PromptAssetCard({
  asset,
  currentVersion,
  isSelected,
  onSelect,
}: PromptAssetCardProps) {
  const metadata = currentVersion === null ? null : parsePromptVersionMetadata(currentVersion)

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
        <Badge variant={currentVersion === null ? "neutral" : "accent"}>
          {currentVersion === null ? "No version" : `v${currentVersion.versionNumber}`}
        </Badge>
      </span>
      <span className="mt-2 flex flex-wrap gap-2 text-[12px] text-muted">
        <span>{scenarioLabel(asset.scenario)}</span>
        <span>{targetAgentLabel(asset.targetAgent)}</span>
        <span>Updated {formatTimestamp(asset.updatedAt)}</span>
        {metadata?.qualityScore !== null && metadata?.qualityScore !== undefined && (
          <span>Saved quality score {metadata.qualityScore}</span>
        )}
      </span>
      <span className="mt-3 line-clamp-2 block text-[12px] leading-5 text-muted-strong">
        {compiledPromptPreview(currentVersion)}
      </span>
    </button>
  )
}
