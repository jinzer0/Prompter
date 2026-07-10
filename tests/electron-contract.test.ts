import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

import {
  createApplicationMenuTemplate,
  MENU_ACTION_CHANNEL,
  MENU_ACTIONS,
  menuActionSchema,
} from "../electron/app-menu"
import { createElectronBridge, PING_RESPONSE } from "../electron/bridge"
import { PERSISTENCE_CHANNELS } from "../electron/ipc-contract"
import { createPersistenceIpcHandlers } from "../electron/ipc-handlers"
import { createWindowOptions } from "../electron/window-options"
import { createFailingServices, listFiles, validPromptAssetId } from "./electron-contract-helpers"

// allow: SIZE_OK - central Electron shell contract covers bridge, IPC validation, and renderer boundaries.

const validPromptVersionId = "22222222-2222-4222-8222-222222222222"
const comparePromptVersionId = "33333333-3333-4333-8333-333333333333"
const promptAssetResponse = {
  id: validPromptAssetId,
  projectId: null,
  title: "Versioned Prompt",
  scenario: "feature",
  targetAgent: "codex",
  currentVersionId: validPromptVersionId,
  parentPromptId: null,
  createdAt: 1,
  updatedAt: 2,
} as const
const promptVersionResponse = {
  id: validPromptVersionId,
  promptAssetId: validPromptAssetId,
  versionNumber: 1,
  originalInput: "Original request",
  compiledPrompt: "Compiled prompt",
  assumptions: null,
  questions: null,
  answers: null,
  acceptanceCriteria: null,
  validationCommands: null,
  qualityScore: null,
  createdAt: 1,
} as const
const compareVersionResponse = {
  ...promptVersionResponse,
  id: comparePromptVersionId,
  versionNumber: 2,
  compiledPrompt: "Compiled prompt\nwith changes",
} as const
type MenuTemplateItem = ReturnType<typeof createApplicationMenuTemplate>[number]

function findMenuItem(items: readonly MenuTemplateItem[], label: string): MenuTemplateItem {
  for (const item of items) {
    if (item.label === label) {
      return item
    }

    if (Array.isArray(item.submenu)) {
      const nested = item.submenu.find((submenuItem) => submenuItem.label === label)
      if (nested !== undefined) {
        return nested
      }
    }
  }

  throw new Error(`Menu item not found: ${label}`)
}

function findMenuRole(items: readonly MenuTemplateItem[], role: string): MenuTemplateItem {
  for (const item of items) {
    if (item.role === role) {
      return item
    }

    if (Array.isArray(item.submenu)) {
      const nested = item.submenu.find((submenuItem) => submenuItem.role === role)
      if (nested !== undefined) {
        return nested
      }
    }
  }

  throw new Error(`Menu role not found: ${role}`)
}

function clickMenuItem(item: MenuTemplateItem): void {
  const click = item.click

  if (click === undefined) {
    throw new Error(`Menu item has no click handler: ${item.label ?? item.role ?? "unknown"}`)
  }

  Reflect.apply(click, undefined, [])
}

describe("Electron shell contract", () => {
  it("defines macOS packaging scripts with native and migration safeguards", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      readonly scripts?: Record<string, string>
    }
    const packageScript = await readFile("scripts/package-macos.mjs", "utf8")
    const zipTemplate = ["darwin-", "{process.arch}.zip"].join("$")

    expect(packageJson.scripts?.["package"]).toBe("npm run build && node scripts/package-macos.mjs")
    expect(packageJson.scripts?.["make"]).toBe("npm run package")
    expect(packageScript).toContain("com.local.prompter")
    expect(packageScript).toContain("Prompter.app")
    expect(packageScript).toContain(zipTemplate)
    expect(packageScript).toContain("CFBundleExecutable")
    expect(packageScript).toContain('"Contents", "MacOS", "Electron"')
    expect(packageScript).toContain("better-sqlite3")
    expect(packageScript).toContain("drizzle")
    expect(packageScript).toContain("unsigned")
    expect(packageScript).not.toContain('replaceAll("Electron", appName)')
  })

  it("maps menu shortcuts to the intended renderer targets", async () => {
    const appSource = await readFile("renderer/src/app.tsx", "utf8")
    const compilerSource = await readFile(
      "renderer/src/components/prompt-compiler-panel.tsx",
      "utf8",
    )
    const saveTargetIndex = compilerSource.indexOf('data-menu-action-target="save-compiled-prompt"')
    const analyzeHandlerIndex = compilerSource.indexOf("onClick={compiler.analyzeWithLLM}")
    const saveHandlerIndex = compilerSource.indexOf("onClick={compiler.savePrompt}")

    expect(saveTargetIndex).toBeGreaterThan(analyzeHandlerIndex)
    expect(saveHandlerIndex).toBeGreaterThan(saveTargetIndex)
    expect(appSource).toContain('event.key !== "Escape"')
    expect(appSource).toContain('handleMenuAction("closeActivePanel")')
    expect(appSource).toContain('window.addEventListener("keydown", handleMenuKeyDown)')
  })

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

  it("defines the narrow main-to-renderer menu action channel", () => {
    expect(MENU_ACTION_CHANNEL).toBe("prompter:menu-action")
    expect(MENU_ACTIONS).toEqual([
      "newPrompt",
      "newProject",
      "focusSearch",
      "savePrompt",
      "copyCompiledPrompt",
      "exportPrompt",
      "openSettings",
      "closeActivePanel",
    ])
    expect(menuActionSchema.parse("focusSearch")).toBe("focusSearch")
    expect(() => menuActionSchema.parse("runPrompt")).toThrow()
  })

  it("routes macOS menu accelerators through narrow renderer actions", () => {
    const actions: string[] = []
    const template = createApplicationMenuTemplate({
      isDevelopment: false,
      isMac: true,
      sendAction: (action) => actions.push(action),
    })

    expect(template.map((item) => item.label)).toEqual([
      "Prompter",
      "File",
      "Edit",
      "View",
      "Window",
      "Help",
    ])
    expect(findMenuItem(template, "New Prompt").accelerator).toBe("CmdOrCtrl+N")
    expect(findMenuItem(template, "New Project").accelerator).toBe("CmdOrCtrl+Shift+N")
    expect(findMenuItem(template, "Search").accelerator).toBe("CmdOrCtrl+F")
    expect(findMenuItem(template, "Save Prompt").accelerator).toBe("CmdOrCtrl+S")
    expect(findMenuItem(template, "Copy Compiled Prompt").accelerator).toBe("CmdOrCtrl+Shift+C")
    expect(findMenuItem(template, "Close Active Panel").accelerator).toBe("Esc")
    expect(findMenuItem(template, "Settings...").accelerator).toBe("CmdOrCtrl+,")

    clickMenuItem(findMenuItem(template, "New Prompt"))
    clickMenuItem(findMenuItem(template, "New Project"))
    clickMenuItem(findMenuItem(template, "Search"))
    clickMenuItem(findMenuItem(template, "Copy Compiled Prompt"))
    clickMenuItem(findMenuItem(template, "Close Active Panel"))

    expect(actions).toEqual([
      "newPrompt",
      "newProject",
      "focusSearch",
      "copyCompiledPrompt",
      "closeActivePanel",
    ])
    expect(() => findMenuItem(template, "Toggle Developer Tools")).toThrow()
  })

  it("keeps development-only menu items out of production templates", () => {
    const productionTemplate = createApplicationMenuTemplate({
      isDevelopment: false,
      isMac: true,
      sendAction: () => undefined,
    })
    const developmentTemplate = createApplicationMenuTemplate({
      isDevelopment: true,
      isMac: true,
      sendAction: () => undefined,
    })

    expect(() => findMenuRole(productionTemplate, "reload")).toThrow()
    expect(findMenuRole(developmentTemplate, "reload").role).toBe("reload")
    expect(findMenuRole(developmentTemplate, "toggleDevTools").role).toBe("toggleDevTools")
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
      "menu",
      "projects",
      "prompts",
      "search",
      "tags",
      "harnessTemplates",
      "settings",
      "secrets",
      "promptCompiler",
      "exports",
      "clipboard",
    ])
    expect(Object.keys(bridge.menu)).toEqual(["onAction"])
    expect(Object.keys(bridge.projects)).toEqual(["create", "list", "get", "update", "delete"])
    expect(Object.keys(bridge.prompts)).toEqual([
      "createAsset",
      "listAssets",
      "getAsset",
      "updateAsset",
      "deleteAsset",
      "createVersion",
      "createNextVersion",
      "listVersions",
      "getVersion",
      "getCurrentVersion",
      "setCurrentVersion",
      "compareVersions",
    ])
    expect(Object.keys(bridge.tags)).toEqual([
      "create",
      "list",
      "update",
      "delete",
      "attachToPrompt",
      "detachFromPrompt",
      "listForPrompt",
      "listWithCounts",
      "createAndAttachToPrompt",
    ])
    expect(Object.keys(bridge.harnessTemplates)).toEqual([
      "create",
      "list",
      "get",
      "update",
      "delete",
    ])
    expect(Object.keys(bridge.settings)).toEqual([
      "get",
      "set",
      "list",
      "getDefaults",
      "updateDefaults",
    ])
    expect(Object.keys(bridge.secrets)).toEqual([
      "saveOpenAIKey",
      "hasOpenAIKey",
      "getOpenAIKeyStatus",
      "deleteOpenAIKey",
    ])
    expect(Object.keys(bridge.promptCompiler)).toEqual(["analyze", "compile"])
    expect(Object.keys(bridge.exports)).toEqual(["formatPrompt", "savePromptToFile"])
    expect(Object.keys(bridge.clipboard)).toEqual(["copyText"])
    await expect(bridge.projects.list()).resolves.toEqual([])
    await expect(bridge.settings.get("missing")).resolves.toBeNull()
  })

  it("exposes a typed menu action subscription without raw ipcRenderer", () => {
    const subscriptions: ((action: "focusSearch") => void)[] = []
    const bridge = createElectronBridge(
      async () => PING_RESPONSE,
      (callback) => {
        subscriptions.push(callback)
        return () => {
          subscriptions.splice(subscriptions.indexOf(callback), 1)
        }
      },
    )

    const receivedActions: string[] = []
    const unsubscribe = bridge.menu.onAction((action) => receivedActions.push(action))

    subscriptions[0]?.("focusSearch")
    unsubscribe()
    subscriptions[0]?.("focusSearch")

    expect(receivedActions).toEqual(["focusSearch"])
  })

  it("routes Phase 6 prompt version methods through typed bridge channels", async () => {
    const calls: { readonly channel: string; readonly payload: unknown }[] = []
    const bridge = createElectronBridge(async (channel, payload) => {
      calls.push({ channel, payload })

      if (channel === PERSISTENCE_CHANNELS.createNextPromptVersion) {
        return { asset: promptAssetResponse, version: promptVersionResponse }
      }
      if (channel === PERSISTENCE_CHANNELS.getCurrentPromptVersion) {
        return promptVersionResponse
      }
      if (channel === PERSISTENCE_CHANNELS.comparePromptVersions) {
        return { baseVersion: promptVersionResponse, compareVersion: compareVersionResponse }
      }

      throw new Error(`Unexpected channel ${channel}`)
    })

    await expect(
      bridge.prompts.createNextVersion({
        promptAssetId: validPromptAssetId,
        originalInput: "Original request",
        compiledPrompt: "Compiled prompt",
      }),
    ).resolves.toEqual({ asset: promptAssetResponse, version: promptVersionResponse })
    await expect(bridge.prompts.getCurrentVersion(validPromptAssetId)).resolves.toEqual(
      promptVersionResponse,
    )
    await expect(
      bridge.prompts.compareVersions(validPromptVersionId, comparePromptVersionId),
    ).resolves.toEqual({
      baseVersion: promptVersionResponse,
      compareVersion: compareVersionResponse,
    })
    expect(calls).toEqual([
      {
        channel: PERSISTENCE_CHANNELS.createNextPromptVersion,
        payload: {
          promptAssetId: validPromptAssetId,
          originalInput: "Original request",
          compiledPrompt: "Compiled prompt",
          makeCurrent: true,
        },
      },
      {
        channel: PERSISTENCE_CHANNELS.getCurrentPromptVersion,
        payload: { id: validPromptAssetId },
      },
      {
        channel: PERSISTENCE_CHANNELS.comparePromptVersions,
        payload: { baseVersionId: validPromptVersionId, compareVersionId: comparePromptVersionId },
      },
    ])
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
    expect(() =>
      handlers.createNextPromptVersion({
        promptAssetId: validPromptAssetId,
        originalInput: "",
        compiledPrompt: "Compiled prompt",
      }),
    ).toThrow(/originalInput/)
    expect(() =>
      handlers.comparePromptVersions({
        baseVersionId: validPromptVersionId,
        compareVersionId: "",
      }),
    ).toThrow(/compareVersionId/)
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
