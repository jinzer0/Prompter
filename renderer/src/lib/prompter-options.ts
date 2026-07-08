import type { Project, PromptAsset } from "../../../electron/ipc-types"

export type TargetAgent = NonNullable<Project["defaultAgent"]>
export type PromptScenario = PromptAsset["scenario"]

export const targetAgentOptions = [
  { value: "codex", label: "Codex" },
  { value: "claude_code", label: "Claude Code" },
  { value: "cursor", label: "Cursor" },
  { value: "generic_agent", label: "Generic agent" },
] as const satisfies readonly { readonly value: TargetAgent; readonly label: string }[]

export const scenarioOptions = [
  { value: "feature", label: "Feature" },
  { value: "bugfix", label: "Bug fix" },
  { value: "refactor", label: "Refactor" },
  { value: "code_review", label: "Code review" },
  { value: "docs", label: "Docs" },
  { value: "research", label: "Research" },
] as const satisfies readonly { readonly value: PromptScenario; readonly label: string }[]

const targetAgentLabels: Record<TargetAgent, string> = {
  codex: "Codex",
  claude_code: "Claude Code",
  cursor: "Cursor",
  generic_agent: "Generic agent",
}

const scenarioLabels: Record<PromptScenario, string> = {
  feature: "Feature",
  bugfix: "Bug fix",
  refactor: "Refactor",
  code_review: "Code review",
  docs: "Docs",
  research: "Research",
}

export function targetAgentLabel(value: TargetAgent | null): string {
  return value === null ? "No default agent" : targetAgentLabels[value]
}

export function scenarioLabel(value: PromptScenario): string {
  return scenarioLabels[value]
}

export function parseTargetAgent(value: string): TargetAgent {
  switch (value) {
    case "codex":
      return "codex"
    case "claude_code":
      return "claude_code"
    case "cursor":
      return "cursor"
    case "generic_agent":
      return "generic_agent"
    default:
      return "generic_agent"
  }
}

export function parseDefaultAgent(value: string): TargetAgent | null {
  return value.length === 0 ? null : parseTargetAgent(value)
}

export function parseScenario(value: string): PromptScenario {
  switch (value) {
    case "feature":
      return "feature"
    case "bugfix":
      return "bugfix"
    case "refactor":
      return "refactor"
    case "code_review":
      return "code_review"
    case "docs":
      return "docs"
    case "research":
      return "research"
    default:
      return "feature"
  }
}
