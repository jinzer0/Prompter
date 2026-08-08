import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef } from "react"

import type { Project } from "../../../electron/ipc-types"
import {
  type CompilerProjectTransitionResolution,
  type CompilerStatePreservationRequest,
  resolveCompilerProjectTransition,
} from "../lib/compiler-project-binding"
import {
  applyProjectContextProfileSelection,
  type CompilerProjectContextPreviewStatus,
  clearProjectContextProfileSelection,
  profileBelongsToSelection,
  recommendedProjectContextProfileId,
  shouldHandleProjectContextProfileRefresh,
  shouldResetCompilerOutputForProfileRefresh,
  useProjectContextProfilePreview,
} from "../lib/project-context-profile-selection"
import type { PromptCompilerInput } from "../lib/prompt-compiler/types"
import { useProjectContextProfiles } from "./use-project-context-profiles"

export { shouldHandleProjectContextProfileRefresh } from "../lib/project-context-profile-selection"
export type { CompilerProjectContextPreviewStatus }

type UseCompilerProjectContextConfig = {
  readonly changedProjectContextProfileId: string | null
  readonly compilerStatePreservationRequest: CompilerStatePreservationRequest | null
  readonly deletedProjectContextProfileIds: readonly string[]
  readonly selectedProject: Project | null
  readonly draft: PromptCompilerInput
  readonly onIncludedProfileChanged: () => void
  readonly onProjectTransition: (transition: CompilerProjectTransitionResolution) => void
  readonly projectContextProfileRefreshSignal: number
  readonly setDraft: Dispatch<SetStateAction<PromptCompilerInput>>
}

type ActiveCompilerStatePreservation = CompilerStatePreservationRequest & {
  readonly profileId: string | null
}

export function useCompilerProjectContext({
  changedProjectContextProfileId,
  compilerStatePreservationRequest,
  deletedProjectContextProfileIds,
  selectedProject,
  draft,
  onIncludedProfileChanged,
  onProjectTransition,
  projectContextProfileRefreshSignal,
  setDraft,
}: UseCompilerProjectContextConfig) {
  const projectId = selectedProject?.id ?? null
  const profiles = useProjectContextProfiles(projectId)
  const appliedPreservationRequestId = useRef<number | null>(null)
  const lastHandledRefreshSignal = useRef(0)
  const recommendedProjectIdRef = useRef<string | null>(null)
  const previousProjectId = useRef<string | null>(projectId)
  const requestedProjectIdRef = useRef<string | null>(null)
  const activePreservationRef = useRef<ActiveCompilerStatePreservation | null>(null)
  const selectedProfileId = draft.projectContextProfileId ?? null
  const transitionResolution = resolveCompilerProjectTransition({
    appliedRequestId: appliedPreservationRequestId.current,
    currentProjectId: projectId,
    previousProjectId: previousProjectId.current,
    request: compilerStatePreservationRequest,
  })
  const activePreservation = activePreservationRef.current
  const isPreservingProjectTransition =
    transitionResolution.kind === "preserve" || activePreservation?.targetProjectId === projectId
  const preservedUnavailableProfileId =
    activePreservation?.targetProjectId === projectId
      ? activePreservation.profileId
      : transitionResolution.kind === "preserve"
        ? selectedProfileId
        : null
  const previewProfileId = transitionResolution.kind === "reset" ? null : selectedProfileId
  const availableProfiles = useMemo(
    () =>
      profiles.profiles.filter((profile) => !deletedProjectContextProfileIds.includes(profile.id)),
    [deletedProjectContextProfileIds, profiles.profiles],
  )
  const { preview, previewError, previewStatus } = useProjectContextProfilePreview({
    deletedProfileIds: deletedProjectContextProfileIds,
    preservedUnavailableProfileId,
    profileId: previewProfileId,
    projectId,
    refreshSignal: projectContextProfileRefreshSignal,
  })
  useEffect(() => {
    if (transitionResolution.kind === "unchanged") {
      return
    }

    previousProjectId.current = projectId
    recommendedProjectIdRef.current = null
    requestedProjectIdRef.current = null
    onProjectTransition(transitionResolution)

    if (transitionResolution.kind === "preserve") {
      appliedPreservationRequestId.current = transitionResolution.request.requestId
      recommendedProjectIdRef.current = transitionResolution.request.targetProjectId
      activePreservationRef.current = {
        ...transitionResolution.request,
        profileId: selectedProfileId,
      }
      return
    }

    activePreservationRef.current = null
    const shouldResetThroughSelection =
      selectedProfileId !== null || draft.includeProjectContextProfile === true
    if (!shouldResetThroughSelection) {
      onIncludedProfileChanged()
    }

    setDraft(clearProjectContextProfileSelection)
  }, [
    draft.includeProjectContextProfile,
    onIncludedProfileChanged,
    onProjectTransition,
    projectId,
    selectedProfileId,
    setDraft,
    transitionResolution,
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
    if (isPreservingProjectTransition) {
      return
    }
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
  }, [
    availableProfiles,
    isPreservingProjectTransition,
    profiles.status,
    projectId,
    selectedProfileId,
    setDraft,
  ])

  useEffect(() => {
    if (selectedProfileId === null) {
      return
    }

    if (deletedProjectContextProfileIds.includes(selectedProfileId)) {
      setDraft(clearProjectContextProfileSelection)
    }
  }, [deletedProjectContextProfileIds, selectedProfileId, setDraft])

  function selectProfile(profileId: string | null): void {
    activePreservationRef.current = null
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

  function releasePreservedProjectContext(): void {
    activePreservationRef.current = null
  }

  return {
    error: profiles.error,
    includeProjectContextProfile: draft.includeProjectContextProfile === true,
    isSelectedProfileUnavailable: preservedUnavailableProfileId !== null,
    preview,
    previewError,
    previewStatus,
    profiles: availableProfiles,
    releasePreservedProjectContext,
    selectedProfileId,
    selectProfile,
    setIncludeProjectContextProfile,
    status: profiles.status,
  }
}
