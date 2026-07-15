import { useCallback, useState } from "react"

import type { Project, PromptCompilerAnalyzeOutput } from "../../../electron/ipc-types"
import {
  analyzeInput,
  type ClarificationAnswersById,
  compiledFromLLM,
  compileInput,
  missingRequiredQuestion,
} from "../lib/prompt-compiler/llm-compiler-flow"
import {
  type OutputRevisionGate,
  resolveRevisionedResponse,
} from "../lib/prompt-compiler/output-revision"
import type { CompiledPromptResult, PromptCompilerInput } from "../lib/prompt-compiler/types"

type UseCompilerLlmActionsConfig = {
  readonly draft: PromptCompilerInput
  readonly onCompiled: (compiled: CompiledPromptResult) => void
  readonly outputRevisionGate: OutputRevisionGate
  readonly selectedProject: Project | null
  readonly setMessage: (message: string | null) => void
}

export function useCompilerLlmActions({
  draft,
  onCompiled,
  outputRevisionGate,
  selectedProject,
  setMessage,
}: UseCompilerLlmActionsConfig) {
  const [analysis, setAnalysis] = useState<PromptCompilerAnalyzeOutput | null>(null)
  const [answers, setAnswers] = useState<ClarificationAnswersById>({})
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCompilingLLM, setIsCompilingLLM] = useState(false)

  const clearDerivedState = useCallback((): void => {
    setAnalysis(null)
    setAnswers({})
  }, [])

  async function analyzeWithLLM(): Promise<void> {
    if (draft.originalInput.trim().length === 0) {
      setMessage("Original request is required")
      return
    }

    const requestedRevision = outputRevisionGate.current()
    setIsAnalyzing(true)
    setMessage(null)

    try {
      const result = await resolveRevisionedResponse(
        window.prompter.promptCompiler.analyze(analyzeInput(draft, selectedProject)),
        requestedRevision,
        outputRevisionGate,
      )

      if (result === null) {
        return
      }
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
      if (outputRevisionGate.isCurrent(requestedRevision)) {
        setMessage("Prompt analysis could not be completed.")
      }
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

    const requestedRevision = outputRevisionGate.current()
    setIsCompilingLLM(true)
    setMessage(null)

    try {
      const result = await resolveRevisionedResponse(
        window.prompter.promptCompiler.compile(
          compileInput(draft, selectedProject, analysis, answers),
        ),
        requestedRevision,
        outputRevisionGate,
      )

      if (result === null) {
        return
      }
      if (!result.ok) {
        setMessage(result.message)
        return
      }

      onCompiled(compiledFromLLM(result.value, draft.originalInput))
      setMessage("LLM compiled prompt is ready to review.")
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }
      if (outputRevisionGate.isCurrent(requestedRevision)) {
        setMessage("LLM prompt compilation could not be completed.")
      }
    } finally {
      setIsCompilingLLM(false)
    }
  }

  function setAnswer(questionId: string, answer: string): void {
    setAnswers((current) => ({ ...current, [questionId]: answer }))
  }

  return {
    analysis,
    answers,
    analyzeWithLLM,
    clearDerivedState,
    compileWithLLM,
    isAnalyzing,
    isCompilingLLM,
    setAnswer,
  }
}
