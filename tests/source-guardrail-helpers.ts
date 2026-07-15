import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

export type ProductionSourceFile = {
  readonly path: string
  readonly source: string
}

export const productionSourceRoots = ["electron", "renderer/src", "drizzle"] as const

const forbiddenRendererDependencyPatterns = [
  /(?:from\s+|import\s*\()\s*["'](?:better-sqlite3|drizzle(?:-orm)?(?:\/[^"']*)?|openai(?:\/[^"']*)?|node:[^"']+|(?:fs|path|process)(?:\/[^"']*)?)["']/,
  /\brequire\s*\(\s*["'](?:electron|better-sqlite3|drizzle(?:-orm)?|openai|node:[^"']+|(?:fs|path|process))[^"']*["']\s*\)/,
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
  /(?:^|\n)\s*import\s+["'](?:better-sqlite3|drizzle(?:-orm)?(?:\/[^"']*)?|openai(?:\/[^"']*)?|node:[^"']+|(?:fs|path|process)(?:\/[^"']*)?)["']/

export const rendererIsolationPatterns = [
  forbiddenRendererElectronImport,
  runtimeIpcTypesImport,
  runtimeIpcTypesDynamicImport,
  sideEffectElectronImport,
  sideEffectRendererDependencyImport,
  ...forbiddenRendererDependencyPatterns,
] as const

export const repoPathReference = /\brepo(?:Path|_path)\b/
export const repoPathFilesystemPatterns = [
  /\b(?:readFile|readFileSync|readdir|readdirSync|opendir|stat|statSync|lstat|lstatSync|realpath|realpathSync|access|glob)\s*\([^)]*\brepo(?:Path|_path)\b/s,
  /\b(?:join|resolve)\s*\([^)]*\brepo(?:Path|_path)\b/s,
  /\b(?:scan|crawl|walk)\w*\s*\([^)]*\brepo(?:Path|_path)\b/s,
] as const

export async function listProductionSourceFiles(
  roots: readonly string[] = productionSourceRoots,
): Promise<readonly string[]> {
  const files = await Promise.all(roots.map(listSourceFiles))

  return files.flat()
}

export async function readProductionSource(
  roots: readonly string[] = productionSourceRoots,
): Promise<string> {
  const files = await listProductionSourceFiles(roots)
  const contents = await Promise.all(files.map((filePath) => readFile(filePath, "utf8")))

  return contents.join("\n")
}

export async function readProductionSourceFiles(
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

export function matchingSourcePaths(
  sourceFiles: readonly ProductionSourceFile[],
  patterns: readonly RegExp[],
): readonly string[] {
  return sourceFiles.filter(({ source }) => matchesAny(source, patterns)).map(({ path }) => path)
}

export function matchesAny(source: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(source))
}

export function extractPromptTemplateTableDefinitions(source: string): readonly string[] {
  const sqlDefinitions = Array.from(
    source.matchAll(/CREATE TABLE\s+[`"]prompt_templates[`"]\s*\(([^;]*)\);/gi),
    (match) => match[1] ?? "",
  )
  const drizzleDefinitions = Array.from(
    source.matchAll(
      /sqliteTable\(\s*["']prompt_templates["']\s*,\s*\{([\s\S]*?)\n\s*\}\s*(?:,|\))/g,
    ),
    (match) => match[1] ?? "",
  )

  return [...sqlDefinitions, ...drizzleDefinitions]
}

async function listSourceFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const filePath = join(directory, entry.name)

      if (entry.isDirectory()) {
        return listSourceFiles(filePath)
      }

      return /\.(sql|ts|tsx)$/.test(entry.name) ? [filePath] : []
    }),
  )

  return files.flat()
}
