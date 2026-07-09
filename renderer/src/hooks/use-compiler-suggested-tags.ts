import { useState } from "react"

type UseCompilerSuggestedTagsConfig = {
  readonly onTagsChanged: () => void
}

export function useCompilerSuggestedTags({ onTagsChanged }: UseCompilerSuggestedTagsConfig) {
  const [selectedSuggestedTags, setSelectedSuggestedTags] = useState<readonly string[]>([])

  function clearSuggestedTags(): void {
    setSelectedSuggestedTags([])
  }

  function setSuggestedTagSelection(tagName: string, isSelected: boolean): void {
    setSelectedSuggestedTags((current) => {
      if (isSelected) {
        return current.includes(tagName) ? current : [...current, tagName]
      }

      return current.filter((selectedTagName) => selectedTagName !== tagName)
    })
  }

  async function attachSelectedSuggestedTags(promptAssetId: string): Promise<void> {
    if (selectedSuggestedTags.length === 0) {
      return
    }

    await Promise.all(
      selectedSuggestedTags.map((tagName) =>
        window.prompter.tags.createAndAttachToPrompt({ promptAssetId, tagName }),
      ),
    )
    onTagsChanged()
  }

  return {
    attachSelectedSuggestedTags,
    clearSuggestedTags,
    selectedSuggestedTags,
    setSuggestedTagSelection,
  }
}
