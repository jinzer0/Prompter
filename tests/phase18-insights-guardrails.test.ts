import { readdir, readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

import {
  matchesAny,
  matchingSourcePaths,
  readProductionSourceFiles,
  rendererIsolationPatterns,
  repoPathFilesystemPatterns,
} from "./source-guardrail-helpers"

const integrationPaths = [
  "renderer/src/app.tsx",
  "renderer/src/components/harness-template-manager.tsx",
  "renderer/src/components/project-context-profile-manager.tsx",
  "renderer/src/components/prompt-library-panel.tsx",
  "renderer/src/components/prompt-template-manager.tsx",
  "renderer/src/components/prompt-version-management.tsx",
  "renderer/src/components/quality/prompt-quality-review-panel.tsx",
  "renderer/src/hooks/use-insights-workspace-navigation.ts",
  "renderer/src/lib/insights-navigation.ts",
  "renderer/src/lib/insights-workspace-navigation.ts",
] as const

const insightSourcePaths = ["electron/insights"] as const

const forbiddenIntegrationPatterns = [
  /\bipcRenderer\b/,
  /\b(?:globalShortcut|appEvents|shortcuts|registerShortcut|quickCapture)\b/,
  /\bquick_capture_[A-Za-z0-9_]*\b/,
  /\b(?:prompt_runs|agent_runs|execution_results|validation_results|run_logs)\b/,
  /\b(?:PromptRun|AgentRun|ExecutionResult|ValidationResult|RunLog)Schema\b/,
  /\bwindow\.prompter\.(?:promptCompiler|secrets|clipboard|backup)\b/,
  /\b(?:promptCompiler|compiler)\.(?:analyze|compile)\s*\(/,
  /\b(?:promptCompilerAnalyze|promptCompilerCompile|analyzePrompt|compilePrompt)\s*\(/,
  /(?:from\s+|import\s*\()\s*["'][^"']*(?:openai|open-ai-client)[^"']*["']/i,
  /\b(?:createOpenAIResponseClient|getOpenAIKeyForMainProcessOnly)\s*\(/,
  /\bwindow\.prompter\.promptQuality\.(?:review|save|apply|run)/,
  /\b(?:promptQuality|qualityReview)\.(?:review|save|apply|run)\s*\(/,
  /\b(?:reviewPromptQuality|saveQualityReview|applyQualityReview|runQualityReview)\s*\(/,
  /\bwindow\.prompter\.maintenance\.(?:scan|prepare|execute|cancel)/,
  /\bmaintenance\.(?:scan|prepare|execute|cancel)\s*\(/,
  /\b(?:scanLibrary|prepareAction|executeAction|cancelActionSession|rescan)\s*\(/,
  /\b(?:backup|exporter|clipboard|secrets)\.(?:export|copy|read|write|save|delete)\s*\(/,
  /\b(?:clipboard|secrets|secretStore|keyStore)\.(?:readText|writeText|saveOpenAIKey|deleteOpenAIKey)\s*\(/,
  /\b(?:exportFullBackup|exportProjectBackup|exportPromptAssetsBackup|copyCompiledPrompt)\s*\(/,
] as const

const sqlMutationPattern = /\b(?:INSERT|UPDATE|DELETE|REPLACE|DROP|ALTER|CREATE)\b/i
const vitestImportMarker = ["from", '"vitest"'].join(" ")
const playwrightImportMarker = ["from", '"@playwright/test"'].join(" ")

function countOccurrences(source: string, needle: string): number {
  return source.split(needle).length - 1
}

async function readPhase18RendererFiles() {
  const discovered = await readProductionSourceFiles([
    "renderer/src/components/insights",
    "renderer/src/hooks",
  ])
  const integration = await Promise.all(
    integrationPaths.map(async (path) => ({ path, source: await readFile(path, "utf8") })),
  )
  return [...discovered.filter(({ path }) => /insights/i.test(path)), ...integration]
}

async function readPhase18ElectronInsightsFiles() {
  return readProductionSourceFiles(insightSourcePaths)
}

describe("Phase 18 Insights source guardrails", () => {
  it("keeps renderer Insights isolated from Node, Electron, database, and runtime IPC access", async () => {
    // Given: every renderer-owned Phase 18 production surface.
    const files = await readPhase18RendererFiles()
    // When: established renderer isolation patterns scan the files.
    // Then: no Node, Electron, SQLite, Drizzle, fs, path, process, or ipcRenderer access exists.
    expect(matchingSourcePaths(files, rendererIsolationPatterns)).toEqual([])
    expect(files.filter(({ source }) => /\b(?:process|ipcRenderer)\b/.test(source))).toEqual([])
  })

  it("keeps Insights disconnected from compiler, mutations, exports, secrets, and automation", async () => {
    // Given: renderer and Electron Phase 18 surfaces plus one fixture per integration category.
    const rendererFiles = await readPhase18RendererFiles()
    const electronFiles = await readPhase18ElectronInsightsFiles()
    const fixtures = [
      "window.prompter.promptCompiler.analyze(input)",
      "promptCompiler.compile(input)",
      "promptCompilerAnalyze(input)",
      'import OpenAI from "openai"',
      'import { createOpenAIResponseClient } from "../prompt-compiler/open-ai-client"',
      "createOpenAIResponseClient(apiKey)",
      "getOpenAIKeyForMainProcessOnly()",
      "window.prompter.promptQuality.review(input)",
      "promptQuality.save(review)",
      "applyQualityReview(result)",
      "window.prompter.maintenance.scan(input)",
      "maintenance.prepare(input)",
      "maintenance.execute(input)",
      "maintenance.cancel(input)",
      "scanLibrary()",
      "prepareAction(input)",
      "executeAction(input)",
      "cancelActionSession(input)",
      "window.prompter.backup.exportFullBackup(input)",
      "backup.export(input)",
      "exportProjectBackup(input)",
      "window.prompter.clipboard.readText()",
      "clipboard.copy(text)",
      "clipboard.writeText(text)",
      "window.prompter.secrets.saveOpenAIKey(input)",
      "secrets.delete(input)",
      "secretStore.saveOpenAIKey(input)",
      "globalShortcut.register(accelerator)",
      "window.prompter.appEvents.onReady(callback)",
      "window.prompter.shortcuts.register(input)",
      "registerShortcut(input)",
      'sqliteTable("prompt_runs", {})',
      "PromptRunSchema.parse(input)",
      'settings.set("quick_capture_enabled", true)',
      "quickCapture.open()",
    ]
    // When: Phase 18 integration patterns scan production and malformed fixtures.
    // Then: production is clean and every prohibited category is detectable.
    expect(matchingSourcePaths(rendererFiles, forbiddenIntegrationPatterns)).toEqual([])
    expect(matchingSourcePaths(electronFiles, forbiddenIntegrationPatterns)).toEqual([])
    expect(fixtures.every((source) => matchesAny(source, forbiddenIntegrationPatterns))).toBe(true)
  })

  it("allows only read-only SELECT and CTE SQL inside electron Insights", async () => {
    // Given: all Electron-owned Insights query modules and mutation fixtures.
    const files = await readPhase18ElectronInsightsFiles()
    const mutations = [
      "INSERT INTO prompts VALUES (?)",
      "UPDATE prompts SET title = ?",
      "DELETE FROM prompts",
      "REPLACE INTO prompts VALUES (?)",
      "DROP TABLE prompts",
      "ALTER TABLE prompts ADD COLUMN x TEXT",
      "CREATE TABLE prompt_runs (id TEXT)",
    ]
    // When: SQL mutation keywords are scanned.
    // Then: production stays read-only and every mutation form is rejected.
    expect(files.filter(({ source }) => sqlMutationPattern.test(source))).toEqual([])
    expect(mutations.every((source) => sqlMutationPattern.test(source))).toBe(true)
  })

  it("keeps repoPath metadata disconnected from filesystem reads and scans", async () => {
    // Given: all Phase 18 Electron and renderer surfaces plus malformed repo I/O fixtures.
    const files = [
      ...(await readPhase18ElectronInsightsFiles()),
      ...(await readPhase18RendererFiles()),
    ]
    const fixtures = [
      "readFile(profile.repoPath, 'utf8')",
      "resolve(project.repoPath, 'AGENTS.md')",
      "scanRepository(repoPath)",
    ]
    // When: repo-path filesystem guardrails scan production and fixtures.
    // Then: no Phase 18 path reads exist and each malformed form is detectable.
    expect(matchingSourcePaths(files, repoPathFilesystemPatterns)).toEqual([])
    expect(fixtures.every((source) => matchesAny(source, repoPathFilesystemPatterns))).toBe(true)
  })

  it("registers every test in exactly one matching runner", async () => {
    // Given: every test file and both runner configurations.
    const names = (await readdir("tests")).filter((name) => name.endsWith(".test.ts"))
    const sources = await Promise.all(
      names.map(async (name) => ({ name, source: await readFile(`tests/${name}`, "utf8") })),
    )
    const vitestConfig = await readFile("vitest.config.ts", "utf8")
    const playwrightConfig = await readFile("playwright.config.ts", "utf8")
    // When: each file is classified by its runner import.
    const vitestFiles = sources.filter(({ source }) => source.includes(vitestImportMarker))
    const playwrightFiles = sources.filter(({ source }) => source.includes(playwrightImportMarker))
    const unclassifiedFiles = sources
      .filter(
        ({ source }) =>
          !source.includes(vitestImportMarker) && !source.includes(playwrightImportMarker),
      )
      .map(({ name }) => name)
    const vitestRegistrationProblems = vitestFiles
      .filter(({ name }) => countOccurrences(vitestConfig, `"tests/${name}"`) !== 1)
      .map(({ name }) => name)
    const playwrightRegistrationProblems = playwrightFiles
      .filter(({ name }) => countOccurrences(playwrightConfig, `"${name}"`) !== 1)
      .map(({ name }) => name)
    const crossRunnerVitestProblems = vitestFiles
      .filter(({ name }) => countOccurrences(playwrightConfig, `"${name}"`) > 0)
      .map(({ name }) => name)
    const crossRunnerPlaywrightProblems = playwrightFiles
      .filter(({ name }) => countOccurrences(vitestConfig, `"tests/${name}"`) > 0)
      .map(({ name }) => name)
    // Then: every test has one runner import and one matching configuration entry.
    expect(vitestFiles.length + playwrightFiles.length).toBe(sources.length)
    expect(unclassifiedFiles).toEqual([])
    expect(vitestRegistrationProblems).toEqual([])
    expect(playwrightRegistrationProblems).toEqual([])
    expect(crossRunnerVitestProblems).toEqual([])
    expect(crossRunnerPlaywrightProblems).toEqual([])
  })
})
