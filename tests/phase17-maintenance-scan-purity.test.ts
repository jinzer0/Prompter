import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"

const scanSourcePaths = [
  "electron/maintenance/scan-service.ts",
  "electron/maintenance/scan-snapshot.ts",
  "electron/maintenance/scan-report-core.ts",
  "electron/maintenance/scan-report.ts",
] as const

const forbiddenScanPatterns = [
  /maintenance-action-session-store/,
  /(?:from\s+|import\s*\()\s*["'][^"']*(?:backup|prompt-compiler|prompt-quality)[^"']*["']/,
  /(?:from\s+|import\s*\()\s*["'](?:node:)?(?:fs|path|http|https|net|tls|child_process)(?:\/[^"']*)?["']/,
  /\b(?:createMaintenanceActionSessionStore|exportFullBackup|exportProjectBackup|exportPromptAssetsBackup|getOpenAIKeyForMainProcessOnly|promptCompilerAnalyze|promptCompilerCompile|reviewPromptQualityWithLLM|fetch|readFile|repo_path|repoPath)\b/,
] as const

describe("Phase 17 maintenance scan purity", () => {
  it("has only database-read and pure-planner production dependencies", async () => {
    // Given: every production module reachable from the scan service.
    const sources = await Promise.all(
      scanSourcePaths.map(async (path) => ({ path, source: await readFile(path, "utf8") })),
    )

    // When: forbidden action-session, backup, LLM, compiler, filesystem, and network seams are checked.
    const violations = sources.flatMap(({ path, source }) =>
      forbiddenScanPatterns.flatMap((pattern) =>
        pattern.test(source) ? [`${path}: ${pattern}`] : [],
      ),
    )

    // Then: scan code remains synchronous, local, and read-only by construction.
    expect(violations).toEqual([])
  })
})
