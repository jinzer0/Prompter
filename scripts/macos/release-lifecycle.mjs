import { mkdir, rm, rmdir } from "node:fs/promises"
import { dirname, join } from "node:path"

import { submitAndWait } from "./notarization.mjs"
import { candidate } from "./release-support.mjs"

function fail(message) {
  throw new Error(message)
}

export async function acceptNotarization({ artifactPath, evidenceDirectory, state }) {
  const result = await submitAndWait({
    artifactPath,
    profile: state.notaryProfile,
    evidenceDir: evidenceDirectory,
    runFile: state.run,
    ...(state.signal === undefined ? {} : { signal: state.signal }),
  })
  if (result?.status === "unknown") fail("Notarization submission is unresolved")
  if (result?.status !== "Accepted" || typeof result.logPath !== "string") {
    fail("Notarization submission was not accepted")
  }
}

export function createReleaseState(release, run, version) {
  const candidateDirectory = join(release.paths.releaseRoot, `v${version}`)
  return {
    state: {
      candidateDirectory,
      appEvidenceDirectory: join(release.paths.notarizationEvidenceRoot, `v${version}`, "app"),
      dmgEvidenceDirectory: join(release.paths.notarizationEvidenceRoot, `v${version}`, "dmg"),
      notaryProfile: release.notaryProfile,
      signal: release.signal,
      run,
      assets: [],
    },
    zipPath: join(candidateDirectory, `Prompter-${version}-mac-arm64.zip`),
    dmgPath: join(candidateDirectory, `Prompter-${version}-mac-arm64.dmg`),
    checksumPath: join(candidateDirectory, "SHA256SUMS"),
  }
}

export async function prepareReleaseCandidate(state) {
  await mkdir(dirname(state.candidateDirectory), { recursive: true })
  const current = await candidate(state.candidateDirectory)
  if (current.exists !== state.candidateInitial.exists || !current.empty) {
    fail("Release candidate directory changed during preflight")
  }
  if (!current.exists) {
    await mkdir(state.candidateDirectory)
    state.candidateCreated = true
  }
}

export async function cleanupRelease(run, state) {
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
  if (!state.success && state.candidateCreated) {
    try {
      await rmdir(state.candidateDirectory)
    } catch {
      failures.push(new Error("macOS release cleanup failed"))
    }
  }
  if (failures.length > 0) throw new AggregateError(failures, "macOS release cleanup failed")
}
