import type {
  CreateProjectContextProfileInput,
  ProjectContextProfile,
  UpdateProjectContextProfileInput,
} from "../../ipc-contract.js"
import { optionalText } from "./common.js"

type ProjectContextProfileTextFields = Pick<
  ProjectContextProfile,
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
>

export type ProjectContextProfileCreateInput = Omit<
  CreateProjectContextProfileInput,
  keyof ProjectContextProfileTextFields | "isDefault"
> &
  Partial<ProjectContextProfileTextFields> & {
    readonly isDefault?: boolean
  }

export type ProjectContextProfileInsertValues = ProjectContextProfileTextFields & {
  readonly id: string
  readonly projectId: string
  readonly name: string
  readonly isDefault: boolean
  readonly createdAt: number
  readonly updatedAt: number
}

export type ProjectContextProfileUpdateValues = Partial<
  ProjectContextProfileTextFields & Pick<ProjectContextProfile, "name" | "isDefault">
> & {
  readonly updatedAt: number
}

export function buildInsertValues(
  input: ProjectContextProfileCreateInput,
  id: string,
  now: number,
): ProjectContextProfileInsertValues {
  return {
    id,
    projectId: input.projectId,
    name: input.name,
    summary: optionalText(input.summary),
    techStack: optionalText(input.techStack),
    architectureNotes: optionalText(input.architectureNotes),
    codingConventions: optionalText(input.codingConventions),
    constraints: optionalText(input.constraints),
    forbiddenActions: optionalText(input.forbiddenActions),
    acceptanceDefaults: optionalText(input.acceptanceDefaults),
    validationCommands: optionalText(input.validationCommands),
    securityNotes: optionalText(input.securityNotes),
    additionalContext: optionalText(input.additionalContext),
    testingNotes: optionalText(input.testingNotes),
    packageManager: optionalText(input.packageManager),
    defaultBranch: optionalText(input.defaultBranch),
    repoPath: optionalText(input.repoPath),
    isDefault: input.isDefault ?? false,
    createdAt: now,
    updatedAt: now,
  }
}

export function buildDuplicateInput(
  source: ProjectContextProfile,
): ProjectContextProfileCreateInput {
  return {
    projectId: source.projectId,
    name: `${source.name} Copy`,
    summary: source.summary,
    techStack: source.techStack,
    architectureNotes: source.architectureNotes,
    codingConventions: source.codingConventions,
    constraints: source.constraints,
    forbiddenActions: source.forbiddenActions,
    acceptanceDefaults: source.acceptanceDefaults,
    validationCommands: source.validationCommands,
    securityNotes: source.securityNotes,
    additionalContext: source.additionalContext,
    testingNotes: source.testingNotes,
    packageManager: source.packageManager,
    defaultBranch: source.defaultBranch,
    repoPath: source.repoPath,
    isDefault: false,
  }
}

export function buildUpdateValues(
  input: UpdateProjectContextProfileInput,
  now: number,
): ProjectContextProfileUpdateValues {
  const values: ProjectContextProfileUpdateValues = { updatedAt: now }

  if (input.name !== undefined) {
    values.name = input.name
  }
  if (input.summary !== undefined) {
    values.summary = optionalText(input.summary)
  }
  if (input.techStack !== undefined) {
    values.techStack = optionalText(input.techStack)
  }
  if (input.architectureNotes !== undefined) {
    values.architectureNotes = optionalText(input.architectureNotes)
  }
  if (input.codingConventions !== undefined) {
    values.codingConventions = optionalText(input.codingConventions)
  }
  if (input.constraints !== undefined) {
    values.constraints = optionalText(input.constraints)
  }
  if (input.forbiddenActions !== undefined) {
    values.forbiddenActions = optionalText(input.forbiddenActions)
  }
  if (input.acceptanceDefaults !== undefined) {
    values.acceptanceDefaults = optionalText(input.acceptanceDefaults)
  }
  if (input.validationCommands !== undefined) {
    values.validationCommands = optionalText(input.validationCommands)
  }
  if (input.securityNotes !== undefined) {
    values.securityNotes = optionalText(input.securityNotes)
  }
  if (input.additionalContext !== undefined) {
    values.additionalContext = optionalText(input.additionalContext)
  }
  if (input.testingNotes !== undefined) {
    values.testingNotes = optionalText(input.testingNotes)
  }
  if (input.packageManager !== undefined) {
    values.packageManager = optionalText(input.packageManager)
  }
  if (input.defaultBranch !== undefined) {
    values.defaultBranch = optionalText(input.defaultBranch)
  }
  if (input.repoPath !== undefined) {
    values.repoPath = optionalText(input.repoPath)
  }
  if (input.isDefault !== undefined) {
    values.isDefault = input.isDefault
  }

  return values
}
