import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

import {
  dependencyManifestSchema,
  expectedDependencies,
  expectedDevDependencies,
  forbiddenMachineSurfacePatterns,
  forbiddenPrivacyBehaviorPatterns,
  overwriteImportStrategyPatterns,
  passphraseLogPattern,
  passphrasePersistencePatterns,
  rawEvidenceBoundaryPatterns,
  rawEvidenceFieldPatterns,
  readPhase19ProductionFiles,
  rendererPrivacyIsolationPatterns,
} from "./phase19-guardrail-helpers"
import {
  matchesAny,
  matchingSourcePaths,
  repoPathFilesystemPatterns,
  repoPathReference,
} from "./source-guardrail-helpers"

describe("Phase 19 privacy and encrypted backup source guardrails", () => {
  it("keeps run storage, quick-capture settings, and shortcut APIs absent", async () => {
    // Given: current and future production source roots plus malformed machine surfaces.
    const files = await readPhase19ProductionFiles()
    const fixtures = [
      ...["prompt_runs", "agent_runs", "execution_results", "validation_results", "run_logs"].map(
        (table) => `sqliteTable("${table}", {})`,
      ),
      "export const AgentRunSchema = z.object({})",
      'database.prepare("INSERT INTO execution_results VALUES (?)")',
      'const channel = "prompter:prompt-runs:create"',
      'settings.set("quick_capture_enabled", true)',
      "export const QuickCaptureSettingsSchema = z.object({})",
      "export const RegisterGlobalShortcutInputSchema = z.object({})",
      'import { globalShortcut } from "electron"',
      "window.prompter.appEvents.onReady(callback)",
      "readonly shortcuts: { register: RegisterShortcut }",
    ]

    // When: forbidden Phase 19 machine identifiers and definitions are scanned.

    // Then: production is clean and each prohibited category is detectable.
    expect(matchingSourcePaths(files, forbiddenMachineSurfacePatterns)).toEqual([])
    expect(fixtures.every((source) => matchesAny(source, forbiddenMachineSurfacePatterns))).toBe(
      true,
    )
  })

  it("keeps renderer privacy modules isolated from main-process dependencies", async () => {
    // Given: privacy-owned renderer files, which may not exist yet, and runtime import fixtures.
    const files = (await readPhase19ProductionFiles()).filter(
      ({ path }) => path.startsWith("renderer/src/") && /privacy/i.test(path),
    )
    const fixtures = [
      'import { ipcRenderer } from "electron"',
      'import { createHash } from "node:crypto"',
      'import crypto from "crypto"',
      'import { readFile } from "fs/promises"',
      'import path from "path"',
      'import process from "process"',
      'import Database from "better-sqlite3"',
      'import { sql } from "drizzle-orm"',
    ]

    // When: established renderer isolation patterns scan privacy modules and fixtures.

    // Then: absence is safe and every prohibited runtime dependency is rejected.
    expect(matchingSourcePaths(files, rendererPrivacyIsolationPatterns)).toEqual([])
    expect(fixtures.every((source) => matchesAny(source, rendererPrivacyIsolationPatterns))).toBe(
      true,
    )
  })

  it("keeps privacy modules local-only and free of automatic redaction", async () => {
    // Given: every discovered privacy-owned production file and forbidden behavior fixtures.
    const files = (await readPhase19ProductionFiles()).filter(({ path }) => /privacy/i.test(path))
    const fixtures = [
      'import OpenAI from "openai"',
      'import { compilePrompt } from "../prompt-compiler/prompt-compiler-service"',
      "createOpenAIResponseClient(apiKey)",
      "promptCompiler.analyze(input)",
      "redactSensitivePayload(input)",
      "const result = { redactedDraft: nextDraft }",
    ]

    // When: LLM-service and redaction behavior patterns scan those sources.

    // Then: privacy remains a local scanner/warning surface and fixtures prove sensitivity.
    expect(matchingSourcePaths(files, forbiddenPrivacyBehaviorPatterns)).toEqual([])
    expect(fixtures.every((source) => matchesAny(source, forbiddenPrivacyBehaviorPatterns))).toBe(
      true,
    )
  })

  it("allows repo-path metadata but rejects filesystem dereferencing", async () => {
    // Given: production files that reference repoPath and malformed filesystem operations.
    const files = (await readPhase19ProductionFiles()).filter(({ source }) =>
      repoPathReference.test(source),
    )
    const fixtures = [
      "readFile(profile.repoPath, 'utf8')",
      "resolve(project.repo_path, 'AGENTS.md')",
      "scanRepository(repoPath)",
    ]

    // When: repo-path filesystem patterns scan metadata-bearing files.

    // Then: metadata remains allowed while every dereference form is detectable.
    expect(files).not.toEqual([])
    expect(matchingSourcePaths(files, repoPathFilesystemPatterns)).toEqual([])
    expect(fixtures.every((source) => matchesAny(source, repoPathFilesystemPatterns))).toBe(true)
  })

  it("keeps backup passphrases out of persistence and logs", async () => {
    // Given: production source plus persistence and logging fixtures.
    const files = await readPhase19ProductionFiles()
    const persistenceFixtures = [
      'settings.set("backup_passphrase", passphrase)',
      'localStorage.setItem("backup-passphrase", passphrase)',
      "keychain.setPassword(account, passphrase)",
      "safeStorage.encryptString(passphrase)",
      'passphrase: text("passphrase")',
    ]
    const logFixtures = ["console.log(passphrase)", "logger.info({ passphrase })"]

    // When: structural persistence and log-call patterns scan production and fixtures.

    // Then: passphrases can cross encryption APIs but cannot be retained or emitted.
    expect(matchingSourcePaths(files, passphrasePersistencePatterns)).toEqual([])
    expect(files.filter(({ source }) => passphraseLogPattern.test(source))).toEqual([])
    expect(
      persistenceFixtures.every((source) => matchesAny(source, passphrasePersistencePatterns)),
    ).toBe(true)
    expect(logFixtures.every((source) => passphraseLogPattern.test(source))).toBe(true)
  })

  it("keeps raw evidence fields out of privacy contracts", async () => {
    // Given: renderer-facing boundaries and privacy schema/type files, if present.
    const files = await readPhase19ProductionFiles()
    const privacyFiles = files.filter(({ path }) => /privacy/i.test(path))
    const boundaryFiles = files.filter(({ path }) =>
      /electron\/(?:ipc-contract|ipc-types|bridge|bridge-types|preload)\.ts$/.test(path),
    )
    const fixtures = [
      "type SensitiveFinding = { readonly evidence: string }",
      "const SensitiveFindingSchema = z.object({ rawEvidence: z.string() })",
      "type SensitiveScanResult = { matchedValue?: string }",
    ]

    // When: raw-value contract keys are scanned without matching evidenceMasked.

    // Then: only masked evidence can cross a Phase 19 contract boundary.
    expect(matchingSourcePaths(privacyFiles, rawEvidenceFieldPatterns)).toEqual([])
    expect(matchingSourcePaths(boundaryFiles, rawEvidenceBoundaryPatterns)).toEqual([])
    expect(fixtures.every((source) => matchesAny(source, rawEvidenceBoundaryPatterns))).toBe(true)
    expect(matchesAny("readonly evidenceMasked: string", rawEvidenceFieldPatterns)).toBe(false)
  })

  it("keeps backup import conflict handling duplicate-only", async () => {
    // Given: backup-owned production files and overwrite strategy declarations.
    const files = (await readPhase19ProductionFiles()).filter(({ path }) => /backup/i.test(path))
    const fixtures = [
      'const options = { strategy: "overwrite" }',
      'type ImportConflictStrategy = "duplicate" | "overwrite"',
      'const ImportModeSchema = z.enum(["duplicate", "overwrite"])',
      "overwriteExisting(input)",
    ]

    // When: machine-consumed import strategy syntax is scanned.

    // Then: warning copy remains unrestricted while overwrite behavior is rejected.
    expect(matchingSourcePaths(files, overwriteImportStrategyPatterns)).toEqual([])
    expect(fixtures.every((source) => matchesAny(source, overwriteImportStrategyPatterns))).toBe(
      true,
    )
  })

  it("adds Phase 19 without adding package dependencies", async () => {
    // Given: the package manifest parsed at its JSON boundary.
    const manifest = dependencyManifestSchema.parse(
      JSON.parse(await readFile("package.json", "utf8")),
    )

    // When: runtime and development dependency names are compared with the Phase 18 baseline.

    // Then: built-in Node crypto and the existing stack remain sufficient for Phase 19.
    expect(Object.keys(manifest.dependencies).sort()).toEqual([...expectedDependencies].sort())
    expect(Object.keys(manifest.devDependencies).sort()).toEqual(
      [...expectedDevDependencies].sort(),
    )
  })
})
