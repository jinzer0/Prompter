import { mkdir, readFile, writeFile } from "node:fs/promises"
import { constants } from "node:os"
import { join } from "node:path"

const resumeFileName = "notarization-resume.json"
const retryDelaysMs = [0, 100, 250]
const signals = new Set(Object.keys(constants.signals))
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

class NotarizationError extends Error {
  constructor(message) {
    super(message)
    this.name = "NotarizationError"
  }
}

function fail(message) {
  throw new NotarizationError(message)
}

function input(value, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("Invalid notarization options")
  const keys = Reflect.ownKeys(value)
  if (
    keys.length !== fields.length ||
    fields.some((field) => !Object.hasOwn(value, field)) ||
    keys.some((key) => typeof key !== "string" || !fields.includes(key)) ||
    typeof value.runFile !== "function"
  ) {
    fail("Invalid notarization options")
  }
  return value
}

function profile(value) {
  if (typeof value !== "string" || value.trim() === "") fail("Invalid Keychain profile")
  return value.trim()
}

function directory(value) {
  if (typeof value !== "string" || value.trim() === "") fail("Invalid evidence directory")
  return value
}

function submissionId(value) {
  if (typeof value !== "string" || !uuid.test(value)) fail("Invalid notarization submission")
  return value.toLowerCase()
}

function submitArtifact(value) {
  if (typeof value !== "string" || value.toLowerCase().endsWith(".app"))
    fail("Unsupported notarization artifact")
  if (!value.toLowerCase().endsWith(".zip") && !value.toLowerCase().endsWith(".dmg")) {
    fail("Unsupported notarization artifact")
  }
}

function stapledArtifact(value, kind) {
  if (typeof value !== "string" || !["app", "dmg"].includes(kind))
    fail("Unsupported stapling artifact")
  if (!value.toLowerCase().endsWith(`.${kind}`)) fail("Unsupported stapling artifact")
}

function json(output, label) {
  if (typeof output !== "string" || output.trim() === "") fail(`Invalid ${label}`)
  try {
    const value = JSON.parse(output)
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(`Invalid ${label}`)
    return value
  } catch (error) {
    if (error instanceof NotarizationError) throw error
    fail(`Invalid ${label}`)
  }
}

function api(payload) {
  if (
    (typeof payload.statusCode === "number" && payload.statusCode >= 400) ||
    Object.hasOwn(payload, "error")
  ) {
    fail("Notarization service rejected the request")
  }
}

function submission(payload) {
  api(payload)
  if (typeof payload.status !== "string") fail("Invalid notarization submission")
  return { submissionId: submissionId(payload.id ?? payload.submissionId), status: payload.status }
}

function commandError(error) {
  if (error instanceof NotarizationError) throw error
  fail("Notarization command failed")
}

async function command(runFile, args, label) {
  try {
    const result = await runFile("xcrun", args, {})
    return json(result?.stdout, label)
  } catch (error) {
    commandError(error)
  }
}

function timeoutId(error) {
  for (const output of [error?.stdout, error?.result?.stdout]) {
    try {
      return submission(json(output, "notarization submission")).submissionId
    } catch (caught) {
      if (!(caught instanceof NotarizationError)) throw caught
    }
  }
  return undefined
}

function timedOut(error) {
  return (
    error?.code === "ETIMEDOUT" ||
    error?.name === "AbortError" ||
    (typeof error?.signal === "string" && signals.has(error.signal))
  )
}

function reviewedLog(payload, id) {
  api(payload)
  if (
    !Array.isArray(payload.issues) ||
    !payload.issues.every((issue) => issue && typeof issue.severity === "string")
  ) {
    fail("Invalid notarization log")
  }
  if (payload.issues.some((issue) => issue.severity === "error" || issue.severity === "warning")) {
    fail("Notarization log blocks publication")
  }
  return { submissionId: id, issues: payload.issues.map((issue) => ({ severity: issue.severity })) }
}

function logPath(id) {
  return `notary-${id}.json`
}

function resume(value) {
  const fields =
    value.status === "unknown" ? ["submissionId", "status"] : ["submissionId", "status", "logPath"]
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !["unknown", "Accepted"].includes(value.status) ||
    Reflect.ownKeys(value).length !== fields.length ||
    fields.some((field) => !Object.hasOwn(value, field))
  ) {
    fail("Invalid resume state")
  }
  const id = submissionId(value.submissionId)
  if (value.status === "Accepted" && value.logPath !== logPath(id)) fail("Invalid resume state")
  return value.status === "Accepted"
    ? { submissionId: id, status: "Accepted", logPath: value.logPath }
    : { submissionId: id, status: "unknown" }
}

async function readResume(evidenceDir) {
  try {
    return resume(json(await readFile(join(evidenceDir, resumeFileName), "utf8"), "resume state"))
  } catch (error) {
    if (error?.code === "ENOENT") return undefined
    if (error instanceof NotarizationError) throw error
    fail("Invalid resume state")
  }
}

async function save(evidenceDir, fileName, value) {
  await mkdir(evidenceDir, { recursive: true })
  await writeFile(join(evidenceDir, fileName), `${JSON.stringify(value)}\n`)
}

async function hasSavedLog(evidenceDir, saved) {
  try {
    const value = json(
      await readFile(join(evidenceDir, saved.logPath), "utf8"),
      "notarization log receipt",
    )
    return (
      Reflect.ownKeys(value).length === 2 &&
      submissionId(value.submissionId) === saved.submissionId &&
      Array.isArray(value.issues) &&
      value.issues.every(
        (issue) =>
          issue &&
          Object.hasOwn(issue, "severity") &&
          typeof issue.severity === "string" &&
          !["warning", "error"].includes(issue.severity) &&
          Reflect.ownKeys(issue).length === 1,
      )
    )
  } catch {
    return false
  }
}

async function info(id, keychainProfile, runFile) {
  const result = submission(
    await command(
      runFile,
      ["notarytool", "info", id, "--keychain-profile", keychainProfile, "--output-format", "json"],
      "notarization info",
    ),
  )
  if (result.submissionId !== id) fail("Invalid notarization submission")
  return result.status
}

export async function preflightNotaryProfile(options) {
  const value = input(options, ["profile", "runFile"])
  const keychainProfile = profile(value.profile)
  api(
    await command(
      value.runFile,
      ["notarytool", "history", "--keychain-profile", keychainProfile, "--output-format", "json"],
      "notarization profile response",
    ),
  )
  return { status: "ready" }
}

export async function fetchNotaryLog(options) {
  const value = input(options, ["submissionId", "profile", "evidenceDir", "runFile"])
  const id = submissionId(value.submissionId)
  const keychainProfile = profile(value.profile)
  const evidenceDir = directory(value.evidenceDir)
  const receipt = reviewedLog(
    await command(
      value.runFile,
      ["notarytool", "log", id, "--keychain-profile", keychainProfile, "--output-format", "json"],
      "notarization log",
    ),
    id,
  )
  const reviewed = { submissionId: id, status: "Accepted", logPath: logPath(id) }
  await save(evidenceDir, reviewed.logPath, receipt)
  await save(evidenceDir, resumeFileName, reviewed)
  return reviewed
}

export async function submitAndWait(options) {
  const value = input(options, ["artifactPath", "profile", "evidenceDir", "runFile"])
  submitArtifact(value.artifactPath)
  const keychainProfile = profile(value.profile)
  const evidenceDir = directory(value.evidenceDir)
  const saved = await readResume(evidenceDir)
  await preflightNotaryProfile({ profile: keychainProfile, runFile: value.runFile })
  if (saved?.status === "Accepted")
    return (await hasSavedLog(evidenceDir, saved))
      ? saved
      : fetchNotaryLog({
          submissionId: saved.submissionId,
          profile: keychainProfile,
          evidenceDir,
          runFile: value.runFile,
        })
  if (saved !== undefined) {
    const status = await info(saved.submissionId, keychainProfile, value.runFile)
    if (status === "Accepted")
      return fetchNotaryLog({
        submissionId: saved.submissionId,
        profile: keychainProfile,
        evidenceDir,
        runFile: value.runFile,
      })
    if (status === "In Progress") return saved
    fail("Notarization submission was not accepted")
  }
  try {
    const response = await value.runFile(
      "xcrun",
      [
        "notarytool",
        "submit",
        value.artifactPath,
        "--keychain-profile",
        keychainProfile,
        "--wait",
        "--output-format",
        "json",
      ],
      {},
    )
    const result = submission(json(response?.stdout, "notarization submission"))
    if (result.status !== "Accepted") fail("Notarization submission was not accepted")
    return fetchNotaryLog({
      submissionId: result.submissionId,
      profile: keychainProfile,
      evidenceDir,
      runFile: value.runFile,
    })
  } catch (error) {
    const id = timedOut(error) ? timeoutId(error) : undefined
    if (id !== undefined) {
      const unknown = { submissionId: id, status: "unknown" }
      await save(evidenceDir, resumeFileName, unknown)
      return unknown
    }
    commandError(error)
  }
}

export async function stapleAndValidate(options) {
  const value = input(options, ["artifactPath", "artifactKind", "runFile"])
  stapledArtifact(value.artifactPath, value.artifactKind)
  for (const [attempt, delay] of retryDelaysMs.entries()) {
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
    try {
      await value.runFile("xcrun", ["stapler", "staple", value.artifactPath], {})
      await value.runFile("xcrun", ["stapler", "validate", value.artifactPath], {})
      return { status: "stapled", attempts: attempt + 1 }
    } catch (error) {
      if (attempt === retryDelaysMs.length - 1) commandError(error)
    }
  }
}

export async function assessGatekeeper(options) {
  const value = input(options, ["artifactPath", "artifactKind", "runFile"])
  stapledArtifact(value.artifactPath, value.artifactKind)
  try {
    await value.runFile(
      "spctl",
      [
        "--assess",
        "--type",
        value.artifactKind === "app" ? "execute" : "open",
        "--verbose=4",
        value.artifactPath,
      ],
      {},
    )
  } catch (error) {
    commandError(error)
  }
  return { status: "accepted" }
}
