import { readFile, realpath } from "node:fs/promises"
import { resolve } from "node:path"

import { discoverSignableCode, SigningInputError } from "./signing-discovery.mjs"

export { discoverSignableCode } from "./signing-discovery.mjs"

const codesignCommand = "/usr/bin/codesign"
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
