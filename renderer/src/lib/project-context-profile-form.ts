import type { ProjectContextProfile } from "../../../electron/ipc-types"

export type ProjectContextProfileFormInput = {
  readonly name: string
  readonly summary: string
  readonly techStack: string
  readonly architectureNotes: string
  readonly codingConventions: string
  readonly constraints: string
  readonly forbiddenActions: string
  readonly acceptanceDefaults: string
  readonly validationCommands: string
  readonly securityNotes: string
  readonly additionalContext: string
  readonly testingNotes: string
  readonly packageManager: string
  readonly defaultBranch: string
  readonly repoPath: string
  readonly isDefault: boolean
}

export type ProjectContextProfileFormField = keyof ProjectContextProfileFormInput

export type ProjectContextProfileBridgeInput = ProjectContextProfileFormInput

export type NormalizedProjectContextProfileForm = ProjectContextProfileFormInput & {
  readonly bridgeInput: ProjectContextProfileBridgeInput
}

export type ProjectContextProfileFormResult =
  | { readonly ok: true; readonly value: NormalizedProjectContextProfileForm }
  | { readonly ok: false; readonly field: ProjectContextProfileFormField; readonly message: string }

export type ProjectContextProfileTextField = Exclude<
  ProjectContextProfileFormField,
  "name" | "isDefault"
>

export const projectContextProfileTextFields = [
  {
    field: "summary",
    label: "Summary",
    placeholder: "Project purpose, product context, and current goals",
  },
  {
    field: "techStack",
    label: "Tech stack",
    placeholder: "Frameworks, runtimes, storage, and test tools",
  },
  {
    field: "architectureNotes",
    label: "Architecture notes",
    placeholder: "Boundaries, layers, and important flows",
  },
  {
    field: "codingConventions",
    label: "Coding conventions",
    placeholder: "Style, naming, and local patterns",
  },
  {
    field: "constraints",
    label: "Constraints",
    placeholder: "Hard limits and must-preserve behavior",
  },
  {
    field: "forbiddenActions",
    label: "Forbidden actions",
    placeholder: "Actions the compiler should not suggest",
  },
  {
    field: "acceptanceDefaults",
    label: "Acceptance defaults",
    placeholder: "Default acceptance criteria shape",
  },
  {
    field: "validationCommands",
    label: "Validation commands",
    placeholder: "npm run typecheck\nnpx vitest run tests/ui-utils.test.ts",
  },
  {
    field: "securityNotes",
    label: "Security notes",
    placeholder: "Secrets, trust boundaries, and privacy constraints",
  },
  {
    field: "additionalContext",
    label: "Additional context",
    placeholder: "Extra context that does not fit another field",
  },
  {
    field: "testingNotes",
    label: "Testing notes",
    placeholder: "Known fixtures, test layers, and QA expectations",
  },
  { field: "packageManager", label: "Package manager", placeholder: "npm" },
  { field: "defaultBranch", label: "Default branch", placeholder: "main" },
  { field: "repoPath", label: "Repo path", placeholder: "/Users/name/project" },
] as const satisfies readonly {
  readonly field: ProjectContextProfileTextField
  readonly label: string
  readonly placeholder: string
}[]

export const emptyProjectContextProfileForm: ProjectContextProfileFormInput = {
  name: "",
  summary: "",
  techStack: "",
  architectureNotes: "",
  codingConventions: "",
  constraints: "",
  forbiddenActions: "",
  acceptanceDefaults: "",
  validationCommands: "",
  securityNotes: "",
  additionalContext: "",
  testingNotes: "",
  packageManager: "",
  defaultBranch: "",
  repoPath: "",
  isDefault: false,
}

export function projectContextProfileFormFromProfile(
  profile: ProjectContextProfile | null,
): ProjectContextProfileFormInput {
  if (profile === null) {
    return emptyProjectContextProfileForm
  }

  return {
    name: profile.name,
    summary: profile.summary ?? "",
    techStack: profile.techStack ?? "",
    architectureNotes: profile.architectureNotes ?? "",
    codingConventions: profile.codingConventions ?? "",
    constraints: profile.constraints ?? "",
    forbiddenActions: profile.forbiddenActions ?? "",
    acceptanceDefaults: profile.acceptanceDefaults ?? "",
    validationCommands: profile.validationCommands ?? "",
    securityNotes: profile.securityNotes ?? "",
    additionalContext: profile.additionalContext ?? "",
    testingNotes: profile.testingNotes ?? "",
    packageManager: profile.packageManager ?? "",
    defaultBranch: profile.defaultBranch ?? "",
    repoPath: profile.repoPath ?? "",
    isDefault: profile.isDefault,
  }
}

export function normalizeProjectContextProfileForm(
  input: ProjectContextProfileFormInput,
): ProjectContextProfileFormResult {
  const name = input.name.trim()

  if (name.length === 0) {
    return { ok: false, field: "name", message: "Profile name is required." }
  }

  const bridgeInput: ProjectContextProfileBridgeInput = {
    name,
    summary: input.summary,
    techStack: input.techStack,
    architectureNotes: input.architectureNotes,
    codingConventions: input.codingConventions,
    constraints: input.constraints,
    forbiddenActions: input.forbiddenActions,
    acceptanceDefaults: input.acceptanceDefaults,
    validationCommands: input.validationCommands,
    securityNotes: input.securityNotes,
    additionalContext: input.additionalContext,
    testingNotes: input.testingNotes,
    packageManager: input.packageManager,
    defaultBranch: input.defaultBranch,
    repoPath: input.repoPath,
    isDefault: input.isDefault,
  }

  return {
    ok: true,
    value: {
      ...bridgeInput,
      bridgeInput,
    },
  }
}
