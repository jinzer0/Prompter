import { type Dispatch, type SetStateAction, useCallback, useRef, useState } from "react"

import type {
  CreateDerivedPromptAssetInput,
  CreateNextPromptVersionInput,
  CreatePromptWithInitialVersionResult,
  Project,
  ProjectContextCompilerBuildResult,
  PromptAsset,
  PromptVersion,
} from "../../../electron/ipc-types"
import { promptCompilerDraftChangeResetsStaleState } from "../lib/prompt-compiler/draft-state"
import { emptyCompilerInput } from "../lib/prompt-compiler/llm-compiler-flow"
import {
  createOutputRevisionGate,
  type OutputRevisionGate,
} from "../lib/prompt-compiler/output-revision"
import { compileStaticPrompt } from "../lib/prompt-compiler/static-prompt-compiler"
import type {
  CompiledPromptResult,
  LoadedHarnessTemplate,
  PromptCompilerInput,
} from "../lib/prompt-compiler/types"
import type { CreatePrompt } from "./prompt-library-data"
import { useCompilerDefaults } from "./use-compiler-defaults"
import { useCompilerLlmActions } from "./use-compiler-llm-actions"
import { useCompilerPersistenceActions } from "./use-compiler-persistence-actions"
import { useCompilerQuickCapture } from "./use-compiler-quick-capture"
import { useCompilerSuggestedTags } from "./use-compiler-suggested-tags"
import { useCompilerTemplateDraftController } from "./use-compiler-template-draft-controller"
import { useDerivedCompilerDraft } from "./use-derived-compiler-draft"

type CreateNextVersion = (input: CreateNextPromptVersionInput) => Promise<PromptVersion>
type CreateDerivedAsset = (
  input: CreateDerivedPromptAssetInput,
) => Promise<CreatePromptWithInitialVersionResult>

export { promptCompilerDraftChangeResetsStaleState }

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
  const [compiled, setCompiled] = useState<CompiledPromptResult | null>(null)
  const [editablePrompt, setEditablePromptValue] = useState("")
  const [message, setMessage] = useState<string | null>(null)
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
    replaceEditablePrompt,
    resetTemplateDraft: template.resetTemplateDraft,
    setCompiled,
    setDraft,
    setMessage,
  })

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
    draft,
    onCompiled: acceptCompiled,
    outputRevisionGate,
    selectedProject,
    setMessage,
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

  const setCompilerDraft = useCallback<Dispatch<SetStateAction<PromptCompilerInput>>>(
    (update) => {
      const current = draftRef.current
      const next = typeof update === "function" ? update(current) : update

      if (promptCompilerDraftChangeResetsStaleState(current, next)) {
        resetStaleDraftState()
      }

      draftRef.current = next
      setDraft(next)
    },
    [resetStaleDraftState],
  )

  useCompilerDefaults(setCompilerDraft, setMessage)

  const quickCapture = useCompilerQuickCapture({
    draft,
    resetImportedDraftState: resetStaleDraftState,
    setDraft: setCompilerDraft,
    setMessage,
  })

  const persistenceActions = useCompilerPersistenceActions({
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

  function compileStatic(
    selectedHarnessTemplate: LoadedHarnessTemplate | null,
    projectContextProfileBuildResult: ProjectContextCompilerBuildResult | null,
  ): void {
    if (draft.originalInput.trim().length === 0) {
      setMessage("Original request is required")
      return
    }

    acceptCompiled(
      compileStaticPrompt({ ...draft, projectContextProfileBuildResult }, selectedHarnessTemplate),
    )
    setMessage("Compiled prompt is ready to review.")
  }

  function confirmTemplateApply(): void {
    const applied = template.createAppliedOutput(draft, outputRevisionGate.current())

    if (applied === null) {
      return
    }

    llm.clearDerivedState()
    setCompiled(applied.compiled)
    replaceEditablePrompt(applied.editablePrompt)
    suggestedTags.clearSuggestedTags()
    template.commitTemplateApplication(applied.provenance)
    setMessage("Template output applied to the compiled prompt draft.")
  }

  function setHarnessTemplateId(id: string | null): void {
    setCompilerDraft((current) => ({ ...current, harnessTemplateId: id }))
  }

  return {
    analysis: llm.analysis,
    answers: llm.answers,
    analyzeWithLLM: llm.analyzeWithLLM,
    cancelClipboardImport: quickCapture.cancelClipboardImport,
    cancelTemplateApply: template.cancelTemplateApply,
    clearStaleOutput: resetStaleDraftState,
    clearTemplateProvenance: template.clearTemplateProvenance,
    compileStatic,
    compileWithLLM: llm.compileWithLLM,
    compiled,
    confirmClipboardImport: quickCapture.confirmClipboardImport,
    confirmTemplateApply,
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
    message,
    originalRequestFocusSignal: quickCapture.originalRequestFocusSignal,
    outputRevision,
    pendingClipboardImport: quickCapture.pendingClipboardImport,
    pendingTemplate: template.pendingTemplate,
    previewTemplate: template.previewTemplate,
    requestTemplateApply: template.requestTemplateApply,
    saveDisabledReasons: persistenceActions.saveDisabledReasons,
    saveNextVersion: persistenceActions.saveNextVersion,
    savePrompt: persistenceActions.savePrompt,
    selectPromptTemplate: template.selectPromptTemplate,
    seedDerivedPrompt: derivedPrompt.seedDerivedPrompt,
    selectedSuggestedTags: suggestedTags.selectedSuggestedTags,
    setAnswer: llm.setAnswer,
    setDraft: setCompilerDraft,
    setEditablePrompt: replaceEditablePrompt,
    setHarnessTemplateId,
    setSuggestedTagSelection: suggestedTags.setSuggestedTagSelection,
    setTemplateVariable: template.setTemplateVariable,
    templatePreview: template.templatePreview,
    templateProvenance: template.templateProvenance,
    templateVariableNames: template.templateVariableNames,
    templateVariableValues: template.templateVariableValues,
  }
}
