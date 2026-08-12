import { useCallback, useRef, useState } from "react"

import type {
  Project,
  PromptCompilerAnalyzeInput,
  PromptCompilerAnalyzeOutput,
  PromptCompilerCompileInput,
} from "../../../electron/ipc-types"
import {
  COMPILER_PROJECT_REBIND_REQUIRED_MESSAGE,
  type CompilerProjectBinding,
  compilerProjectActionIsAllowed,
} from "../lib/compiler-project-binding"
import {
  compilerResponseNeedsConfirmation,
  confirmedAnalyzeRequest,
  confirmedCompileRequest,
} from "../lib/prompt-compiler/compiler-privacy-confirmation"
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
import { usePrivacyWarning } from "./use-privacy-warning"

export { confirmedAnalyzeRequest, confirmedCompileRequest }

type UseCompilerLlmActionsConfig = {
  readonly binding: CompilerProjectBinding
  readonly draft: PromptCompilerInput
  readonly onCompiled: (compiled: CompiledPromptResult) => void
  readonly outputRevisionGate: OutputRevisionGate
  readonly selectedProject: Project | null
  readonly setMessage: (message: string | null) => void
}

export function useCompilerLlmActions({
  binding,
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
  const privacyWarning = usePrivacyWarning()
  const bindingRef = useRef({ binding, projectId: selectedProject?.id ?? null })
  bindingRef.current = { binding, projectId: selectedProject?.id ?? null }

  const clearDerivedState = useCallback((): void => {
    setAnalysis(null)
    setAnswers({})
  }, [])

  function retryIsAllowed(requestedRevision: number, action: "analyze" | "compile_llm"): boolean {
    const currentBinding = bindingRef.current
    if (!compilerProjectActionIsAllowed(currentBinding.binding, currentBinding.projectId, action)) {
      setMessage(COMPILER_PROJECT_REBIND_REQUIRED_MESSAGE)
      return false
    }
    if (!outputRevisionGate.isCurrent(requestedRevision)) {
      setMessage("Draft changed; privacy-confirmed request was not sent.")
      return false
    }
    return true
  }

  async function performAnalyze(
    request: PromptCompilerAnalyzeInput,
    requestedRevision: number,
    acceptsConfirmation: boolean,
  ): Promise<void> {
    if (!retryIsAllowed(requestedRevision, "analyze")) return
    setIsAnalyzing(true)
    setMessage(null)

    try {
      const result = await resolveRevisionedResponse(
        window.prompter.promptCompiler.analyze(request),
        requestedRevision,
        outputRevisionGate,
      )

      if (result === null) return
      if (compilerResponseNeedsConfirmation(result)) {
        if (!acceptsConfirmation) {
          setMessage("Privacy confirmation could not authorize prompt analysis.")
          return
        }
        privacyWarning.open({
          scanResult: result.scanResult,
          retry: () =>
            performAnalyze(
              confirmedAnalyzeRequest(request, result.privacyConfirmationSessionId),
              requestedRevision,
              false,
            ),
        })
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

  async function performCompile(
    request: PromptCompilerCompileInput,
    requestedRevision: number,
    acceptsConfirmation: boolean,
  ): Promise<void> {
    if (!retryIsAllowed(requestedRevision, "compile_llm")) return
    setIsCompilingLLM(true)
    setMessage(null)

    try {
      const result = await resolveRevisionedResponse(
        window.prompter.promptCompiler.compile(request),
        requestedRevision,
        outputRevisionGate,
      )

      if (result === null) return
      if (compilerResponseNeedsConfirmation(result)) {
        if (!acceptsConfirmation) {
          setMessage("Privacy confirmation could not authorize prompt compilation.")
          return
        }
        privacyWarning.open({
          scanResult: result.scanResult,
          retry: () =>
            performCompile(
              confirmedCompileRequest(request, result.privacyConfirmationSessionId),
              requestedRevision,
              false,
            ),
        })
        return
      }
      if (!result.ok) {
        setMessage(result.message)
        return
      }

      onCompiled(compiledFromLLM(result.value, request.originalInput))
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

  async function analyzeWithLLM(): Promise<void> {
    if (!compilerProjectActionIsAllowed(binding, selectedProject?.id ?? null, "analyze")) {
      setMessage(COMPILER_PROJECT_REBIND_REQUIRED_MESSAGE)
      return
    }
    if (draft.originalInput.trim().length === 0) {
      setMessage("Original request is required")
      return
    }
    await performAnalyze(analyzeInput(draft, selectedProject), outputRevisionGate.current(), true)
  }

  async function compileWithLLM(): Promise<void> {
    if (!compilerProjectActionIsAllowed(binding, selectedProject?.id ?? null, "compile_llm")) {
      setMessage(COMPILER_PROJECT_REBIND_REQUIRED_MESSAGE)
      return
    }
    if (draft.originalInput.trim().length === 0) {
      setMessage("Original request is required")
      return
    }
    const missingQuestion = missingRequiredQuestion(analysis, answers)
    if (missingQuestion !== null) {
      setMessage(`Answer required: ${missingQuestion.question}`)
      return
    }
    await performCompile(
      compileInput(draft, selectedProject, analysis, answers),
      outputRevisionGate.current(),
      true,
    )
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
    privacyWarning,
    setAnswer,
  }
}
