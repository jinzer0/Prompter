import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type {
  CreateProjectContextProfileInput,
  ProjectContextProfile,
  UpdateProjectContextProfileInput,
} from "../../../electron/ipc-types"

export type ProjectContextProfilesStatus = "idle" | "loading" | "ready" | "error"

export type ProjectContextProfilesLoadEvent =
  | { readonly kind: "load_started" }
  | { readonly kind: "load_succeeded"; readonly profiles: readonly ProjectContextProfile[] }
  | { readonly kind: "load_failed"; readonly message: string }

type ProjectContextProfilesList = (projectId: string) => Promise<readonly ProjectContextProfile[]>

export type ProjectContextProfilesLoader = {
  readonly dispose: () => void
  readonly load: (projectId: string) => Promise<void>
}

export function createProjectContextProfilesLoader(
  list: ProjectContextProfilesList,
  dispatch: (event: ProjectContextProfilesLoadEvent) => void,
): ProjectContextProfilesLoader {
  let generation = 0
  let isActive = true

  return {
    dispose(): void {
      isActive = false
    },
    async load(projectId): Promise<void> {
      if (!isActive) {
        return
      }

      generation += 1
      const requestGeneration = generation
      dispatch({ kind: "load_started" })

      try {
        const profiles = await list(projectId)
        if (isActive && requestGeneration === generation) {
          dispatch({ kind: "load_succeeded", profiles })
        }
      } catch (error) {
        if (!isActive || requestGeneration !== generation) {
          return
        }

        if (!(error instanceof Error)) {
          throw error
        }

        dispatch({ kind: "load_failed", message: error.message })
      }
    },
  }
}

function assertNever(event: never): never {
  throw new TypeError(`Unexpected project context profiles event: ${JSON.stringify(event)}`)
}

export function useProjectContextProfiles(projectId: string | null) {
  const [profiles, setProfiles] = useState<readonly ProjectContextProfile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [status, setStatus] = useState<ProjectContextProfilesStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const activeProjectIdRef = useRef(projectId)
  const loaderRef = useRef<ProjectContextProfilesLoader | null>(null)

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  )

  useEffect(() => {
    const loader = createProjectContextProfilesLoader(
      (requestedProjectId) => window.prompter.projectContextProfiles.list(requestedProjectId),
      (event) => {
        switch (event.kind) {
          case "load_started":
            setStatus("loading")
            setError(null)
            return
          case "load_succeeded":
            setProfiles(event.profiles)
            setStatus("ready")
            return
          case "load_failed":
            setError(event.message)
            setStatus("error")
            return
          default:
            return assertNever(event)
        }
      },
    )
    activeProjectIdRef.current = projectId
    loaderRef.current = loader
    setProfiles([])
    setSelectedProfileId(null)
    setStatus(projectId === null ? "ready" : "idle")
    setError(null)

    return () => {
      loader.dispose()
      loaderRef.current = null
    }
  }, [projectId])

  useEffect(() => {
    if (selectedProfileId !== null && selectedProfile === null) {
      setSelectedProfileId(null)
    }
  }, [selectedProfile, selectedProfileId])

  const loadProfiles = useCallback(async (): Promise<void> => {
    if (activeProjectIdRef.current !== projectId) {
      return
    }

    if (projectId === null) {
      setProfiles([])
      setStatus("ready")
      setError(null)
      return
    }

    const loader = loaderRef.current
    if (loader !== null) {
      await loader.load(projectId)
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
