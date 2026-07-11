import { useEffect, useState } from "react"

import type { HarnessTemplate } from "../../../electron/ipc-types"
import { type HarnessTemplateFilters, useHarnessTemplates } from "../hooks/use-harness-templates"
import type { NormalizedHarnessTemplateForm } from "../lib/harness-template-form"
import { HarnessTemplateEditor, type HarnessTemplateEditorMode } from "./harness-template-editor"
import {
  type HarnessScenarioFilter,
  type HarnessTargetAgentFilter,
  HarnessTemplateSidebarSection,
} from "./harness-template-sidebar-section"
import { Button } from "./ui/button"

type DeleteConfirmation = {
  readonly id: string
  readonly name: string
}

type HarnessTemplateChange = {
  readonly deletedTemplateId?: string
}

type HarnessTemplateManagerProps = {
  readonly onTemplatesChanged: (change?: HarnessTemplateChange) => void
}

function filtersFromState(
  query: string,
  scenario: HarnessScenarioFilter,
  targetAgent: HarnessTargetAgentFilter,
): HarnessTemplateFilters {
  return {
    ...(query.trim().length > 0 ? { query } : {}),
    ...(scenario !== "" ? { scenario } : {}),
    ...(targetAgent !== "" ? { targetAgent } : {}),
  }
}

function confirmationFromTemplate(template: HarnessTemplate | null): DeleteConfirmation | null {
  return template === null ? null : { id: template.id, name: template.name }
}

export function HarnessTemplateManager({ onTemplatesChanged }: HarnessTemplateManagerProps) {
  const harnesses = useHarnessTemplates()
  const [query, setQuery] = useState("")
  const [scenario, setScenario] = useState<HarnessScenarioFilter>("")
  const [targetAgent, setTargetAgent] = useState<HarnessTargetAgentFilter>("")
  const [editorMode, setEditorMode] = useState<HarnessTemplateEditorMode | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const hasActiveFilters = query.trim().length > 0 || scenario.length > 0 || targetAgent.length > 0

  useEffect(() => {
    if (harnesses.status === "idle") {
      void harnesses.loadTemplates({})
    }
  }, [harnesses.loadTemplates, harnesses.status])

  function applyFilters(
    nextQuery: string,
    nextScenario: HarnessScenarioFilter,
    nextAgent: HarnessTargetAgentFilter,
  ): void {
    const nextFilters = filtersFromState(nextQuery, nextScenario, nextAgent)
    harnesses.setFilters(nextFilters)
    void harnesses.loadTemplates(nextFilters)
  }

  function changeQuery(nextQuery: string): void {
    setQuery(nextQuery)
    applyFilters(nextQuery, scenario, targetAgent)
  }

  function changeScenario(nextScenario: HarnessScenarioFilter): void {
    setScenario(nextScenario)
    applyFilters(query, nextScenario, targetAgent)
  }

  function changeTargetAgent(nextTargetAgent: HarnessTargetAgentFilter): void {
    setTargetAgent(nextTargetAgent)
    applyFilters(query, scenario, nextTargetAgent)
  }

  function clearFilters(): void {
    setQuery("")
    setScenario("")
    setTargetAgent("")
    harnesses.setFilters({})
    void harnesses.loadTemplates({})
  }

  function startCreate(): void {
    setEditorMode("create")
    setDeleteConfirmation(null)
    harnesses.selectTemplate(null)
  }

  function selectTemplate(id: string): void {
    setEditorMode("edit")
    setDeleteConfirmation(null)
    harnesses.selectTemplate(id)
  }

  async function submitTemplate(input: NormalizedHarnessTemplateForm): Promise<void> {
    setIsSaving(true)

    try {
      if (editorMode === "create") {
        const created = await harnesses.createTemplate(input.bridgeInput)
        harnesses.selectTemplate(created.id)
        setEditorMode("edit")
        onTemplatesChanged()
        return
      }

      if (harnesses.selectedTemplate !== null) {
        const updated = await harnesses.updateTemplate(
          harnesses.selectedTemplate.id,
          input.bridgeInput,
        )
        harnesses.selectTemplate(updated.id)
        onTemplatesChanged()
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function duplicateSelected(): Promise<void> {
    if (harnesses.selectedTemplateId === null) {
      return
    }

    const duplicated = await harnesses.duplicateTemplate(harnesses.selectedTemplateId)
    harnesses.selectTemplate(duplicated.id)
    setEditorMode("edit")
    setDeleteConfirmation(null)
    onTemplatesChanged()
  }

  function requestDelete(): void {
    setDeleteConfirmation(confirmationFromTemplate(harnesses.selectedTemplate))
  }

  async function confirmDelete(): Promise<void> {
    if (deleteConfirmation === null) {
      return
    }

    await harnesses.deleteTemplate(deleteConfirmation.id)
    onTemplatesChanged({ deletedTemplateId: deleteConfirmation.id })
    setDeleteConfirmation(null)
    setEditorMode(null)
  }

  return (
    <div className="min-w-0 space-y-3 overflow-hidden">
      <HarnessTemplateSidebarSection
        error={harnesses.error}
        hasActiveFilters={hasActiveFilters}
        query={query}
        scenario={scenario}
        selectedTemplateId={harnesses.selectedTemplateId}
        status={harnesses.status}
        targetAgent={targetAgent}
        templates={harnesses.templates}
        onClearFilters={clearFilters}
        onDuplicateSelected={() => void duplicateSelected()}
        onNewTemplate={startCreate}
        onQueryChange={changeQuery}
        onRequestDelete={requestDelete}
        onScenarioChange={changeScenario}
        onSelectTemplate={selectTemplate}
        onTargetAgentChange={changeTargetAgent}
      />

      {deleteConfirmation !== null && (
        <div className="space-y-3 rounded-card border border-border bg-panel-muted p-3">
          <p className="text-[13px] font-medium text-muted-strong">
            Delete {deleteConfirmation.name}?
          </p>
          <p className="text-[12px] leading-5 text-muted">
            This removes the template now. Seeded default templates can return after restart because
            Phase 12 has no tombstone field.
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
              aria-label="Confirm Delete Harness"
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
        <HarnessTemplateEditor
          isSaving={isSaving}
          mode={editorMode}
          selectedTemplate={harnesses.selectedTemplate}
          onCancel={() => setEditorMode(null)}
          onSubmit={submitTemplate}
        />
      )}
    </div>
  )
}
