import { readdir, readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

import {
  matchesAny,
  matchingSourcePaths,
  readProductionSource,
  readProductionSourceFiles,
  rendererIsolationPatterns,
  repoPathFilesystemPatterns,
  repoPathReference,
} from "./source-guardrail-helpers"

const approvedBackupMethods = [
  "exportFullBackup",
  "exportProjectBackup",
  "exportPromptAssetsBackup",
  "exportPromptTemplatesPack",
  "exportHarnessTemplatesPack",
  "validateBackupFile",
  "importBackup",
  "cancelImportSession",
] as const

const forbiddenSourceCases = [
  {
    source: 'sqliteTable("prompt_asset_lineage", {})',
    pattern: /\bprompt_asset_lineage\b/,
  },
  {
    source: 'sqliteTable("prompt_runs", {})',
    pattern: /\b(?:prompt_runs|agent_runs|execution_results|validation_results|run_logs)\b/,
  },
  {
    source: "export const ExecutionResultSchema = z.object({})",
    pattern: /\b(?:PromptRun|AgentRun|ExecutionResult|ValidationResult|RunLog)Schema\b/,
  },
  { source: 'import { globalShortcut } from "electron"', pattern: /\bglobalShortcut\b/ },
  { source: "window.prompter.appEvents.onReady(callback)", pattern: /\bappEvents\b/ },
  { source: "window.prompter.shortcuts.register(input)", pattern: /\bshortcuts\b/ },
  { source: 'settings.set("quick_capture_enabled", true)', pattern: /\bquick_capture_\w*\b/ },
  {
    source: "encryptBackupFile(envelope)",
    pattern: /\b(?:backup\w*encrypt\w*|encrypt\w*backup\w*)/i,
  },
  { source: "backupScheduler.start()", pattern: /\b(?:backup\w*schedul\w*|schedul\w*backup\w*)/i },
  {
    source: "backgroundBackupJob.run()",
    pattern: /\b(?:backup\w*background\w*|background\w*backup\w*)/i,
  },
  { source: "remoteBackupUpload(file)", pattern: /\b(?:backup\w*remote\w*|remote\w*backup\w*)/i },
  { source: "cloudBackupSync.start()", pattern: /\b(?:backup\w*cloud\w*|cloud\w*backup\w*)/i },
] as const

const backupResponseLeakCases = [
  {
    source: "type BackupExportResult = { readonly filePath: string }",
    pattern:
      /\b(?:backup\w*|(?:export|validate|import)\w*backup\w*)(?:result|response|preview)(?:schema)?\b[\s\S]{0,320}\bfilePath\s*:/i,
  },
  {
    source: "type BackupValidationResponse = { readonly data: BackupEnvelope }",
    pattern:
      /\b(?:backup\w*|(?:export|validate|import)\w*backup\w*)(?:result|response|preview)(?:schema)?\b[\s\S]{0,320}\bdata\s*:/i,
  },
] as const

const forbiddenSourcePatterns = forbiddenSourceCases.map(({ pattern }) => pattern)
const backupResponseLeakPatterns = backupResponseLeakCases.map(({ pattern }) => pattern)
const vitestImportMarker = ["from", '"vitest"'].join(" ")
const playwrightImportMarker = ["from", '"@playwright/test"'].join(" ")

function backupBlocks(source: string): readonly string[] {
  const blocks: string[] = []
  const declaration = /(?:readonly\s+)?\bbackup\b\s*:\s*\{/g

  for (const match of source.matchAll(declaration)) {
    const openingBrace = source.indexOf("{", match.index)
    let depth = 1

    for (let index = openingBrace + 1; index < source.length; index += 1) {
      const character = source[index]
      if (character === "{") {
        depth += 1
      } else if (character === "}") {
        depth -= 1
      }
      if (depth === 0) {
        blocks.push(source.slice(openingBrace + 1, index))
        break
      }
    }
  }

  return blocks
}

function extractBackupMethods(source: string): readonly string[] {
  const methods: string[] = []

  for (const block of backupBlocks(source)) {
    for (const property of block.matchAll(/^\s+(?:readonly\s+)?([A-Za-z][A-Za-z0-9]*)\s*:/gm)) {
      const method = property[1]
      if (method !== undefined) {
        methods.push(method)
      }
    }
  }

  for (const match of source.matchAll(/\bwindow\.prompter\.backup\.([A-Za-z][A-Za-z0-9]*)/g)) {
    const method = match[1]
    if (method !== undefined) {
      methods.push(method)
    }
  }

  return [...new Set(methods)].sort()
}

function isApprovedBackupSurface(methods: readonly string[]): boolean {
  if (methods.length === 0) {
    return true
  }

  const expected = [...approvedBackupMethods].sort()
  return (
    methods.length === expected.length &&
    methods.every((method, index) => method === expected[index])
  )
}

describe("Phase 16 backup source guardrails", () => {
  it("keeps forbidden Phase 16 scope surfaces out of production source", async () => {
    // Given: only production Electron, renderer, and migration sources.
    const productionSource = await readProductionSource()

    // When: the Phase 16 scope exclusions are scanned.

    // Then: execution, shortcuts, and non-local backup capabilities remain absent.
    expect(matchesAny(productionSource, forbiddenSourcePatterns)).toBe(false)
  })

  it("detects every seeded forbidden Phase 16 source pattern", () => {
    // Given: one malformed source snippet for every forbidden identifier category.

    // When: each snippet is checked by its corresponding guardrail pattern.

    // Then: every individual pattern proves it can detect the prohibited code.
    expect(forbiddenSourceCases.every(({ source, pattern }) => pattern.test(source))).toBe(true)
  })

  it("keeps renderer runtime imports isolated from Node, Electron, and database packages", async () => {
    // Given: production renderer files and representative prohibited runtime imports.
    const rendererFiles = await readProductionSourceFiles(["renderer/src"])
    const forbiddenImports = [
      'import { ipcRenderer } from "electron"',
      'import { readFile } from "node:fs/promises"',
      'import Database from "better-sqlite3"',
      'import { sql } from "drizzle-orm"',
    ]

    // When: the established renderer isolation patterns scan both source groups.

    // Then: production is isolated and every malformed import is detectable.
    expect(matchingSourcePaths(rendererFiles, rendererIsolationPatterns)).toEqual([])
    expect(forbiddenImports.every((source) => matchesAny(source, rendererIsolationPatterns))).toBe(
      true,
    )
  })

  it("allows repo path metadata but rejects filesystem reads and scans", async () => {
    // Given: production files with repo-path metadata and seeded repo I/O attempts.
    const productionFiles = await readProductionSourceFiles(["electron", "renderer/src", "drizzle"])
    const repoPathFiles = productionFiles.filter(({ source }) => repoPathReference.test(source))
    const forbiddenRepoIo = [
      "readFile(profile.repoPath, 'utf8')",
      "resolve(project.repo_path, 'AGENTS.md')",
      "scanRepository(repoPath)",
    ]

    // When: only repo-path-bearing files and malformed snippets are scanned for I/O.

    // Then: metadata remains valid while reads, path resolution, and scans are rejected.
    expect(repoPathFiles).not.toEqual([])
    expect(matchingSourcePaths(repoPathFiles, repoPathFilesystemPatterns)).toEqual([])
    expect(forbiddenRepoIo.every((source) => matchesAny(source, repoPathFilesystemPatterns))).toBe(
      true,
    )
  })

  it("keeps file paths and parsed data out of renderer-facing backup responses", async () => {
    // Given: renderer-facing contract and bridge files plus malformed response shapes.
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

    // When: backup result fields are scanned for renderer path or payload leakage.

    // Then: production remains narrow and each prohibited response field is detectable.
    expect(matchesAny(bridgeSource, backupResponseLeakPatterns)).toBe(false)
    expect(backupResponseLeakCases.every(({ source, pattern }) => pattern.test(source))).toBe(true)
  })

  it("allows no backup bridge yet or exactly the approved future backup methods", async () => {
    // Given: current bridge surfaces and seeded approved and unexpected future namespaces.
    const productionSource = await readProductionSource(["electron", "renderer/src"])
    const approvedSource = `backup: {
${approvedBackupMethods.map((method) => `  ${method}: handler,`).join("\n")}
}`
    const unexpectedSource = `${approvedSource}\nwindow.prompter.backup.uploadToCloud()`

    // When: backup namespace declarations and renderer method accesses are extracted.
    const currentMethods = extractBackupMethods(productionSource)

    // Then: absence is allowed until Todo 2, while any introduced surface must be exact.
    expect(isApprovedBackupSurface(currentMethods)).toBe(true)
    expect(extractBackupMethods(approvedSource)).toEqual([...approvedBackupMethods].sort())
    expect(isApprovedBackupSurface(extractBackupMethods(unexpectedSource))).toBe(false)
  })

  it("discovers every Phase 16 test with exactly one configured runner", async () => {
    // Given: all present and future phase16-*.test.ts files plus explicit runner configs.
    const testFiles = (await readdir("tests")).filter((name) => /^phase16-.*\.test\.ts$/.test(name))
    const sources = await Promise.all(
      testFiles.map(async (name) => ({ name, source: await readFile(`tests/${name}`, "utf8") })),
    )
    const vitestConfig = await readFile("vitest.config.ts", "utf8")
    const playwrightConfig = await readFile("playwright.config.ts", "utf8")
    const vitestFiles = sources.filter(({ source }) => source.includes(vitestImportMarker))
    const playwrightFiles = sources.filter(({ source }) => source.includes(playwrightImportMarker))

    // When: each Phase 16 file is classified and checked against its runner whitelist.

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
