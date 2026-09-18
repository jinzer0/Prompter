import { readdir } from "node:fs/promises"
import { join, relative } from "node:path"

export async function listFilesRecursively(rootPath) {
  async function listDirectory(directoryPath) {
    const files = []
    const entries = await readdir(directoryPath, { withFileTypes: true })
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const entryPath = join(directoryPath, entry.name)
      if (entry.isDirectory()) files.push(...(await listDirectory(entryPath)))
      else if (entry.isFile()) files.push(relative(rootPath, entryPath))
    }
    return files
  }

  return listDirectory(rootPath)
}
