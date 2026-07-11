import { useCallback, useEffect, useMemo, useState } from "react"

import type {
  CreateProjectContextProfileInput,
  ProjectContextProfile,
  UpdateProjectContextProfileInput,
} from "../../../electron/ipc-types"

export type ProjectContextProfilesStatus = "idle" | "loading" | "ready" | "error"

export function useProjectContextProfiles(projectId: string | null) {
  const [profiles, setProfiles] = useState<readonly ProjectContextProfile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [status, setStatus] = useState<ProjectContextProfilesStatus>("idle")
  const [error, setError] = useState<string | null>(null)

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  )

  useEffect(() => {
    setProfiles([])
    setSelectedProfileId(null)
    setStatus(projectId === null ? "ready" : "idle")
    setError(null)
  }, [projectId])

  useEffect(() => {
    if (selectedProfileId !== null && selectedProfile === null) {
      setSelectedProfileId(null)
    }
  }, [selectedProfile, selectedProfileId])

  const loadProfiles = useCallback(async (): Promise<void> => {
    if (projectId === null) {
      setProfiles([])
      setStatus("ready")
      setError(null)
      return
    }

    setStatus("loading")
    setError(null)

    try {
      const nextProfiles = await window.prompter.projectContextProfiles.list(projectId)
      setProfiles(nextProfiles)
      setStatus("ready")
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      setError(error.message)
      setStatus("error")
    }
  }, [projectId])

  function selectProfile(id: string | null): void {
    setSelectedProfileId(id)
  }

  const createProfile = useCallback(
    async (input: CreateProjectContextProfileInput): Promise<ProjectContextProfile> => {
      const profile = await window.prompter.projectContextProfiles.create(input)
      await loadProfiles()
      return profile
    },
    [loadProfiles],
  )

  const updateProfile = useCallback(
    async (
      profileId: string,
      input: UpdateProjectContextProfileInput,
    ): Promise<ProjectContextProfile> => {
      if (projectId === null) {
        throw new Error("Project is required to update a context profile.")
      }

      const profile = await window.prompter.projectContextProfiles.update(
        projectId,
        profileId,
        input,
      )
      await loadProfiles()
      return profile
    },
    [loadProfiles, projectId],
  )

  const duplicateProfile = useCallback(
    async (profileId: string): Promise<ProjectContextProfile> => {
      if (projectId === null) {
        throw new Error("Project is required to duplicate a context profile.")
      }

      const profile = await window.prompter.projectContextProfiles.duplicate(projectId, profileId)
      await loadProfiles()
      return profile
    },
    [loadProfiles, projectId],
  )

  const deleteProfile = useCallback(
    async (profileId: string): Promise<void> => {
      if (projectId === null) {
        throw new Error("Project is required to delete a context profile.")
      }

      await window.prompter.projectContextProfiles.delete(projectId, profileId)

      if (profileId === selectedProfileId) {
        setSelectedProfileId(null)
      }

      await loadProfiles()
    },
    [loadProfiles, projectId, selectedProfileId],
  )

  const setDefaultProfile = useCallback(
    async (profileId: string): Promise<ProjectContextProfile> => {
      if (projectId === null) {
        throw new Error("Project is required to set a default context profile.")
      }

      const profile = await window.prompter.projectContextProfiles.setDefault(projectId, profileId)
      await loadProfiles()
      return profile
    },
    [loadProfiles, projectId],
  )

  return {
    profiles,
    selectedProfileId,
    selectedProfile,
    status,
    error,
    loadProfiles,
    selectProfile,
    createProfile,
    updateProfile,
    duplicateProfile,
    deleteProfile,
    setDefaultProfile,
  }
}
