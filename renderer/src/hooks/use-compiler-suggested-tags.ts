import { useCallback, useState } from "react"

type UseCompilerSuggestedTagsConfig = {
  readonly onTagsChanged: () => void
}

export function useCompilerSuggestedTags({ onTagsChanged }: UseCompilerSuggestedTagsConfig) {
  const [selectedSuggestedTags, setSelectedSuggestedTags] = useState<readonly string[]>([])

  const clearSuggestedTags = useCallback((): void => {
    setSelectedSuggestedTags([])
  }, [])

  const setSuggestedTagSelection = useCallback((tagName: string, isSelected: boolean): void => {
    setSelectedSuggestedTags((current) => {
      if (isSelected) {
        return current.includes(tagName) ? current : [...current, tagName]
      }

      return current.filter((selectedTagName) => selectedTagName !== tagName)
    })
  }, [])

  const attachSelectedSuggestedTags = useCallback(
    async (promptAssetId: string): Promise<void> => {
      if (selectedSuggestedTags.length === 0) {
        return
      }

      await Promise.all(
        selectedSuggestedTags.map((tagName) =>
          window.prompter.tags.createAndAttachToPrompt({ promptAssetId, tagName }),
        ),
      )
      onTagsChanged()
    },
    [onTagsChanged, selectedSuggestedTags],
  )

  return {
    attachSelectedSuggestedTags,
    clearSuggestedTags,
    selectedSuggestedTags,
    setSuggestedTagSelection,
  }
}
