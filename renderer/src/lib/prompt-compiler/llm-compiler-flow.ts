import type {
  Project,
  PromptCompilerAnalyzeInput,
  PromptCompilerAnalyzeOutput,
  PromptCompilerCompileInput,
  PromptCompilerCompileOutput,
} from "../../../../electron/ipc-types"
import type { CompiledPromptResult, PromptCompilerInput } from "./types"

export type ClarificationAnswersById = Readonly<Record<string, string>>

export const emptyCompilerInput: PromptCompilerInput = {
  title: "",
  originalInput: "",
  scenario: "feature",
  targetAgent: "codex",
  harnessTemplateId: null,
  projectContextProfileId: null,
  includeProjectContextProfile: false,
  projectContext: "",
  techStack: "",
  constraints: "",
  acceptanceCriteria: "",
  validationCommands: "",
  additionalNotes: "",
}

function normalizeProjectId(project: Project | null): string | null {
  return project?.id ?? null
}

export function analyzeInput(
  draft: PromptCompilerInput,
  selectedProject: Project | null,
): PromptCompilerAnalyzeInput {
  return {
    originalInput: draft.originalInput,
    scenario: draft.scenario,
    targetAgent: draft.targetAgent,
    harnessTemplateId: draft.harnessTemplateId,
    projectContextProfileId: draft.projectContextProfileId,
    includeProjectContextProfile: draft.includeProjectContextProfile,
    projectContext: draft.projectContext,
    techStack: draft.techStack,
    constraints: draft.constraints,
    acceptanceCriteria: draft.acceptanceCriteria,
    validationCommands: draft.validationCommands,
    additionalNotes: draft.additionalNotes,
    projectId: normalizeProjectId(selectedProject),
  }
}

function answeredClarifications(
  analysis: PromptCompilerAnalyzeOutput | null,
  answers: ClarificationAnswersById,
): PromptCompilerCompileInput["clarificationAnswers"] {
  return (analysis?.questions ?? [])
    .map((question) => ({
      questionId: question.id,
      question: question.question,
      answer: (answers[question.id] ?? "").trim(),
    }))
    .filter((answer) => answer.answer.length > 0)
}

export function compileInput(
  draft: PromptCompilerInput,
  selectedProject: Project | null,
  analysis: PromptCompilerAnalyzeOutput | null,
  answers: ClarificationAnswersById,
): PromptCompilerCompileInput {
  return {
    ...analyzeInput(draft, selectedProject),
    scenario: draft.scenario,
    targetAgent: draft.targetAgent,
    clarificationAnswers: answeredClarifications(analysis, answers),
    assumptions: analysis?.assumptions,
  }
}

export function compiledFromLLM(
  output: PromptCompilerCompileOutput,
  originalInput: string,
): CompiledPromptResult {
  return {
    title: output.title,
    originalInput,
    compiledPrompt: output.compiledPrompt,
    scenario: output.scenario,
    targetAgent: output.targetAgent,
    summary: output.summary,
    assumptions: output.assumptions,
    questions: output.questions,
    answers: output.answers,
    acceptanceCriteria: output.acceptanceCriteria,
    validationCommands: output.validationCommands,
    suggestedTags: output.suggestedTags,
    qualityScore: output.qualityScore,
    warnings: output.warnings,
  }
}

export function missingRequiredQuestion(
  analysis: PromptCompilerAnalyzeOutput | null,
  answers: ClarificationAnswersById,
) {
  return (
    analysis?.questions.find(
      (question) => question.required && (answers[question.id] ?? "").trim().length === 0,
    ) ?? null
  )
}
