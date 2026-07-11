import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react"

import type { Project, ProjectContextCompilerBuildResult } from "../../../electron/ipc-types"
import {
  applyProjectContextProfileSelection,
  clearProjectContextProfileSelection,
  missingProjectContextProfilePreview,
  profileBelongsToSelection,
  recommendedProjectContextProfileId,
  shouldResetCompilerOutputForProfileRefresh,
  shouldResetCompilerOutputForProjectContextChange,
} from "../lib/project-context-profile-selection"
import type { PromptCompilerInput } from "../lib/prompt-compiler/types"
import { useProjectContextProfiles } from "./use-project-context-profiles"

export type CompilerProjectContextPreviewStatus = "idle" | "loading" | "ready" | "error"

type UseCompilerProjectContextConfig = {
  readonly changedProjectContextProfileId: string | null
  readonly deletedProjectContextProfileIds: readonly string[]
  readonly selectedProject: Project | null
  readonly draft: PromptCompilerInput
  readonly onIncludedProfileChanged: () => void
  readonly projectContextProfileRefreshSignal: number
  readonly setDraft: Dispatch<SetStateAction<PromptCompilerInput>>
}

type ProjectContextProfileRefreshState = {
  readonly lastHandledRefreshSignal: number
  readonly refreshSignal: number
}

export function shouldHandleProjectContextProfileRefresh({
  lastHandledRefreshSignal,
  refreshSignal,
}: ProjectContextProfileRefreshState): boolean {
  return refreshSignal > 0 && refreshSignal !== lastHandledRefreshSignal
}

export function useCompilerProjectContext({
  changedProjectContextProfileId,
  deletedProjectContextProfileIds,
  selectedProject,
  draft,
  onIncludedProfileChanged,
  projectContextProfileRefreshSignal,
  setDraft,
}: UseCompilerProjectContextConfig) {
  const projectId = selectedProject?.id ?? null
  const profiles = useProjectContextProfiles(projectId)
  const lastHandledRefreshSignal = useRef(0)
  const recommendedProjectIdRef = useRef<string | null>(null)
  const previousProjectId = useRef<string | null>(projectId)
  const requestedProjectIdRef = useRef<string | null>(null)
  const [preview, setPreview] = useState<ProjectContextCompilerBuildResult | null>(null)
  const [previewStatus, setPreviewStatus] = useState<CompilerProjectContextPreviewStatus>("idle")
  const [previewError, setPreviewError] = useState<string | null>(null)
  const selectedProfileId = draft.projectContextProfileId ?? null
  const availableProfiles = useMemo(
    () =>
      profiles.profiles.filter((profile) => !deletedProjectContextProfileIds.includes(profile.id)),
    [deletedProjectContextProfileIds, profiles.profiles],
  )
  const previewRequest = useMemo(
    () => ({
      projectId,
      profileId: selectedProfileId,
      refreshSignal: projectContextProfileRefreshSignal,
    }),
    [projectContextProfileRefreshSignal, projectId, selectedProfileId],
  )

  useEffect(() => {
    if (!shouldResetCompilerOutputForProjectContextChange(previousProjectId.current, projectId)) {
      return
    }

    const shouldResetThroughSelection =
      selectedProfileId !== null || draft.includeProjectContextProfile === true

    previousProjectId.current = projectId
    recommendedProjectIdRef.current = null
    requestedProjectIdRef.current = null

    if (!shouldResetThroughSelection) {
      onIncludedProfileChanged()
    }

    setDraft(clearProjectContextProfileSelection)
  }, [
    draft.includeProjectContextProfile,
    onIncludedProfileChanged,
    projectId,
    selectedProfileId,
    setDraft,
  ])

  useEffect(() => {
    if (projectId !== null && profiles.status === "idle") {
      requestedProjectIdRef.current = projectId
      void profiles.loadProfiles()
    }
  }, [profiles.loadProfiles, profiles.status, projectId])

  useEffect(() => {
    if (
      !shouldHandleProjectContextProfileRefresh({
        lastHandledRefreshSignal: lastHandledRefreshSignal.current,
        refreshSignal: projectContextProfileRefreshSignal,
      })
    ) {
      return
    }

    lastHandledRefreshSignal.current = projectContextProfileRefreshSignal

    if (projectId !== null) {
      requestedProjectIdRef.current = projectId
      void profiles.loadProfiles()
    }

    if (
      shouldResetCompilerOutputForProfileRefresh(
        selectedProfileId,
        draft.includeProjectContextProfile === true,
        changedProjectContextProfileId,
      )
    ) {
      onIncludedProfileChanged()
    }
  }, [
    changedProjectContextProfileId,
    draft.includeProjectContextProfile,
    onIncludedProfileChanged,
    profiles.loadProfiles,
    projectContextProfileRefreshSignal,
    projectId,
    selectedProfileId,
  ])

  useEffect(() => {
    if (
      projectId === null ||
      profiles.status !== "ready" ||
      requestedProjectIdRef.current !== projectId
    ) {
      return
    }

    if (recommendedProjectIdRef.current !== projectId) {
      recommendedProjectIdRef.current = projectId
      setDraft((current) =>
        applyProjectContextProfileSelection(current, {
          projectContextProfileId: recommendedProjectContextProfileId(availableProfiles),
          includeProjectContextProfile: false,
        }),
      )
      return
    }

    if (!profileBelongsToSelection(availableProfiles, selectedProfileId)) {
      setDraft(clearProjectContextProfileSelection)
    }
  }, [availableProfiles, profiles.status, projectId, selectedProfileId, setDraft])

  useEffect(() => {
    if (selectedProfileId === null) {
      return
    }

    if (deletedProjectContextProfileIds.includes(selectedProfileId)) {
      setDraft(clearProjectContextProfileSelection)
    }
  }, [deletedProjectContextProfileIds, selectedProfileId, setDraft])

  useEffect(() => {
    let isActive = true
    const profileId = previewRequest.profileId
    const requestProjectId = previewRequest.projectId

    if (requestProjectId === null || profileId === null) {
      setPreview(null)
      setPreviewStatus("idle")
      setPreviewError(null)
      return () => {
        isActive = false
      }
    }

    if (deletedProjectContextProfileIds.includes(profileId)) {
      setPreview(missingProjectContextProfilePreview(profileId))
      setPreviewStatus("ready")
      setPreviewError(null)
      return () => {
        isActive = false
      }
    }

    const selectedProjectId = requestProjectId
    const selectedPreviewProfileId = profileId

    async function loadPreview(): Promise<void> {
      setPreviewStatus("loading")
      setPreviewError(null)

      try {
        const result = await window.prompter.projectContextProfiles.buildCompilerContext(
          selectedProjectId,
          selectedPreviewProfileId,
        )

        if (isActive) {
          setPreview(result)
          setPreviewStatus("ready")
        }
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error
        }

        if (isActive) {
          setPreview(null)
          setPreviewError(error.message)
          setPreviewStatus("error")
        }
      }
    }

    void loadPreview()

    return () => {
      isActive = false
    }
  }, [deletedProjectContextProfileIds, previewRequest])

  function selectProfile(profileId: string | null): void {
    setDraft((current) =>
      applyProjectContextProfileSelection(current, {
        projectContextProfileId: profileId,
        includeProjectContextProfile:
          profileId === null ? false : current.includeProjectContextProfile === true,
      }),
    )
  }

  function setIncludeProjectContextProfile(includeProjectContextProfile: boolean): void {
    setDraft((current) =>
      applyProjectContextProfileSelection(current, {
        projectContextProfileId: current.projectContextProfileId ?? null,
        includeProjectContextProfile:
          (current.projectContextProfileId ?? null) === null ? false : includeProjectContextProfile,
      }),
    )
  }

  return {
    error: profiles.error,
    includeProjectContextProfile: draft.includeProjectContextProfile === true,
    preview,
    previewError,
    previewStatus,
    profiles: availableProfiles,
    selectedProfileId,
    selectProfile,
    setIncludeProjectContextProfile,
    status: profiles.status,
  }
}
