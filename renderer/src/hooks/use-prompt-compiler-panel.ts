import { useState } from "react"

import type {
  CreateNextPromptVersionInput,
  CreatePromptAssetInput,
  CreatePromptVersionInput,
  Project,
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
import type { CompiledPromptResult, PromptCompilerInput } from "../lib/prompt-compiler/types"
import { versionInputFromCompiled } from "../lib/prompt-compiler/version-input"
import { useCompilerDefaults } from "./use-compiler-defaults"
import { useCompilerSuggestedTags } from "./use-compiler-suggested-tags"

type CreatePrompt = (
  assetInput: CreatePromptAssetInput,
  versionInput: Omit<CreatePromptVersionInput, "promptAssetId">,
) => Promise<PromptAsset>

type CreateNextVersion = (input: CreateNextPromptVersionInput) => Promise<PromptVersion>

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
  const [analysis, setAnalysis] = useState<PromptCompilerAnalyzeOutput | null>(null)
  const [answers, setAnswers] = useState<ClarificationAnswersById>({})
  const [compiled, setCompiled] = useState<CompiledPromptResult | null>(null)
  const [editablePrompt, setEditablePrompt] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCompilingLLM, setIsCompilingLLM] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingNextVersion, setIsSavingNextVersion] = useState(false)
  const suggestedTags = useCompilerSuggestedTags({ onTagsChanged })

  useCompilerDefaults(setDraft, setMessage)

  function compileStatic(): void {
    if (draft.originalInput.trim().length === 0) {
      setMessage("Original request is required")
      return
    }

    const result = compileStaticPrompt(draft)
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

      const nextCompiled = compiledFromLLM(result.value, draft.originalInput.trim())
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

  async function savePrompt(): Promise<void> {
    if (selectedProject === null) {
      setMessage("Select a project before saving compiled prompt")
      return
    }

    if (compiled === null || editablePrompt.trim().length === 0) {
      setMessage("Compile a prompt before saving")
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const asset = await createPrompt(
        {
          projectId: selectedProject.id,
          title: compiled.title,
          scenario: compiled.scenario,
          targetAgent: compiled.targetAgent,
        },
        versionInputFromCompiled(compiled, editablePrompt.trim()),
      )
      await window.prompter.search.rebuildIndex()
      await suggestedTags.attachSelectedSuggestedTags(asset.id)
      setMessage("Compiled prompt saved.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Compiled prompt could not be saved")
    } finally {
      setIsSaving(false)
    }
  }

  async function saveNextVersion(): Promise<void> {
    if (selectedAsset === null) {
      setMessage("Select a prompt before saving a new version")
      return
    }

    if (compiled === null || editablePrompt.trim().length === 0) {
      setMessage("Compile a prompt before saving a new version")
      return
    }

    setIsSavingNextVersion(true)
    setMessage(null)

    try {
      await createNextVersion({
        promptAssetId: selectedAsset.id,
        ...versionInputFromCompiled(compiled, editablePrompt.trim()),
        makeCurrent: true,
      })
      await window.prompter.search.rebuildIndex()
      await suggestedTags.attachSelectedSuggestedTags(selectedAsset.id)
      setCompiled(null)
      setEditablePrompt("")
      suggestedTags.clearSuggestedTags()
      setMessage("Saved as a new version.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Prompt version could not be saved")
    } finally {
      setIsSavingNextVersion(false)
    }
  }

  async function copyPrompt(): Promise<void> {
    if (editablePrompt.trim().length === 0 || navigator.clipboard === undefined) {
      setMessage("Compiled prompt is not available to copy")
      return
    }

    try {
      await navigator.clipboard.writeText(editablePrompt)
      setMessage("Compiled prompt copied.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Compiled prompt could not be copied")
    }
  }

  function setAnswer(questionId: string, answer: string): void {
    setAnswers((current) => ({ ...current, [questionId]: answer }))
  }

  return {
    analysis,
    answers,
    analyzeWithLLM,
    compileStatic,
    compileWithLLM,
    compiled,
    copyPrompt,
    draft,
    editablePrompt,
    isAnalyzing,
    isCompilingLLM,
    isSaving,
    isSavingNextVersion,
    message,
    saveNextVersion,
    savePrompt,
    setAnswer,
    setDraft,
    setEditablePrompt,
    selectedSuggestedTags: suggestedTags.selectedSuggestedTags,
    setSuggestedTagSelection: suggestedTags.setSuggestedTagSelection,
  }
}
