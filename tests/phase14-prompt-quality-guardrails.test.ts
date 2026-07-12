import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

import { listProductionSourceFiles, readProductionSource } from "./source-guardrail-helpers"

type ProductionSourceFile = {
  readonly path: string
  readonly source: string
}

const executionAndStoragePatterns = [
  /\bprompt_runs\b/,
  /\bagent_runs\b/,
  /\bexecution_results\b/,
  /\bvalidation_results\b/,
  /\brun_logs\b/,
  /\bchild_process\b/,
  /\bexecFile(?:Sync)?\b/,
  /\bspawn(?:Sync)?\s*\(/,
] as const

const prohibitedShortcutPatterns = [
  /\bglobalShortcut\b/,
  /\bappEvents\b/,
  /\bshortcuts\b/,
  /\bwindow\.prompter\.(?:appEvents|shortcuts)\b/,
  /\bquick_capture_/,
] as const

const forbiddenRendererDependencyPatterns = [
  /(?:from\s+|import\s*\()\s*["'](?:better-sqlite3|drizzle(?:-orm)?(?:\/[^"']*)?|openai(?:\/[^"']*)?|(?:node:)?(?:fs|path|process)(?:\/[^"']*)?)["']/,
  /\brequire\s*\(\s*["'](?:electron|better-sqlite3|drizzle(?:-orm)?|openai|(?:node:)?(?:fs|path|process))[^"']*["']\s*\)/,
  /\b(?:safeStorage|ipcRenderer)\b/,
  /\b(?:fs|path|process)\s*\./,
  /\b(?:new\s+OpenAI|getOpenAIKeyForMainProcessOnly)\b/,
] as const

const forbiddenRendererElectronImport =
  /(?:from\s+|import\s*\()\s*["'](?:electron|[^"']*electron\/(?!ipc-types(?:\.js)?["']|prompt-quality-contract(?:\.js)?["']))["']/

const runtimeIpcTypesImport =
  /(?:^|\n)\s*import\s+(?!type\b)(?:(?!\n\s*import\b)[\s\S])*?\s+from\s+["'][^"']*electron\/ipc-types(?:\.js)?["']/

const runtimeIpcTypesDynamicImport =
  /\bimport\s*\(\s*["'][^"']*electron\/ipc-types(?:\.js)?["']\s*\)/

const sideEffectElectronImport =
  /(?:^|\n)\s*import\s+["'](?:electron|[^"']*electron\/(?!prompt-quality-contract(?:\.js)?["']))["']/

const sideEffectRendererDependencyImport =
  /(?:^|\n)\s*import\s+["'](?:better-sqlite3|drizzle(?:-orm)?(?:\/[^"']*)?|openai(?:\/[^"']*)?|(?:node:)?(?:fs|path|process)(?:\/[^"']*)?)["']/

const promptBodyLogPattern =
  /(?:console|logger|log)\.(?:log|debug|info|warn|error)\s*\((?:(?!\)\s*;)[\s\S]){0,240}\b(?:compiledPrompt|originalInput|projectContext|constraints|acceptanceCriteria|validationCommands|improvedPromptDraft|promptBody|promptText|prompt)\b/

const repoPathReference = /\brepo(?:Path|_path)\b/
const filesystemReadOrScan =
  /\b(?:readFile|readFileSync|readdir|readdirSync|opendir|stat|statSync|lstat|lstatSync|realpath|realpathSync|glob|scan(?:Directory|Repository|Files)?)\s*\(/

const rendererIsolationPatterns = [
  forbiddenRendererElectronImport,
  runtimeIpcTypesImport,
  runtimeIpcTypesDynamicImport,
  sideEffectElectronImport,
  sideEffectRendererDependencyImport,
  ...forbiddenRendererDependencyPatterns,
] as const

async function readProductionSourceFiles(
  roots: readonly string[],
): Promise<readonly ProductionSourceFile[]> {
  const paths = await listProductionSourceFiles(roots)

  return Promise.all(
    paths.map(async (path) => ({
      path,
      source: await readFile(path, "utf8"),
    })),
  )
}

function matchingSourcePaths(
  sourceFiles: readonly ProductionSourceFile[],
  patterns: readonly RegExp[],
): readonly string[] {
  return sourceFiles.filter(({ source }) => matchesAny(source, patterns)).map(({ path }) => path)
}

function matchesAny(source: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(source))
}

describe("Phase 14 prompt quality source guardrails", () => {
  it("keeps execution, run-result storage, and prohibited shortcut surfaces out of production", async () => {
    // Given: every production Electron, renderer, and migration source file.
    const productionSource = await readProductionSource()

    // When: the Phase 14 forbidden execution and shortcut surfaces are scanned.

    // Then: no prompt execution, run storage, global shortcut, or settings surface exists.
    expect(productionSource).not.toMatch(
      new RegExp(executionAndStoragePatterns.map((pattern) => pattern.source).join("|")),
    )
    expect(productionSource).not.toMatch(
      new RegExp(prohibitedShortcutPatterns.map((pattern) => pattern.source).join("|")),
    )
  })

  it("keeps renderer runtime imports and access isolated from main-process dependencies", async () => {
    // Given: the production renderer source files.
    const rendererSourceFiles = await readProductionSourceFiles(["renderer/src"])

    // When: main-only imports and Node/Electron runtime access are scanned.

    // Then: only type-only ipc-types and the renderer-safe quality contract remain permitted.
    expect(matchingSourcePaths(rendererSourceFiles, rendererIsolationPatterns)).toEqual([])
  })

  it("rejects bare Electron static, dynamic, and side-effect renderer imports", () => {
    // Given: renderer source snippets that load Electron at runtime without a subpath.
    const forbiddenSources = [
      'import { app } from "electron"',
      'void import("electron")',
      'import "electron"',
    ]

    // When: the renderer isolation patterns scan each runtime import form.

    // Then: every bare Electron runtime import is rejected.
    expect(forbiddenSources.every((source) => matchesAny(source, rendererIsolationPatterns))).toBe(
      true,
    )
  })

  it("rejects bare Node, database-package, and runtime ipc-types renderer imports", () => {
    // Given: renderer source snippets that expose Node, database, or runtime IPC access.
    const forbiddenSources = [
      'import fs from "fs"',
      'import { readFile } from "fs/promises"',
      'import "fs"',
      'import path from "path"',
      'import posix from "path/posix"',
      'import process from "process"',
      'void import("node:process")',
      'import Database from "better-sqlite3"',
      'void import("../../electron/ipc-types")',
    ]

    // When: the renderer isolation patterns scan the forbidden dependencies.

    // Then: every Node, database, and runtime IPC import is rejected.
    expect(forbiddenSources.every((source) => matchesAny(source, rendererIsolationPatterns))).toBe(
      true,
    )
  })

  it("permits renderer-safe Electron type and contract imports", () => {
    // Given: the two renderer-safe Electron import forms.
    const allowedSources = [
      'import type { PromptAsset } from "../../electron/ipc-types"',
      'import { promptQualityGradeForScore } from "../../electron/prompt-quality-contract"',
    ]

    // When: the renderer isolation patterns scan those allowed imports.

    // Then: both established renderer-safe import forms remain available.
    expect(allowedSources.some((source) => matchesAny(source, rendererIsolationPatterns))).toBe(
      false,
    )
  })

  it("keeps prompt body fields out of production logs", async () => {
    // Given: prompt-quality code and its Electron and renderer boundaries.
    const qualityBoundarySource = await readProductionSource(["electron", "renderer/src"])

    // When: log calls that include prompt-bearing fields are scanned.

    // Then: prompt, review, and context bodies cannot be emitted to logs.
    expect(qualityBoundarySource).not.toMatch(promptBodyLogPattern)
  })

  it("rejects console log calls that include prompt-bearing fields", () => {
    // Given: a log call containing an original prompt field.
    const sources = ["console.log(originalInput)", "console.log(prompt)"]

    // When: the prompt-body logging pattern scans the call.

    // Then: the log call is rejected before it can reach production source.
    expect(sources.every((source) => promptBodyLogPattern.test(source))).toBe(true)
  })

  it("allows repo path storage but rejects filesystem reads and scans in repo-path source files", async () => {
    // Given: production source files that legitimately define or persist repo_path values.
    const productionSourceFiles = await readProductionSourceFiles([
      "electron",
      "renderer/src",
      "drizzle",
    ])
    const repoPathSourceFiles = productionSourceFiles.filter(({ source }) =>
      repoPathReference.test(source),
    )

    // When: repo_path-bearing files are checked for filesystem reads or repository scans.

    // Then: storage is retained while readFile(profile.repoPath)-style behavior is rejected.
    expect(repoPathSourceFiles).not.toEqual([])
    expect(matchingSourcePaths(repoPathSourceFiles, [filesystemReadOrScan])).toEqual([])
  })
})
