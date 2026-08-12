import { readdir } from "node:fs/promises"
import { z } from "zod"

import {
  productionSourceRoots,
  readProductionSourceFiles,
  rendererIsolationPatterns,
} from "./source-guardrail-helpers"

export const expectedDependencies = [
  "better-sqlite3",
  "class-variance-authority",
  "clsx",
  "drizzle-orm",
  "openai",
  "react",
  "react-dom",
  "tailwind-merge",
  "zod",
] as const

export const expectedDevDependencies = [
  "@biomejs/biome",
  "@electron/rebuild",
  "@playwright/test",
  "@tailwindcss/vite",
  "@types/better-sqlite3",
  "@types/node",
  "@types/react",
  "@types/react-dom",
  "@vitejs/plugin-react",
  "concurrently",
  "cross-env",
  "drizzle-kit",
  "electron",
  "esbuild",
  "tailwindcss",
  "typescript",
  "vite",
  "vitest",
  "wait-on",
] as const

export const dependencyManifestSchema = z.object({
  dependencies: z.record(z.string(), z.string()),
  devDependencies: z.record(z.string(), z.string()),
})

export const forbiddenMachineSurfacePatterns = [
  /\b(?:promptRuns|agentRuns|executionResults|validationResults|runLogs)\b/,
  /\b(?:PromptRun|AgentRun|ExecutionResult|ValidationResult|RunLog)Schema\b/,
  /\bsqliteTable\s*\(\s*["'](?:prompt_runs|agent_runs|execution_results|validation_results|run_logs)["']/,
  /\bCREATE\s+TABLE\s+[`"]?(?:prompt_runs|agent_runs|execution_results|validation_results|run_logs)\b/i,
  /\b(?:FROM|INTO|UPDATE|JOIN)\s+[`"]?(?:prompt_runs|agent_runs|execution_results|validation_results|run_logs)\b/i,
  /["']prompter:[^"']*(?:prompt[-_:]runs?|agent[-_:]runs?|execution[-_:]results?|validation[-_:]results?|run[-_:]logs?)[^"']*["']/i,
  /\bQuickCapture(?:Settings|Preferences)Schema\b/,
  /\bRegisterGlobalShortcutInputSchema\b/,
  /\bquick_capture_[A-Za-z0-9_]*\s*:/,
  /["']quick_capture_[A-Za-z0-9_]*["']\s*:/,
  /\b(?:text|integer)\s*\(\s*["']quick_capture_[A-Za-z0-9_]*["']/,
  /\bsettings\.(?:set|update|save)\s*\(\s*["']quick_capture_[A-Za-z0-9_]*["']/,
  /\bimport\s*\{[^}]*\bglobalShortcut\b[^}]*\}\s*from\s*["']electron["']/,
  /\bglobalShortcut\.(?:register|registerAll|unregister|unregisterAll|isRegistered)\s*\(/,
  /(?:readonly\s+)?globalShortcut\s*:/,
  /\bwindow\.prompter\.(?:appEvents|shortcuts)\b/,
  /(?:readonly\s+)?(?:appEvents|shortcuts)\s*[?:]/,
] as const

export const rendererPrivacyIsolationPatterns = [
  ...rendererIsolationPatterns,
  /(?:from\s+|import\s*\()\s*["']crypto(?:\/[^"']*)?["']/,
  /\brequire\s*\(\s*["']crypto(?:\/[^"']*)?["']\s*\)/,
] as const

export const forbiddenPrivacyBehaviorPatterns = [
  /(?:from\s+|import\s*\()\s*["'][^"']*(?:openai|open-ai-client|prompt-compiler-service|prompt-quality-service)[^"']*["']/i,
  /\b(?:createOpenAIResponseClient|getOpenAIKeyForMainProcessOnly|promptCompilerAnalyze|promptCompilerCompile|reviewPromptQualityWithLLM)\s*\(/,
  /\b(?:promptCompiler|promptQuality)\.(?:analyze|compile|reviewWithLLM)\s*\(/,
  /\b(?:autoRedact|redactSensitive(?:Text|Payload|Draft)|applyRedaction|replaceSensitive(?:Text|Payload)|removeSensitive(?:Text|Value))\s*\(/,
  /\b(?:redactedText|redactedPayload|redactedDraft)\s*:/,
] as const

export const passphrasePersistencePatterns = [
  /\b(?:localStorage|sessionStorage)\.setItem\s*\([^)]*\bpassphrase\b/is,
  /\b(?:settings|settingsRepository|secretStore|keyStore|keychain|keytar)\.(?:set|save|store|insert|update|write|setPassword)\s*\([^)]*\bpassphrase\b/is,
  /\bsafeStorage\.encryptString\s*\([^)]*\bpassphrase\b/is,
  /\b(?:save|store|persist|remember|cache)(?:Backup)?Passphrase\s*\(/,
  /\b(?:passphrase|backupPassphrase)\s*:\s*(?:text|integer|blob)\s*\(/,
  /^\s*[`"]?(?:passphrase|backup_passphrase)[`"]?\s+(?:text|blob)\b/im,
] as const

export const passphraseLogPattern =
  /(?:console|logger|log)\.(?:log|debug|info|warn|error)\s*\((?:(?!\)\s*;)[\s\S]){0,240}\bpassphrase\b/

export const rawEvidenceFieldPatterns = [
  /(?:readonly\s+)?\b(?:evidence|rawEvidence|evidenceRaw|rawValue|matchedValue)\s*[?:]/,
  /\b(?:evidence|rawEvidence|evidenceRaw|rawValue|matchedValue)\s*:\s*z\./,
] as const

export const rawEvidenceBoundaryPatterns = [
  /\b(?:SensitiveFinding|SensitiveScanResult)\w*\b[\s\S]{0,1200}\b(?:evidence|rawEvidence|evidenceRaw|rawValue|matchedValue)\s*[?:]/,
  /\b(?:evidence|rawEvidence|evidenceRaw|rawValue|matchedValue)\s*[?:][\s\S]{0,1200}\b(?:SensitiveFinding|SensitiveScanResult)\w*\b/,
] as const

export const overwriteImportStrategyPatterns = [
  /\b(?:strategy|resolution|conflictMode|importMode)\s*:\s*["']overwrite["']/i,
  /\b(?:Import|Conflict|Duplicate)\w*(?:Strategy|Resolution|Mode)\b[\s\S]{0,160}["']overwrite["']/i,
  /\bz\.(?:literal|enum)\s*\([^)]*["']overwrite["']/i,
  /\b(?:overwriteExisting|replaceExisting|upsertExisting)\b/,
] as const

export async function readPhase19ProductionFiles() {
  const rootEntries = await readdir(".", { withFileTypes: true })
  const roots = rootEntries.some((entry) => entry.isDirectory() && entry.name === "src")
    ? [...productionSourceRoots, "src"]
    : productionSourceRoots

  return readProductionSourceFiles(roots)
}
