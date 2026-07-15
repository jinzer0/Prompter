import { useCallback, useReducer } from "react"

import type { PromptTemplate } from "../../../electron/ipc-types"
import type { PromptCompilerInput } from "../lib/prompt-compiler/types"
import {
  type AppliedPromptTemplateOutput,
  applyPromptTemplateToCompilerOutput,
  createPromptTemplateApplication,
  initialPromptTemplateDraftState,
  reducePromptTemplateDraftState,
} from "../lib/prompt-templates/prompt-template-state"

export function useCompilerTemplateDraftController() {
  const [templateDraft, dispatchTemplateDraft] = useReducer(
    reducePromptTemplateDraftState,
    initialPromptTemplateDraftState,
  )

  const resetTemplateDraft = useCallback((): void => {
    dispatchTemplateDraft({ kind: "draft_reset" })
  }, [])

  function createAppliedOutput(
    draft: PromptCompilerInput,
    currentRevision: number,
  ): AppliedPromptTemplateOutput | null {
    const application = createPromptTemplateApplication(templateDraft)

    return application === null
      ? null
      : applyPromptTemplateToCompilerOutput({ application, currentRevision, draft })
  }

  return {
    cancelTemplateApply: () => dispatchTemplateDraft({ kind: "apply_cancelled" }),
    clearTemplateProvenance: () => dispatchTemplateDraft({ kind: "provenance_cleared" }),
    commitTemplateApplication: (provenance: AppliedPromptTemplateOutput["provenance"]) =>
      dispatchTemplateDraft({ kind: "application_committed", provenance }),
    createAppliedOutput,
    isTemplateApplyConfirmationPending: templateDraft.isApplyConfirmationPending,
    pendingTemplate: templateDraft.pendingTemplate,
    previewTemplate: () => dispatchTemplateDraft({ kind: "preview_requested" }),
    requestTemplateApply: () => dispatchTemplateDraft({ kind: "apply_requested" }),
    resetTemplateDraft,
    selectPromptTemplate: (template: PromptTemplate | null) =>
      dispatchTemplateDraft({ kind: "template_selected", template }),
    setTemplateVariable: (name: string, value: string) =>
      dispatchTemplateDraft({ kind: "variable_changed", name, value }),
    templatePreview: templateDraft.preview,
    templateProvenance: templateDraft.appliedProvenance,
    templateVariableNames: templateDraft.variableNames,
    templateVariableValues: templateDraft.variableValues,
  }
}
