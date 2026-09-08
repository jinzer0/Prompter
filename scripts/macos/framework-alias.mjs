import { lstat, realpath } from "node:fs/promises"
import { basename, relative, resolve, sep } from "node:path"

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

export async function sameFrameworkBinaryAlias(candidatePath, targetPath, rootPath) {
  const candidateFramework = containingFramework(candidatePath, rootPath)
  const targetFramework = containingFramework(targetPath, rootPath)
  if (candidateFramework === undefined || targetFramework === undefined) return false
  const frameworkName = basename(candidateFramework, ".framework")
  const conventionalBinary = (filePath, frameworkPath) => {
    if (filePath === resolve(frameworkPath, frameworkName)) return true
    const segments = relative(frameworkPath, filePath).split(sep)
    return segments.length === 3 && segments[0] === "Versions" && segments[2] === frameworkName
  }
  return (
    conventionalBinary(candidatePath, candidateFramework) &&
    conventionalBinary(targetPath, targetFramework) &&
    (await realpath(candidateFramework)) === (await realpath(targetFramework))
  )
}

export async function sameFrameworkDirectoryAlias(candidatePath, targetPath, rootPath) {
  if (!(await lstat(candidatePath)).isSymbolicLink()) return candidatePath === targetPath
  const candidateFramework = containingFramework(candidatePath, rootPath)
  const targetFramework = containingFramework(targetPath, rootPath)
  if (candidateFramework === undefined || targetFramework === undefined) return false
  if ((await realpath(candidateFramework)) !== (await realpath(targetFramework))) return false
  const candidateSegments = relative(candidateFramework, candidatePath).split(sep)
  const targetSegments = relative(targetFramework, targetPath).split(sep)
  if (
    candidateSegments.length === 2 &&
    candidateSegments[0] === "Versions" &&
    candidateSegments[1] === "Current"
  ) {
    return targetSegments.length === 2 && targetSegments[0] === "Versions"
  }
  return (
    candidateSegments.length === 1 &&
    ["Resources", "Headers", "Modules"].includes(candidateSegments[0]) &&
    targetSegments.length === 3 &&
    targetSegments[0] === "Versions" &&
    targetSegments[2] === candidateSegments[0]
  )
}

export async function assertFrameworkDirectoryAlias(
  candidateMetadata,
  candidatePath,
  targetPath,
  rootPath,
) {
  if (
    candidateMetadata.isSymbolicLink() &&
    !(await sameFrameworkDirectoryAlias(candidatePath, targetPath, rootPath))
  ) {
    throw new Error("Signable directory alias is not allowed")
  }
}
