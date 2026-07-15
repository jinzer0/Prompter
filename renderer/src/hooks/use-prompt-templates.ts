import { useCallback, useEffect, useMemo, useState } from "react"

import type {
  CreatePromptTemplateInput,
  PromptTemplate,
  UpdatePromptTemplateInput,
} from "../../../electron/ipc-types"
import type { PromptScenario, TargetAgent } from "../lib/prompter-options"

export type PromptTemplateFilters = {
  readonly query?: string
  readonly scenario?: PromptScenario
  readonly targetAgent?: TargetAgent
}

export type PromptTemplatesStatus = "idle" | "loading" | "ready" | "error"

export function usePromptTemplates() {
  const [templates, setTemplates] = useState<readonly PromptTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [status, setStatus] = useState<PromptTemplatesStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilterState] = useState<PromptTemplateFilters>({})

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
    async (filter?: PromptTemplateFilters): Promise<void> => {
      const nextFilters = filter ?? filters

      if (filter !== undefined) {
        setFilterState(filter)
      }

      setStatus("loading")
      setError(null)

      try {
        const result = await window.prompter.promptTemplates.list(nextFilters)
        setTemplates(result.templates)
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

  function setFilters(next: PromptTemplateFilters): void {
    setFilterState(next)
  }

  function selectTemplate(id: string | null): void {
    setSelectedTemplateId(id)
  }

  const createTemplate = useCallback(
    async (input: CreatePromptTemplateInput): Promise<PromptTemplate> => {
      const template = await window.prompter.promptTemplates.create(input)
      await loadTemplates()
      return template
    },
    [loadTemplates],
  )

  const updateTemplate = useCallback(
    async (id: string, input: UpdatePromptTemplateInput): Promise<PromptTemplate> => {
      const template = await window.prompter.promptTemplates.update(id, input)
      await loadTemplates()
      return template
    },
    [loadTemplates],
  )

  const duplicateTemplate = useCallback(
    async (id: string): Promise<PromptTemplate> => {
      const template = await window.prompter.promptTemplates.duplicate(id)
      await loadTemplates()
      return template
    },
    [loadTemplates],
  )

  const deleteTemplate = useCallback(
    async (id: string): Promise<void> => {
      await window.prompter.promptTemplates.delete(id)

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
