import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type {
  CreatePromptTemplateInput,
  PromptTemplate,
  PromptTemplateListResult,
  UpdatePromptTemplateInput,
} from "../../../electron/ipc-types"
import type { PromptScenario, TargetAgent } from "../lib/prompter-options"

export type PromptTemplateFilters = {
  readonly query?: string
  readonly scenario?: PromptScenario
  readonly targetAgent?: TargetAgent
}

export type PromptTemplatesStatus = "idle" | "loading" | "ready" | "error"

export type PromptTemplateLoadEvent =
  | { readonly kind: "load_started" }
  | { readonly kind: "list_applied"; readonly templates: readonly PromptTemplate[] }
  | { readonly kind: "exact_applied"; readonly template: PromptTemplate }
  | { readonly kind: "load_failed"; readonly message: string }

export type PromptTemplateLoadResult<T> =
  | { readonly kind: "applied"; readonly value: T }
  | { readonly kind: "failed" }
  | { readonly kind: "stale" }

type PromptTemplateLoadBridge = {
  readonly get: (id: string) => Promise<PromptTemplate>
  readonly list: (filters: PromptTemplateFilters) => Promise<PromptTemplateListResult>
}

export type PromptTemplateLoader = {
  readonly loadTemplate: (id: string) => Promise<PromptTemplateLoadResult<PromptTemplate>>
  readonly loadTemplates: (
    filters: PromptTemplateFilters,
  ) => Promise<PromptTemplateLoadResult<readonly PromptTemplate[]>>
}

export function createPromptTemplateLoader(
  bridge: PromptTemplateLoadBridge,
  dispatch: (event: PromptTemplateLoadEvent) => void,
): PromptTemplateLoader {
  let generation = 0

  function startLoad(): number {
    generation += 1
    dispatch({ kind: "load_started" })
    return generation
  }

  function failedLoad(error: unknown, requestGeneration: number): PromptTemplateLoadResult<never> {
    if (requestGeneration !== generation) return { kind: "stale" }
    if (!(error instanceof Error)) throw error
    dispatch({ kind: "load_failed", message: error.message })
    return { kind: "failed" }
  }

  return {
    async loadTemplates(filters) {
      const requestGeneration = startLoad()
      try {
        const result = await bridge.list(filters)
        if (requestGeneration !== generation) return { kind: "stale" }
        dispatch({ kind: "list_applied", templates: result.templates })
        return { kind: "applied", value: result.templates }
      } catch (error) {
        return failedLoad(error, requestGeneration)
      }
    },
    async loadTemplate(id) {
      const requestGeneration = startLoad()
      try {
        const template = await bridge.get(id)
        if (requestGeneration !== generation) return { kind: "stale" }
        dispatch({ kind: "exact_applied", template })
        return { kind: "applied", value: template }
      } catch (error) {
        return failedLoad(error, requestGeneration)
      }
    },
  }
}

function assertNever(event: never): never {
  throw new TypeError(`Unexpected prompt template load event: ${JSON.stringify(event)}`)
}

export function usePromptTemplates() {
  const [templates, setTemplates] = useState<readonly PromptTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [status, setStatus] = useState<PromptTemplatesStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilterState] = useState<PromptTemplateFilters>({})
  const loaderRef = useRef<PromptTemplateLoader | null>(null)

  if (loaderRef.current === null) {
    loaderRef.current = createPromptTemplateLoader(
      {
        get: (id) => window.prompter.promptTemplates.get(id),
        list: (nextFilters) => window.prompter.promptTemplates.list(nextFilters),
      },
      (event) => {
        switch (event.kind) {
          case "load_started":
            setStatus("loading")
            setError(null)
            return
          case "list_applied":
            setTemplates(event.templates)
            setStatus("ready")
            return
          case "exact_applied":
            setTemplates((current) => [
              event.template,
              ...current.filter((item) => item.id !== event.template.id),
            ])
            setSelectedTemplateId(event.template.id)
            setStatus("ready")
            return
          case "load_failed":
            setError(event.message)
            setStatus("error")
            return
          default:
            return assertNever(event)
        }
      },
    )
  }

  const loader = loaderRef.current

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
    async (
      filter?: PromptTemplateFilters,
    ): Promise<PromptTemplateLoadResult<readonly PromptTemplate[]>> => {
      const nextFilters = filter ?? filters

      if (filter !== undefined) {
        setFilterState(filter)
      }

      return loader.loadTemplates(nextFilters)
    },
    [filters, loader],
  )

  const loadTemplate = useCallback(
    (id: string): Promise<PromptTemplateLoadResult<PromptTemplate>> => loader.loadTemplate(id),
    [loader],
  )

  const setFilters = useCallback((next: PromptTemplateFilters): void => {
    setFilterState(next)
  }, [])

  const selectTemplate = useCallback((id: string | null): void => {
    setSelectedTemplateId(id)
  }, [])

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
    loadTemplate,
    loadTemplates,
    setFilters,
    selectTemplate,
    createTemplate,
    updateTemplate,
    duplicateTemplate,
    deleteTemplate,
  }
}
