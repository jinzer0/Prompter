export type VersionField =
  | "originalInput"
  | "compiledPrompt"
  | "assumptions"
  | "questions"
  | "answers"
  | "acceptanceCriteria"
  | "validationCommands"

export type ContextField =
  | "summary"
  | "techStack"
  | "architectureNotes"
  | "codingConventions"
  | "constraints"
  | "forbiddenActions"
  | "acceptanceDefaults"
  | "validationCommands"
  | "securityNotes"
  | "additionalContext"
  | "testingNotes"
  | "packageManager"
  | "defaultBranch"
  | "repoPath"

export const versionFields = [
  ["originalInput", "original input"],
  ["compiledPrompt", "compiled prompt"],
  ["assumptions", "assumptions"],
  ["questions", "questions"],
  ["answers", "answers"],
  ["acceptanceCriteria", "acceptance criteria"],
  ["validationCommands", "validation commands"],
] as const satisfies readonly (readonly [VersionField, string])[]

export const contextFields = [
  ["summary", "summary"],
  ["techStack", "tech stack"],
  ["architectureNotes", "architecture notes"],
  ["codingConventions", "coding conventions"],
  ["constraints", "constraints"],
  ["forbiddenActions", "forbidden actions"],
  ["acceptanceDefaults", "acceptance defaults"],
  ["validationCommands", "validation commands"],
  ["securityNotes", "security notes"],
  ["additionalContext", "additional context"],
  ["testingNotes", "testing notes"],
  ["packageManager", "package manager"],
  ["defaultBranch", "default branch"],
  ["repoPath", "repository path"],
] as const satisfies readonly (readonly [ContextField, string])[]
