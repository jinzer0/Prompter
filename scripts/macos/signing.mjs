import { readdir, readFile, realpath, stat } from "node:fs/promises"
import { basename, extname, isAbsolute, relative, resolve, sep } from "node:path"

const codesignCommand = "/usr/bin/codesign"
const fileCommand = "/usr/bin/file"
const plutilCommand = "/usr/bin/plutil"
const securityCommand = "/usr/bin/security"
const expectedEntitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
</dict>
</plist>
`

class SigningInputError extends Error {
  constructor(message) {
    super(message)
    this.name = "SigningInputError"
  }
}

function requireRunner(runFile) {
  if (typeof runFile !== "function") throw new SigningInputError("runFile must be a function")
  return runFile
}

async function requireIdentity(identity, runFile) {
  if (
    typeof identity !== "string" ||
    identity.length === 0 ||
    identity.trim() !== identity ||
    /[\0\r\n]/u.test(identity)
  ) {
    throw new SigningInputError("Exactly one signing identity is required")
  }

  const { stdout } = await runFile(
    securityCommand,
    ["find-identity", "-v", "-p", "codesigning"],
    {},
  )
  if (typeof stdout !== "string") {
    throw new SigningInputError("Unable to validate signing identity")
  }
  const lines = stdout.split(/\r?\n/u).filter((entry) => entry.trim() !== "")
  const summaryMatch = (lines.pop() ?? "").match(/^\s*(\d+)\s+valid identities found\s*$/u)
  if (summaryMatch === null || Number(summaryMatch[1]) !== lines.length) {
    throw new SigningInputError("Unable to validate signing identity")
  }
  let exactMatches = 0
  for (const line of lines) {
    const match = line.match(/^\s*\d+\)\s+(?:[0-9A-Fa-f]{40}|[0-9A-Fa-f]{64})\s+"([^"\r\n]+)"\s*$/u)
    if (match === null) throw new SigningInputError("Unable to validate signing identity")
    if (match[1] === identity) exactMatches += 1
  }
  if (exactMatches !== 1) throw new SigningInputError("Exactly one signing identity is required")
  return identity
}

function assertContained(rootPath, targetPath) {
  const pathFromRoot = relative(rootPath, targetPath)
  const contained =
    pathFromRoot === "" ||
    (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== ".." && !isAbsolute(pathFromRoot))
  if (contained) return
  throw new SigningInputError("Signable code resolves outside the app bundle")
}

function pathDepth(rootPath, targetPath) {
  const pathFromRoot = relative(rootPath, targetPath)
  return pathFromRoot === "" ? 0 : pathFromRoot.split(sep).length
}

function lexicalCompare(left, right) {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function containingFramework(filePath, rootPath) {
  let currentPath = filePath
  while (currentPath !== rootPath) {
    if (currentPath.endsWith(".framework")) return currentPath
    const parentPath = resolve(currentPath, "..")
    if (parentPath === currentPath) return undefined
    currentPath = parentPath
  }
  return undefined
}

function bundleKind(targetPath) {
  if (targetPath.endsWith(".app")) return "helper-app"
  if (targetPath.endsWith(".xpc")) return "xpc-service"
  if (targetPath.endsWith(".framework")) return "framework"
  return undefined
}

function rawKind(targetPath, mode, frameworkPath) {
  const extension = extname(targetPath).toLowerCase()
  if (extension === ".node") return "native-module"
  if (extension === ".dylib") return "dynamic-library"
  if (frameworkPath !== undefined) return "framework-binary"
  if ((mode & 0o111) !== 0) return "executable-host"
  return undefined
}

function usesEntitlements(kind) {
  return kind === "helper-app" || kind === "xpc-service" || kind === "executable-host"
}

function isFrameworkBinary(filePath, frameworkPath) {
  if (frameworkPath === undefined) return false
  const frameworkName = basename(frameworkPath, ".framework")
  return basename(filePath) === frameworkName
}

async function sameFrameworkBinaryAlias(candidatePath, targetPath, rootPath) {
  const candidateFramework = containingFramework(candidatePath, rootPath)
  const targetFramework = containingFramework(targetPath, rootPath)
  if (candidateFramework === undefined || targetFramework === undefined) return false
  if (!isFrameworkBinary(candidatePath, candidateFramework)) return false
  if (!isFrameworkBinary(targetPath, targetFramework)) return false
  return (await realpath(candidateFramework)) === (await realpath(targetFramework))
}

function sortedTargets(rootPath, targets) {
  return [...targets.values()].sort((left, right) => {
    const depthDifference = pathDepth(rootPath, right.path) - pathDepth(rootPath, left.path)
    return depthDifference === 0 ? lexicalCompare(left.path, right.path) : depthDifference
  })
}

export async function discoverSignableCode({ appPath, runFile }) {
  const executeFile = requireRunner(runFile)
  const rootPath = await realpath(resolve(appPath))
  if (!(await stat(rootPath)).isDirectory() || !rootPath.endsWith(".app")) {
    throw new SigningInputError("appPath must be an app bundle directory")
  }

  const visited = new Set()
  const targets = new Map()

  async function visit(candidatePath) {
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
    if (visited.has(targetPath)) {
      if (
        targets.has(targetPath) &&
        !(await sameFrameworkBinaryAlias(candidatePath, targetPath, rootPath))
      )
        throw new SigningInputError("Duplicate signable code path is not allowed")
      return
    }
    visited.add(targetPath)

    const metadata = await stat(targetPath)
    if (metadata.isDirectory()) {
      const kind = targetPath === rootPath ? undefined : bundleKind(targetPath)
      if (kind !== undefined) {
        targets.set(targetPath, {
          path: targetPath,
          kind,
          entitlements: usesEntitlements(kind),
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
    const mustInspect =
      extension === ".node" ||
      extension === ".dylib" ||
      (metadata.mode & 0o111) !== 0 ||
      isFrameworkBinary(targetPath, frameworkPath)
    if (!mustInspect) return

    const { stdout } = await executeFile(fileCommand, ["-b", targetPath], {})
    const kind = rawKind(targetPath, metadata.mode, frameworkPath)
    if (!stdout.includes("Mach-O")) {
      if (
        extension === ".node" ||
        extension === ".dylib" ||
        isFrameworkBinary(targetPath, frameworkPath)
      ) {
        throw new SigningInputError("Native-code path is not a Mach-O object")
      }
      return
    }
    if (kind === undefined) {
      throw new SigningInputError("Mach-O object could not be classified")
    }
    targets.set(targetPath, {
      path: targetPath,
      kind,
      entitlements: usesEntitlements(kind),
    })
  }

  await visit(rootPath)
  return sortedTargets(rootPath, targets)
}

async function validateEntitlements(entitlementsPath, runFile) {
  const canonicalPath = await realpath(resolve(entitlementsPath))
  await runFile(plutilCommand, ["-lint", canonicalPath], {})
  const contents = await readFile(canonicalPath)
  if (
    [...contents].some((byte) => byte > 0x7f) ||
    contents.toString("ascii") !== expectedEntitlements
  ) {
    throw new SigningInputError("Entitlements must contain only com.apple.security.cs.allow-jit")
  }
  return canonicalPath
}

function signingArguments(identity, target, entitlementsPath) {
  const arguments_ = ["--force", "--timestamp", "--options", "runtime", "--sign", identity]
  if (target.entitlements) arguments_.push("--entitlements", entitlementsPath)
  arguments_.push(target.path)
  return arguments_
}

async function verifyTargets(targets, runFile) {
  for (const target of targets) {
    await runFile(codesignCommand, ["--verify", "--strict", target.path], {})
  }
}

export async function signAppBundle({ appPath, identity, entitlementsPath, runFile }) {
  const executeFile = requireRunner(runFile)
  const signingIdentity = await requireIdentity(identity, executeFile)
  const canonicalEntitlementsPath = await validateEntitlements(entitlementsPath, executeFile)
  const rootPath = await realpath(resolve(appPath))
  const targets = await discoverSignableCode({ appPath: rootPath, runFile: executeFile })

  for (const target of targets) {
    await executeFile(
      codesignCommand,
      signingArguments(signingIdentity, target, canonicalEntitlementsPath),
      {},
    )
  }

  const postSignTargets = await discoverSignableCode({ appPath: rootPath, runFile: executeFile })
  if (
    targets.length !== postSignTargets.length ||
    targets.some((target, index) => target.path !== postSignTargets[index]?.path)
  ) {
    throw new SigningInputError("Signable code changed during signing")
  }
  await verifyTargets(postSignTargets, executeFile)
  await executeFile(
    codesignCommand,
    signingArguments(
      signingIdentity,
      { path: rootPath, entitlements: true },
      canonicalEntitlementsPath,
    ),
    {},
  )
  await executeFile(codesignCommand, ["--verify", "--deep", "--strict", rootPath], {})
  return rootPath
}

export async function verifyAppSignature({ appPath, runFile }) {
  const executeFile = requireRunner(runFile)
  const rootPath = await realpath(resolve(appPath))
  const targets = await discoverSignableCode({ appPath: rootPath, runFile: executeFile })
  await verifyTargets(targets, executeFile)
  await executeFile(codesignCommand, ["--verify", "--deep", "--strict", rootPath], {})
  return rootPath
}

export async function verifyDmgSignature({ dmgPath, runFile }) {
  const executeFile = requireRunner(runFile)
  const canonicalPath = await realpath(resolve(dmgPath))
  await executeFile(codesignCommand, ["--verify", "--strict", canonicalPath], {})
  return canonicalPath
}
