import { useEffect, useState } from "react"
import { flushSync } from "react-dom"

import type { BackupImportResult } from "../../../../electron/ipc-types"
import { useInsightsWorkspaceNavigation } from "../../hooks/use-insights-workspace-navigation"
import { useProjectPrompts, useProjects } from "../../hooks/use-prompter-library"
import { OPEN_LIBRARY_EVENT, OPEN_SETTINGS_EVENT } from "../../lib/menu-actions"
import { navigateToPrivacyFinding } from "../../lib/privacy-navigation"
import type { CompilerMemory } from "../../lib/prompt-compiler/compiler-memory"
import { HarnessTemplateManager } from "../harness-template-manager"
import { InsightsDashboard } from "../insights/insights-dashboard"
import { PrivacyCenter } from "../privacy/privacy-center"
import { ProjectContextProfileManager } from "../project-context-profile-manager"
import { ProjectSidebarSection } from "../project-sidebar-section"
import { PromptCompilerPanel } from "../prompt-compiler-panel"
import { usePromptEditorContext } from "../prompt-editor-provider"
import { PromptLibraryPanel } from "../prompt-library-panel"
import { PromptTemplateManager } from "../prompt-template-manager"
import { SettingsWorkspace } from "../settings-workspace"
import { Button } from "../ui/button"
import { SidebarItem } from "./sidebar-item"
import { WorkspaceViewNavigation } from "./workspace-view-navigation"

type HarnessTemplateChange = {
  readonly deletedTemplateId?: string
}

type ProjectContextProfileChange = {
  readonly changedProfileId?: string
  readonly deletedProfileId?: string
}

type AppShellProps = {
  readonly compilerMemory: CompilerMemory
  readonly onAppLockStateChange: () => Promise<void>
}

export function AppShell({ compilerMemory, onAppLockStateChange }: AppShellProps) {
  const editor = usePromptEditorContext()
  const [restoredSelection] = useState(() => editor.store.getSnapshot().selection)
  const [tagRefreshSignal, setTagRefreshSignal] = useState(0)
  const [harnessTemplateRefreshSignal, setHarnessTemplateRefreshSignal] = useState(0)
  const [promptTemplateRefreshSignal, setPromptTemplateRefreshSignal] = useState(0)
  const [settingsRefreshSignal, setSettingsRefreshSignal] = useState(0)
  const [deletedHarnessTemplateIds, setDeletedHarnessTemplateIds] = useState<readonly string[]>([])
  const [projectContextProfileRefreshSignal, setProjectContextProfileRefreshSignal] = useState(0)
  const [changedProjectContextProfileId, setChangedProjectContextProfileId] = useState<
    string | null
  >(null)
  const [deletedProjectContextProfileIds, setDeletedProjectContextProfileIds] = useState<
    readonly string[]
  >([])
  const projectLibrary = useProjects(restoredSelection?.project.id ?? null)
  const promptLibrary = useProjectPrompts(
    projectLibrary.selectedProject?.id ?? null,
    restoredSelection === null
      ? null
      : {
          projectId: restoredSelection.project.id,
          assetId: restoredSelection.asset.id,
          versionId: restoredSelection.version.id,
        },
  )
  const insightsNavigation = useInsightsWorkspaceNavigation({
    selectAsset: promptLibrary.selectAsset,
    selectProject: projectLibrary.selectProject,
    selectVersion: promptLibrary.selectVersion,
    snapshot: {
      assetIds: promptLibrary.assets.map((asset) => asset.id),
      assetStatus: promptLibrary.assetStatus,
      selectedAssetId: promptLibrary.selectedAsset?.id ?? null,
      selectedProjectId: projectLibrary.selectedProject?.id ?? null,
      selectedVersionId: promptLibrary.selectedVersion?.id ?? null,
      versionIds: promptLibrary.versions.map((version) => version.id),
      versionStatus: promptLibrary.versionStatus,
    },
  })

  const refreshPromptTags = () => setTagRefreshSignal((current) => current + 1)
  const refreshPromptTemplates = () => setPromptTemplateRefreshSignal((current) => current + 1)

  useEffect(
    () =>
      editor.registerRefresh(async (result) => {
        const selection = editor.store.getSnapshot().selection
        const select =
          selection?.asset.id === result.asset.id && selection.version.id === result.version.id
        await promptLibrary.refreshPersistedPrompt(result, select)
        await window.prompter.search.rebuildIndex()
        setTagRefreshSignal((current) => current + 1)
      }),
    [editor.registerRefresh, editor.store, promptLibrary.refreshPersistedPrompt],
  )

  useEffect(() => {
    if (insightsNavigation.isNavigationPending) return
    const project = projectLibrary.selectedProject
    const asset = promptLibrary.selectedAsset
    const version = promptLibrary.selectedVersion
    if (
      project === null ||
      asset === null ||
      version === null ||
      promptLibrary.versionStatus !== "ready"
    )
      return
    const current = editor.snapshot.selection
    if (current?.asset.id === asset.id && current.version.id === version.id) return
    if (
      current?.asset.id === asset.id &&
      editor.snapshot.lastSaved?.version.id === current.version.id &&
      current.version.id !== version.id
    )
      return
    editor.store.select({ project, asset, version })
  }, [
    editor.store,
    editor.snapshot.selection,
    editor.snapshot.lastSaved,
    insightsNavigation.isNavigationPending,
    projectLibrary.selectedProject,
    promptLibrary.selectedAsset,
    promptLibrary.selectedVersion,
    promptLibrary.versionStatus,
  ])

  function selectProject(id: string): void {
    if (projectLibrary.selectedProject?.id === id) {
      insightsNavigation.openLibrary()
      return
    }
    void editor.requestTransition(() => {
      editor.store.select(null)
      insightsNavigation.openLibrary()
      projectLibrary.selectProject(id)
    })
  }

  function selectAsset(id: string): void {
    if (
      promptLibrary.selectedAsset?.id === id &&
      promptLibrary.selectedVersion?.id === promptLibrary.currentVersion?.id
    )
      return
    void editor.requestTransition(() => {
      editor.store.select(null)
      promptLibrary.selectAsset(id)
    })
  }

  function selectVersion(id: string): void {
    if (promptLibrary.selectedVersion?.id === id) return
    void editor.requestTransition(() => {
      editor.store.select(null)
      promptLibrary.selectVersion(id)
    })
  }

  const navigate: typeof insightsNavigation.navigate = (intent) => {
    const changesSelection =
      ("projectId" in intent && intent.projectId !== projectLibrary.selectedProject?.id) ||
      ("promptAssetId" in intent && intent.promptAssetId !== promptLibrary.selectedAsset?.id) ||
      ("promptVersionId" in intent &&
        intent.promptVersionId !== null &&
        intent.promptVersionId !== promptLibrary.selectedVersion?.id)
    if (!changesSelection) {
      insightsNavigation.navigate(intent)
      return
    }
    void editor.requestTransition(() => {
      editor.store.select(null)
      insightsNavigation.navigate(intent)
    })
  }

  async function guardedCreation<T extends object>(action: () => Promise<T>): Promise<T> {
    let result: T | undefined
    const proceeded = await editor.requestTransition(async () => {
      result = await action()
    })
    if (!proceeded || result === undefined)
      throw new Error("작업을 취소했습니다. 기존 편집 내용은 유지됩니다.")
    return result
  }

  const createPrompt: typeof promptLibrary.createPrompt = (input) =>
    guardedCreation(() => promptLibrary.createPrompt(input))
  const createDerivedAsset: typeof promptLibrary.createDerivedAsset = (input) =>
    guardedCreation(() => promptLibrary.createDerivedAsset(input))
  const createNextVersion: typeof promptLibrary.createNextVersion = (input) =>
    guardedCreation(async () => {
      const version = await promptLibrary.createNextVersion(input)
      editor.store.select(null)
      return version
    })
  const createProject: typeof projectLibrary.createProject = (input) =>
    guardedCreation(async () => {
      const project = await projectLibrary.createProject(input)
      editor.store.select(null)
      return project
    })

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
    setSettingsRefreshSignal((current) => current + 1)
  }

  useEffect(() => {
    const openSettings = () => flushSync(() => insightsNavigation.openSettings())
    const openLibrary = () => flushSync(() => insightsNavigation.openLibrary())
    window.addEventListener(OPEN_SETTINGS_EVENT, openSettings)
    window.addEventListener(OPEN_LIBRARY_EVENT, openLibrary)
    return () => {
      window.removeEventListener(OPEN_SETTINGS_EVENT, openSettings)
      window.removeEventListener(OPEN_LIBRARY_EVENT, openLibrary)
    }
  }, [insightsNavigation.openSettings, insightsNavigation.openLibrary])

  return (
    <main
      data-testid="app-shell"
      aria-label="Prompter"
      className="h-full min-h-0 min-w-0 bg-shell text-foreground"
    >
      <div className="prompter-shell-grid grid h-full min-h-0 min-w-0">
        <aside
          data-testid="left-sidebar"
          aria-label="프로젝트 및 작업 공간 탐색"
          className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-border-subtle bg-panel-elevated p-4"
        >
          <div className="shrink-0 border-b border-border-subtle pb-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
              Prompter
            </p>
            <SidebarItem
              onClick={insightsNavigation.openLibrary}
              aria-current={insightsNavigation.workspaceView === "library" ? "page" : undefined}
            >
              Library
            </SidebarItem>
            <WorkspaceViewNavigation
              onOpenInsights={insightsNavigation.openInsights}
              onOpenPrivacy={insightsNavigation.openPrivacy}
              workspaceView={insightsNavigation.workspaceView}
            />
          </div>

          <div className="mt-5 flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto">
            <ProjectSidebarSection
              createProject={createProject}
              error={projectLibrary.projectError}
              projects={projectLibrary.projects}
              selectProject={selectProject}
              selectedProject={projectLibrary.selectedProject}
              status={projectLibrary.projectStatus}
            />
            <nav aria-label="관리">
              <SidebarItem
                onClick={() => insightsNavigation.openManager("context")}
                aria-current={insightsNavigation.workspaceView === "context" ? "page" : undefined}
              >
                컨텍스트 관리
              </SidebarItem>
              <SidebarItem
                onClick={() => insightsNavigation.openManager("templates")}
                aria-current={insightsNavigation.workspaceView === "templates" ? "page" : undefined}
              >
                템플릿 관리
              </SidebarItem>
              <SidebarItem
                onClick={() => insightsNavigation.openManager("harnesses")}
                aria-current={insightsNavigation.workspaceView === "harnesses" ? "page" : undefined}
              >
                하네스 관리
              </SidebarItem>
            </nav>
          </div>

          <div className="mt-5 shrink-0 border-t border-border-subtle pt-3">
            <SidebarItem
              data-menu-action-target="open-settings"
              onClick={insightsNavigation.openSettings}
              aria-current={insightsNavigation.workspaceView === "settings" ? "page" : undefined}
            >
              설정…
            </SidebarItem>
          </div>
        </aside>

        <div
          className={
            insightsNavigation.workspaceView === "library"
              ? "prompter-library-panels contents"
              : "prompter-library-panels hidden"
          }
        >
          <PromptLibraryPanel
            assets={promptLibrary.assets}
            currentVersionSummaries={promptLibrary.currentVersionSummaries}
            createPrompt={createPrompt}
            error={promptLibrary.assetError}
            selectAsset={selectAsset}
            selectedAsset={promptLibrary.selectedAsset}
            selectedProject={projectLibrary.selectedProject}
            status={promptLibrary.assetStatus}
            tagRefreshSignal={tagRefreshSignal}
            tagRequest={insightsNavigation.tagRequest}
            onTagsChanged={refreshPromptTags}
          />
          <PromptCompilerPanel
            compilerMemory={compilerMemory}
            assets={promptLibrary.assets}
            compareVersions={promptLibrary.compareVersions}
            createDerivedAsset={createDerivedAsset}
            createNextVersion={createNextVersion}
            createPrompt={createPrompt}
            changedProjectContextProfileId={changedProjectContextProfileId}
            compilerStatePreservationRequest={insightsNavigation.statePreservationRequest}
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
            selectAsset={selectAsset}
            selectVersion={selectVersion}
            setCurrentVersion={promptLibrary.setCurrentVersion}
            status={promptLibrary.versionStatus}
            versions={promptLibrary.versions}
            onOpenManager={insightsNavigation.openManager}
            onPromptTemplatesChanged={refreshPromptTemplates}
            onTagsChanged={refreshPromptTags}
          />
        </div>
        <SettingsWorkspace
          active={insightsNavigation.workspaceView === "settings"}
          onBackToLibrary={insightsNavigation.openLibrary}
          onOpenPrivacy={insightsNavigation.openPrivacy}
          appLockBridge={window.prompter.appLock}
          projects={projectLibrary.projects}
          refreshSignal={settingsRefreshSignal}
          selectedPromptAssetId={promptLibrary.selectedAsset?.id ?? null}
          selectedProjectId={projectLibrary.selectedProject?.id ?? null}
          onBackupImportComplete={refreshAfterBackupImport}
          onViewImportedProject={(id) => navigate({ kind: "project", projectId: id })}
          onAppLockStateChange={onAppLockStateChange}
        />
        <section
          hidden={insightsNavigation.workspaceView !== "context"}
          data-testid="context-workspace"
          className="col-span-2 min-h-0 min-w-0 overflow-y-auto bg-panel p-4"
        >
          <Button variant="secondary" onClick={insightsNavigation.openLibrary}>
            라이브러리로 돌아가기
          </Button>
          <ProjectContextProfileManager
            selectionRequest={insightsNavigation.contextProfileRequest}
            selectedProject={projectLibrary.selectedProject}
            onProfilesChanged={recordProjectContextProfileChange}
          />
        </section>
        <section
          hidden={insightsNavigation.workspaceView !== "templates"}
          data-testid="templates-workspace"
          className="col-span-2 min-h-0 min-w-0 overflow-y-auto bg-panel p-4"
        >
          <Button variant="secondary" onClick={insightsNavigation.openLibrary}>
            라이브러리로 돌아가기
          </Button>
          <PromptTemplateManager
            refreshSignal={promptTemplateRefreshSignal}
            selectionRequest={insightsNavigation.promptTemplateRequest}
            onTemplatesChanged={refreshPromptTemplates}
          />
        </section>
        <section
          hidden={insightsNavigation.workspaceView !== "harnesses"}
          data-testid="harnesses-workspace"
          className="col-span-2 min-h-0 min-w-0 overflow-y-auto bg-panel p-4"
        >
          <Button variant="secondary" onClick={insightsNavigation.openLibrary}>
            라이브러리로 돌아가기
          </Button>
          <HarnessTemplateManager
            selectionRequest={insightsNavigation.harnessTemplateRequest}
            onTemplatesChanged={recordHarnessTemplateChange}
          />
        </section>
        {insightsNavigation.workspaceView === "insights" && (
          <section
            data-testid="insights-workspace"
            className="prompter-workspace col-span-2 h-full min-h-0 min-w-0"
          >
            <InsightsDashboard
              projects={projectLibrary.projects}
              onBackToLibrary={insightsNavigation.openLibrary}
              onNavigate={navigate}
            />
          </section>
        )}
        {insightsNavigation.workspaceView === "privacy" && (
          <section
            data-testid="privacy-workspace"
            className="prompter-workspace col-span-2 h-full min-h-0 min-w-0"
          >
            <PrivacyCenter
              onBackToLibrary={insightsNavigation.openLibrary}
              onNavigate={(location) =>
                void navigateToPrivacyFinding(location, {
                  navigate,
                  openSettings: insightsNavigation.openSettings,
                  projectIds: projectLibrary.projects.map((project) => project.id),
                })
              }
            />
          </section>
        )}
      </div>
    </main>
  )
}
