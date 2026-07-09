import { useCallback, useEffect, useMemo, useState } from "react"

import type { CreateProjectInput, Project } from "../../../electron/ipc-types"
import { errorMessage, type LoadStatus, selectedProjectId } from "./prompt-library-data"

export function useProjects() {
  const [projects, setProjects] = useState<readonly Project[]>([])
  const [projectStatus, setProjectStatus] = useState<LoadStatus>("loading")
  const [projectError, setProjectError] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    setProjectStatus("loading")
    setProjectError(null)

    try {
      const loadedProjects = await window.prompter.projects.list()
      setProjects(loadedProjects)
      setProjectId((current) => selectedProjectId(current, loadedProjects))
      setProjectStatus("ready")
    } catch (error) {
      setProjectError(errorMessage(error))
      setProjectStatus("error")
    }
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const createProject = useCallback(async (input: CreateProjectInput): Promise<Project> => {
    const project = await window.prompter.projects.create(input)
    setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)])
    setProjectId(project.id)
    return project
  }, [])

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? null,
    [projectId, projects],
  )

  return {
    createProject,
    projectError,
    projects,
    projectStatus,
    selectProject: setProjectId,
    selectedProject,
  }
}
