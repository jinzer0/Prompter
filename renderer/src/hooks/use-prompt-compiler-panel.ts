import { type Dispatch, type SetStateAction, useCallback, useRef, useState } from "react"

import type {
  CreateNextPromptVersionInput,
  CreatePromptAssetInput,
  CreatePromptVersionInput,
  Project,
  ProjectContextCompilerBuildResult,
  PromptAsset,
  PromptCompilerAnalyzeOutput,
  PromptVersion,
} from "../../../electron/ipc-types"
import {
  analyzeInput,
  type ClarificationAnswersById,
  compiledFromLLM,
  compileInput,
  emptyCompilerInput,
  missingRequiredQuestion,
} from "../lib/prompt-compiler/llm-compiler-flow"
import { compileStaticPrompt } from "../lib/prompt-compiler/static-prompt-compiler"
import type {
  CompiledPromptResult,
  LoadedHarnessTemplate,
  PromptCompilerInput,
} from "../lib/prompt-compiler/types"
import { useCompilerDefaults } from "./use-compiler-defaults"
import { useCompilerPersistenceActions } from "./use-compiler-persistence-actions"
import { useCompilerQuickCapture } from "./use-compiler-quick-capture"
import { useCompilerSuggestedTags } from "./use-compiler-suggested-tags"

type CreatePrompt = (
  assetInput: CreatePromptAssetInput,
  versionInput: Omit<CreatePromptVersionInput, "promptAssetId">,
) => Promise<PromptAsset>

type CreateNextVersion = (input: CreateNextPromptVersionInput) => Promise<PromptVersion>

const staleStateDraftFields = [
  "title",
  "originalInput",
  "scenario",
  "targetAgent",
  "harnessTemplateId",
  "projectContextProfileId",
  "includeProjectContextProfile",
  "projectContext",
  "techStack",
  "constraints",
  "acceptanceCriteria",
  "validationCommands",
  "additionalNotes",
] as const satisfies readonly (keyof PromptCompilerInput)[]

export function promptCompilerDraftChangeResetsStaleState(
  current: PromptCompilerInput,
  next: PromptCompilerInput,
): boolean {
  return staleStateDraftFields.some((field) => current[field] !== next[field])
}

type UsePromptCompilerPanelConfig = {
  readonly createPrompt: CreatePrompt
  readonly createNextVersion: CreateNextVersion
  readonly onTagsChanged: () => void
  readonly selectedAsset: PromptAsset | null
  readonly selectedProject: Project | null
}

export function usePromptCompilerPanel({
  createNextVersion,
  createPrompt,
  onTagsChanged,
  selectedAsset,
  selectedProject,
}: UsePromptCompilerPanelConfig) {
  const [draft, setDraft] = useState<PromptCompilerInput>(emptyCompilerInput)
  const draftRef = useRef<PromptCompilerInput>(emptyCompilerInput)
  const [analysis, setAnalysis] = useState<PromptCompilerAnalyzeOutput | null>(null)
  const [answers, setAnswers] = useState<ClarificationAnswersById>({})
  const [compiled, setCompiled] = useState<CompiledPromptResult | null>(null)
  const [editablePrompt, setEditablePrompt] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCompilingLLM, setIsCompilingLLM] = useState(false)
  const suggestedTags = useCompilerSuggestedTags({ onTagsChanged })

  const resetStaleDraftState = useCallback((): void => {
    setAnalysis(null)
    setAnswers({})
    setCompiled(null)
    setEditablePrompt("")
    suggestedTags.clearSuggestedTags()
    setMessage(null)
  }, [suggestedTags.clearSuggestedTags])

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

  function resetImportedDraftState(): void {
    resetStaleDraftState()
  }

  const quickCapture = useCompilerQuickCapture({
    draft,
    resetImportedDraftState,
    setDraft: setCompilerDraft,
    setMessage,
  })

  const persistenceActions = useCompilerPersistenceActions({
    compiled,
    createNextVersion,
    createPrompt,
    editablePrompt,
    onSavedNextVersion: () => {
      setCompiled(null)
      setEditablePrompt("")
      suggestedTags.clearSuggestedTags()
    },
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

    const result = compileStaticPrompt(
      { ...draft, projectContextProfileBuildResult },
      selectedHarnessTemplate,
    )
    setCompiled(result)
    setEditablePrompt(result.compiledPrompt)
    suggestedTags.clearSuggestedTags()
    setMessage("Compiled prompt is ready to review.")
  }

  async function analyzeWithLLM(): Promise<void> {
    if (draft.originalInput.trim().length === 0) {
      setMessage("Original request is required")
      return
    }

    setIsAnalyzing(true)
    setMessage(null)

    try {
      const result = await window.prompter.promptCompiler.analyze(
        analyzeInput(draft, selectedProject),
      )

      if (!result.ok) {
        setMessage(result.message)
        return
      }

      setAnalysis(result.value)
      setAnswers((current) => {
        const nextAnswers: Record<string, string> = {}

        for (const question of result.value.questions) {
          nextAnswers[question.id] = current[question.id] ?? ""
        }

        return nextAnswers
      })
      setMessage("Analysis is ready.")
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      setMessage("Prompt analysis could not be completed.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function compileWithLLM(): Promise<void> {
    if (draft.originalInput.trim().length === 0) {
      setMessage("Original request is required")
      return
    }

    const missingQuestion = missingRequiredQuestion(analysis, answers)

    if (missingQuestion !== null) {
      setMessage(`Answer required: ${missingQuestion.question}`)
      return
    }

    setIsCompilingLLM(true)
    setMessage(null)

    try {
      const result = await window.prompter.promptCompiler.compile(
        compileInput(draft, selectedProject, analysis, answers),
      )

      if (!result.ok) {
        setMessage(result.message)
        return
      }

      const nextCompiled = compiledFromLLM(result.value, draft.originalInput)
      setCompiled(nextCompiled)
      setEditablePrompt(result.value.compiledPrompt)
      suggestedTags.clearSuggestedTags()
      setMessage("LLM compiled prompt is ready to review.")
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      setMessage("LLM prompt compilation could not be completed.")
    } finally {
      setIsCompilingLLM(false)
    }
  }

  function setAnswer(questionId: string, answer: string): void {
    setAnswers((current) => ({ ...current, [questionId]: answer }))
  }

  function setHarnessTemplateId(id: string | null): void {
    setCompilerDraft((current) => ({ ...current, harnessTemplateId: id }))
  }

  return {
    analysis,
    answers,
    analyzeWithLLM,
    cancelClipboardImport: quickCapture.cancelClipboardImport,
    clearStaleOutput: resetStaleDraftState,
    compileStatic,
    compileWithLLM,
    compiled,
    confirmClipboardImport: quickCapture.confirmClipboardImport,
    copyPrompt: persistenceActions.copyPrompt,
    draft,
    editablePrompt,
    importFromClipboard: quickCapture.importFromClipboard,
    isAnalyzing,
    isCompilingLLM,
    isReadingClipboard: quickCapture.isReadingClipboard,
    isSaving: persistenceActions.isSaving,
    isSavingNextVersion: persistenceActions.isSavingNextVersion,
    message,
    originalRequestFocusSignal: quickCapture.originalRequestFocusSignal,
    pendingClipboardImport: quickCapture.pendingClipboardImport,
    saveNextVersion: persistenceActions.saveNextVersion,
    savePrompt: persistenceActions.savePrompt,
    setAnswer,
    setDraft: setCompilerDraft,
    setEditablePrompt,
    setHarnessTemplateId,
    selectedSuggestedTags: suggestedTags.selectedSuggestedTags,
    setSuggestedTagSelection: suggestedTags.setSuggestedTagSelection,
  }
}
