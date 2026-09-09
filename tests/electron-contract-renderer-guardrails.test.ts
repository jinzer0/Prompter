import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

import { createPersistenceIpcHandlers } from "../electron/ipc-handlers"
import {
  listFiles,
  validProjectContextProfileId,
  validProjectId,
} from "./electron-contract-helpers"
import { createFailingServices } from "./electron-contract-service-fixture"
import { readProductionSource } from "./source-guardrail-helpers"

describe("Electron shell contract", () => {
  it("returns safe compiler context warnings for cross-project profile ownership mismatches", () => {
    const inputs: { readonly projectId: string; readonly profileId: string }[] = []
    const crossProjectResult = {
      profileId: null,
      profileName: null,
      context: null,
      sectionNames: [],
      warnings: ["Selected project context profile is unavailable; profile context was excluded."],
    }
    const handlers = createPersistenceIpcHandlers({
      ...createFailingServices(() => undefined),
      buildCompilerContext: (input) => {
        inputs.push(input)
        return crossProjectResult
      },
    })

    expect(
      handlers.buildProjectContextForCompiler({
        projectId: validProjectId,
        profileId: validProjectContextProfileId,
      }),
    ).toEqual(crossProjectResult)
    expect(inputs).toEqual([{ projectId: validProjectId, profileId: validProjectContextProfileId }])
    expect(crossProjectResult.context).toBeNull()
    expect(JSON.stringify(crossProjectResult)).not.toContain("A safe project summary.")
  })

  it("keeps renderer source free of direct database, Node, OpenAI, and main-only quality imports", async () => {
    const rendererFiles = await listFiles("renderer/src")
    const sourceFiles = rendererFiles.filter((filePath) => /\.(ts|tsx)$/.test(filePath))
    const contents = await Promise.all(sourceFiles.map((filePath) => readFile(filePath, "utf8")))
    const rendererSource = contents.join("\n")

    expect(rendererSource).not.toContain("better-sqlite3")
    expect(rendererSource).not.toContain("drizzle-orm")
    expect(rendererSource).not.toContain('from "drizzle-orm"')
    expect(rendererSource).not.toContain('from "electron"')
    expect(rendererSource).not.toContain("from 'electron'")
    expect(rendererSource).not.toContain("electron/db")
    expect(rendererSource).not.toContain("ipcRenderer")
    expect(rendererSource).not.toContain("node:fs")
    expect(rendererSource).not.toContain("node:path")
    expect(rendererSource).not.toContain("node:crypto")
    expect(rendererSource).not.toContain("node:os")
    expect(rendererSource).not.toContain("node:child_process")
    expect(rendererSource).not.toContain("process.env")
    expect(rendererSource).not.toMatch(
      /from\s+["'][^"']*electron\/prompt-quality(?!-contract(?:\.js)?["'])[^"']*["']/,
    )
    expect(rendererSource).not.toMatch(/from\s+["']openai(?:\/[^"']*)?["']/)
  })

  it("keeps forbidden native shortcut, bridge event, quick-capture settings, and run storage surfaces out of production source", async () => {
    const productionSource = await readProductionSource()

    expect(productionSource).not.toContain("globalShortcut")
    expect(productionSource).not.toContain("appEvents")
    expect(productionSource).not.toContain("PromptRunSchema")
    expect(productionSource).not.toContain("ExecutionResultSchema")
    expect(productionSource).not.toContain("QuickCaptureSettingsSchema")
    expect(productionSource).not.toContain("RegisterGlobalShortcutInputSchema")
    expect(productionSource).not.toContain("window.prompter.appEvents")
    expect(productionSource).not.toContain("window.prompter.shortcuts")
    expect(productionSource).not.toContain("saveImprovedPromptAsNewVersion")
    expect(productionSource).not.toContain("navigator.clipboard")
    expect(productionSource).not.toContain("quick_capture_")
    expect(productionSource).not.toContain("quick_capture_settings")
    expect(productionSource).not.toContain("prompt_runs")
    expect(productionSource).not.toContain("agent_runs")
    expect(productionSource).not.toContain("execution_results")
    expect(productionSource).not.toContain("validation_results")
    expect(productionSource).not.toContain("run_logs")
  })

  it("allows repo path metadata while forbidding filesystem reads or scans from it", async () => {
    const productionSource = await readProductionSource(["electron", "renderer/src"])
    const repoPathReference = String.raw`\b(?:repoPath|repo_path)\b`

    expect(productionSource).toContain("repoPath")
    expect(productionSource).toContain("repo_path")
    expect(productionSource).not.toMatch(
      new RegExp(
        String.raw`\b(?:readFile|readdir|opendir|stat|access|glob)\s*\([^)]*${repoPathReference}`,
        "s",
      ),
    )
    expect(productionSource).not.toMatch(
      new RegExp(String.raw`\b(?:join|resolve)\s*\([^)]*${repoPathReference}`, "s"),
    )
    expect(productionSource).not.toMatch(
      new RegExp(String.raw`\b(?:scan|crawl|walk)\w*\s*\([^)]*${repoPathReference}`, "s"),
    )
  })

  it("keeps shell copy aligned with Phase 1 UI-only scope", async () => {
    const shellCopy = await Promise.all([
      readFile("renderer/src/app.tsx", "utf8"),
      readFile("renderer/src/components/shell/sidebar-section.tsx", "utf8"),
      readFile("renderer/src/components/prompt-library-panel.tsx", "utf8"),
      readFile("renderer/src/components/prompt-compiler-panel.tsx", "utf8"),
      readFile("DESIGN.md", "utf8"),
    ])
    const combinedCopy = shellCopy.join("\n")

    expect(combinedCopy).not.toContain("no editing or persistence")
    expect(combinedCopy).not.toContain("No variables, persistence, or model calls")
    expect(combinedCopy).not.toContain("Local prompt storage is ready")
    expect(combinedCopy).not.toContain("Empty persistence view")
    expect(combinedCopy).not.toContain("can persist once")
    expect(combinedCopy).not.toContain("persistence exists behind IPC")
    expect(combinedCopy).not.toContain("real storage exists")
    expect(combinedCopy).not.toContain("no data boundary exists")
  })
})
