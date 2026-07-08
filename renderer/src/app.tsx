import { useEffect, useState } from "react"

import type { PingResponse } from "../../electron/bridge"
import { ProjectSidebarSection } from "./components/project-sidebar-section"
import { PromptCompilerPanel } from "./components/prompt-compiler-panel"
import { PromptLibraryPanel } from "./components/prompt-library-panel"
import { SidebarSection, sidebarSections } from "./components/shell/sidebar-section"
import { useProjectPrompts, useProjects } from "./hooks/use-prompter-library"

type PingState = PingResponse | "pending"

export function App() {
  const [pingResult, setPingResult] = useState<PingState>("pending")
  const projectLibrary = useProjects()
  const promptLibrary = useProjectPrompts(projectLibrary.selectedProject?.id ?? null)

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
          createPrompt={promptLibrary.createPrompt}
          error={promptLibrary.assetError}
          selectAsset={promptLibrary.selectAsset}
          selectedAsset={promptLibrary.selectedAsset}
          selectedProject={projectLibrary.selectedProject}
          status={promptLibrary.assetStatus}
        />
        <PromptCompilerPanel
          createPrompt={promptLibrary.createPrompt}
          currentVersion={promptLibrary.currentVersion}
          error={promptLibrary.versionError}
          selectedAsset={promptLibrary.selectedAsset}
          selectedProject={projectLibrary.selectedProject}
          status={promptLibrary.versionStatus}
        />
      </div>
    </main>
  )
}
