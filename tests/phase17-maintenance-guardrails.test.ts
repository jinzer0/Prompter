import { readdir, readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

import {
  matchesAny,
  matchingSourcePaths,
  readProductionSourceFiles,
  rendererIsolationPatterns,
  repoPathFilesystemPatterns,
} from "./source-guardrail-helpers"

const contractAndSchemaPaths = [
  "electron/ipc-contract.ts",
  "electron/ipc-types.ts",
  "electron/bridge.ts",
  "electron/bridge-types.ts",
  "electron/preload.ts",
  "electron/db/schema.ts",
] as const

const forbiddenPersistencePatterns = [
  /\b(?:prompt_runs|agent_runs|execution_results|validation_results|run_logs|maintenance_reports)\b/,
  /\b(?:PromptRun|AgentRun|ExecutionResult|ValidationResult|RunLog|MaintenanceReport)Schema\b/,
  /\b(?:PROMPT_RUN|AGENT_RUN|EXECUTION_RESULT|VALIDATION_RESULT|RUN_LOG|MAINTENANCE_REPORT)[A-Z0-9_]*CHANNEL\b/,
  /["'][^"']*(?:prompt[-_:]runs?|agent[-_:]runs?|execution[-_:]results?|validation[-_:]results?|run[-_:]logs?|maintenance[-_:]reports?)[^"']*["']/i,
  /\b(?:archive(?:d)?(?:_at|At)|is_archived|isArchived|archive_status|archiveStatus|soft_deleted_at|softDeletedAt|deleted_at|deletedAt|is_deleted|isDeleted)\b/,
  /\b(?:quick_capture_[A-Za-z0-9_]*|quickCapture(?:Enabled|Settings|Preferences)|QuickCapture(?:Settings|Preferences)Schema)\b/,
] as const

const phase17RendererIsolationPatterns = [
  ...rendererIsolationPatterns,
  /\bimport\.meta\.env\b/,
  /(?:from\s+|import\s*\()\s*["'][^"']*electron\/(?:maintenance|db\/)[^"']*["']/,
] as const

const forbiddenMaintenanceIntegrationPatterns = [
  ...forbiddenPersistencePatterns,
  ...repoPathFilesystemPatterns,
  /(?:from\s+|import\s*\()\s*["'][^"']*(?:prompt-compiler|prompt-quality\/prompt-quality-service|open-ai-client|openai)[^"']*["']/,
  /\b(?:promptCompilerAnalyze|promptCompilerCompile|review(?:PromptQuality)?WithLLM|getOpenAIKeyForMainProcessOnly|createOpenAIResponseClient)\s*\(/,
  /(?:from\s+|import\s*\()\s*["'](?:node:)?(?:fs|path|child_process)(?:\/[^"']*)?["']/,
  /\b(?:child_process|execFile(?:Sync)?|spawn(?:Sync)?|simpleGit|isomorphicGit)\b/,
  /\b(?:scanRepository|crawlRepository|walkRepository|runGit|gitCommand)\s*\(/,
  /\bglobalShortcut\b/,
  /\b(?:window\.)?prompter\.(?:appEvents|shortcuts)\b/,
  /\b(?:automatic\w*backup\w*|backup\w*schedul\w*|schedul\w*backup\w*|backup\w*background\w*|background\w*backup\w*)\b/i,
  /\b(?:exportFullBackup|exportProjectBackup|exportPromptAssetsBackup)\s*\(/,
] as const

const vitestImportMarker = ["from", '"vitest"'].join(" ")
const playwrightImportMarker = ["from", '"@playwright/test"'].join(" ")

describe("Phase 17 maintenance source guardrails", () => {
  it("keeps forbidden tables, channels, schemas, columns, and settings out of persistence surfaces", async () => {
    // Given: contract, bridge, schema, and migration files that can add persisted or IPC surfaces.
    const contractAndSchemaFiles = await Promise.all(
      contractAndSchemaPaths.map(async (path) => ({ path, source: await readFile(path, "utf8") })),
    )
    const migrationFiles = await readProductionSourceFiles(["drizzle"])

    // When: Phase 17 persistence exclusions are scanned at their definition boundaries.
    const forbiddenPaths = matchingSourcePaths(
      [...contractAndSchemaFiles, ...migrationFiles],
      forbiddenPersistencePatterns,
    )

    // Then: no run storage, reports, archive/soft-delete columns, or quick-capture settings exist.
    expect(forbiddenPaths).toEqual([])
  })

  it("detects seeded forbidden persistence and contract surfaces", () => {
    // Given: malformed fixtures covering every forbidden persistence category.
    const forbiddenSources = [
      ...[
        "prompt_runs",
        "agent_runs",
        "execution_results",
        "validation_results",
        "run_logs",
        "maintenance_reports",
      ].map((table) => `sqliteTable("${table}", {})`),
      "export const PromptRunSchema = z.object({})",
      'const PROMPT_RUN_CREATE_CHANNEL = "prompter:prompt-runs:create"',
      'archivedAt: integer("archived_at")',
      'deletedAt: integer("deleted_at")',
      'settings.set("quick_capture_enabled", true)',
    ]

    // When: each fixture is checked by the production persistence matcher.

    // Then: every prohibited spelling is independently detectable.
    expect(
      forbiddenSources.every((source) => matchesAny(source, forbiddenPersistencePatterns)),
    ).toBe(true)
  })

  it("keeps renderer imports isolated from runtime, environment, and main maintenance utilities", async () => {
    // Given: every renderer source file and representative forbidden import forms.
    const rendererFiles = await readProductionSourceFiles(["renderer/src"])
    const forbiddenImports = [
      'import { ipcRenderer } from "electron"',
      'import { readFile } from "node:fs/promises"',
      'import path from "path"',
      'import Database from "better-sqlite3"',
      'import { sql } from "drizzle-orm"',
      'import { detectDuplicates } from "../../../electron/maintenance/detection"',
      "const mode = import.meta.env.MODE",
      "const home = process.env.HOME",
    ]

    // When: renderer isolation patterns scan production and malformed fixture content.

    // Then: production stays isolated and every prohibited renderer dependency is detectable.
    expect(matchingSourcePaths(rendererFiles, phase17RendererIsolationPatterns)).toEqual([])
    expect(
      forbiddenImports.every((source) => matchesAny(source, phase17RendererIsolationPatterns)),
    ).toBe(true)
  })

  it("keeps maintenance modules local, read-only, and disconnected from automation", async () => {
    // Given: present and future production files whose path identifies Maintenance ownership.
    const productionFiles = await readProductionSourceFiles(["electron", "renderer/src"])
    const maintenanceFiles = productionFiles.filter(({ path }) => /maintenance/i.test(path))
    const forbiddenSources = [
      'import { createPromptCompilerService } from "../prompt-compiler/prompt-compiler-service"',
      "services.promptCompilerCompile(input)",
      "services.reviewWithLLM()",
      "services.reviewPromptQualityWithLLM()",
      "readFile(profile.repoPath, 'utf8')",
      "resolve(project.repo_path, 'AGENTS.md')",
      "scanRepository(repoPath)",
      'import { execFile } from "node:child_process"',
      'import { globalShortcut } from "electron"',
      "window.prompter.appEvents.onReady(callback)",
      "window.prompter.shortcuts.register(input)",
      "automaticBackupScheduler.start()",
      "exportFullBackup(input)",
    ]

    // When: maintenance files and seeded integrations are checked for forbidden dependencies.

    // Then: Maintenance remains local-only and every prohibited integration is detectable.
    expect(matchingSourcePaths(maintenanceFiles, forbiddenMaintenanceIntegrationPatterns)).toEqual(
      [],
    )
    expect(
      forbiddenSources.every((source) =>
        matchesAny(source, forbiddenMaintenanceIntegrationPatterns),
      ),
    ).toBe(true)
  })

  it("reports a forbidden string from mock maintenance file content", () => {
    // Given: a mock renderer Maintenance file containing a prohibited Node import.
    const fixturePath = "renderer/src/hooks/use-maintenance.ts"
    const fixtureFiles = [
      { path: fixturePath, source: 'import { readFile } from "node:fs/promises"' },
    ]

    // When: the same matcher used for repository files scans the fixture.
    const forbiddenPaths = matchingSourcePaths(fixtureFiles, phase17RendererIsolationPatterns)

    // Then: the fixture is reported, proving a forbidden addition makes the guardrail fail.
    expect(forbiddenPaths).toEqual([fixturePath])
  })

  it("discovers every Phase 17 test with exactly one configured runner", async () => {
    // Given: all present and future phase17-*.test.ts files plus explicit runner configs.
    const testFiles = (await readdir("tests")).filter((name) => /^phase17-.*\.test\.ts$/.test(name))
    const sources = await Promise.all(
      testFiles.map(async (name) => ({ name, source: await readFile(`tests/${name}`, "utf8") })),
    )
    const vitestConfig = await readFile("vitest.config.ts", "utf8")
    const playwrightConfig = await readFile("playwright.config.ts", "utf8")
    const vitestFiles = sources.filter(({ source }) => source.includes(vitestImportMarker))
    const playwrightFiles = sources.filter(({ source }) => source.includes(playwrightImportMarker))

    // When: each Phase 17 file is classified and checked against its runner whitelist.

    // Then: no file is unclassified, ambiguous, omitted, or registered with both runners.
    expect(sources).not.toEqual([])
    expect(vitestFiles.length + playwrightFiles.length).toBe(sources.length)
    expect(
      sources.filter(
        ({ source }) =>
          source.includes(vitestImportMarker) && source.includes(playwrightImportMarker),
      ),
    ).toEqual([])
    expect(vitestFiles.every(({ name }) => vitestConfig.includes(`"tests/${name}"`))).toBe(true)
    expect(playwrightFiles.every(({ name }) => playwrightConfig.includes(`"${name}"`))).toBe(true)
  })
})
