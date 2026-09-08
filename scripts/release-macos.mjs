import { execFile } from "node:child_process"
import { mkdir, mkdtemp, readdir, rm, rmdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import {
  assessGatekeeper,
  preflightNotaryProfile,
  stapleAndValidate,
  submitAndWait,
} from "./macos/notarization.mjs"
import {
  assertIdentity,
  candidate,
  checksums,
  contained,
  input,
  runner,
  versionFrom,
} from "./macos/release-support.mjs"
import { signAppBundle, verifyAppSignature, verifyDmgSignature } from "./macos/signing.mjs"
import { assembleMacOSApp, createDmgArchive, createZipArchive } from "./package-macos.mjs"

const executeFile = promisify(execFile)
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const appBundleName = "Prompter.app"

function fail(message) {
  throw new Error(message)
}

async function preflight(release, run, state) {
  const selected = await run("/usr/bin/xcode-select", ["-p"], {})
  const xcode = await run("/usr/bin/xcodebuild", ["-version"], {})
  if (
    !selected.stdout.trim().endsWith("Xcode.app/Contents/Developer") ||
    !/^Xcode \d/u.test(xcode.stdout)
  )
    fail("Full Xcode must be selected")
  if (
    (await run("/usr/bin/git", ["status", "--porcelain"], { cwd: release.paths.sourceRoot }))
      .stdout !== ""
  )
    fail("Worktree must be clean")
  state.candidateInitial = await candidate(state.candidateDirectory)
  if (!state.candidateInitial.empty) fail("Release candidate directory is not empty")
  await run("/usr/bin/security", ["show-keychain-info"], {})
  assertIdentity(
    (await run("/usr/bin/security", ["find-identity", "-v", "-p", "codesigning"], {})).stdout,
    release.signingIdentity,
  )
  await preflightNotaryProfile({
    profile: release.notaryProfile,
    runFile: run,
    ...(release.signal === undefined ? {} : { signal: release.signal }),
  })
}

async function accepted(artifactPath, evidenceDirectory, state) {
  const result = await submitAndWait({
    artifactPath,
    profile: state.notaryProfile,
    evidenceDir: evidenceDirectory,
    runFile: state.run,
    ...(state.signal === undefined ? {} : { signal: state.signal }),
  })
  if (result?.status === "unknown") fail("Notarization submission is unresolved")
  if (result?.status !== "Accepted" || typeof result.logPath !== "string")
    fail("Notarization submission was not accepted")
}

async function prepareCandidate(state) {
  await mkdir(dirname(state.candidateDirectory), { recursive: true })
  const current = await candidate(state.candidateDirectory)
  if (current.exists !== state.candidateInitial.exists || !current.empty)
    fail("Release candidate directory changed during preflight")
  if (!current.exists) {
    await mkdir(state.candidateDirectory)
    state.candidateCreated = true
  }
}

async function cleanup(run, state) {
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

export async function runMacOSRelease(options) {
  const release = input(options)
  const run = runner(release.runFile)
  const version = await versionFrom(release.paths.packageJsonPath)
  const state = {
    candidateDirectory: join(release.paths.releaseRoot, `v${version}`),
    appEvidenceDirectory: join(release.paths.notarizationEvidenceRoot, `v${version}`, "app"),
    dmgEvidenceDirectory: join(release.paths.notarizationEvidenceRoot, `v${version}`, "dmg"),
    notaryProfile: release.notaryProfile,
    signal: release.signal,
    run,
    assets: [],
  }
  const zipPath = join(state.candidateDirectory, `Prompter-${version}-mac-arm64.zip`)
  const dmgPath = join(state.candidateDirectory, `Prompter-${version}-mac-arm64.dmg`)
  const checksumPath = join(state.candidateDirectory, "SHA256SUMS")
  try {
    await preflight(release, run, state)
    state.appStageDirectory = await mkdtemp(join(tmpdir(), "prompter-release-app-"))
    const appPath = join(state.appStageDirectory, appBundleName)
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
      runFile: run,
    })
    await verifyAppSignature({ appPath, runFile: run })
    await assessGatekeeper({
      artifactPath: appPath,
      artifactKind: "app",
      runFile: run,
      ...(release.signal === undefined ? {} : { signal: release.signal }),
    })
    state.submissionDirectory = await mkdtemp(join(tmpdir(), "prompter-notary-app-"))
    await accepted(
      await createZipArchive({
        arch: release.arch,
        appPath,
        outputDirectory: state.submissionDirectory,
        packageJsonPath: release.paths.packageJsonPath,
        runFile: run,
      }),
      state.appEvidenceDirectory,
      state,
    )
    await stapleAndValidate({
      artifactPath: appPath,
      artifactKind: "app",
      runFile: run,
      ...(release.signal === undefined ? {} : { signal: release.signal }),
    })
    await prepareCandidate(state)
    state.assets.push(zipPath)
    const finalZip = await createZipArchive({
      arch: release.arch,
      appPath,
      outputDirectory: state.candidateDirectory,
      packageJsonPath: release.paths.packageJsonPath,
      runFile: run,
    })
    state.extractDirectory = await mkdtemp(join(tmpdir(), "prompter-release-extract-"))
    await run("/usr/bin/ditto", ["-x", "-k", finalZip, state.extractDirectory], {})
    const extractedApp = await contained(
      state.extractDirectory,
      join(state.extractDirectory, appBundleName),
    )
    await verifyAppSignature({ appPath: extractedApp, runFile: run })
    await assessGatekeeper({
      artifactPath: extractedApp,
      artifactKind: "app",
      runFile: run,
      ...(release.signal === undefined ? {} : { signal: release.signal }),
    })
    state.assets.push(dmgPath)
    const finalDmg = await createDmgArchive({
      arch: release.arch,
      appPath,
      outputDirectory: state.candidateDirectory,
      packageJsonPath: release.paths.packageJsonPath,
      runFile: run,
    })
    await run("/usr/bin/hdiutil", ["verify", finalDmg], {})
    await run(
      "/usr/bin/codesign",
      [
        "--force",
        "--timestamp",
        "--options",
        "runtime",
        "--sign",
        release.signingIdentity,
        finalDmg,
      ],
      {},
    )
    await verifyDmgSignature({ dmgPath: finalDmg, runFile: run })
    await accepted(finalDmg, state.dmgEvidenceDirectory, state)
    await stapleAndValidate({
      artifactPath: finalDmg,
      artifactKind: "dmg",
      runFile: run,
      ...(release.signal === undefined ? {} : { signal: release.signal }),
    })
    await assessGatekeeper({
      artifactPath: finalDmg,
      artifactKind: "dmg",
      runFile: run,
      ...(release.signal === undefined ? {} : { signal: release.signal }),
    })
    state.mountDirectory = await mkdtemp(join(tmpdir(), "prompter-release-mount-"))
    await run(
      "/usr/bin/hdiutil",
      ["attach", "-readonly", "-nobrowse", "-mountpoint", state.mountDirectory, finalDmg],
      {},
    )
    state.mountAttached = true
    const mountedApp = await contained(
      state.mountDirectory,
      join(state.mountDirectory, appBundleName),
    )
    await verifyAppSignature({ appPath: mountedApp, runFile: run })
    await assessGatekeeper({
      artifactPath: mountedApp,
      artifactKind: "app",
      runFile: run,
      ...(release.signal === undefined ? {} : { signal: release.signal }),
    })
    await run("/usr/bin/hdiutil", ["detach", state.mountDirectory], {})
    state.mountAttached = false
    state.assets.push(checksumPath)
    await writeFile(
      checksumPath,
      checksums(
        (await run("/usr/bin/shasum", ["-a", "256", finalZip, finalDmg], {})).stdout,
        finalZip,
        finalDmg,
      ),
    )
    const artifacts = [basename(finalZip), basename(finalDmg), "SHA256SUMS"].sort()
    if (
      JSON.stringify((await readdir(state.candidateDirectory)).sort()) !== JSON.stringify(artifacts)
    )
      fail("Release candidate contains unexpected artifacts")
    state.success = true
    state.result = { artifacts }
  } catch (error) {
    try {
      await cleanup(run, state)
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "macOS release failed and cleanup failed")
    }
    throw error
  }
  await cleanup(run, state)
  return state.result
}

const defaultPaths = () => ({
  sourceRoot: root,
  packageJsonPath: join(root, "package.json"),
  electronAppPath: join(root, "node_modules", "electron", "dist", "Electron.app"),
  releaseRoot: join(root, "release"),
  entitlementsPath: join(root, "scripts", "macos", "entitlements.plist"),
  notarizationEvidenceRoot: join(root, ".omo", "evidence", "release-macos"),
})

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  process.once("SIGINT", abort)
  process.once("SIGTERM", abort)
  try {
    await runMacOSRelease({
      runFile: executeFile,
      platform: process.platform,
      arch: process.arch,
      paths: defaultPaths(),
      signingIdentity: process.env.PROMPTER_SIGNING_IDENTITY,
      notaryProfile: process.env.PROMPTER_NOTARY_PROFILE,
      signal: controller.signal,
    })
    console.log("macOS release artifacts are ready.")
  } catch {
    console.error("macOS release failed.")
    process.exitCode = 1
  } finally {
    process.removeListener("SIGINT", abort)
    process.removeListener("SIGTERM", abort)
  }
}
