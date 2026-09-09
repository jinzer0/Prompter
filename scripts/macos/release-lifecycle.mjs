import { mkdir, rm } from "node:fs/promises"
import { dirname, join } from "node:path"

import { ensureOwnedDirectory, validateOwnedDirectory } from "./owned-directory.mjs"
import { cleanupReleaseAttempts, createReleaseAttempts } from "./release-attempt.mjs"

function fail(message) {
  throw new Error(message)
}

export function createReleaseState(release, run, version) {
  const candidateDirectory = join(release.paths.releaseRoot, `v${version}`)
  const appEvidenceDirectory = join(release.paths.notarizationEvidenceRoot, `v${version}`, "app")
  const dmgEvidenceDirectory = join(release.paths.notarizationEvidenceRoot, `v${version}`, "dmg")
  const zipName = `Prompter-${version}-mac-arm64.zip`
  const dmgName = `Prompter-${version}-mac-arm64.dmg`
  return {
    state: {
      candidateDirectory,
      trustedAnchor: dirname(release.paths.sourceRoot),
      appEvidenceDirectory,
      dmgEvidenceDirectory,
      notaryProfile: release.notaryProfile,
      signal: release.signal,
      run,
      assets: [],
      attemptHandlingStarted: false,
      attempts: createReleaseAttempts({
        evidenceRoot: release.paths.notarizationEvidenceRoot,
        trustedAnchor: dirname(release.paths.sourceRoot),
        appEvidenceDirectory,
        dmgEvidenceDirectory,
        zipName,
        dmgName,
      }),
    },
    zipPath: join(candidateDirectory, zipName),
    dmgPath: join(candidateDirectory, dmgName),
    checksumPath: join(candidateDirectory, "SHA256SUMS"),
  }
}

export async function validateReleaseRoot(state) {
  const releaseRoot = dirname(state.candidateDirectory)
  try {
    return (
      (await validateOwnedDirectory({
        trustedAnchor: state.trustedAnchor,
        targetPath: releaseRoot,
      })) !== undefined
    )
  } catch (error) {
    if (error?.code === "ENOENT") return false
    fail("Release root is unavailable")
  }
}

export async function prepareReleaseCandidate(state) {
  const releaseRoot = dirname(state.candidateDirectory)
  try {
    if (!(await validateReleaseRoot(state))) {
      await ensureOwnedDirectory({ trustedAnchor: state.trustedAnchor, targetPath: releaseRoot })
    }
    if (!(await validateReleaseRoot(state))) fail("Release root is unavailable")
    await mkdir(state.candidateDirectory)
    state.candidateCreated = true
  } catch {
    fail("Release candidate directory is unavailable")
  }
}

export async function cleanupRelease(run, state, error) {
  const failures = []
  let detached = !state.mountAttached
  if (state.mountAttached) {
    try {
      await run("/usr/bin/hdiutil", ["detach", state.mountDirectory], {})
      state.mountAttached = false
      detached = true
    } catch {
      failures.push(new Error("macOS release cleanup failed"))
    }
  }
  const paths = [
    state.appStageDirectory,
    state.submissionDirectory,
    state.extractDirectory,
    ...(detached ? [state.mountDirectory] : []),
    ...(!state.success ? state.assets : []),
  ].filter(Boolean)
  for (const path of paths) {
    try {
      await rm(path, { recursive: true, force: true })
    } catch {
      failures.push(new Error("macOS release cleanup failed"))
    }
  }
  try {
    await cleanupReleaseAttempts(state.attempts, error, state.attemptHandlingStarted)
  } catch {
    failures.push(new Error("macOS release cleanup failed"))
  }
  if (!state.success && state.candidateCreated) {
    try {
      if (!(await validateReleaseRoot(state))) fail("Release root is unavailable")
      await rm(state.candidateDirectory, { recursive: true, force: true })
    } catch {
      failures.push(new Error("macOS release cleanup failed"))
    }
  }
  if (failures.length > 0) throw new AggregateError(failures, "macOS release cleanup failed")
}
