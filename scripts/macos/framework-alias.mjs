import { realpath } from "node:fs/promises"
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
  const targetSegments = relative(targetFramework, targetPath).split(sep)
  if (
    targetSegments.length !== 3 ||
    targetSegments[0] !== "Versions" ||
    targetSegments[1] === "Current" ||
    targetSegments[2] !== frameworkName
  ) {
    return false
  }
  if (candidatePath === targetPath) return true
  if (candidatePath !== resolve(candidateFramework, frameworkName)) return false
  return (await realpath(candidateFramework)) === (await realpath(targetFramework))
}
