import { useEffect, useRef, useState } from "react"

import type { Project, ProjectContextProfile } from "../../../electron/ipc-types"
import { useProjectContextProfiles } from "../hooks/use-project-context-profiles"
import type { NormalizedProjectContextProfileForm } from "../lib/project-context-profile-form"
import {
  ProjectContextProfileEditor,
  type ProjectContextProfileEditorMode,
} from "./project-context-profile-editor"
import { ProjectContextProfileSidebarSection } from "./project-context-profile-sidebar-section"
import { Button } from "./ui/button"
import { EmptyState } from "./ui/empty-state"

type DeleteConfirmation = {
  readonly id: string
  readonly name: string
}

type ProjectContextProfileManagerProps = {
  readonly selectedProject: Project | null
  readonly onProfilesChanged: (change?: ProjectContextProfileChange) => void
}

type ProjectContextProfileChange = {
  readonly changedProfileId?: string
  readonly deletedProfileId?: string
}

function confirmationFromProfile(profile: ProjectContextProfile | null): DeleteConfirmation | null {
  return profile === null ? null : { id: profile.id, name: profile.name }
}

export function ProjectContextProfileManager({
  onProfilesChanged,
  selectedProject,
}: ProjectContextProfileManagerProps) {
  const projectId = selectedProject?.id ?? null
  const profiles = useProjectContextProfiles(projectId)
  const [editorMode, setEditorMode] = useState<ProjectContextProfileEditorMode | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const previousProjectId = useRef(projectId)

  useEffect(() => {
    if (projectId !== null && profiles.status === "idle") {
      void profiles.loadProfiles()
    }
  }, [profiles.loadProfiles, profiles.status, projectId])

  useEffect(() => {
    if (previousProjectId.current !== projectId) {
      previousProjectId.current = projectId
      setEditorMode(null)
      setDeleteConfirmation(null)
    }
  }, [projectId])

  function startCreate(): void {
    setEditorMode("create")
    setDeleteConfirmation(null)
    profiles.selectProfile(null)
  }

  function selectProfile(id: string): void {
    setEditorMode("edit")
    setDeleteConfirmation(null)
    profiles.selectProfile(id)
  }

  async function createDefaultProfile(): Promise<void> {
    if (projectId === null) {
      return
    }

    const created = await profiles.createProfile({
      projectId,
      name: "Default Context",
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
      isDefault: true,
    })
    profiles.selectProfile(created.id)
    setEditorMode("edit")
    onProfilesChanged({ changedProfileId: created.id })
  }

  async function submitProfile(input: NormalizedProjectContextProfileForm): Promise<void> {
    if (projectId === null) {
      return
    }

    setIsSaving(true)

    try {
      if (editorMode === "create") {
        const created = await profiles.createProfile({ projectId, ...input.bridgeInput })
        profiles.selectProfile(created.id)
        setEditorMode("edit")
        onProfilesChanged({ changedProfileId: created.id })
        return
      }

      if (profiles.selectedProfile !== null) {
        const updated = await profiles.updateProfile(profiles.selectedProfile.id, input.bridgeInput)
        profiles.selectProfile(updated.id)
        onProfilesChanged({ changedProfileId: updated.id })
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function duplicateSelected(): Promise<void> {
    if (profiles.selectedProfileId === null) {
      return
    }

    const duplicated = await profiles.duplicateProfile(profiles.selectedProfileId)
    profiles.selectProfile(duplicated.id)
    setEditorMode("edit")
    setDeleteConfirmation(null)
    onProfilesChanged({ changedProfileId: duplicated.id })
  }

  async function setSelectedDefault(): Promise<void> {
    if (profiles.selectedProfileId === null) {
      return
    }

    const updated = await profiles.setDefaultProfile(profiles.selectedProfileId)
    profiles.selectProfile(updated.id)
    setEditorMode("edit")
    setDeleteConfirmation(null)
    onProfilesChanged({ changedProfileId: updated.id })
  }

  function requestDelete(): void {
    setDeleteConfirmation(confirmationFromProfile(profiles.selectedProfile))
  }

  async function confirmDelete(): Promise<void> {
    if (deleteConfirmation === null) {
      return
    }

    await profiles.deleteProfile(deleteConfirmation.id)
    onProfilesChanged({ deletedProfileId: deleteConfirmation.id })
    setDeleteConfirmation(null)
    setEditorMode(null)
  }

  if (selectedProject === null) {
    return (
      <section className="space-y-3" aria-labelledby="context-profiles-heading">
        <h2
          id="context-profiles-heading"
          className="text-[16px] font-semibold text-foreground"
          tabIndex={-1}
        >
          Context Profiles
        </h2>
        <EmptyState
          title="프로젝트를 선택하세요"
          description="Select a project before managing context profiles."
        />
      </section>
    )
  }

  return (
    <div className="min-w-0 space-y-3 overflow-hidden">
      <ProjectContextProfileSidebarSection
        error={profiles.error}
        profiles={profiles.profiles}
        selectedProfileId={profiles.selectedProfileId}
        status={profiles.status}
        onCreateDefault={() => void createDefaultProfile()}
        onDuplicateSelected={() => void duplicateSelected()}
        onNewProfile={startCreate}
        onRequestDelete={requestDelete}
        onSelectProfile={selectProfile}
        onSetDefaultSelected={() => void setSelectedDefault()}
      />

      {deleteConfirmation !== null && (
        <div className="space-y-3 rounded-card border border-border bg-panel-muted p-3">
          <p className="text-[13px] font-medium text-muted-strong">
            Delete {deleteConfirmation.name}?
          </p>
          <p className="text-[12px] leading-5 text-muted">
            This removes the project context profile for the selected project.
          </p>
          <div className="grid gap-2">
            <Button
              className="w-full"
              size="sm"
              variant="secondary"
              onClick={() => setDeleteConfirmation(null)}
            >
              Cancel Delete
            </Button>
            <Button
              aria-label="Confirm Delete Context Profile"
              className="w-full"
              size="sm"
              onClick={() => void confirmDelete()}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      )}

      {editorMode !== null && (
        <ProjectContextProfileEditor
          isSaving={isSaving}
          mode={editorMode}
          selectedProfile={profiles.selectedProfile}
          onCancel={() => setEditorMode(null)}
          onSubmit={submitProfile}
        />
      )}
    </div>
  )
}
