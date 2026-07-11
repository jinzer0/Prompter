import { useEffect, useMemo, useRef } from "react"

import type { HarnessTemplate } from "../../../electron/ipc-types"
import type { HarnessTemplateFilters, HarnessTemplatesStatus } from "./use-harness-templates"

type HarnessTemplateSource = {
  readonly templates: readonly HarnessTemplate[]
  readonly status: HarnessTemplatesStatus
  readonly loadTemplates: (filter?: HarnessTemplateFilters) => Promise<void>
}

type UseAvailableHarnessTemplatesConfig = {
  readonly deletedHarnessTemplateIds: readonly string[]
  readonly harnessTemplateRefreshSignal: number
  readonly harnessTemplates: HarnessTemplateSource
  readonly selectedTemplateId: string | null
  readonly selectTemplate: (id: string | null) => void
}

type HarnessTemplateRefreshState = {
  readonly lastHandledRefreshSignal: number
  readonly refreshSignal: number
}

export function shouldHandleHarnessTemplateRefresh({
  lastHandledRefreshSignal,
  refreshSignal,
}: HarnessTemplateRefreshState): boolean {
  return refreshSignal > 0 && refreshSignal !== lastHandledRefreshSignal
}

export function useAvailableHarnessTemplates({
  deletedHarnessTemplateIds,
  harnessTemplateRefreshSignal,
  harnessTemplates,
  selectedTemplateId,
  selectTemplate,
}: UseAvailableHarnessTemplatesConfig) {
  const lastHandledRefreshSignal = useRef(0)
  const availableTemplates = useMemo(
    () =>
      harnessTemplates.templates.filter(
        (template) => !deletedHarnessTemplateIds.includes(template.id),
      ),
    [deletedHarnessTemplateIds, harnessTemplates.templates],
  )
  const selectedTemplate = useMemo(
    () => availableTemplates.find((template) => template.id === selectedTemplateId) ?? null,
    [availableTemplates, selectedTemplateId],
  )

  useEffect(() => {
    if (
      shouldHandleHarnessTemplateRefresh({
        lastHandledRefreshSignal: lastHandledRefreshSignal.current,
        refreshSignal: harnessTemplateRefreshSignal,
      })
    ) {
      lastHandledRefreshSignal.current = harnessTemplateRefreshSignal
      void harnessTemplates.loadTemplates()
    }
  }, [harnessTemplateRefreshSignal, harnessTemplates.loadTemplates])

  useEffect(() => {
    if (selectedTemplateId === null) {
      return
    }

    if (
      deletedHarnessTemplateIds.includes(selectedTemplateId) ||
      (harnessTemplates.status === "ready" && selectedTemplate === null)
    ) {
      selectTemplate(null)
    }
  }, [
    deletedHarnessTemplateIds,
    harnessTemplates.status,
    selectTemplate,
    selectedTemplate,
    selectedTemplateId,
  ])

  return { availableTemplates, selectedTemplate }
}
