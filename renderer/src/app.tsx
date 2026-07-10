import { useEffect, useState } from "react"

import type { MenuAction } from "../../electron/app-menu"
import type { PingResponse } from "../../electron/bridge"
import { ProjectSidebarSection } from "./components/project-sidebar-section"
import { PromptCompilerPanel } from "./components/prompt-compiler-panel"
import { PromptLibraryPanel } from "./components/prompt-library-panel"
import { SettingsPanel } from "./components/settings-panel"
import { SidebarSection, sidebarSections } from "./components/shell/sidebar-section"
import { useProjectPrompts, useProjects } from "./hooks/use-prompter-library"

type PingState = PingResponse | "pending"

function assertNever(value: never): never {
  throw new Error(`Unhandled menu action: ${value}`)
}

function clickMenuTarget(target: string): void {
  const element = document.querySelector<HTMLElement>(`[data-menu-action-target="${target}"]`)

  if (element instanceof HTMLButtonElement && element.disabled) {
    return
  }

  element?.click()
}

function focusMenuTarget(target: string): void {
  const element = document.querySelector<HTMLElement>(`[data-menu-action-target="${target}"]`)
  element?.focus()
  element?.scrollIntoView({ block: "nearest" })
}

function handleMenuAction(action: MenuAction): void {
  switch (action) {
    case "newPrompt":
      clickMenuTarget("new-prompt")
      return
    case "newProject":
      clickMenuTarget("new-project")
      return
    case "quickCaptureFromClipboard":
      clickMenuTarget("quick-capture-from-clipboard")
      return
    case "focusSearch":
      focusMenuTarget("search-prompts")
      return
    case "savePrompt":
      clickMenuTarget("save-compiled-prompt")
      return
    case "copyCompiledPrompt":
      clickMenuTarget("copy-compiled-prompt")
      return
    case "exportPrompt":
      clickMenuTarget("save-compiled-export")
      return
    case "openSettings":
      focusMenuTarget("settings-panel")
      return
    case "closeActivePanel":
      document.activeElement instanceof HTMLElement && document.activeElement.blur()
      return
    default:
      assertNever(action)
  }
}

function handleMenuKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented) {
    return
  }

  if (event.key.toLowerCase() === "v" && event.shiftKey && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    handleMenuAction("quickCaptureFromClipboard")
    return
  }

  if (event.key !== "Escape") {
    return
  }

  handleMenuAction("closeActivePanel")
}

export function App() {
  const [pingResult, setPingResult] = useState<PingState>("pending")
  const [tagRefreshSignal, setTagRefreshSignal] = useState(0)
  const projectLibrary = useProjects()
  const promptLibrary = useProjectPrompts(projectLibrary.selectedProject?.id ?? null)

  function refreshPromptTags(): void {
    setTagRefreshSignal((current) => current + 1)
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
            {sidebarSections.map((section) => (
              <SidebarSection
                key={section.title}
                title={section.title}
                emptyTitle={section.emptyTitle}
                emptyDescription={section.emptyDescription}
                items={section.items}
              />
            ))}
            <SettingsPanel />
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
          compareVersions={promptLibrary.compareVersions}
          createNextVersion={promptLibrary.createNextVersion}
          createPrompt={promptLibrary.createPrompt}
          currentVersion={promptLibrary.currentVersion}
          error={promptLibrary.versionError}
          selectedAsset={promptLibrary.selectedAsset}
          selectedVersion={promptLibrary.selectedVersion}
          selectedProject={projectLibrary.selectedProject}
          selectVersion={promptLibrary.selectVersion}
          setCurrentVersion={promptLibrary.setCurrentVersion}
          status={promptLibrary.versionStatus}
          versions={promptLibrary.versions}
          onTagsChanged={refreshPromptTags}
        />
      </div>
    </main>
  )
}
