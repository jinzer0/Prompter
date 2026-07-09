export const phase5ScreenshotPath = "test-results/phase5-llm-compiler-ui.png"
export const phase5PlaintextKey = "sk-proj-phase5-secret-value-1234"
export const phase5CompiledPrompt = [
  "# Objective",
  "Generate a Phase 5 prompt compiler flow.",
  "",
  "# Context",
  "Prompter is an Electron app with local-first prompt storage.",
  "",
  "# Task",
  "Implement the LLM compile path only.",
  "",
  "# Scope",
  "Do not execute generated prompts.",
  "",
  "# Constraints",
  "Keep OpenAI calls in the Electron main process.",
  "",
  "# Acceptance Criteria",
  "The compiled prompt can be saved as a prompt asset and version.",
  "",
  "# Validation",
  "npm run test:smoke",
  "",
  "# Working Instructions",
  "Inspect the repository before editing.",
  "",
  "# Final Response Format",
  "Summarize changes and verification.",
].join("\n")

export const phase5AnalyzeResponse = JSON.stringify({
  detectedScenario: "feature",
  detectedTargetAgent: "codex",
  summary: "The request needs one clarification before compiling.",
  clarificationNeeded: true,
  questions: [
    {
      id: "focus",
      question: "Which project behavior should the agent focus on?",
      whyItMatters: "This determines the concrete implementation target.",
      options: ["Compiler UI", "Prompt library refresh"],
      required: true,
    },
  ],
  assumptions: ["Existing prompt storage remains unchanged."],
  suggestedTags: ["phase5", "compiler"],
  riskLevel: "medium",
})

export const phase5CompileResponse = JSON.stringify({
  title: "Generate Phase 5 compiler prompt",
  scenario: "feature",
  targetAgent: "codex",
  summary: "Generate a final agent-ready Phase 5 prompt.",
  compiledPrompt: phase5CompiledPrompt,
  assumptions: ["Existing prompt storage remains unchanged."],
  questions: [
    {
      id: "focus",
      question: "Which project behavior should the agent focus on?",
      whyItMatters: "This determines the concrete implementation target.",
      options: ["Compiler UI", "Prompt library refresh"],
      required: true,
    },
  ],
  answers: [
    {
      questionId: "focus",
      question: "Which project behavior should the agent focus on?",
      answer: "Compiler UI with prompt library refresh after save.",
    },
  ],
  acceptanceCriteria: ["LLM compiled prompts save as PromptAsset and PromptVersion."],
  validationCommands: ["npm run test:smoke"],
  suggestedTags: ["phase5", "compiler"],
  qualityScore: 91,
  warnings: ["Confirm OpenAI key exists before compiling."],
})
