import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

import {
  extractPromptTemplateTableDefinitions,
  matchesAny,
  matchingSourcePaths,
  readProductionSource,
  readProductionSourceFiles,
  rendererIsolationPatterns,
  repoPathFilesystemPatterns,
  repoPathReference,
} from "./source-guardrail-helpers"

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

const promptBodyLogPattern =
  /(?:console|logger|log)\.(?:log|debug|info|warn|error)\s*\((?:(?!\)\s*;)[\s\S]){0,240}\b(?:compiledPrompt|originalInput|projectContext|constraints|acceptanceCriteria|validationCommands|improvedPromptDraft|promptBody|promptText|prompt)\b/

const phase15ForbiddenSurfacePatterns = [
  /\bprompt_asset_lineage\b/,
  /\bprompt_runs\b/,
  /\bagent_runs\b/,
  /\bexecution_results\b/,
  /\bvalidation_results\b/,
  /\brun_logs\b/,
  /\bPromptRunSchema\b/,
  /\bExecutionResultSchema\b/,
  /\bQuickCaptureSettingsSchema\b/,
  /\bRegisterGlobalShortcutInputSchema\b/,
  /\bglobalShortcut\b/,
  /\bwindow\.prompter\.(?:appEvents|shortcuts)\b/,
  /\bquick_capture_[A-Za-z0-9_]*\b/,
] as const

const forbiddenPromptTemplateApiPatterns = [
  /\bpromptTemplates\s*\.\s*(?:preview|extractVariables)\b/,
  /\b(?:readonly\s+)?(?:preview|extractVariables)\s*:\s*\([^)]*\)\s*=>/,
  /\b(?:preview|extractVariables)\s*\([^)]*\)\s*\{/,
  /\b(?:previewPromptTemplate|extractPromptTemplateVariables)\b/,
  /\bprompter:prompt-templates:(?:preview|extract-variables)\b/,
  /\blistChildren\b/,
] as const

const forbiddenPromptTemplateColumnPatterns = [
  /^\s*[`"]?(?:variables|tags)[`"]?\s+(?:text|integer|real|blob|numeric)\b/im,
  /\b(?:variables|tags)\s*:/,
] as const

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
      'import crypto from "node:crypto"',
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
    expect(matchingSourcePaths(repoPathSourceFiles, repoPathFilesystemPatterns)).toEqual([])
  })

  it("rejects seeded repo-path reads and scans without rejecting metadata storage", () => {
    // Given: direct repo-path I/O attempts and the existing metadata-only forms.
    const forbiddenSources = [
      "readFile(profile.repoPath, 'utf8')",
      "resolve(project.repo_path, 'AGENTS.md')",
      "scanRepository(repoPath)",
    ]
    const allowedSources = ["repoPath: nullableTextSchema", 'repoPath: text("repo_path")']

    // When: repo-path I/O patterns scan both source groups.

    // Then: I/O is rejected while storage and contract metadata remain valid.
    expect(forbiddenSources.every((source) => matchesAny(source, repoPathFilesystemPatterns))).toBe(
      true,
    )
    expect(allowedSources.some((source) => matchesAny(source, repoPathFilesystemPatterns))).toBe(
      false,
    )
  })

  it("keeps Phase 15 forbidden schemas, tables, settings, and bridge surfaces absent", async () => {
    // Given: current production Electron, renderer, and migration sources.
    const productionSource = await readProductionSource()

    // When: exact Phase 15 forbidden identifiers are scanned.

    // Then: execution, shortcut namespace, and quick-capture settings additions stay absent.
    expect(productionSource).not.toMatch(
      new RegExp(phase15ForbiddenSurfacePatterns.map((pattern) => pattern.source).join("|")),
    )
  })

  it("keeps template preview, variable extraction, and listChildren out of IPC and bridge files", async () => {
    // Given: every registry and renderer-facing bridge file that can expose an IPC surface.
    const bridgeSource = (
      await Promise.all(
        [
          "electron/ipc-contract.ts",
          "electron/ipc-types.ts",
          "electron/bridge.ts",
          "electron/bridge-types.ts",
          "electron/preload.ts",
        ].map((path) => readFile(path, "utf8")),
      )
    ).join("\n")

    // When: forbidden prompt-template API spellings and channels are scanned.

    // Then: only local renderer preview/extraction can be introduced in later Phase 15 work.
    expect(matchesAny(bridgeSource, forbiddenPromptTemplateApiPatterns)).toBe(false)
  })

  it("rejects seeded Phase 15 forbidden surfaces", () => {
    // Given: one malformed source fixture for each forbidden contract or bridge category.
    const forbiddenSources = [
      'export const promptAssetLineage = sqliteTable("prompt_asset_lineage", {})',
      "export const PromptRunSchema = z.object({})",
      "export const ExecutionResultSchema = z.object({})",
      "export const QuickCaptureSettingsSchema = z.object({})",
      "export const RegisterGlobalShortcutInputSchema = z.object({})",
      'import { globalShortcut } from "electron"',
      "window.prompter.appEvents.onReady(callback)",
      "window.prompter.shortcuts.register(input)",
      'settings.set("quick_capture_enabled", true)',
      "window.prompter.promptTemplates.preview(input)",
      "window.prompter.promptTemplates.extractVariables(body)",
      "window.prompter.promptTemplates.listChildren(id)",
      "readonly preview: (input: PreviewInput) => Promise<PreviewResult>",
      "extractVariables: (body: string) => []",
    ]
    const allForbiddenPatterns = [
      ...phase15ForbiddenSurfacePatterns,
      ...forbiddenPromptTemplateApiPatterns,
    ]

    // When: the Phase 15 source guardrails scan every malformed fixture.

    // Then: each forbidden addition is independently detectable.
    expect(forbiddenSources.every((source) => matchesAny(source, allForbiddenPatterns))).toBe(true)
  })

  it("forbids variables and tags only as prompt_templates database columns", async () => {
    // Given: current schema/migrations plus valid and invalid prompt_templates definitions.
    const databaseSource = await readProductionSource(["electron/db", "drizzle"])
    const currentDefinitions = extractPromptTemplateTableDefinitions(databaseSource)
    const validDefinition = extractPromptTemplateTableDefinitions(`
      CREATE TABLE \`prompt_templates\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`template_body\` text NOT NULL
      );
    `)
    const invalidDefinitions = extractPromptTemplateTableDefinitions(`
      CREATE TABLE \`prompt_templates\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`variables\` text,
        \`tags\` text
      );
      const promptTemplates = sqliteTable("prompt_templates", {
        id: text("id").primaryKey(),
        variables: text("variables"),
        tags: text("tags"),
      })
    `)

    // When: only extracted prompt_templates table bodies are checked for forbidden columns.

    // Then: unrelated tags remain allowed, while variables/tags columns are rejected.
    expect(
      currentDefinitions.some((source) =>
        matchesAny(source, forbiddenPromptTemplateColumnPatterns),
      ),
    ).toBe(false)
    expect(
      validDefinition.some((source) => matchesAny(source, forbiddenPromptTemplateColumnPatterns)),
    ).toBe(false)
    expect(invalidDefinitions).toHaveLength(2)
    expect(
      invalidDefinitions.every((source) =>
        matchesAny(source, forbiddenPromptTemplateColumnPatterns),
      ),
    ).toBe(true)
  })
})
