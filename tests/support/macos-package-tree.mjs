import { cp, mkdir, readdir } from "node:fs/promises"
import { dirname, join, relative } from "node:path"

export async function copyRequiredRuntimeAddon(sourceRoot, nativeFixture) {
  const addonPath = join(
    sourceRoot,
    "node_modules",
    "better-sqlite3",
    "build",
    "Release",
    "better_sqlite3.node",
  )
  await mkdir(dirname(addonPath), { recursive: true })
  await cp(nativeFixture, addonPath)
}

export async function listFilesRecursively(rootPath) {
  async function listDirectory(directoryPath) {
    const files = []
    const entries = await readdir(directoryPath, { withFileTypes: true })
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const entryPath = join(directoryPath, entry.name)
      if (entry.isDirectory()) files.push(...(await listDirectory(entryPath)))
      else if (entry.isFile() || entry.isSymbolicLink()) files.push(relative(rootPath, entryPath))
    }
    return files
  }

  return listDirectory(rootPath)
}
