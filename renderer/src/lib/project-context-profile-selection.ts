import type {
  ProjectContextCompilerBuildResult,
  ProjectContextProfile,
} from "../../../electron/ipc-types"
import type { PromptCompilerInput } from "./prompt-compiler/types"

export type ProjectContextProfileSelection = {
  readonly projectContextProfileId: string | null
  readonly includeProjectContextProfile: boolean
}

const missingProjectContextProfileWarning =
  "Selected project context profile is unavailable; profile context was excluded."

export function recommendedProjectContextProfileId(
  profiles: readonly Pick<ProjectContextProfile, "id" | "isDefault">[],
): string | null {
  return profiles.find((profile) => profile.isDefault)?.id ?? null
}

export function profileBelongsToSelection(
  profiles: readonly Pick<ProjectContextProfile, "id">[],
  profileId: string | null,
): boolean {
  return profileId === null || profiles.some((profile) => profile.id === profileId)
}

export function applyProjectContextProfileSelection(
  draft: PromptCompilerInput,
  selection: ProjectContextProfileSelection,
): PromptCompilerInput {
  return {
    ...draft,
    projectContextProfileId: selection.projectContextProfileId,
    includeProjectContextProfile: selection.includeProjectContextProfile,
  }
}

export function clearProjectContextProfileSelection(
  draft: PromptCompilerInput,
): PromptCompilerInput {
  return applyProjectContextProfileSelection(draft, {
    projectContextProfileId: null,
    includeProjectContextProfile: false,
  })
}

export function shouldResetCompilerOutputForProjectContextChange(
  previousProjectId: string | null,
  projectId: string | null,
): boolean {
  return previousProjectId !== projectId
}

export function shouldResetCompilerOutputForProfileRefresh(
  selectedProfileId: string | null,
  includeProjectContextProfile: boolean,
  changedProjectContextProfileId: string | null,
): boolean {
  return (
    selectedProfileId !== null &&
    includeProjectContextProfile &&
    changedProjectContextProfileId === selectedProfileId
  )
}

export function missingProjectContextProfilePreview(
  profileId: string,
): ProjectContextCompilerBuildResult {
  return {
    profileId,
    profileName: "Unavailable Context Profile",
    context: null,
    sectionNames: [],
    warnings: [missingProjectContextProfileWarning],
  }
}
