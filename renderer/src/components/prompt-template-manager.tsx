import { useEffect, useMemo, useState } from "react"

import type { PromptTemplate } from "../../../electron/ipc-types"
import { type PromptTemplateFilters, usePromptTemplates } from "../hooks/use-prompt-templates"
import {
  type NormalizedPromptTemplateForm,
  updateInputFromPromptTemplateForm,
} from "../lib/prompt-template-form"
import { PromptTemplateEditor, type PromptTemplateEditorMode } from "./prompt-template-editor"
import {
  type PromptTemplateScenarioFilter,
  PromptTemplateSidebarSection,
  type PromptTemplateTargetAgentFilter,
} from "./prompt-template-sidebar-section"
import { Button } from "./ui/button"

type DeleteConfirmation = {
  readonly id: string
  readonly name: string
}

type PromptTemplateManagerProps = {
  readonly refreshSignal: number
  readonly onTemplatesChanged: () => void
}

export function promptTemplateManagerFiltersFromState(
  query: string,
  scenario: PromptTemplateScenarioFilter,
  targetAgent: PromptTemplateTargetAgentFilter,
): PromptTemplateFilters {
  return {
    ...(query.trim().length > 0 ? { query } : {}),
    ...(scenario !== "" ? { scenario } : {}),
    ...(targetAgent !== "" ? { targetAgent } : {}),
  }
}

function confirmationFromTemplate(template: PromptTemplate | null): DeleteConfirmation | null {
  return template === null ? null : { id: template.id, name: template.name }
}

export function PromptTemplateManager({
  refreshSignal,
  onTemplatesChanged,
}: PromptTemplateManagerProps) {
  const promptTemplates = usePromptTemplates()
  const [query, setQuery] = useState("")
  const [scenario, setScenario] = useState<PromptTemplateScenarioFilter>("")
  const [targetAgent, setTargetAgent] = useState<PromptTemplateTargetAgentFilter>("")
  const [editorMode, setEditorMode] = useState<PromptTemplateEditorMode | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const hasActiveFilters = query.trim().length > 0 || scenario.length > 0 || targetAgent.length > 0
  const activeFilters = useMemo(
    () => promptTemplateManagerFiltersFromState(query, scenario, targetAgent),
    [query, scenario, targetAgent],
  )

  useEffect(() => {
    if (promptTemplates.status === "idle") {
      void promptTemplates.loadTemplates({})
    }
  }, [promptTemplates.loadTemplates, promptTemplates.status])

  useEffect(() => {
    if (refreshSignal > 0) {
      void promptTemplates.loadTemplates(activeFilters)
    }
  }, [activeFilters, promptTemplates.loadTemplates, refreshSignal])

  function applyFilters(
    nextQuery: string,
    nextScenario: PromptTemplateScenarioFilter,
    nextAgent: PromptTemplateTargetAgentFilter,
  ): void {
    const nextFilters = promptTemplateManagerFiltersFromState(nextQuery, nextScenario, nextAgent)
    promptTemplates.setFilters(nextFilters)
    void promptTemplates.loadTemplates(nextFilters)
  }

  function clearFilters(): void {
    setQuery("")
    setScenario("")
    setTargetAgent("")
    promptTemplates.setFilters({})
    void promptTemplates.loadTemplates({})
  }

  function startCreate(): void {
    setEditorMode("create")
    setDeleteConfirmation(null)
    promptTemplates.selectTemplate(null)
  }

  function selectTemplate(id: string): void {
    setEditorMode("edit")
    setDeleteConfirmation(null)
    promptTemplates.selectTemplate(id)
  }

  async function submitTemplate(input: NormalizedPromptTemplateForm): Promise<void> {
    setIsSaving(true)

    try {
      if (editorMode === "create") {
        const created = await promptTemplates.createTemplate(input.bridgeInput)
        promptTemplates.selectTemplate(created.id)
        setEditorMode("edit")
        onTemplatesChanged()
        return
      }

      if (promptTemplates.selectedTemplate !== null) {
        const updated = await promptTemplates.updateTemplate(
          promptTemplates.selectedTemplate.id,
          updateInputFromPromptTemplateForm(input),
        )
        promptTemplates.selectTemplate(updated.id)
        onTemplatesChanged()
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function duplicateSelected(): Promise<void> {
    if (promptTemplates.selectedTemplateId === null) {
      return
    }

    const duplicated = await promptTemplates.duplicateTemplate(promptTemplates.selectedTemplateId)
    promptTemplates.selectTemplate(duplicated.id)
    setEditorMode("edit")
    setDeleteConfirmation(null)
    onTemplatesChanged()
  }

  async function confirmDelete(): Promise<void> {
    if (deleteConfirmation === null) {
      return
    }

    await promptTemplates.deleteTemplate(deleteConfirmation.id)
    onTemplatesChanged()
    setDeleteConfirmation(null)
    setEditorMode(null)
  }

  return (
    <div className="min-w-0 space-y-3 overflow-hidden">
      <PromptTemplateSidebarSection
        error={promptTemplates.error}
        hasActiveFilters={hasActiveFilters}
        query={query}
        scenario={scenario}
        selectedTemplateId={promptTemplates.selectedTemplateId}
        status={promptTemplates.status}
        targetAgent={targetAgent}
        templates={promptTemplates.templates}
        onClearFilters={clearFilters}
        onDuplicateSelected={() => void duplicateSelected()}
        onNewTemplate={startCreate}
        onQueryChange={(nextQuery) => {
          setQuery(nextQuery)
          applyFilters(nextQuery, scenario, targetAgent)
        }}
        onRequestDelete={() =>
          setDeleteConfirmation(confirmationFromTemplate(promptTemplates.selectedTemplate))
        }
        onScenarioChange={(nextScenario) => {
          setScenario(nextScenario)
          applyFilters(query, nextScenario, targetAgent)
        }}
        onSelectTemplate={selectTemplate}
        onTargetAgentChange={(nextTargetAgent) => {
          setTargetAgent(nextTargetAgent)
          applyFilters(query, scenario, nextTargetAgent)
        }}
      />

      {deleteConfirmation !== null && (
        <div className="space-y-3 rounded-card border border-border bg-panel-muted p-3">
          <p className="text-[13px] font-medium text-muted-strong">
            Delete {deleteConfirmation.name}?
          </p>
          <p className="text-[12px] leading-5 text-muted">
            This removes the prompt template from the selector and manager.
          </p>
          <div className="grid gap-2">
            <Button
              className="w-full"
              size="sm"
              variant="secondary"
              onClick={() => setDeleteConfirmation(null)}
            >
              Cancel Delete
            </Button>
            <Button
              aria-label="Confirm Delete Prompt Template"
              className="w-full"
              size="sm"
              onClick={() => void confirmDelete()}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      )}

      {editorMode !== null && (
        <PromptTemplateEditor
          isSaving={isSaving}
          mode={editorMode}
          selectedTemplate={promptTemplates.selectedTemplate}
          onCancel={() => setEditorMode(null)}
          onSubmit={submitTemplate}
        />
      )}
    </div>
  )
}
