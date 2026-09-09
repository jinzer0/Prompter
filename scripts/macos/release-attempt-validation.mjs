import { lstat, readdir, readFile, realpath, rm, unlink } from "node:fs/promises"
import { dirname, isAbsolute, join, relative, sep } from "node:path"

import {
  createNotarizationEvidence,
  identifyNotarizationArtifact,
  validateFinalNotarizationEvidence,
} from "./notarization-evidence.mjs"

const resumableErrors = new Set([
  "Notarization command failed",
  "Notarization submission is unresolved",
])

function fail() {
  throw new Error("Invalid retained notarization attempt")
}

function isContained(rootPath, targetPath) {
  const pathFromRoot = relative(rootPath, targetPath)
  return (
    pathFromRoot !== "" &&
    pathFromRoot !== ".." &&
    !pathFromRoot.startsWith(`..${sep}`) &&
    !isAbsolute(pathFromRoot)
  )
}

async function metadata(path) {
  try {
    return await lstat(path)
  } catch (error) {
    if (error?.code === "ENOENT") return undefined
    throw error
  }
}

export async function identifyRetainedAttempt(attempt) {
  const evidenceCanonical = await validateAttemptEvidenceDirectory(attempt)
  if (evidenceCanonical === undefined) return undefined
  const directoryMetadata = await metadata(attempt.directory)
  if (directoryMetadata === undefined) return undefined
  if (!directoryMetadata.isDirectory() || directoryMetadata.isSymbolicLink()) fail()
  if (JSON.stringify(await readdir(attempt.directory)) !== JSON.stringify([attempt.artifactName])) {
    fail()
  }
  const artifactMetadata = await lstat(attempt.artifactPath)
  if (!artifactMetadata.isFile() || artifactMetadata.isSymbolicLink()) fail()
  const [directoryCanonical, artifactCanonical] = await Promise.all([
    realpath(attempt.directory),
    realpath(attempt.artifactPath),
  ])
  if (
    !isContained(evidenceCanonical, directoryCanonical) ||
    !isContained(directoryCanonical, artifactCanonical) ||
    dirname(artifactCanonical) !== directoryCanonical
  ) {
    fail()
  }
  return identifyNotarizationArtifact(artifactCanonical)
}

export async function validateAttemptEvidenceDirectory(attempt) {
  const rootMetadata = await metadata(attempt.evidenceRoot)
  if (rootMetadata === undefined) return undefined
  if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink()) fail()
  const rootCanonical = await realpath(attempt.evidenceRoot)
  const parentPath = dirname(attempt.evidenceDirectory)
  const parentMetadata = await metadata(parentPath)
  if (parentMetadata === undefined) return undefined
  if (!parentMetadata.isDirectory() || parentMetadata.isSymbolicLink()) fail()
  const parentCanonical = await realpath(parentPath)
  if (!isContained(rootCanonical, parentCanonical)) fail()
  const evidenceMetadata = await metadata(attempt.evidenceDirectory)
  if (evidenceMetadata === undefined) return undefined
  if (!evidenceMetadata.isDirectory() || evidenceMetadata.isSymbolicLink()) fail()
  const evidenceCanonical = await realpath(attempt.evidenceDirectory)
  if (!isContained(rootCanonical, evidenceCanonical)) fail()
  return evidenceCanonical
}

async function readBoundAttempt(attempt) {
  const artifactIdentity = await identifyRetainedAttempt(attempt)
  if (artifactIdentity === undefined) return undefined
  const evidence = createNotarizationEvidence({
    evidenceDir: attempt.evidenceDirectory,
    artifactIdentity,
  })
  const saved = await evidence.readResume()
  if (
    saved === undefined ||
    !evidence.matchesArtifact(saved) ||
    !["unknown", "accepted", "Accepted"].includes(saved.status)
  ) {
    fail()
  }
  return Object.freeze({ attempt, saved })
}

async function savedEvidenceStatus(attempt) {
  try {
    if ((await validateAttemptEvidenceDirectory(attempt)) === undefined) return undefined
    const value = JSON.parse(
      await readFile(join(attempt.evidenceDirectory, "notarization-resume.json"), "utf8"),
    )
    if (value?.status !== "Accepted") return "pending"
    await validateFinalNotarizationEvidence({
      evidenceDir: attempt.evidenceDirectory,
      artifactKind: attempt.artifactKind,
    })
    return "Accepted"
  } catch (error) {
    if (error?.code === "ENOENT") return undefined
    fail()
  }
}

export async function inspectReleaseAttempts(attempts) {
  try {
    const [app, dmg, appEvidenceStatus, dmgEvidenceStatus] = await Promise.all([
      readBoundAttempt(attempts.app),
      readBoundAttempt(attempts.dmg),
      savedEvidenceStatus(attempts.app),
      savedEvidenceStatus(attempts.dmg),
    ])
    if (app !== undefined && dmg !== undefined) {
      if (app.saved.status !== "Accepted") fail()
      return dmg
    }
    if (app !== undefined && dmgEvidenceStatus !== undefined) fail()
    if (dmg !== undefined && appEvidenceStatus !== "Accepted") fail()
    if (app === undefined && dmg === undefined && (appEvidenceStatus || dmgEvidenceStatus)) fail()
    if (app === undefined && appEvidenceStatus === "pending") fail()
    if (dmg === undefined && dmgEvidenceStatus === "pending") fail()
    return app ?? dmg
  } catch {
    fail()
  }
}

export async function removeAttempt(attempt) {
  const evidenceCanonical = await validateAttemptEvidenceDirectory(attempt)
  if (evidenceCanonical === undefined) return
  const directoryMetadata = await metadata(attempt.directory)
  if (directoryMetadata === undefined) return
  if (directoryMetadata.isSymbolicLink() || !directoryMetadata.isDirectory()) {
    await unlink(attempt.directory)
    return
  }
  const directoryCanonical = await realpath(attempt.directory)
  if (!isContained(evidenceCanonical, directoryCanonical)) fail()
  await rm(attempt.directory, { recursive: true })
}

export async function cleanupReleaseAttempts(attempts, error, attemptHandlingStarted) {
  for (const attempt of [attempts.app, attempts.dmg]) {
    let retain = false
    if (error !== undefined) {
      try {
        const retained = await readBoundAttempt(attempt)
        retain =
          retained !== undefined &&
          (retained.saved.status === "Accepted" ||
            !attemptHandlingStarted ||
            resumableErrors.has(error?.message))
      } catch {
        retain = false
      }
    }
    if (!retain) await removeAttempt(attempt)
  }
}
