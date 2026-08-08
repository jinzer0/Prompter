import { useEffect, useMemo, useState } from "react"

import type {
  ProjectContextCompilerBuildResult,
  ProjectContextProfile,
} from "../../../electron/ipc-types"
import type { PromptCompilerInput } from "./prompt-compiler/types"

export type ProjectContextProfileSelection = {
  readonly projectContextProfileId: string | null
  readonly includeProjectContextProfile: boolean
}

export type CompilerProjectContextPreviewStatus = "idle" | "loading" | "ready" | "error"

type ProjectContextProfilePreviewConfig = {
  readonly deletedProfileIds: readonly string[]
  readonly preservedUnavailableProfileId: string | null
  readonly profileId: string | null
  readonly projectId: string | null
  readonly refreshSignal: number
}

type ProjectContextProfileRefreshState = {
  readonly lastHandledRefreshSignal: number
  readonly refreshSignal: number
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

export function shouldHandleProjectContextProfileRefresh({
  lastHandledRefreshSignal,
  refreshSignal,
}: ProjectContextProfileRefreshState): boolean {
  return refreshSignal > 0 && refreshSignal !== lastHandledRefreshSignal
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

export function useProjectContextProfilePreview({
  deletedProfileIds,
  preservedUnavailableProfileId,
  profileId,
  projectId,
  refreshSignal,
}: ProjectContextProfilePreviewConfig) {
  const [preview, setPreview] = useState<ProjectContextCompilerBuildResult | null>(null)
  const [previewStatus, setPreviewStatus] = useState<CompilerProjectContextPreviewStatus>("idle")
  const [previewError, setPreviewError] = useState<string | null>(null)
  const previewRequest = useMemo(
    () => ({ profileId, projectId, refreshSignal }),
    [profileId, projectId, refreshSignal],
  )

  useEffect(() => {
    let isActive = true
    const requestProfileId = previewRequest.profileId
    const requestProjectId = previewRequest.projectId
    const deactivate = (): void => {
      isActive = false
    }
    if (requestProjectId === null || requestProfileId === null) {
      setPreview(null)
      setPreviewStatus("idle")
      setPreviewError(null)
      return deactivate
    }
    const selectedProjectId = requestProjectId
    const selectedProfileId = requestProfileId
    if (
      preservedUnavailableProfileId === selectedProfileId ||
      deletedProfileIds.includes(selectedProfileId)
    ) {
      setPreview(missingProjectContextProfilePreview(selectedProfileId))
      setPreviewStatus("ready")
      setPreviewError(null)
      return deactivate
    }

    async function loadPreview(): Promise<void> {
      setPreviewStatus("loading")
      setPreviewError(null)
      try {
        const result = await window.prompter.projectContextProfiles.buildCompilerContext(
          selectedProjectId,
          selectedProfileId,
        )
        if (isActive) {
          setPreview(result)
          setPreviewStatus("ready")
        }
      } catch (error) {
        if (!(error instanceof Error)) throw error
        if (isActive) {
          setPreview(null)
          setPreviewError(error.message)
          setPreviewStatus("error")
        }
      }
    }

    void loadPreview()
    return deactivate
  }, [deletedProfileIds, preservedUnavailableProfileId, previewRequest])

  return { preview, previewError, previewStatus }
}
