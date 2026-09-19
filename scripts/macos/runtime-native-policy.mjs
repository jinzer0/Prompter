import { lstat, open, readdir } from "node:fs/promises"
import { extname, isAbsolute, join, relative, sep } from "node:path"

export const runtimePackageRoots = ["better-sqlite3", "bindings", "file-uri-to-path"]
export const allowedRuntimeNativePath = join(
  "better-sqlite3",
  "build",
  "Release",
  "better_sqlite3.node",
)

const runtimeNodeModulesPath = join("Contents", "Resources", "app", "node_modules")
const machOMagic = new Set([
  "bebafeca",
  "bfbafeca",
  "cafebabe",
  "cafebabf",
  "cefaedfe",
  "cffaedfe",
  "feedface",
  "feedfacf",
])
const nativeArtifactExtensions = new Set([".node", ".dylib", ".o", ".a"])

function normalizedPath(path) {
  return path.split(sep).join("/")
}

function relativeRuntimePath(appPath, path) {
  return normalizedPath(relative(appPath, path))
}

async function optionalMetadata(path) {
  try {
    return await lstat(path)
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined
    throw error
  }
}

function isContained(rootPath, targetPath) {
  const pathFromRoot = relative(rootPath, targetPath)
  return (
    pathFromRoot === "" ||
    (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== ".." && !isAbsolute(pathFromRoot))
  )
}

export async function shouldStageRuntimePackagePath({
  packageName,
  sourcePackagePath,
  sourcePath,
}) {
  const packagePath = relative(sourcePackagePath, sourcePath)
  if (packagePath === "") return true
  if (
    packageName === "better-sqlite3" &&
    packagePath.split(sep)[0] === "build" &&
    !["build", join("build", "Release"), join("build", "Release", "better_sqlite3.node")].includes(
      packagePath,
    )
  ) {
    return false
  }

  const metadata = await lstat(sourcePath)
  if (metadata.isSymbolicLink()) return false
  if (!metadata.isFile()) return metadata.isDirectory()
  if (join(packageName, packagePath) === allowedRuntimeNativePath) return true
  if (nativeArtifactExtensions.has(extname(packagePath).toLowerCase())) return false
  const handle = await open(sourcePath, "r")
  try {
    const bytes = Buffer.alloc(4)
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0)
    return bytesRead !== bytes.length || !machOMagic.has(bytes.toString("hex"))
  } finally {
    await handle.close()
  }
}

export function isRuntimeNodeModuleTarget(appPath, targetPath) {
  return isContained(join(appPath, runtimeNodeModulesPath), targetPath)
}

export function isAllowedRuntimeNativeTarget(appPath, targetPath) {
  const nodeModulesPath = join(appPath, runtimeNodeModulesPath)
  return (
    isContained(nodeModulesPath, targetPath) &&
    relative(nodeModulesPath, targetPath) === allowedRuntimeNativePath
  )
}

export async function runtimePackageRootIssues(appPath) {
  const nodeModulesPath = join(appPath, runtimeNodeModulesPath)
  const nodeModulesMetadata = await optionalMetadata(nodeModulesPath)
  if (nodeModulesMetadata?.isDirectory() !== true || nodeModulesMetadata.isSymbolicLink()) {
    return {
      missing: runtimePackageRoots.map((name) =>
        relativeRuntimePath(appPath, join(nodeModulesPath, name)),
      ),
      unexpected: [],
      mismatched: [relativeRuntimePath(appPath, nodeModulesPath)],
    }
  }
  const entries = await readdir(nodeModulesPath)
  const missing = []
  const unexpected = entries
    .filter((entry) => !runtimePackageRoots.includes(entry))
    .map((entry) => relativeRuntimePath(appPath, join(nodeModulesPath, entry)))
  const mismatched = []
  for (const name of runtimePackageRoots) {
    const path = join(nodeModulesPath, name)
    const metadata = await optionalMetadata(path)
    if (metadata === undefined) missing.push(relativeRuntimePath(appPath, path))
    else if (metadata.isDirectory() !== true || metadata.isSymbolicLink())
      mismatched.push(relativeRuntimePath(appPath, path))
  }
  return { missing, unexpected, mismatched }
}

export async function hasExpectedRuntimeNativeTarget({ appPath, targets }) {
  const rootIssues = await runtimePackageRootIssues(appPath)
  if (rootIssues.missing.length + rootIssues.unexpected.length + rootIssues.mismatched.length > 0)
    return false
  const runtimeTargets = targets.filter((target) => isRuntimeNodeModuleTarget(appPath, target.path))
  if (
    runtimeTargets.length !== 1 ||
    !isAllowedRuntimeNativeTarget(appPath, runtimeTargets[0].path)
  ) {
    return false
  }
  const metadata = await optionalMetadata(
    join(appPath, runtimeNodeModulesPath, allowedRuntimeNativePath),
  )
  return metadata?.isFile() === true && metadata.isSymbolicLink() === false
}
