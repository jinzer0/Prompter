import { useEffect, useMemo, useState } from "react"

import type { PromptAsset, PromptVersion } from "../../../../electron/ipc-types"
import { usePromptQuality } from "../../hooks/use-prompt-quality"
import {
  buildSavedPromptVersionQualitySnapshot,
  PromptQualityReviewPanel,
} from "./prompt-quality-review-panel"

type SavedPromptQualityPanelProps = {
  readonly selectedAsset: PromptAsset
  readonly selectedVersion: PromptVersion
}

export function SavedPromptQualityPanel({
  selectedAsset,
  selectedVersion,
}: SavedPromptQualityPanelProps) {
  const currentSnapshot = useMemo(
    () => buildSavedPromptVersionQualitySnapshot({ selectedAsset, selectedVersion }),
    [selectedAsset, selectedVersion],
  )
  const quality = usePromptQuality({
    currentSnapshot,
    promptVersionId: selectedVersion.id,
  })
  const [loadedPromptVersionId, setLoadedPromptVersionId] = useState<string | null>(null)

  useEffect(() => {
    if (loadedPromptVersionId === selectedVersion.id) {
      return
    }

    setLoadedPromptVersionId(selectedVersion.id)
    void quality.loadLatestReview()
  }, [loadedPromptVersionId, quality.loadLatestReview, selectedVersion.id])

  return (
    <PromptQualityReviewPanel
      actionState={quality.actionState}
      appliedScore={quality.appliedScore}
      error={quality.error}
      llmResult={quality.llmResult}
      operation={quality.operation}
      review={quality.review}
      versionQualityScore={selectedVersion.qualityScore}
      onApplyScore={quality.applyScore}
      onClearError={quality.clearError}
      onRunLLMReview={quality.runLLMReview}
      onReviewVersionLocally={quality.reviewVersionLocally}
      onSaveReview={quality.saveReview}
    />
  )
}
