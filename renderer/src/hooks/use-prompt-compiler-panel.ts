import { useCallback, useRef, useState } from "react"

import type {
  CreateDerivedPromptAssetInput,
  CreateNextPromptVersionInput,
  CreatePromptWithInitialVersionResult,
  Project,
  PromptAsset,
  PromptVersion,
} from "../../../electron/ipc-types"
import { emptyCompilerInput } from "../lib/prompt-compiler/llm-compiler-flow"
import {
  createOutputRevisionGate,
  type OutputRevisionGate,
} from "../lib/prompt-compiler/output-revision"
import { createCompilerRoutingFieldAuthorship } from "../lib/prompt-compiler/routing-field-authorship"
import type { CompiledPromptResult, PromptCompilerInput } from "../lib/prompt-compiler/types"
import type { CreatePrompt } from "./prompt-library-data"
import { useBoundCompilerGenerationActions } from "./use-bound-compiler-generation-actions"
import { useCompilerDefaults } from "./use-compiler-defaults"
import { useCompilerLlmActions } from "./use-compiler-llm-actions"
import { useCompilerPersistenceActions } from "./use-compiler-persistence-actions"
import { useCompilerProjectBinding } from "./use-compiler-project-binding"
import { useCompilerQuickCapture } from "./use-compiler-quick-capture"
import { useCompilerRoutingDraftActions } from "./use-compiler-routing-draft-actions"
import { useCompilerSuggestedTags } from "./use-compiler-suggested-tags"
import { useCompilerTemplateDraftController } from "./use-compiler-template-draft-controller"
import { useDerivedCompilerDraft } from "./use-derived-compiler-draft"

type CreateNextVersion = (input: CreateNextPromptVersionInput) => Promise<PromptVersion>
type CreateDerivedAsset = (
  input: CreateDerivedPromptAssetInput,
) => Promise<CreatePromptWithInitialVersionResult>

export { promptCompilerDraftChangeResetsStaleState } from "../lib/prompt-compiler/draft-state"

type UsePromptCompilerPanelConfig = {
  readonly createDerivedAsset: CreateDerivedAsset
  readonly createPrompt: CreatePrompt
  readonly createNextVersion: CreateNextVersion
  readonly onTagsChanged: () => void
  readonly selectedAsset: PromptAsset | null
  readonly selectedProject: Project | null
}

export function usePromptCompilerPanel({
  createDerivedAsset,
  createNextVersion,
  createPrompt,
  onTagsChanged,
  selectedAsset,
  selectedProject,
}: UsePromptCompilerPanelConfig) {
  const [draft, setDraft] = useState<PromptCompilerInput>(emptyCompilerInput)
  const draftRef = useRef<PromptCompilerInput>(emptyCompilerInput)
  const [routingFieldAuthorship] = useState(createCompilerRoutingFieldAuthorship)
  const [compiled, setCompiled] = useState<CompiledPromptResult | null>(null)
  const [editablePrompt, setEditablePromptValue] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const projectId = selectedProject?.id ?? null
  const projectBinding = useCompilerProjectBinding(projectId)
  const compilerActionsEnabled = projectBinding.actionIsAllowed("compile_static")
  const canEditOutput = projectBinding.actionIsAllowed("edit_output")
  const canSaveExportToFile = projectBinding.actionIsAllowed("save_export_file")
  const template = useCompilerTemplateDraftController()
  const outputRevisionGateRef = useRef<OutputRevisionGate | null>(null)

  if (outputRevisionGateRef.current === null) {
    outputRevisionGateRef.current = createOutputRevisionGate()
  }

  const outputRevisionGate = outputRevisionGateRef.current
  const [outputRevision, setOutputRevision] = useState(outputRevisionGate.current())
  const suggestedTags = useCompilerSuggestedTags({ onTagsChanged })

  const replaceEditablePrompt = useCallback(
    (prompt: string): number => {
      const revision = outputRevisionGate.advance()
      setEditablePromptValue(prompt)
      setOutputRevision(revision)
      return revision
    },
    [outputRevisionGate],
  )
  const derivedPrompt = useDerivedCompilerDraft({
    clearSuggestedTags: suggestedTags.clearSuggestedTags,
    draftRef,
    markRoutingFieldsAuthored: routingFieldAuthorship.markAllAuthored,
    replaceEditablePrompt,
    resetTemplateDraft: template.resetTemplateDraft,
    setCompiled,
    setDraft,
    setMessage,
  })
  const setEditablePrompt = useCallback(
    (prompt: string): void => {
      if (!projectBinding.currentActionIsAllowed("edit_output")) {
        return
      }
      replaceEditablePrompt(prompt)
    },
    [projectBinding.currentActionIsAllowed, replaceEditablePrompt],
  )

  const acceptCompiled = useCallback(
    (result: CompiledPromptResult): void => {
      setCompiled(result)
      derivedPrompt.clearDerivedPrompt()
      replaceEditablePrompt(result.compiledPrompt)
      template.resetTemplateDraft()
      suggestedTags.clearSuggestedTags()
    },
    [
      derivedPrompt.clearDerivedPrompt,
      replaceEditablePrompt,
      suggestedTags.clearSuggestedTags,
      template.resetTemplateDraft,
    ],
  )

  const llm = useCompilerLlmActions({
    binding: projectBinding.state,
    draft,
    onCompiled: acceptCompiled,
    outputRevisionGate,
    selectedProject,
    setMessage,
  })
  const generationActions = useBoundCompilerGenerationActions({
    acceptCompiled,
    binding: projectBinding,
    clearLlmState: llm.clearDerivedState,
    clearSuggestedTags: suggestedTags.clearSuggestedTags,
    draft,
    outputRevisionGate,
    replaceEditablePrompt,
    setCompiled,
    setMessage,
    template,
  })

  const resetStaleDraftState = useCallback((): void => {
    llm.clearDerivedState()
    setCompiled(null)
    derivedPrompt.clearDerivedPrompt()
    replaceEditablePrompt("")
    template.resetTemplateDraft()
    suggestedTags.clearSuggestedTags()
    setMessage(null)
  }, [
    derivedPrompt.clearDerivedPrompt,
    llm.clearDerivedState,
    replaceEditablePrompt,
    suggestedTags.clearSuggestedTags,
    template.resetTemplateDraft,
  ])

  const routingDraftActions = useCompilerRoutingDraftActions({
    authorship: routingFieldAuthorship,
    currentActionIsAllowed: projectBinding.currentActionIsAllowed,
    draftRef,
    onProjectTransition: projectBinding.handleProjectTransition,
    resetStaleDraftState,
    setDraft,
  })

  useCompilerDefaults({
    applyDefaultRoutingPatch: routingDraftActions.applyDefaultRoutingPatch,
    getRoutingFieldGenerations: routingFieldAuthorship.current,
    setMessage,
  })

  const quickCapture = useCompilerQuickCapture({
    draft,
    resetImportedDraftState: resetStaleDraftState,
    setDraft: routingDraftActions.setCompilerDraft,
    setMessage,
  })

  const persistenceActions = useCompilerPersistenceActions({
    binding: projectBinding.state,
    compiled,
    createDerivedAsset,
    createNextVersion,
    createPrompt,
    derivedPromptSource: derivedPrompt.source,
    editablePrompt,
    onTagsChanged,
    onSavedNextVersion: resetStaleDraftState,
    selectedAsset,
    selectedProject,
    setMessage,
    suggestedTags,
  })

  function setHarnessTemplateId(id: string | null): void {
    routingDraftActions.setCompilerDraft((current) => ({ ...current, harnessTemplateId: id }))
  }

  function rebindProject(): boolean {
    return projectBinding.rebind({
      clearGeneratedState: resetStaleDraftState,
      draftRef,
      projectName: selectedProject?.name ?? null,
      setDraft,
      setMessage,
    })
  }

  return {
    analysis: llm.analysis,
    answers: llm.answers,
    analyzeWithLLM: llm.analyzeWithLLM,
    cancelClipboardImport: quickCapture.cancelClipboardImport,
    cancelTemplateApply: template.cancelTemplateApply,
    canEditOutput,
    canSaveExportToFile,
    clearStaleOutput: resetStaleDraftState,
    clearTemplateProvenance: template.clearTemplateProvenance,
    compileStatic: generationActions.compileStatic,
    compileWithLLM: llm.compileWithLLM,
    compilerActionsEnabled,
    compiled,
    confirmClipboardImport: quickCapture.confirmClipboardImport,
    confirmTemplateApply: generationActions.confirmTemplateApply,
    copyPrompt: persistenceActions.copyPrompt,
    derivedPromptSourceTitle: derivedPrompt.sourceTitle,
    draft,
    editablePrompt,
    importFromClipboard: quickCapture.importFromClipboard,
    isAnalyzing: llm.isAnalyzing,
    isCompilingLLM: llm.isCompilingLLM,
    isReadingClipboard: quickCapture.isReadingClipboard,
    isSaving: persistenceActions.isSaving,
    isSavingNextVersion: persistenceActions.isSavingNextVersion,
    isTemplateApplyConfirmationPending: template.isTemplateApplyConfirmationPending,
    handleProjectTransition: routingDraftActions.handleProjectTransition,
    message,
    originalRequestFocusSignal: quickCapture.originalRequestFocusSignal,
    outputRevision,
    pendingClipboardImport: quickCapture.pendingClipboardImport,
    pendingTemplate: template.pendingTemplate,
    previewTemplate: generationActions.previewTemplate,
    projectBinding: projectBinding.state,
    rebindProject,
    requestTemplateApply: generationActions.requestTemplateApply,
    saveDisabledReasons: persistenceActions.saveDisabledReasons,
    saveNextVersion: persistenceActions.saveNextVersion,
    savePrompt: persistenceActions.savePrompt,
    selectPromptTemplate: template.selectPromptTemplate,
    seedDerivedPrompt: derivedPrompt.seedDerivedPrompt,
    selectedSuggestedTags: suggestedTags.selectedSuggestedTags,
    setAnswer: llm.setAnswer,
    setDraft: routingDraftActions.setCompilerDraft,
    setEditablePrompt,
    setHarnessTemplateId,
    setSuggestedTagSelection: suggestedTags.setSuggestedTagSelection,
    setTemplateVariable: template.setTemplateVariable,
    templatePreview: template.templatePreview,
    templateProvenance: template.templateProvenance,
    templateVariableNames: template.templateVariableNames,
    templateVariableValues: template.templateVariableValues,
  }
}
