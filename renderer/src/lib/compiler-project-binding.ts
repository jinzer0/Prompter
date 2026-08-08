import type { PromptCompilerInput } from "./prompt-compiler/types"

export const COMPILER_PROJECT_REBIND_DESCRIPTION_ID = "compiler-project-rebind-description"
export const COMPILER_PROJECT_REBIND_REQUIRED_MESSAGE =
  "Rebind the compiler to the current project before changing or saving preserved output."

export type CompilerStatePreservationRequest = {
  readonly sourceProjectId: string
  readonly targetProjectId: string
  readonly requestId: number
}

type CompilerProjectTransitionState = {
  readonly appliedRequestId: number | null
  readonly currentProjectId: string | null
  readonly previousProjectId: string | null
  readonly request: CompilerStatePreservationRequest | null
}

export type CompilerProjectTransitionResolution =
  | { readonly kind: "preserve"; readonly request: CompilerStatePreservationRequest }
  | { readonly kind: "reset"; readonly projectId: string | null }
  | { readonly kind: "unchanged" }

export type CompilerProjectBinding =
  | { readonly kind: "bound"; readonly projectId: string | null }
  | ({ readonly kind: "preserved_unbound" } & CompilerStatePreservationRequest)

export type CompilerProjectBindingEvent =
  | { readonly kind: "project_preserved"; readonly request: CompilerStatePreservationRequest }
  | { readonly kind: "project_reset"; readonly projectId: string | null }
  | { readonly kind: "rebind_requested"; readonly projectId: string }

export type CompilerProjectAction =
  | "analyze"
  | "compile_static"
  | "compile_llm"
  | "template_apply"
  | "save_prompt"
  | "save_derived"
  | "save_next_version"
  | "edit_output"
  | "save_export_file"
  | "copy"

type GuardedCompilerPersistenceInput = {
  readonly action: Extract<CompilerProjectAction, `save_${string}`>
  readonly binding: CompilerProjectBinding
  readonly currentProjectId: string | null
}

function assertNever(value: never): never {
  throw new TypeError(`Unexpected compiler project binding value: ${JSON.stringify(value)}`)
}

export function createCompilerProjectBinding(projectId: string | null): CompilerProjectBinding {
  return { kind: "bound", projectId }
}

export function resolveCompilerProjectTransition({
  appliedRequestId,
  currentProjectId,
  previousProjectId,
  request,
}: CompilerProjectTransitionState): CompilerProjectTransitionResolution {
  if (previousProjectId === currentProjectId) {
    return { kind: "unchanged" }
  }
  if (
    request !== null &&
    request.sourceProjectId === previousProjectId &&
    request.targetProjectId === currentProjectId &&
    request.requestId !== appliedRequestId
  ) {
    return { kind: "preserve", request }
  }
  return { kind: "reset", projectId: currentProjectId }
}

export function reduceCompilerProjectBinding(
  state: CompilerProjectBinding,
  event: CompilerProjectBindingEvent,
): CompilerProjectBinding {
  switch (event.kind) {
    case "project_preserved":
      return state.kind === "bound" && state.projectId === event.request.sourceProjectId
        ? { kind: "preserved_unbound", ...event.request }
        : state
    case "project_reset":
      return createCompilerProjectBinding(event.projectId)
    case "rebind_requested":
      return state.kind === "preserved_unbound" && state.targetProjectId === event.projectId
        ? createCompilerProjectBinding(event.projectId)
        : state
    default:
      return assertNever(event)
  }
}

export function compilerProjectActionIsAllowed(
  binding: CompilerProjectBinding,
  currentProjectId: string | null,
  action: CompilerProjectAction,
): boolean {
  switch (action) {
    case "copy":
      return true
    case "analyze":
    case "compile_static":
    case "compile_llm":
    case "template_apply":
    case "edit_output":
    case "save_export_file":
    case "save_prompt":
    case "save_derived":
    case "save_next_version":
      return binding.kind === "bound" && binding.projectId === currentProjectId
    default:
      return assertNever(action)
  }
}

export async function executeGuardedCompilerPersistence(
  input: GuardedCompilerPersistenceInput,
  persist: () => Promise<void> | void,
): Promise<"blocked" | "executed"> {
  if (!compilerProjectActionIsAllowed(input.binding, input.currentProjectId, input.action)) {
    return "blocked"
  }

  await persist()
  return "executed"
}

export function rebindCompilerDraft(draft: PromptCompilerInput): PromptCompilerInput {
  return {
    ...draft,
    projectContextProfileId: null,
    includeProjectContextProfile: false,
  }
}
