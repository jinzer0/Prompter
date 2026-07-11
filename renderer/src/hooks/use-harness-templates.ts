import { useCallback, useEffect, useMemo, useState } from "react"

import type {
  CreateHarnessTemplateInput,
  HarnessTemplate,
  UpdateHarnessTemplateInput,
} from "../../../electron/ipc-types"
import type { PromptScenario, TargetAgent } from "../lib/prompter-options"

export type HarnessTemplateFilters = {
  readonly scenario?: PromptScenario
  readonly targetAgent?: TargetAgent
  readonly query?: string
}

export type HarnessTemplatesStatus = "idle" | "loading" | "ready" | "error"

export function useHarnessTemplates() {
  const [templates, setTemplates] = useState<readonly HarnessTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [status, setStatus] = useState<HarnessTemplatesStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilterState] = useState<HarnessTemplateFilters>({})

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  )

  useEffect(() => {
    if (selectedTemplateId !== null && selectedTemplate === null) {
      setSelectedTemplateId(null)
    }
  }, [selectedTemplate, selectedTemplateId])

  const loadTemplates = useCallback(
    async (filter?: HarnessTemplateFilters): Promise<void> => {
      const nextFilters = filter ?? filters

      if (filter !== undefined) {
        setFilterState(filter)
      }

      setStatus("loading")
      setError(null)

      try {
        const nextTemplates = await window.prompter.harnessTemplates.list(nextFilters)
        setTemplates(nextTemplates)
        setStatus("ready")
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error
        }

        setError(error.message)
        setStatus("error")
      }
    },
    [filters],
  )

  function setFilters(next: HarnessTemplateFilters): void {
    setFilterState(next)
  }

  function selectTemplate(id: string | null): void {
    setSelectedTemplateId(id)
  }

  const createTemplate = useCallback(
    async (input: CreateHarnessTemplateInput): Promise<HarnessTemplate> => {
      const template = await window.prompter.harnessTemplates.create(input)
      await loadTemplates()
      return template
    },
    [loadTemplates],
  )

  const updateTemplate = useCallback(
    async (id: string, input: UpdateHarnessTemplateInput): Promise<HarnessTemplate> => {
      const template = await window.prompter.harnessTemplates.update(id, input)
      await loadTemplates()
      return template
    },
    [loadTemplates],
  )

  const duplicateTemplate = useCallback(
    async (id: string): Promise<HarnessTemplate> => {
      const template = await window.prompter.harnessTemplates.duplicate(id)
      await loadTemplates()
      return template
    },
    [loadTemplates],
  )

  const deleteTemplate = useCallback(
    async (id: string): Promise<void> => {
      await window.prompter.harnessTemplates.delete(id)

      if (id === selectedTemplateId) {
        setSelectedTemplateId(null)
      }

      await loadTemplates()
    },
    [loadTemplates, selectedTemplateId],
  )

  return {
    templates,
    selectedTemplateId,
    selectedTemplate,
    status,
    error,
    filters,
    loadTemplates,
    setFilters,
    selectTemplate,
    createTemplate,
    updateTemplate,
    duplicateTemplate,
    deleteTemplate,
  }
}
