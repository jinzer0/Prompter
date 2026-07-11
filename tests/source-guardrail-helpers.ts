import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

export const productionSourceRoots = ["electron", "renderer/src", "drizzle"] as const

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
