import { constants } from "node:fs"
import { copyFile, mkdir, mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"

import { assembleMacOSApp, createDmgArchive, createZipArchive } from "../package-macos.mjs"
import { stapleAndValidate, submitAndWait } from "./notarization.mjs"
import { ensureOwnedDirectory } from "./owned-directory.mjs"
import {
  identifyRetainedAttempt,
  validateAttemptEvidenceDirectory,
} from "./release-attempt-validation.mjs"
import { contained } from "./release-support.mjs"
import { signAppBundle, verifyAppSignature, verifyDmgSignature } from "./signing.mjs"

export {
  cleanupReleaseAttempts,
  inspectReleaseAttempts,
} from "./release-attempt-validation.mjs"

const attemptDirectoryName = "notarization-attempt"
function fail() {
  throw new Error("Invalid retained notarization attempt")
}

function descriptor(trustedAnchor, evidenceRoot, evidenceDirectory, artifactKind, artifactName) {
  if (
    basename(artifactName) !== artifactName ||
    !artifactName.endsWith(artifactKind === "app" ? ".zip" : ".dmg")
  ) {
    fail()
  }
  const directory = join(evidenceDirectory, attemptDirectoryName)
  return Object.freeze({
    artifactKind,
    artifactName,
    artifactPath: join(directory, artifactName),
    directory,
    evidenceDirectory,
    evidenceRoot,
    trustedAnchor,
  })
}

export function createReleaseAttempts(options) {
  return Object.freeze({
    app: descriptor(
      options.trustedAnchor,
      options.evidenceRoot,
      options.appEvidenceDirectory,
      "app",
      options.zipName,
    ),
    dmg: descriptor(
      options.trustedAnchor,
      options.evidenceRoot,
      options.dmgEvidenceDirectory,
      "dmg",
      options.dmgName,
    ),
  })
}

async function prepareAttempt(attempt) {
  await ensureOwnedDirectory({
    trustedAnchor: attempt.trustedAnchor,
    targetPath: attempt.evidenceDirectory,
  })
  if ((await validateAttemptEvidenceDirectory(attempt)) === undefined) fail()
  try {
    await mkdir(attempt.directory)
  } catch {
    fail()
  }
  return attempt.directory
}

async function verifyPreparedAttempt(attempt, artifactPath) {
  if (
    artifactPath !== attempt.artifactPath ||
    (await identifyRetainedAttempt(attempt)) === undefined
  ) {
    fail()
  }
}

async function acceptAttempt(attempt, state) {
  try {
    const result = await submitAndWait({
      artifactPath: attempt.artifactPath,
      profile: state.notaryProfile,
      evidenceDir: attempt.evidenceDirectory,
      runFile: state.run,
      ...(state.signal === undefined ? {} : { signal: state.signal }),
      ...(state.staplerWaitFor === undefined ? {} : { waitFor: state.staplerWaitFor }),
    })
    if (["unknown", "accepted"].includes(result?.status)) {
      throw new Error("Notarization submission is unresolved")
    }
    if (result?.status !== "Accepted" || typeof result.logPath !== "string") {
      throw new Error("Notarization submission was not accepted")
    }
  } catch (error) {
    if (error instanceof Error) {
      error.artifactKind = attempt.artifactKind
      throw error
    }
    const sanitized = new Error("Notarization command failed")
    sanitized.artifactKind = attempt.artifactKind
    throw sanitized
  }
}

function invalidDmgAttemptError() {
  const error = new Error("Invalid retained notarization attempt")
  error.artifactKind = "dmg"
  error.discardEvidence = true
  error.dependentArtifactKind = "app"
  return error
}

async function refreshAppAttemptForDmg(appAttempt, state) {
  if (appAttempt === undefined) throw invalidDmgAttemptError()
  try {
    await acceptAttempt(appAttempt, state)
  } catch (error) {
    if (error instanceof Error) error.dependentArtifactKind = "dmg"
    throw error
  }
}

export async function prepareReleaseApp({ attempt, release, resumed, state }) {
  state.appStageDirectory = await mkdtemp(join(tmpdir(), "prompter-release-app-"))
  const appPath = join(state.appStageDirectory, "Prompter.app")
  state.attemptHandlingStarted = true
  if (resumed) {
    await acceptAttempt(attempt, state)
    await state.run(
      "/usr/bin/ditto",
      ["-x", "-k", attempt.artifactPath, state.appStageDirectory],
      {},
    )
    const recoveredAppPath = await contained(state.appStageDirectory, appPath)
    await verifyAppSignature({
      appPath: recoveredAppPath,
      identity: release.signingIdentity,
      runFile: state.run,
    })
  } else {
    await assembleMacOSApp({
      appPath,
      electronAppPath: release.paths.electronAppPath,
      packageJsonPath: release.paths.packageJsonPath,
      sourceRoot: release.paths.sourceRoot,
    })
    await signAppBundle({
      appPath,
      identity: release.signingIdentity,
      entitlementsPath: release.paths.entitlementsPath,
      runFile: state.run,
    })
    await verifyAppSignature({ appPath, runFile: state.run })
    await prepareAttempt(attempt)
    const artifactPath = await createZipArchive({
      arch: release.arch,
      appPath,
      outputDirectory: attempt.directory,
      packageJsonPath: release.paths.packageJsonPath,
      runFile: state.run,
    })
    await verifyPreparedAttempt(attempt, artifactPath)
    await acceptAttempt(attempt, state)
  }
  await stapleAndValidate({
    artifactPath: appPath,
    artifactKind: "app",
    runFile: state.run,
    ...(state.signal === undefined ? {} : { signal: state.signal }),
    ...(state.staplerWaitFor === undefined ? {} : { waitFor: state.staplerWaitFor }),
  })
  return appPath
}

export async function prepareReleaseDmg({
  appAttempt,
  appPath,
  attempt,
  release,
  resumed,
  state,
  targetPath,
}) {
  state.attemptHandlingStarted = true
  if (!resumed) {
    await prepareAttempt(attempt)
    const artifactPath = await createDmgArchive({
      arch: release.arch,
      appPath,
      outputDirectory: attempt.directory,
      packageJsonPath: release.paths.packageJsonPath,
      runFile: state.run,
    })
    await state.run("/usr/bin/hdiutil", ["verify", artifactPath], {})
    await state.run(
      "/usr/bin/codesign",
      [
        "--force",
        "--timestamp",
        "--options",
        "runtime",
        "--sign",
        release.signingIdentity,
        artifactPath,
      ],
      {},
    )
    await verifyDmgSignature({ dmgPath: artifactPath, runFile: state.run })
    await verifyPreparedAttempt(attempt, artifactPath)
  }
  if (resumed) await refreshAppAttemptForDmg(appAttempt, state)
  await acceptAttempt(attempt, state)
  if (resumed) {
    await verifyDmgSignature({
      dmgPath: attempt.artifactPath,
      identity: release.signingIdentity,
      runFile: state.run,
    })
  }
  state.assets.push(targetPath)
  await copyFile(attempt.artifactPath, targetPath, constants.COPYFILE_EXCL)
  await stapleAndValidate({
    artifactPath: targetPath,
    artifactKind: "dmg",
    runFile: state.run,
    ...(state.signal === undefined ? {} : { signal: state.signal }),
    ...(state.staplerWaitFor === undefined ? {} : { waitFor: state.staplerWaitFor }),
  })
  await state.run("/usr/bin/hdiutil", ["verify", targetPath], {})
  await verifyDmgSignature({
    dmgPath: targetPath,
    identity: release.signingIdentity,
    runFile: state.run,
  })
  return targetPath
}
