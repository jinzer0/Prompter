import type { PromptCompilerAnalyzeInput, PromptCompilerCompileInput } from "../ipc-types.js"

export const promptCompilerSystemPrompt = [
  "You are an agent prompt compiler.",
  "Turn vague human requests into executable coding-agent task specifications.",
  "Detect ambiguity and ask at most three clarification questions only when the answer materially changes prompt quality.",
  "Treat minor missing details as explicit assumptions instead of questions.",
  "Do not invent project facts that were not provided.",
  "Final prompts must include objective, context, task, scope, constraints, acceptance criteria, validation, working instructions, and final response format.",
  "Return only JSON that matches the requested schema.",
].join("\n")

const scenarioInstructions = {
  feature: [
    "Focus on implementing the requested feature.",
    "Integrate naturally with the existing structure and include relevant edge cases.",
  ],
  bugfix: [
    "Ask the agent to identify reproduction conditions first.",
    "Require root-cause explanation, minimal fix, and regression verification.",
  ],
  refactor: [
    "Improve structure without changing external behavior.",
    "Preserve public behavior and existing tests; forbid broad unrelated rewrites.",
  ],
  code_review: [
    "Focus on review findings rather than code changes.",
    "Order findings by severity and include concrete evidence where possible.",
  ],
  docs: [
    "Clarify the intended reader and documentation purpose.",
    "Include usage, examples, and caveats while minimizing code changes.",
  ],
  research: [
    "Focus on investigation and options, not immediate implementation.",
    "Include trade-offs, risks, recommendation, and next execution steps.",
  ],
} as const

const targetAgentInstructions = {
  codex: [
    "Tell Codex to inspect the repository structure first.",
    "Require a short plan before changes and small reviewable edits.",
    "Require final test, typecheck, and build results when applicable.",
  ],
  claude_code: [
    "Separate plan, change summary, verification, and assumptions clearly.",
    "Move uncertainty into assumptions and preserve architecture boundaries.",
  ],
  cursor: [
    "Identify likely files before editing.",
    "Follow nearby code style and keep the edit scope small.",
  ],
  generic_agent: [
    "Use tool-agnostic instructions.",
    "Ask the agent to inspect files and context before acting when needed.",
  ],
} as const

function optionalField(label: string, value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed === undefined || trimmed.length === 0 ? null : `${label}: ${trimmed}`
}

function answerLines(input: PromptCompilerCompileInput): readonly string[] {
  return (input.clarificationAnswers ?? []).map(
    (answer) => `- ${answer.questionId}: ${answer.question}\n  Answer: ${answer.answer}`,
  )
}

function assumptionLines(input: PromptCompilerCompileInput): readonly string[] {
  return (input.assumptions ?? []).map((assumption) => `- ${assumption}`)
}

export function buildAnalyzePrompt(input: PromptCompilerAnalyzeInput): string {
  return [
    "Analyze this request and decide whether clarification is needed.",
    "Keep questions to at most three and prefer options when possible.",
    "If scenario or target agent is provided, do not override it without clear need; reflect it as the detected value when appropriate.",
    "",
    `Original input: ${input.originalInput}`,
    optionalField("Selected scenario", input.scenario),
    optionalField("Selected target agent", input.targetAgent),
    optionalField("Project context", input.projectContext),
    optionalField("Tech stack", input.techStack),
    optionalField("Constraints", input.constraints),
    optionalField("Acceptance criteria", input.acceptanceCriteria),
    optionalField("Validation commands", input.validationCommands),
    optionalField("Additional notes", input.additionalNotes),
  ]
    .filter((line): line is string => line !== null)
    .join("\n")
}

export function buildCompilePrompt(input: PromptCompilerCompileInput): string {
  return [
    "Compile this request into a final Markdown prompt ready for the selected coding agent.",
    "The compiledPrompt must contain these exact section headings: # Objective, # Context, # Task, # Scope, # Constraints, # Acceptance Criteria, # Validation, # Working Instructions, # Final Response Format.",
    "Do not invent project facts. Separate missing information into assumptions.",
    "Prevent unnecessary large refactors. Include 'Do not store prompt execution results.' when scope could be confused with execution.",
    "",
    `Scenario: ${input.scenario}`,
    ...scenarioInstructions[input.scenario],
    "",
    `Target agent: ${input.targetAgent}`,
    ...targetAgentInstructions[input.targetAgent],
    "",
    `Original input: ${input.originalInput}`,
    optionalField("Project context", input.projectContext),
    optionalField("Tech stack", input.techStack),
    optionalField("Constraints", input.constraints),
    optionalField("Acceptance criteria", input.acceptanceCriteria),
    optionalField("Validation commands", input.validationCommands),
    optionalField("Additional notes", input.additionalNotes),
    "",
    "Clarification answers:",
    ...answerLines(input),
    "",
    "Assumptions to preserve:",
    ...assumptionLines(input),
  ]
    .filter((line): line is string => line !== null)
    .join("\n")
}

const clarificationQuestionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    question: { type: "string", minLength: 1 },
    whyItMatters: { type: "string", minLength: 1 },
    options: { type: "array", items: { type: "string", minLength: 1 }, maxItems: 6 },
    required: { type: "boolean" },
  },
  required: ["id", "question", "whyItMatters", "options", "required"],
} as const satisfies Record<string, unknown>

const clarificationAnswerJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questionId: { type: "string", minLength: 1 },
    question: { type: "string", minLength: 1 },
    answer: { type: "string", minLength: 1 },
  },
  required: ["questionId", "question", "answer"],
} as const satisfies Record<string, unknown>

export const analyzeResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    detectedScenario: {
      type: "string",
      enum: ["feature", "bugfix", "refactor", "code_review", "docs", "research"],
    },
    detectedTargetAgent: {
      type: "string",
      enum: ["codex", "claude_code", "cursor", "generic_agent"],
    },
    summary: { type: "string", minLength: 1 },
    clarificationNeeded: { type: "boolean" },
    questions: { type: "array", items: clarificationQuestionJsonSchema, maxItems: 3 },
    assumptions: { type: "array", items: { type: "string", minLength: 1 } },
    suggestedTags: { type: "array", items: { type: "string", minLength: 1 } },
    riskLevel: { type: "string", enum: ["low", "medium", "high"] },
  },
  required: [
    "detectedScenario",
    "detectedTargetAgent",
    "summary",
    "clarificationNeeded",
    "questions",
    "assumptions",
    "suggestedTags",
    "riskLevel",
  ],
} as const satisfies Record<string, unknown>

export const compileResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    scenario: {
      type: "string",
      enum: ["feature", "bugfix", "refactor", "code_review", "docs", "research"],
    },
    targetAgent: { type: "string", enum: ["codex", "claude_code", "cursor", "generic_agent"] },
    summary: { type: "string", minLength: 1 },
    compiledPrompt: { type: "string", minLength: 1 },
    assumptions: { type: "array", items: { type: "string", minLength: 1 } },
    questions: { type: "array", items: clarificationQuestionJsonSchema, maxItems: 3 },
    answers: { type: "array", items: clarificationAnswerJsonSchema },
    acceptanceCriteria: { type: "array", items: { type: "string", minLength: 1 } },
    validationCommands: { type: "array", items: { type: "string", minLength: 1 } },
    suggestedTags: { type: "array", items: { type: "string", minLength: 1 } },
    qualityScore: { type: "integer", minimum: 0, maximum: 100 },
    warnings: { type: "array", items: { type: "string", minLength: 1 } },
  },
  required: [
    "title",
    "scenario",
    "targetAgent",
    "summary",
    "compiledPrompt",
    "assumptions",
    "questions",
    "answers",
    "acceptanceCriteria",
    "validationCommands",
    "suggestedTags",
    "qualityScore",
    "warnings",
  ],
} as const satisfies Record<string, unknown>
