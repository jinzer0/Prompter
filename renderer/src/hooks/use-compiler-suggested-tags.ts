import { useCallback, useState } from "react"

export function useCompilerSuggestedTags() {
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

  return {
    clearSuggestedTags,
    selectedSuggestedTags,
    setSuggestedTagSelection,
  }
}
