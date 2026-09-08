import { lstat, readdir, readFile, realpath } from "node:fs/promises"
import { constants } from "node:os"
import { basename, isAbsolute, relative, sep } from "node:path"

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const signals = new Set(Object.keys(constants.signals))
const releaseKeys = ["runFile", "platform", "arch", "paths", "signingIdentity", "notaryProfile"]
const pathKeys = [
  "sourceRoot",
  "packageJsonPath",
  "electronAppPath",
  "releaseRoot",
  "entitlementsPath",
  "notarizationEvidenceRoot",
]

function fail(message) {
  throw new Error(message)
}
function exactObject(value, keys, message) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Reflect.ownKeys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    fail(message)
  return value
}
function text(value, message) {
  if (typeof value !== "string" || value.trim() === "" || value.trim() !== value) fail(message)
  return value
}
export function input(value) {
  const release = exactObject(value, releaseKeys, "Invalid macOS release options")
  if (
    typeof release.runFile !== "function" ||
    release.platform !== "darwin" ||
    release.arch !== "arm64"
  )
    fail("Invalid macOS release options")
  const paths = exactObject(release.paths, pathKeys, "Invalid macOS release paths")
  for (const key of pathKeys) text(paths[key], "Invalid macOS release paths")
  const signingIdentity = text(release.signingIdentity, "Signing identity is required")
  if (!signingIdentity.startsWith("Developer ID Application: ")) fail("Invalid signing identity")
  return {
    ...release,
    paths,
    signingIdentity,
    notaryProfile: text(release.notaryProfile, "Notary profile is required"),
  }
}
function timeoutId(output) {
  if (typeof output !== "string") return undefined
  try {
    const value = JSON.parse(output)
    const id = value?.id ?? value?.submissionId
    return typeof id === "string" && uuid.test(id) ? id : undefined
  } catch (error) {
    if (error instanceof SyntaxError) return undefined
    throw error
  }
}
export function runner(runFile) {
  return async (command, args, options) => {
    try {
      const result = await runFile(command, args, options)
      if (!result || typeof result.stdout !== "string" || typeof result.stderr !== "string")
        fail("Invalid macOS release command result")
      return result
    } catch (error) {
      const timedOut =
        error?.code === "ETIMEDOUT" ||
        error?.name === "AbortError" ||
        (typeof error?.signal === "string" && signals.has(error.signal))
      const id = timedOut
        ? [error?.stdout, error?.result?.stdout].map(timeoutId).find((value) => value !== undefined)
        : undefined
      const safe = new Error("macOS release command failed")
      if (id !== undefined) {
        safe.code = "ETIMEDOUT"
        safe.stdout = JSON.stringify({ id, status: "In Progress" })
      }
      throw safe
    }
  }
}
export async function versionFrom(packageJsonPath) {
  try {
    const value = JSON.parse(await readFile(packageJsonPath, "utf8"))
    if (
      typeof value.version !== "string" ||
      !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(value.version)
    )
      fail("Invalid package version")
    return value.version
  } catch {
    fail("Invalid package version")
  }
}
export async function candidate(path) {
  try {
    const metadata = await lstat(path)
    if (!metadata.isDirectory() || metadata.isSymbolicLink())
      fail("Release candidate directory is invalid")
    return { exists: true, empty: (await readdir(path)).length === 0 }
  } catch (error) {
    if (error?.code === "ENOENT") return { exists: false, empty: true }
    throw error
  }
}
export async function contained(rootPath, targetPath) {
  const [rootCanonical, targetCanonical] = await Promise.all([
    realpath(rootPath),
    realpath(targetPath),
  ])
  const pathFromRoot = relative(rootCanonical, targetCanonical)
  if (
    pathFromRoot === "" ||
    (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== ".." && !isAbsolute(pathFromRoot))
  )
    return targetCanonical
  fail("Packaged app resolves outside its staging root")
}
export function assertIdentity(output, identity) {
  const lines = output.split(/\r?\n/u).filter((line) => line.trim() !== "")
  const summary = (lines.pop() ?? "").match(/^\s*(\d+)\s+valid identities found\s*$/u)
  if (summary === null || Number(summary[1]) !== lines.length)
    fail("Unable to validate signing identity")
  if (
    lines.filter(
      (line) =>
        line.match(/^\s*\d+\)\s+(?:[0-9A-Fa-f]{40}|[0-9A-Fa-f]{64})\s+"([^"\r\n]+)"\s*$/u)?.[1] ===
        identity,
    ).length !== 1
  )
    fail("Exactly one signing identity is required")
}
export function checksums(stdout, zipPath, dmgPath) {
  const values = stdout.trim().split("\n")
  if (values.length !== 2) fail("Invalid SHA-256 output")
  return `${values
    .map((line, index) => {
      const match = line.match(/^([0-9a-f]{64})\s+(.+)$/iu)
      if (match === null || match[2] !== [zipPath, dmgPath][index]) fail("Invalid SHA-256 output")
      return `${match[1].toLowerCase()}  ${basename(match[2])}`
    })
    .join("\n")}\n`
}
