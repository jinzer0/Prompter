import { execFile } from "node:child_process"
import { mkdtemp, readdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import {
  assessGatekeeper,
  preflightNotaryProfile,
  stapleAndValidate,
} from "./macos/notarization.mjs"
import {
  acceptNotarization,
  cleanupRelease,
  createReleaseState,
  prepareReleaseCandidate,
} from "./macos/release-lifecycle.mjs"
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
  if ((await candidate(state.candidateDirectory)).exists)
    fail("Release candidate directory is unavailable")
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

export async function runMacOSRelease(options) {
  const release = input(options)
  const run = runner(release.runFile)
  const version = await versionFrom(release.paths.packageJsonPath)
  const { state, zipPath, dmgPath, checksumPath } = createReleaseState(release, run, version)
  try {
    await preflight(release, run, state)
    await prepareReleaseCandidate(state)
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
    await acceptNotarization({
      artifactPath: await createZipArchive({
        arch: release.arch,
        appPath,
        outputDirectory: state.submissionDirectory,
        packageJsonPath: release.paths.packageJsonPath,
        runFile: run,
      }),
      evidenceDirectory: state.appEvidenceDirectory,
      state,
    })
    await stapleAndValidate({
      artifactPath: appPath,
      artifactKind: "app",
      runFile: run,
      ...(release.signal === undefined ? {} : { signal: release.signal }),
    })
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
    await acceptNotarization({
      artifactPath: finalDmg,
      evidenceDirectory: state.dmgEvidenceDirectory,
      state,
    })
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
      await cleanupRelease(run, state)
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "macOS release failed and cleanup failed")
    }
    throw error
  }
  await cleanupRelease(run, state)
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
