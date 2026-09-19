import { lstat, mkdir, realpath } from "node:fs/promises"
import { isAbsolute, join, relative, resolve, sep } from "node:path"

function componentsBelow(trustedAnchor, targetPath) {
  const pathFromAnchor = relative(resolve(trustedAnchor), resolve(targetPath))
  if (
    pathFromAnchor === "" ||
    pathFromAnchor === ".." ||
    pathFromAnchor.startsWith(`..${sep}`) ||
    isAbsolute(pathFromAnchor)
  ) {
    throw new Error("Configured directory is outside its trusted anchor")
  }
  return pathFromAnchor.split(sep)
}

async function boundary(options) {
  const anchorPath = await realpath(resolve(options.trustedAnchor))
  const anchorMetadata = await lstat(anchorPath)
  if (!anchorMetadata.isDirectory()) throw new Error("Trusted anchor is unavailable")
  return { anchorPath, components: componentsBelow(options.trustedAnchor, options.targetPath) }
}

async function directoryMetadata(path) {
  try {
    return await lstat(path)
  } catch (error) {
    if (error?.code === "ENOENT") return undefined
    throw error
  }
}

function requireDirectory(metadata) {
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("Configured directory has an unsafe path component")
  }
}

export async function validateOwnedDirectory(options) {
  const { anchorPath, components } = await boundary(options)
  let currentPath = anchorPath
  for (const component of components) {
    currentPath = join(currentPath, component)
    const metadata = await directoryMetadata(currentPath)
    if (metadata === undefined) return undefined
    requireDirectory(metadata)
  }
  return currentPath
}

export async function ensureOwnedDirectory(options) {
  const { anchorPath, components } = await boundary(options)
  let currentPath = anchorPath
  for (const component of components) {
    currentPath = join(currentPath, component)
    try {
      await mkdir(currentPath)
    } catch (error) {
      if (error?.code !== "EEXIST") throw error
    }
    requireDirectory(await lstat(currentPath))
  }
  return currentPath
}
