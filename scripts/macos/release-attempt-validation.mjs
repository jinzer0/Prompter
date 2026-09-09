import { lstat, readdir, readFile, realpath, rm, unlink } from "node:fs/promises"
import { dirname, isAbsolute, join, relative, sep } from "node:path"

import {
  createNotarizationEvidence,
  identifyNotarizationArtifact,
  validateFinalNotarizationEvidence,
} from "./notarization-evidence.mjs"
import { validateOwnedDirectory } from "./owned-directory.mjs"

const resumableErrors = new Set([
  "Notarization command failed",
  "Notarization submission is unresolved",
])
const terminalAttemptErrors = new Set(["Notarization submission was not accepted"])

function fail() {
  throw new Error("Invalid retained notarization attempt")
}

function invalidAttemptError(attempt) {
  const error = new Error("Invalid retained notarization attempt")
  error.artifactKind = attempt.artifactKind
  error.discardEvidence = true
  return error
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
  const rootCanonical = await validateOwnedDirectory({
    trustedAnchor: attempt.trustedAnchor,
    targetPath: attempt.evidenceRoot,
  })
  if (rootCanonical === undefined) return undefined
  const parentPath = dirname(attempt.evidenceDirectory)
  const parentCanonical = await validateOwnedDirectory({
    trustedAnchor: attempt.trustedAnchor,
    targetPath: parentPath,
  })
  if (parentCanonical === undefined) return undefined
  if (!isContained(rootCanonical, parentCanonical)) fail()
  const evidenceCanonical = await validateOwnedDirectory({
    trustedAnchor: attempt.trustedAnchor,
    targetPath: attempt.evidenceDirectory,
  })
  if (evidenceCanonical === undefined) return undefined
  if (!isContained(rootCanonical, evidenceCanonical)) fail()
  return evidenceCanonical
}

export async function validateReleaseAttemptDirectories(attempts) {
  try {
    await Promise.all([
      validateAttemptEvidenceDirectory(attempts.app),
      validateAttemptEvidenceDirectory(attempts.dmg),
    ])
  } catch {
    fail()
  }
}

async function readBoundAttempt(attempt) {
  try {
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
  } catch {
    throw invalidAttemptError(attempt)
  }
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
    throw invalidAttemptError(attempt)
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
  } catch (error) {
    if (error?.artifactKind === "app" || error?.artifactKind === "dmg") throw error
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

async function removeAttemptEvidence(attempt) {
  const evidenceCanonical = await validateAttemptEvidenceDirectory(attempt)
  if (evidenceCanonical === undefined) return
  await rm(evidenceCanonical, { recursive: true })
}

export async function cleanupReleaseAttempts(attempts, error, attemptHandlingStarted) {
  if (!attemptHandlingStarted) return
  for (const attempt of [attempts.app, attempts.dmg]) {
    let retain = false
    let discardEvidence = false
    if (error !== undefined) {
      const affectedAttempt = error?.artifactKind === attempt.artifactKind
      const terminalError = error?.blocksPublication || terminalAttemptErrors.has(error?.message)
      discardEvidence = affectedAttempt && (error?.discardEvidence === true || terminalError)
      try {
        const retained = await readBoundAttempt(attempt)
        retain =
          retained !== undefined &&
          (!affectedAttempt ||
            (!terminalError &&
              (retained.saved.status === "Accepted" ||
                retained.saved.status === "accepted" ||
                resumableErrors.has(error.message))))
      } catch {
        retain = false
      }
    }
    if (discardEvidence) await removeAttemptEvidence(attempt)
    else if (!retain) await removeAttempt(attempt)
  }
}
