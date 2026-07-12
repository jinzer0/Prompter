import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

import {
  createApplicationMenuTemplate,
  MENU_ACTION_CHANNEL,
  MENU_ACTIONS,
  menuActionSchema,
} from "../electron/app-menu"
import { createElectronBridge, PING_RESPONSE } from "../electron/bridge"
import {
  createHarnessTemplateInputSchema,
  harnessTemplateSchema,
  PERSISTENCE_CHANNELS,
} from "../electron/ipc-contract"
import { createPersistenceIpcHandlers } from "../electron/ipc-handlers"
import type {
  PromptQualityLLMReviewResult,
  PromptQualityReviewResult,
  PromptQualityReviewSnapshot,
} from "../electron/ipc-types"
import { createWindowOptions } from "../electron/window-options"
import {
  createFailingServices,
  listFiles,
  projectContextCompilerBuildFixture,
  projectContextProfileFixture,
  validProjectContextProfileId,
  validProjectId,
  validPromptAssetId,
} from "./electron-contract-helpers"
import { readProductionSource } from "./source-guardrail-helpers"

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
const promptQualitySnapshot = {
  compiledPrompt: "# Objective\n\nDefine the expected change.",
  originalInput: "Improve the prompt instructions.",
  scenario: "feature",
  targetAgent: "codex",
  harnessTemplateId: null,
  projectContextProfileId: null,
  includeProjectContextProfile: false,
  projectContext: null,
  constraints: "Preserve the existing public contract.",
  acceptanceCriteria: "The new behavior is covered by tests.",
  validationCommands: "npm test",
} satisfies PromptQualityReviewSnapshot
const promptQualityReviewResponse = {
  id: "33333333-3333-4333-8333-333333333333",
  source: "prompt_version",
  promptVersionId: validPromptVersionId,
  reviewMode: "local",
  overallScore: 82,
  grade: "good",
  dimensionScores: {
    clarity: 88,
    context: 78,
    scope: 84,
    constraints: 81,
    acceptanceCriteria: 85,
    validation: 76,
    safety: 90,
    ambiguityRisk: 20,
  },
  strengths: ["The objective is explicit."],
  issues: [],
  suggestions: [],
  missingSections: [],
  warnings: [],
  recommendedClarifyingQuestions: [],
  scoreExplanation: "The prompt is clear but needs focused validation guidance.",
  snapshot: promptQualitySnapshot,
  createdAt: 1,
  improvedPromptDraft: null,
} satisfies PromptQualityReviewResult
const draftPromptQualityReviewResponse = {
  ...promptQualityReviewResponse,
  id: null,
  source: "draft",
  promptVersionId: null,
} satisfies PromptQualityReviewResult
const unavailableLLMReviewResponse = {
  ok: false,
  code: "llm_review_unavailable",
  message: "LLM prompt review is not available yet. Use local review instead.",
} satisfies PromptQualityLLMReviewResult
const validHarnessTemplateId = "44444444-4444-4444-8444-444444444444"
const harnessTemplateResponse = {
  id: validHarnessTemplateId,
  name: "Feature Harness",
  scenario: "feature",
  targetAgent: "generic_agent",
  templateBody: "  Keep exact body whitespace.  \n",
  requiredFields: null,
  clarificationPolicy: null,
  createdAt: 1,
  updatedAt: 2,
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

function findButtonBlock(source: string, text: string, handler: string): string {
  const buttonBlocks = source.match(/<Button[\s\S]*?<\/Button>/g) ?? []
  const buttonBlock = buttonBlocks.find((block) => block.includes(text) && block.includes(handler))

  if (buttonBlock === undefined) {
    throw new Error(`Button block not found for ${text}`)
  }

  return buttonBlock
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
    const compilerActionsSource = await readFile(
      "renderer/src/components/prompt-compiler-actions.tsx",
      "utf8",
    )
    const saveTargetIndex = compilerActionsSource.indexOf(
      'data-menu-action-target="save-compiled-prompt"',
    )
    const quickCaptureTargetIndex = compilerActionsSource.indexOf(
      'data-menu-action-target="quick-capture-from-clipboard"',
    )
    const llmCompileButton = findButtonBlock(
      compilerActionsSource,
      "최종 프롬프트 생성",
      "onClick={onCompileWithLLM}",
    )
    const saveCompiledPromptButton = findButtonBlock(
      compilerActionsSource,
      "Save compiled prompt",
      "onClick={() => void onSavePrompt()}",
    )

    expect(quickCaptureTargetIndex).toBeGreaterThan(-1)
    expect(saveTargetIndex).toBeGreaterThan(-1)
    expect(saveCompiledPromptButton).toContain('data-menu-action-target="save-compiled-prompt"')
    expect(llmCompileButton).not.toContain('data-menu-action-target="save-compiled-prompt"')
    expect(compilerSource).toContain("onAnalyzeWithLLM={compiler.analyzeWithLLM}")
    expect(compilerSource).toContain("onSavePrompt={compiler.savePrompt}")
    expect(appSource).toContain('case "quickCaptureFromClipboard"')
    expect(appSource).toContain('clickMenuTarget("quick-capture-from-clipboard")')
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
      "quickCaptureFromClipboard",
      "focusSearch",
      "savePrompt",
      "copyCompiledPrompt",
      "exportPrompt",
      "openSettings",
      "closeActivePanel",
    ])
    expect(menuActionSchema.parse("focusSearch")).toBe("focusSearch")
    expect(menuActionSchema.parse("quickCaptureFromClipboard")).toBe("quickCaptureFromClipboard")
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
    expect(findMenuItem(template, "Quick Capture from Clipboard").accelerator).toBe(
      "CmdOrCtrl+Shift+V",
    )
    expect(findMenuItem(template, "Search").accelerator).toBe("CmdOrCtrl+F")
    expect(findMenuItem(template, "Save Prompt").accelerator).toBe("CmdOrCtrl+S")
    expect(findMenuItem(template, "Copy Compiled Prompt").accelerator).toBe("CmdOrCtrl+Shift+C")
    expect(findMenuItem(template, "Close Active Panel").accelerator).toBe("Esc")
    expect(findMenuItem(template, "Settings...").accelerator).toBe("CmdOrCtrl+,")

    clickMenuItem(findMenuItem(template, "New Prompt"))
    clickMenuItem(findMenuItem(template, "New Project"))
    clickMenuItem(findMenuItem(template, "Quick Capture from Clipboard"))
    clickMenuItem(findMenuItem(template, "Search"))
    clickMenuItem(findMenuItem(template, "Copy Compiled Prompt"))
    clickMenuItem(findMenuItem(template, "Close Active Panel"))

    expect(actions).toEqual([
      "newPrompt",
      "newProject",
      "quickCaptureFromClipboard",
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
      "projectContextProfiles",
      "prompts",
      "search",
      "tags",
      "harnessTemplates",
      "settings",
      "secrets",
      "promptCompiler",
      "promptQuality",
      "exports",
      "clipboard",
    ])
    expect(Object.keys(bridge)).not.toContain("appEvents")
    expect(Object.keys(bridge)).not.toContain("shortcuts")
    expect(Object.keys(bridge.menu)).toEqual(["onAction"])
    expect(Object.keys(bridge.projects)).toEqual(["create", "list", "get", "update", "delete"])
    expect(Object.keys(bridge.projectContextProfiles)).toEqual([
      "create",
      "list",
      "get",
      "getDefault",
      "update",
      "delete",
      "duplicate",
      "setDefault",
      "buildCompilerContext",
    ])
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
      "duplicate",
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
    expect(Object.keys(bridge.promptQuality)).toEqual([
      "reviewDraft",
      "reviewVersion",
      "saveReview",
      "listReviewsForVersion",
      "getLatestReview",
      "getReview",
      "applyScoreToVersion",
      "reviewWithLLM",
    ])
    expect(Object.keys(bridge.exports)).toEqual(["formatPrompt", "savePromptToFile"])
    expect(Object.keys(bridge.clipboard)).toEqual(["copyText", "readText"])
    await expect(bridge.projects.list()).resolves.toEqual([])
    await expect(bridge.settings.get("missing")).resolves.toBeNull()
  })

  it("routes harness template list filters and duplicate through typed bridge channels", async () => {
    const calls: { readonly channel: string; readonly payload: unknown }[] = []
    const bridge = createElectronBridge(async (channel, payload) => {
      calls.push({ channel, payload })

      if (channel === PERSISTENCE_CHANNELS.listHarnessTemplates) {
        return [harnessTemplateResponse]
      }
      if (channel === PERSISTENCE_CHANNELS.duplicateHarnessTemplate) {
        return { ...harnessTemplateResponse, name: "Feature Harness Copy" }
      }

      throw new Error(`Unexpected channel ${channel}`)
    })

    await expect(bridge.harnessTemplates.list()).resolves.toEqual([harnessTemplateResponse])
    await expect(bridge.harnessTemplates.list({ scenario: "feature" })).resolves.toEqual([
      harnessTemplateResponse,
    ])
    await expect(bridge.harnessTemplates.list({ targetAgent: "generic_agent" })).resolves.toEqual([
      harnessTemplateResponse,
    ])
    await expect(bridge.harnessTemplates.list({ query: "  Feature  " })).resolves.toEqual([
      harnessTemplateResponse,
    ])
    await expect(bridge.harnessTemplates.list({ query: "   " })).resolves.toEqual([
      harnessTemplateResponse,
    ])
    await expect(bridge.harnessTemplates.duplicate(validHarnessTemplateId)).resolves.toEqual({
      ...harnessTemplateResponse,
      name: "Feature Harness Copy",
    })

    expect(calls).toEqual([
      { channel: PERSISTENCE_CHANNELS.listHarnessTemplates, payload: undefined },
      { channel: PERSISTENCE_CHANNELS.listHarnessTemplates, payload: { scenario: "feature" } },
      {
        channel: PERSISTENCE_CHANNELS.listHarnessTemplates,
        payload: { targetAgent: "generic_agent" },
      },
      { channel: PERSISTENCE_CHANNELS.listHarnessTemplates, payload: { query: "Feature" } },
      { channel: PERSISTENCE_CHANNELS.listHarnessTemplates, payload: { query: "" } },
      {
        channel: PERSISTENCE_CHANNELS.duplicateHarnessTemplate,
        payload: { id: validHarnessTemplateId },
      },
    ])
  })

  it("routes project context profile methods through typed bridge channels", async () => {
    const calls: { readonly channel: string; readonly payload: unknown }[] = []
    const bridge = createElectronBridge(async (channel, payload) => {
      calls.push({ channel, payload })

      if (channel === PERSISTENCE_CHANNELS.listProjectContextProfiles) {
        return [projectContextProfileFixture]
      }
      if (channel === PERSISTENCE_CHANNELS.getProjectContextProfile) {
        return projectContextProfileFixture
      }
      if (channel === PERSISTENCE_CHANNELS.getDefaultProjectContextProfile) {
        return projectContextProfileFixture
      }
      if (channel === PERSISTENCE_CHANNELS.deleteProjectContextProfile) {
        return { id: validProjectContextProfileId }
      }
      if (channel === PERSISTENCE_CHANNELS.buildProjectContextForCompiler) {
        return projectContextCompilerBuildFixture
      }
      if (
        channel === PERSISTENCE_CHANNELS.createProjectContextProfile ||
        channel === PERSISTENCE_CHANNELS.updateProjectContextProfile ||
        channel === PERSISTENCE_CHANNELS.duplicateProjectContextProfile ||
        channel === PERSISTENCE_CHANNELS.setDefaultProjectContextProfile
      ) {
        return projectContextProfileFixture
      }

      throw new Error(`Unexpected channel ${channel}`)
    })

    await expect(
      bridge.projectContextProfiles.create({
        projectId: validProjectId,
        name: "Default Context",
        summary: "A safe project summary.",
      }),
    ).resolves.toEqual(projectContextProfileFixture)
    await expect(bridge.projectContextProfiles.list(validProjectId)).resolves.toEqual([
      projectContextProfileFixture,
    ])
    await expect(
      bridge.projectContextProfiles.get(validProjectId, validProjectContextProfileId),
    ).resolves.toEqual(projectContextProfileFixture)
    await expect(bridge.projectContextProfiles.getDefault(validProjectId)).resolves.toEqual(
      projectContextProfileFixture,
    )
    await expect(
      bridge.projectContextProfiles.update(validProjectId, validProjectContextProfileId, {
        name: "Updated Context",
      }),
    ).resolves.toEqual(projectContextProfileFixture)
    await expect(
      bridge.projectContextProfiles.delete(validProjectId, validProjectContextProfileId),
    ).resolves.toEqual({ id: validProjectContextProfileId })
    await expect(
      bridge.projectContextProfiles.duplicate(validProjectId, validProjectContextProfileId),
    ).resolves.toEqual(projectContextProfileFixture)
    await expect(
      bridge.projectContextProfiles.setDefault(validProjectId, validProjectContextProfileId),
    ).resolves.toEqual(projectContextProfileFixture)
    await expect(
      bridge.projectContextProfiles.buildCompilerContext(
        validProjectId,
        validProjectContextProfileId,
      ),
    ).resolves.toEqual(projectContextCompilerBuildFixture)

    expect(calls).toEqual([
      {
        channel: PERSISTENCE_CHANNELS.createProjectContextProfile,
        payload: {
          projectId: validProjectId,
          name: "Default Context",
          summary: "A safe project summary.",
          techStack: null,
          architectureNotes: null,
          codingConventions: null,
          constraints: null,
          forbiddenActions: null,
          acceptanceDefaults: null,
          validationCommands: null,
          securityNotes: null,
          additionalContext: null,
          testingNotes: null,
          packageManager: null,
          defaultBranch: null,
          repoPath: null,
          isDefault: false,
        },
      },
      {
        channel: PERSISTENCE_CHANNELS.listProjectContextProfiles,
        payload: { projectId: validProjectId },
      },
      {
        channel: PERSISTENCE_CHANNELS.getProjectContextProfile,
        payload: { projectId: validProjectId, profileId: validProjectContextProfileId },
      },
      {
        channel: PERSISTENCE_CHANNELS.getDefaultProjectContextProfile,
        payload: { projectId: validProjectId },
      },
      {
        channel: PERSISTENCE_CHANNELS.updateProjectContextProfile,
        payload: {
          projectId: validProjectId,
          profileId: validProjectContextProfileId,
          input: { name: "Updated Context" },
        },
      },
      {
        channel: PERSISTENCE_CHANNELS.deleteProjectContextProfile,
        payload: { projectId: validProjectId, profileId: validProjectContextProfileId },
      },
      {
        channel: PERSISTENCE_CHANNELS.duplicateProjectContextProfile,
        payload: { projectId: validProjectId, profileId: validProjectContextProfileId },
      },
      {
        channel: PERSISTENCE_CHANNELS.setDefaultProjectContextProfile,
        payload: { projectId: validProjectId, profileId: validProjectContextProfileId },
      },
      {
        channel: PERSISTENCE_CHANNELS.buildProjectContextForCompiler,
        payload: { projectId: validProjectId, profileId: validProjectContextProfileId },
      },
    ])
  })

  it("validates harness template contract inputs without mutating template whitespace", () => {
    const templateBody = "  \nKeep the exact template body.\n  "

    expect(
      createHarnessTemplateInputSchema.parse({
        name: "Whitespace Harness",
        scenario: "feature",
        targetAgent: "generic_agent",
        templateBody,
        requiredFields: ["title", "originalInput"],
        clarificationPolicy: { mode: "ask_when_missing" },
      }),
    ).toEqual({
      name: "Whitespace Harness",
      scenario: "feature",
      targetAgent: "generic_agent",
      templateBody,
      requiredFields: JSON.stringify(["title", "originalInput"]),
      clarificationPolicy: JSON.stringify({ mode: "ask_when_missing" }),
    })
    expect(
      createHarnessTemplateInputSchema.parse({
        name: "JSON Harness",
        scenario: "feature",
        targetAgent: "generic_agent",
        templateBody,
        requiredFields: '["title"]',
        clarificationPolicy: '{"mode":"ask_when_missing"}',
      }),
    ).toMatchObject({
      templateBody,
      requiredFields: JSON.stringify(["title"]),
      clarificationPolicy: JSON.stringify({ mode: "ask_when_missing" }),
    })
    expect(
      harnessTemplateSchema.parse({ ...harnessTemplateResponse, templateBody }).templateBody,
    ).toBe(templateBody)
    expect(() =>
      createHarnessTemplateInputSchema.parse({
        name: "Blank Harness",
        scenario: "feature",
        targetAgent: "generic_agent",
        templateBody: "  \n\t  ",
      }),
    ).toThrow(/templateBody/)
    expect(() =>
      createHarnessTemplateInputSchema.parse({
        name: "Bad Fields Harness",
        scenario: "feature",
        targetAgent: "generic_agent",
        templateBody,
        requiredFields: { title: true },
      }),
    ).toThrow(/requiredFields/)
    expect(() =>
      createHarnessTemplateInputSchema.parse({
        name: "Bad Policy Harness",
        scenario: "feature",
        targetAgent: "generic_agent",
        templateBody,
        clarificationPolicy: ["ask"],
      }),
    ).toThrow(/clarificationPolicy/)
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
    expect(() => handlers.duplicateHarnessTemplate({ id: "not-a-uuid" })).toThrow(/id/)
    expect(() =>
      handlers.createProjectContextProfile({ projectId: validProjectId, name: "" }),
    ).toThrow(/name/)
    expect(() => handlers.listProjectContextProfiles({ projectId: "not-a-uuid" })).toThrow(
      /projectId/,
    )
    expect(() =>
      handlers.buildProjectContextForCompiler({
        projectId: validProjectId,
        profileId: "not-a-uuid",
      }),
    ).toThrow(/profileId/)
    expect(called).toBe(false)
  })

  it("routes prompt-quality bridge methods through exact parsed IPC channels", async () => {
    const calls: { readonly channel: string; readonly payload: unknown }[] = []
    const bridge = createElectronBridge(async (channel, payload) => {
      calls.push({ channel, payload })

      if (channel === PERSISTENCE_CHANNELS.reviewPromptQualityDraft) {
        return draftPromptQualityReviewResponse
      }
      if (channel === PERSISTENCE_CHANNELS.reviewPromptQualityWithLLM) {
        return unavailableLLMReviewResponse
      }
      if (
        channel === PERSISTENCE_CHANNELS.reviewPromptQualityVersion ||
        channel === PERSISTENCE_CHANNELS.savePromptQualityReview ||
        channel === PERSISTENCE_CHANNELS.getLatestPromptQualityReview ||
        channel === PERSISTENCE_CHANNELS.getPromptQualityReview
      ) {
        return promptQualityReviewResponse
      }
      if (channel === PERSISTENCE_CHANNELS.listPromptQualityReviewsForVersion) {
        return [promptQualityReviewResponse]
      }
      if (channel === PERSISTENCE_CHANNELS.applyPromptQualityScoreToVersion) {
        return { promptVersionId: validPromptVersionId, qualityScore: 82 }
      }

      throw new Error(`Unexpected channel ${channel}`)
    })
    const draftInput = { ...promptQualitySnapshot, reviewMode: "local" } as const
    const versionInput = { promptVersionId: validPromptVersionId, reviewMode: "local" } as const

    await expect(bridge.promptQuality.reviewDraft(draftInput)).resolves.toEqual(
      draftPromptQualityReviewResponse,
    )
    await expect(bridge.promptQuality.reviewWithLLM()).resolves.toEqual(
      unavailableLLMReviewResponse,
    )
    await expect(bridge.promptQuality.reviewVersion(versionInput)).resolves.toEqual(
      promptQualityReviewResponse,
    )
    await expect(
      bridge.promptQuality.saveReview({
        promptVersionId: validPromptVersionId,
        review: promptQualityReviewResponse,
      }),
    ).resolves.toEqual(promptQualityReviewResponse)
    await expect(
      bridge.promptQuality.listReviewsForVersion({ promptVersionId: validPromptVersionId }),
    ).resolves.toEqual([promptQualityReviewResponse])
    await expect(
      bridge.promptQuality.getLatestReview({ promptVersionId: validPromptVersionId }),
    ).resolves.toEqual(promptQualityReviewResponse)
    await expect(
      bridge.promptQuality.getReview({ reviewId: promptQualityReviewResponse.id }),
    ).resolves.toEqual(promptQualityReviewResponse)
    await expect(
      bridge.promptQuality.applyScoreToVersion({
        promptVersionId: validPromptVersionId,
        reviewId: promptQualityReviewResponse.id,
        qualityScore: 82,
      }),
    ).resolves.toEqual({ promptVersionId: validPromptVersionId, qualityScore: 82 })

    expect(calls).toEqual([
      { channel: "prompter:prompt-quality:review-draft", payload: draftInput },
      { channel: "prompter:prompt-quality:review-llm", payload: undefined },
      { channel: "prompter:prompt-quality:review-version", payload: versionInput },
      {
        channel: "prompter:prompt-quality:save-review",
        payload: { promptVersionId: validPromptVersionId, review: promptQualityReviewResponse },
      },
      {
        channel: "prompter:prompt-quality:list-for-version",
        payload: { promptVersionId: validPromptVersionId, limit: 50, offset: 0 },
      },
      {
        channel: "prompter:prompt-quality:get-latest",
        payload: { promptVersionId: validPromptVersionId },
      },
      {
        channel: "prompter:prompt-quality:get",
        payload: { reviewId: promptQualityReviewResponse.id },
      },
      {
        channel: "prompter:prompt-quality:apply-score-to-version",
        payload: {
          promptVersionId: validPromptVersionId,
          reviewId: promptQualityReviewResponse.id,
          qualityScore: 82,
        },
      },
    ])
  })

  it("rejects malformed prompt-quality payloads before service calls", () => {
    let called = false
    const handlers = createPersistenceIpcHandlers(
      createFailingServices(() => {
        called = true
      }),
    )

    expect(() =>
      handlers.reviewPromptQualityVersion({
        promptVersionId: "not-a-uuid",
        reviewMode: "local",
      }),
    ).toThrow(/promptVersionId/)
    expect(() =>
      handlers.reviewPromptQualityDraft({
        ...promptQualitySnapshot,
        compiledPrompt: "   ",
        reviewMode: "local",
      }),
    ).toThrow(/compiledPrompt/)
    expect(() =>
      handlers.reviewPromptQualityVersion({
        promptVersionId: validPromptVersionId,
        reviewMode: "automatic",
      }),
    ).toThrow(/reviewMode/)
    expect(() =>
      handlers.reviewPromptQualityDraft({
        ...promptQualitySnapshot,
        scenario: "run",
        reviewMode: "local",
      }),
    ).toThrow(/scenario/)
    expect(() =>
      handlers.savePromptQualityReview({
        promptVersionId: validPromptVersionId,
        review: { ...promptQualityReviewResponse, grade: "excellent_plus" },
      }),
    ).toThrow(/grade/)
    expect(() =>
      handlers.applyPromptQualityScoreToVersion({
        promptVersionId: validPromptVersionId,
        reviewId: promptQualityReviewResponse.id,
        qualityScore: 101,
      }),
    ).toThrow(/qualityScore/)
    expect(called).toBe(false)
  })

  it("rejects malformed prompt-quality service and bridge responses", async () => {
    const handlers = createPersistenceIpcHandlers({
      ...createFailingServices(() => undefined),
      reviewPromptQualityDraft: () => ({ ...draftPromptQualityReviewResponse, overallScore: 101 }),
    })
    const bridge = createElectronBridge(async () => ({
      ...draftPromptQualityReviewResponse,
      overallScore: 101,
    }))
    const draftInput = { ...promptQualitySnapshot, reviewMode: "local" } as const

    expect(() => handlers.reviewPromptQualityDraft(draftInput)).toThrow(/overallScore/)
    await expect(bridge.promptQuality.reviewDraft(draftInput)).rejects.toThrow(/overallScore/)
  })

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
