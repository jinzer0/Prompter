import type { PromptSearchResultItem } from "../../../electron/ipc-types"
import { scenarioLabel, targetAgentLabel } from "../lib/prompter-options"
import { Badge } from "./ui/badge"
import { SelectableCard } from "./ui/selectable-card"

type PromptSearchResultCardProps = {
  readonly isSelected: boolean
  readonly item: PromptSearchResultItem
  readonly onSelect: () => void
}

export function PromptSearchResultCard({
  isSelected,
  item,
  onSelect,
}: PromptSearchResultCardProps) {
  return (
    <SelectableCard selected={isSelected} onClick={onSelect}>
      <span className="text-[14px] font-semibold text-foreground">{item.title}</span>
      <span className="mt-2 line-clamp-2 block text-[12px] leading-5 text-muted-strong">
        {item.matchedTextPreview.length > 0 ? item.matchedTextPreview : item.compiledPromptPreview}
      </span>
      <span className="mt-2 flex flex-wrap gap-2 text-[12px] text-muted">
        <Badge variant="accent">v{item.versionNumber}</Badge>
        <span>{scenarioLabel(item.scenario)}</span>
        <span>{targetAgentLabel(item.targetAgent)}</span>
        {item.qualityScore !== null && <span>Saved quality score {item.qualityScore}</span>}
      </span>
      {item.tags.length > 0 && (
        <span className="mt-2 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <Badge key={tag.id} variant="neutral">
              {tag.name}
            </Badge>
          ))}
        </span>
      )}
    </SelectableCard>
  )
}
