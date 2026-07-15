import { useEffect, useState } from "react"

import type { BackupImportResult, PingResponse } from "../../electron/ipc-types"
import { HarnessTemplateManager } from "./components/harness-template-manager"
import { ProjectContextProfileManager } from "./components/project-context-profile-manager"
import { ProjectSidebarSection } from "./components/project-sidebar-section"
import { PromptCompilerPanel } from "./components/prompt-compiler-panel"
import { PromptLibraryPanel } from "./components/prompt-library-panel"
import { PromptTemplateManager } from "./components/prompt-template-manager"
import { SettingsPanel } from "./components/settings-panel"
import { SidebarSection, sidebarSections } from "./components/shell/sidebar-section"
import { useProjectPrompts, useProjects } from "./hooks/use-prompter-library"
import { handleMenuAction, handleMenuKeyDown } from "./lib/menu-actions"

type PingState = PingResponse | "pending"

type HarnessTemplateChange = {
  readonly deletedTemplateId?: string
}

type ProjectContextProfileChange = {
  readonly changedProfileId?: string
  readonly deletedProfileId?: string
}

export function App() {
  const [pingResult, setPingResult] = useState<PingState>("pending")
  const [tagRefreshSignal, setTagRefreshSignal] = useState(0)
  const [harnessTemplateRefreshSignal, setHarnessTemplateRefreshSignal] = useState(0)
  const [promptTemplateRefreshSignal, setPromptTemplateRefreshSignal] = useState(0)
  const [deletedHarnessTemplateIds, setDeletedHarnessTemplateIds] = useState<readonly string[]>([])
  const [projectContextProfileRefreshSignal, setProjectContextProfileRefreshSignal] = useState(0)
  const [changedProjectContextProfileId, setChangedProjectContextProfileId] = useState<
    string | null
  >(null)
  const [deletedProjectContextProfileIds, setDeletedProjectContextProfileIds] = useState<
    readonly string[]
  >([])
  const projectLibrary = useProjects()
  const promptLibrary = useProjectPrompts(projectLibrary.selectedProject?.id ?? null)

  function refreshPromptTags(): void {
    setTagRefreshSignal((current) => current + 1)
  }

  function refreshPromptTemplates(): void {
    setPromptTemplateRefreshSignal((current) => current + 1)
  }

  function recordHarnessTemplateChange(change: HarnessTemplateChange = {}): void {
    const deletedTemplateId = change.deletedTemplateId

    if (deletedTemplateId !== undefined) {
      setDeletedHarnessTemplateIds((current) =>
        current.includes(deletedTemplateId) ? current : [...current, deletedTemplateId],
      )
    }

    setHarnessTemplateRefreshSignal((current) => current + 1)
  }

  function recordProjectContextProfileChange(change: ProjectContextProfileChange = {}): void {
    const changedProfileId = change.changedProfileId
    const deletedProfileId = change.deletedProfileId

    setChangedProjectContextProfileId(changedProfileId ?? null)

    if (deletedProfileId !== undefined) {
      setDeletedProjectContextProfileIds((current) =>
        current.includes(deletedProfileId) ? current : [...current, deletedProfileId],
      )
    }

    setProjectContextProfileRefreshSignal((current) => current + 1)
  }

  async function refreshAfterBackupImport(_result: BackupImportResult): Promise<void> {
    await projectLibrary.reloadProjects({ preserveSelection: true })
    await promptLibrary.reloadAssets({ preserveSelection: true })
    refreshPromptTags()
    refreshPromptTemplates()
    recordHarnessTemplateChange()
    recordProjectContextProfileChange()
  }

  useEffect(() => {
    let isActive = true

    async function loadPing(): Promise<void> {
      const response = await window.prompter.ping()

      if (isActive) {
        setPingResult(response)
      }
    }

    void loadPing()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => window.prompter.menu.onAction(handleMenuAction), [])

  useEffect(() => {
    window.addEventListener("keydown", handleMenuKeyDown)
    return () => window.removeEventListener("keydown", handleMenuKeyDown)
  }, [])

  return (
    <main
      data-testid="app-shell"
      aria-label="Prompter shell"
      className="min-h-[100dvh] overflow-x-auto bg-shell p-6 text-foreground"
    >
      <div className="prompter-shell-grid grid min-h-[calc(100dvh-48px)] min-w-[var(--layout-shell-min)] gap-4">
        <aside
          data-testid="left-sidebar"
          aria-label="Projects, tags, and harnesses"
          className="flex flex-col rounded-panel border border-border-subtle bg-panel p-4 shadow-panel"
        >
          <div className="border-b border-border-subtle pb-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
              Prompter
            </p>
            <p className="mt-2 text-[14px] leading-5 text-muted-strong">Prompt workspace shell</p>
          </div>

          <div className="mt-5 flex flex-1 flex-col gap-5">
            <ProjectSidebarSection
              createProject={projectLibrary.createProject}
              error={projectLibrary.projectError}
              projects={projectLibrary.projects}
              selectProject={projectLibrary.selectProject}
              selectedProject={projectLibrary.selectedProject}
              status={projectLibrary.projectStatus}
            />
            <ProjectContextProfileManager
              selectedProject={projectLibrary.selectedProject}
              onProfilesChanged={recordProjectContextProfileChange}
            />
            <PromptTemplateManager
              refreshSignal={promptTemplateRefreshSignal}
              onTemplatesChanged={refreshPromptTemplates}
            />
            {sidebarSections.map((section) =>
              section.title === "Harnesses" ? (
                <HarnessTemplateManager
                  key={section.title}
                  onTemplatesChanged={recordHarnessTemplateChange}
                />
              ) : (
                <SidebarSection
                  key={section.title}
                  title={section.title}
                  emptyTitle={section.emptyTitle}
                  emptyDescription={section.emptyDescription}
                  items={section.items}
                />
              ),
            )}
            <SettingsPanel
              projects={projectLibrary.projects}
              selectedPromptAssetId={promptLibrary.selectedAsset?.id ?? null}
              selectedProjectId={projectLibrary.selectedProject?.id ?? null}
              onBackupImportComplete={refreshAfterBackupImport}
              onViewImportedProject={projectLibrary.selectProject}
            />
          </div>

          <div className="mt-5 rounded-card border border-border bg-panel-muted p-3 text-[12px] text-muted">
            Bridge status:{" "}
            <output data-testid="ping-result" className="font-mono text-success">
              {pingResult}
            </output>
          </div>
        </aside>

        <PromptLibraryPanel
          assets={promptLibrary.assets}
          currentVersionSummaries={promptLibrary.currentVersionSummaries}
          createPrompt={promptLibrary.createPrompt}
          error={promptLibrary.assetError}
          selectAsset={promptLibrary.selectAsset}
          selectedAsset={promptLibrary.selectedAsset}
          selectedProject={projectLibrary.selectedProject}
          status={promptLibrary.assetStatus}
          tagRefreshSignal={tagRefreshSignal}
          onTagsChanged={refreshPromptTags}
        />
        <PromptCompilerPanel
          assets={promptLibrary.assets}
          compareVersions={promptLibrary.compareVersions}
          createDerivedAsset={promptLibrary.createDerivedAsset}
          createNextVersion={promptLibrary.createNextVersion}
          createPrompt={promptLibrary.createPrompt}
          duplicateAsset={promptLibrary.duplicateAsset}
          changedProjectContextProfileId={changedProjectContextProfileId}
          currentVersion={promptLibrary.currentVersion}
          deletedHarnessTemplateIds={deletedHarnessTemplateIds}
          deletedProjectContextProfileIds={deletedProjectContextProfileIds}
          error={promptLibrary.versionError}
          harnessTemplateRefreshSignal={harnessTemplateRefreshSignal}
          projectContextProfileRefreshSignal={projectContextProfileRefreshSignal}
          promptTemplateRefreshSignal={promptTemplateRefreshSignal}
          selectedAsset={promptLibrary.selectedAsset}
          selectedVersion={promptLibrary.selectedVersion}
          selectedProject={projectLibrary.selectedProject}
          selectAsset={promptLibrary.selectAsset}
          selectVersion={promptLibrary.selectVersion}
          setCurrentVersion={promptLibrary.setCurrentVersion}
          status={promptLibrary.versionStatus}
          versions={promptLibrary.versions}
          onPromptTemplatesChanged={refreshPromptTemplates}
          onTagsChanged={refreshPromptTags}
        />
      </div>
    </main>
  )
}
