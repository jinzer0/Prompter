import { lstat, open, readdir, realpath, stat } from "node:fs/promises"
import { extname, isAbsolute, relative, resolve, sep } from "node:path"

import {
  containingFramework,
  createFrameworkAliasPolicy,
  isFrameworkBinary,
} from "./framework-alias.mjs"

const fileCommand = "/usr/bin/file"
const lipoCommand = "/usr/bin/lipo"
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

export class SigningInputError extends Error {
  constructor(message) {
    super(message)
    this.name = "SigningInputError"
  }
}

function assertContained(rootPath, targetPath) {
  const pathFromRoot = relative(rootPath, targetPath)
  const contained =
    pathFromRoot === "" ||
    (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== ".." && !isAbsolute(pathFromRoot))
  if (!contained) throw new SigningInputError("Signable code resolves outside the app bundle")
}

function pathDepth(rootPath, targetPath) {
  return targetPath === rootPath ? 0 : relative(rootPath, targetPath).split(sep).length
}

function lexicalCompare(left, right) {
  return left === right ? 0 : left < right ? -1 : 1
}

function bundleKind(targetPath) {
  if (targetPath.endsWith(".app")) return "helper-app"
  if (targetPath.endsWith(".xpc")) return "xpc-service"
  if (targetPath.endsWith(".framework")) return "framework"
  return undefined
}

function rawKind(targetPath, mode, frameworkPath, description) {
  const extension = extname(targetPath).toLowerCase()
  if (extension === ".node") return "native-module"
  if (extension === ".dylib" || frameworkPath !== undefined) return "dynamic-library"
  if ((mode & 0o111) !== 0 || description.includes("executable")) return "executable-host"
  return "dynamic-library"
}

function sortedTargets(rootPath, targets) {
  return [...targets.values()].sort((left, right) => {
    const depthDifference = pathDepth(rootPath, right.path) - pathDepth(rootPath, left.path)
    return depthDifference === 0 ? lexicalCompare(left.path, right.path) : depthDifference
  })
}

async function hasMachOMagic(path) {
  const handle = await open(path, "r")
  try {
    const bytes = Buffer.alloc(4)
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0)
    return bytesRead === bytes.length && machOMagic.has(bytes.toString("hex"))
  } finally {
    await handle.close()
  }
}

export async function discoverSignableCode({ appPath, runFile }) {
  if (typeof runFile !== "function") throw new SigningInputError("runFile must be a function")
  const rootPath = await realpath(resolve(appPath))
  if (!(await stat(rootPath)).isDirectory() || !rootPath.endsWith(".app")) {
    throw new SigningInputError("appPath must be an app bundle directory")
  }

  const visited = new Set()
  const targets = new Map()
  const descriptions = new Map()
  const frameworkAliases = createFrameworkAliasPolicy(rootPath)

  async function visit(candidatePath) {
    const candidateMetadata = await lstat(candidatePath)
    const targetPath = await realpath(candidatePath)
    assertContained(rootPath, targetPath)
    const candidateBundleKind = bundleKind(candidatePath)
    const candidateExtension = extname(candidatePath).toLowerCase()
    const targetExtension = extname(targetPath).toLowerCase()
    if (
      (candidateBundleKind !== undefined && candidateBundleKind !== bundleKind(targetPath)) ||
      ([".node", ".dylib"].includes(candidateExtension) && candidateExtension !== targetExtension)
    ) {
      throw new SigningInputError("Signable symlink alias has an ambiguous target type")
    }
    const metadata = await stat(targetPath)
    if (metadata.isDirectory()) {
      if (
        candidateMetadata.isSymbolicLink() &&
        !(await frameworkAliases.directory(candidatePath, targetPath))
      ) {
        throw new SigningInputError("Signable directory alias is not allowed")
      }
      if (visited.has(targetPath)) return
      visited.add(targetPath)
      const kind = targetPath === rootPath ? undefined : bundleKind(targetPath)
      if (kind !== undefined) {
        targets.set(targetPath, {
          path: targetPath,
          kind,
          entitlements: ["helper-app", "xpc-service"].includes(kind),
        })
      }
      const entries = await readdir(targetPath)
      entries.sort(lexicalCompare)
      for (const entry of entries) await visit(resolve(targetPath, entry))
      return
    }
    if (!metadata.isFile()) return

    const frameworkPath = containingFramework(targetPath, rootPath)
    const extension = extname(targetPath).toLowerCase()
    const inspectByContract =
      extension === ".node" ||
      extension === ".dylib" ||
      (metadata.mode & 0o111) !== 0 ||
      isFrameworkBinary(targetPath, frameworkPath)
    if (!inspectByContract && !(await hasMachOMagic(targetPath))) return

    let description = descriptions.get(targetPath)
    if (description === undefined) {
      const result = await runFile(fileCommand, ["-b", targetPath], {})
      description = result.stdout
      descriptions.set(targetPath, description)
    }
    if (!description.includes("Mach-O")) return
    if (
      candidatePath !== targetPath &&
      !(await frameworkAliases.binary(candidatePath, targetPath))
    ) {
      throw new SigningInputError("Signable binary alias is not allowed")
    }
    if (visited.has(targetPath)) return
    const architectures = (await runFile(lipoCommand, ["-archs", targetPath], {})).stdout.split(
      /\s+/u,
    )
    if (!architectures.includes("arm64")) {
      throw new SigningInputError("Mach-O payload does not contain an arm64 slice")
    }
    visited.add(targetPath)
    const kind = rawKind(targetPath, metadata.mode, frameworkPath, description)
    targets.set(targetPath, {
      path: targetPath,
      kind,
      entitlements: ["helper-app", "xpc-service", "executable-host"].includes(kind),
    })
  }

  await visit(rootPath)
  return sortedTargets(rootPath, targets)
}
