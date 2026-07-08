import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { createElectronBridge, PING_RESPONSE } from "../electron/bridge"
import { createPersistenceIpcHandlers } from "../electron/ipc-handlers"
import { createWindowOptions } from "../electron/window-options"

async function listFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const paths = await Promise.all(
    entries.map((entry) => {
      const filePath = join(directory, entry.name)

      if (entry.isDirectory()) {
        return listFiles(filePath)
      }

      return Promise.resolve([filePath])
    }),
  )

  return paths.flat()
}

const validPromptAssetId = "11111111-1111-4111-8111-111111111111"

function createFailingServices(onServiceCall: () => void) {
  return {
    createProject: () => {
      onServiceCall()
      throw new Error("repository should not be called")
    },
    listProjects: () => [],
    getProject: () => null,
    updateProject: () => {
      throw new Error("unused service")
    },
    deleteProject: (id: string) => ({ id }),
    createPromptAsset: () => {
      throw new Error("unused service")
    },
    listPromptAssets: () => [],
    getPromptAsset: () => null,
    updatePromptAsset: () => {
      throw new Error("unused service")
    },
    deletePromptAsset: (id: string) => ({ id }),
    createPromptVersion: () => {
      onServiceCall()
      throw new Error("repository should not be called")
    },
    listPromptVersions: () => [],
    getPromptVersion: () => null,
    setCurrentPromptVersion: () => {
      throw new Error("unused service")
    },
    createTag: () => {
      throw new Error("unused service")
    },
    listTags: () => [],
    updateTag: () => {
      throw new Error("unused service")
    },
    deleteTag: (id: string) => ({ id }),
    attachTagToPrompt: (promptAssetId: string, tagId: string) => ({ promptAssetId, tagId }),
    detachTagFromPrompt: (promptAssetId: string, tagId: string) => ({ promptAssetId, tagId }),
    createHarnessTemplate: () => {
      throw new Error("unused service")
    },
    listHarnessTemplates: () => [],
    getHarnessTemplate: () => null,
    updateHarnessTemplate: () => {
      throw new Error("unused service")
    },
    deleteHarnessTemplate: (id: string) => ({ id }),
    getSetting: () => null,
    setSetting: (key: string, value: string) => ({ key, value, updatedAt: 1 }),
    listSettings: () => [],
  }
}

describe("Electron shell contract", () => {
  it("uses secure BrowserWindow defaults for the main window", () => {
    const preloadPath = "/tmp/prompter-preload.js"

    const options = createWindowOptions(preloadPath)

    expect(options.webPreferences).toMatchObject({
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    })
  })

  it("exposes only grouped typed ping and persistence bridge methods", async () => {
    const bridge = createElectronBridge(async (channel) => {
      if (channel === "prompter:ping") {
        return PING_RESPONSE
      }

      if (channel === "prompter:projects:list") {
        return []
      }

      if (channel === "prompter:settings:get") {
        return null
      }

      throw new Error(`Unexpected channel ${channel}`)
    })

    await expect(bridge.ping()).resolves.toBe(PING_RESPONSE)
    expect(Object.keys(bridge)).toEqual([
      "ping",
      "projects",
      "prompts",
      "tags",
      "harnessTemplates",
      "settings",
    ])
    expect(Object.keys(bridge.projects)).toEqual(["create", "list", "get", "update", "delete"])
    expect(Object.keys(bridge.prompts)).toEqual([
      "createAsset",
      "listAssets",
      "getAsset",
      "updateAsset",
      "deleteAsset",
      "createVersion",
      "listVersions",
      "getVersion",
      "setCurrentVersion",
    ])
    expect(Object.keys(bridge.tags)).toEqual([
      "create",
      "list",
      "update",
      "delete",
      "attachToPrompt",
      "detachFromPrompt",
    ])
    expect(Object.keys(bridge.harnessTemplates)).toEqual([
      "create",
      "list",
      "get",
      "update",
      "delete",
    ])
    expect(Object.keys(bridge.settings)).toEqual(["get", "set", "list"])
    await expect(bridge.projects.list()).resolves.toEqual([])
    await expect(bridge.settings.get("missing")).resolves.toBeNull()
  })

  it("rejects malformed IPC payloads before repository calls", () => {
    let called = false
    const handlers = createPersistenceIpcHandlers(
      createFailingServices(() => {
        called = true
      }),
    )

    expect(() => handlers.createProject({ name: "" })).toThrow()
    expect(() =>
      handlers.createPromptAsset({
        title: "Bad",
        scenario: "unknown",
        targetAgent: "codex",
      }),
    ).toThrow(/scenario/)
    expect(() =>
      handlers.createPromptVersion({
        promptAssetId: validPromptAssetId,
        originalInput: "",
        compiledPrompt: "Compiled prompt",
      }),
    ).toThrow(/originalInput/)
    expect(() =>
      handlers.createPromptVersion({
        promptAssetId: validPromptAssetId,
        originalInput: "Original input",
        compiledPrompt: "   ",
      }),
    ).toThrow(/compiledPrompt/)
    expect(called).toBe(false)
  })

  it("keeps renderer source free of direct database and Node access", async () => {
    const rendererFiles = await listFiles("renderer/src")
    const sourceFiles = rendererFiles.filter((filePath) => /\.(ts|tsx)$/.test(filePath))
    const contents = await Promise.all(sourceFiles.map((filePath) => readFile(filePath, "utf8")))
    const rendererSource = contents.join("\n")

    expect(rendererSource).not.toContain("better-sqlite3")
    expect(rendererSource).not.toContain("drizzle-orm")
    expect(rendererSource).not.toContain("electron/db")
    expect(rendererSource).not.toContain("ipcRenderer")
    expect(rendererSource).not.toContain("node:fs")
    expect(rendererSource).not.toContain("node:path")
    expect(rendererSource).not.toContain("process.env")
  })

  it("keeps Phase 2 scope free of execution and LLM storage", async () => {
    const files = await listFiles("electron")
    const sourceFiles = files.filter((filePath) => /\.(ts|tsx)$/.test(filePath))
    const contents = await Promise.all(sourceFiles.map((filePath) => readFile(filePath, "utf8")))
    const mainSource = contents.join("\n")

    expect(mainSource).not.toContain("prompt_runs")
    expect(mainSource).not.toContain("agent_runs")
    expect(mainSource).not.toContain("execution_results")
    expect(mainSource).not.toContain("validation_results")
    expect(mainSource).not.toContain("run_logs")
    expect(mainSource).not.toContain("openai")
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
