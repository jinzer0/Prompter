import { realpath } from "node:fs/promises"
import { basename, relative, resolve, sep } from "node:path"

const directoryAliases = new Set(["Resources", "Headers", "Modules", "Helpers", "Libraries"])

export function containingFramework(filePath, rootPath) {
  let currentPath = filePath
  while (currentPath !== rootPath) {
    if (currentPath.endsWith(".framework")) return currentPath
    const parentPath = resolve(currentPath, "..")
    if (parentPath === currentPath) return undefined
    currentPath = parentPath
  }
  return undefined
}

export function isFrameworkBinary(filePath, frameworkPath) {
  if (frameworkPath === undefined) return false
  return basename(filePath) === basename(frameworkPath, ".framework")
}

function frameworkParts(candidatePath, targetPath, rootPath) {
  const candidateFramework = containingFramework(candidatePath, rootPath)
  const targetFramework = containingFramework(targetPath, rootPath)
  if (candidateFramework === undefined || targetFramework === undefined) return undefined
  return { candidateFramework, targetFramework }
}

export function createFrameworkAliasPolicy(rootPath) {
  const currentVersions = new Map()

  async function currentVersion(frameworkPath) {
    const canonicalFramework = await realpath(frameworkPath)
    const cached = currentVersions.get(canonicalFramework)
    if (cached !== undefined) return cached
    const versionPath = await realpath(resolve(frameworkPath, "Versions", "Current"))
    const segments = relative(canonicalFramework, versionPath).split(sep)
    if (segments.length !== 2 || segments[0] !== "Versions" || segments[1] === "Current") {
      return undefined
    }
    currentVersions.set(canonicalFramework, versionPath)
    return versionPath
  }

  async function sameFramework(candidatePath, targetPath) {
    const parts = frameworkParts(candidatePath, targetPath, rootPath)
    if (parts === undefined) return undefined
    if ((await realpath(parts.candidateFramework)) !== (await realpath(parts.targetFramework))) {
      return undefined
    }
    const versionPath = await currentVersion(parts.candidateFramework)
    if (versionPath === undefined) return undefined
    return { ...parts, versionPath }
  }

  return Object.freeze({
    async binary(candidatePath, targetPath) {
      const framework = await sameFramework(candidatePath, targetPath)
      if (framework === undefined) return false
      const frameworkName = basename(framework.candidateFramework, ".framework")
      const rootBinary = resolve(framework.candidateFramework, frameworkName)
      const versionBinary = resolve(framework.versionPath, frameworkName)
      return candidatePath === rootBinary && targetPath === versionBinary
    },
    async directory(candidatePath, targetPath) {
      const framework = await sameFramework(candidatePath, targetPath)
      if (framework === undefined) return false
      const candidateSegments = relative(framework.candidateFramework, candidatePath).split(sep)
      if (candidateSegments.length === 2 && candidateSegments[0] === "Versions") {
        return candidateSegments[1] === "Current" && targetPath === framework.versionPath
      }
      return (
        candidateSegments.length === 1 &&
        directoryAliases.has(candidateSegments[0]) &&
        targetPath === resolve(framework.versionPath, candidateSegments[0])
      )
    },
  })
}
