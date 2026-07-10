import { type FormEvent, useState } from "react"

import type { CreateProjectInput, Project } from "../../../electron/ipc-types"
import { parseDefaultAgent, targetAgentLabel, targetAgentOptions } from "../lib/prompter-options"
import { SidebarItem } from "./shell/sidebar-item"
import { Button } from "./ui/button"
import { EmptyState } from "./ui/empty-state"
import { Input } from "./ui/input"
import { Select } from "./ui/select"

type ProjectFormState = {
  readonly name: string
  readonly description: string
  readonly techStack: string
  readonly defaultAgent: Project["defaultAgent"]
}

type ProjectSidebarSectionProps = {
  readonly createProject: (input: CreateProjectInput) => Promise<Project>
  readonly error: string | null
  readonly projects: readonly Project[]
  readonly selectProject: (id: string) => void
  readonly selectedProject: Project | null
  readonly status: "loading" | "ready" | "error"
}

const emptyProjectForm: ProjectFormState = {
  name: "",
  description: "",
  techStack: "",
  defaultAgent: null,
}

function optionalField(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export function ProjectSidebarSection({
  createProject,
  error,
  projects,
  selectProject,
  selectedProject,
  status,
}: ProjectSidebarSectionProps) {
  const [form, setForm] = useState<ProjectFormState>(emptyProjectForm)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function submitProject(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const name = form.name.trim()

    if (name.length === 0) {
      setMessage("Project name is required")
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      await createProject({
        name,
        description: optionalField(form.description),
        techStack: optionalField(form.techStack),
        defaultAgent: form.defaultAgent,
      })
      setForm(emptyProjectForm)
      setIsFormOpen(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Project could not be saved")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-3" aria-labelledby="projects-heading">
      <div className="flex items-center justify-between">
        <h2 id="projects-heading" className="text-[16px] font-semibold text-foreground">
          Projects
        </h2>
        <Button
          data-menu-action-target="new-project"
          variant="ghost"
          size="sm"
          onClick={() => setIsFormOpen((isOpen) => !isOpen)}
        >
          New Project
        </Button>
      </div>

      {isFormOpen && (
        <form
          className="space-y-3 rounded-card border border-border bg-panel-muted p-3"
          onSubmit={submitProject}
        >
          <Input
            aria-label="Project name"
            placeholder="Project name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.currentTarget.value })}
          />
          <Input
            aria-label="Project description"
            placeholder="Project description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.currentTarget.value })}
          />
          <Input
            aria-label="Tech stack"
            placeholder="Tech stack"
            value={form.techStack}
            onChange={(event) => setForm({ ...form, techStack: event.currentTarget.value })}
          />
          <Select
            aria-label="Default agent"
            value={form.defaultAgent ?? ""}
            onChange={(event) =>
              setForm({ ...form, defaultAgent: parseDefaultAgent(event.currentTarget.value) })
            }
          >
            <option value="">No default agent</option>
            {targetAgentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          {message !== null && <p className="text-[12px] text-muted-strong">{message}</p>}
          {isSaving && <p className="text-[12px] text-muted">Saving project...</p>}
          <Button className="w-full" type="submit" disabled={isSaving}>
            Save Project
          </Button>
        </form>
      )}

      <div className="space-y-1">
        {status === "loading" && <p className="text-[12px] text-muted">Loading projects...</p>}
        {status === "error" && <p className="text-[12px] text-muted-strong">{error}</p>}
        {projects.map((project) => (
          <SidebarItem
            key={project.id}
            aria-current={project.id === selectedProject?.id ? "page" : undefined}
            onClick={() => selectProject(project.id)}
            variant={project.id === selectedProject?.id ? "active" : "default"}
          >
            <span>{project.name}</span>
            <span className="font-mono text-[11px] text-muted">
              {targetAgentLabel(project.defaultAgent)}
            </span>
          </SidebarItem>
        ))}
      </div>

      {status === "ready" && projects.length === 0 && (
        <EmptyState
          title="No projects yet"
          description="Create a project to start a DB-backed prompt library."
        />
      )}
    </section>
  )
}
