import type { PromptScenario, TargetAgent } from "../prompter-options"

export const defaultConstraints = ["Prefer small, focused, reviewable changes."] as const
export const defaultValidation = [
  "Run the existing test, typecheck, lint, or build commands if available.",
] as const
export const baseWorkingInstructions = [
  "Inspect the existing project structure before editing.",
  "Make a concise implementation plan before changing files.",
  "Keep changes small and reviewable.",
  "Do not introduce unrelated refactors.",
  "Preserve existing architecture boundaries.",
  "If important information is missing, state assumptions before proceeding.",
] as const
export const defaultOutOfScope = [
  "Do not implement unrelated features.",
  "Do not store prompt execution results.",
] as const

export const scenarioTaskLines: Record<PromptScenario, readonly string[]> = {
  feature: [
    "Implement the requested feature and integrate it naturally with the existing structure.",
    "Consider relevant edge cases before declaring the work complete.",
  ],
  bugfix: [
    "Identify the reproduction conditions before changing code.",
    "Find the root cause, make the smallest safe fix, and prevent regression.",
  ],
  refactor: [
    "Improve structure without changing public behavior.",
    "Avoid broad rewrites or unrelated cleanup.",
  ],
  code_review: [
    "Review the code instead of implementing changes unless explicitly asked.",
    "Report findings by severity with concrete file and location references.",
  ],
  docs: [
    "Clarify the target reader before writing.",
    "Include usage, examples, and caveats without unnecessary code changes.",
  ],
  research: [
    "Investigate options before implementation.",
    "Compare trade-offs and recommend a concrete path forward.",
  ],
}

export const scenarioAcceptanceCriteria: Record<PromptScenario, readonly string[]> = {
  feature: [
    "The requested feature is implemented in the appropriate existing surface.",
    "Relevant edge cases are handled or explicitly documented.",
    "Existing behavior outside the feature remains unchanged.",
  ],
  bugfix: [
    "The bug is reproducible before the fix and no longer reproduces after the fix.",
    "The root cause is addressed with a focused change.",
    "A regression test or verification step covers the fixed behavior.",
  ],
  refactor: [
    "Public behavior remains unchanged.",
    "The new structure is smaller or clearer than the old structure.",
    "Existing tests continue to pass.",
  ],
  code_review: [
    "Findings are ordered by severity.",
    "Each finding includes concrete evidence and affected location.",
    "If no findings exist, residual risks are stated clearly.",
  ],
  docs: [
    "The intended audience is clear.",
    "Usage, examples, and caveats are included where relevant.",
    "No unnecessary code changes are made.",
  ],
  research: [
    "Viable options are compared with trade-offs.",
    "A recommendation is provided with rationale.",
    "Implementation work is deferred unless explicitly requested.",
  ],
}

export const agentInstructions: Record<TargetAgent, readonly string[]> = {
  codex: [
    "Inspect the repository before editing.",
    "Prefer small change sets.",
    "Include test and typecheck results in the final response.",
  ],
  claude_code: [
    "Separate the plan, change summary, and verification results clearly.",
    "Move uncertain information into an Assumptions section.",
  ],
  cursor: [
    "Identify the files to edit before making changes.",
    "Follow the existing code style in nearby files.",
  ],
  generic_agent: [
    "Use tool-agnostic implementation steps and report concrete verification evidence.",
  ],
}
