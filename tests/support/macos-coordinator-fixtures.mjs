import { access, cp, mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { runMacOSRelease } from "../../scripts/release-macos.mjs"
import {
  appSubmissionId,
  commandStage,
  dmgSubmissionId,
  syntheticIdentity,
  syntheticSecret,
} from "./macos-coordinator-support.mjs"
import { createElectronAppFixture } from "./macos-package-fixtures.mjs"

export async function createCoordinatorFixture({
  displayOutput,
  signingIdentity = syntheticIdentity,
  displayIdentity = signingIdentity,
  failure,
  identityListing = "one",
  label = "default",
  pendingAppStatus,
  pendingDmgStatus,
  reservationBarrier,
  appSubmissionBarrier,
  shared,
  warningLog = false,
  notaryLog,
} = {}) {
  const root = shared?.root ?? (await mkdtemp(join(tmpdir(), "prompter-release-test-")))
  const sourceRoot = shared?.sourceRoot ?? join(root, "source")
  const nativeSourcePath = join(sourceRoot, "node_modules", "native", "build", "addon.node")
  const releaseRoot = shared?.releaseRoot ?? join(root, "release-parent", "release")
  const evidenceRoot = shared?.evidenceRoot ?? join(root, "evidence-parent", "evidence")
  const electron = shared?.electron ?? (await createElectronAppFixture())
  const fakeArtifacts = shared?.fakeArtifacts ?? {
    directory: join(root, "fake-artifacts"),
    nextId: 0,
    snapshots: new Map(),
  }
  if (shared === undefined) {
    await mkdir(sourceRoot, { recursive: true })
    await mkdir(dirname(nativeSourcePath), { recursive: true })
    await Promise.all([
      mkdir(releaseRoot, { recursive: true }),
      mkdir(evidenceRoot, { recursive: true }),
      mkdir(fakeArtifacts.directory, { recursive: true }),
      ...["dist", "dist-electron", "drizzle", "node_modules"].map((name) =>
        mkdir(join(sourceRoot, name), { recursive: true }),
      ),
    ])
    await Promise.all([
      writeFile(join(sourceRoot, "package.json"), JSON.stringify({ version: "0.1.1" })),
      writeFile(nativeSourcePath, "native"),
      writeFile(join(releaseRoot, "caller-sentinel"), "retain"),
      writeFile(join(evidenceRoot, "caller-sentinel"), "retain"),
    ])
  }
  if (failure === "stale-candidate") {
    await mkdir(join(releaseRoot, "v0.1.1"))
    await writeFile(join(releaseRoot, "v0.1.1", "stale"), "stale")
  }
  const [calls, rawCalls, observedTempRoots] = [[], [], new Set()]
  let candidateExistsDuringProfile = false
  const runFile = async (command, arguments_, options = {}) => {
    const stage = commandStage(command, arguments_)
    calls.push(stage)
    rawCalls.push({ command, arguments_, options })
    for (const value of [...arguments_, options.cwd].filter((entry) => typeof entry === "string")) {
      const match = value.match(
        /^(.*\/prompter-(?:release-app|notary-app|release-extract|release-mount|dmg)-[^/]+)/u,
      )
      if (match?.[1] !== undefined) observedTempRoots.add(match[1])
    }
    if (
      stage === "app-sign" &&
      command === "/usr/bin/codesign" &&
      !calls.includes("native-copied")
    ) {
      const appPath = `${arguments_.at(-1).split("/Prompter.app")[0]}/Prompter.app`
      await access(
        join(
          appPath,
          "Contents",
          "Resources",
          "app",
          "node_modules",
          "native",
          "build",
          "addon.node",
        ),
      )
      calls.splice(calls.length - 1, 0, "native-copied")
    }
    if (failure === "app-staple-exhaustion" && stage === "app-staple")
      throw new Error(syntheticSecret)
    if (failure === "dmg-mutating-validate-exhaustion" && stage === "dmg-staple") {
      if (arguments_[1] === "validate") throw new Error(syntheticSecret)
      const artifactPath = arguments_[2]
      await writeFile(artifactPath, `${await readFile(artifactPath, "utf8")}-stapled`)
      return { stdout: "", stderr: "" }
    }
    if (stage === failure) throw new Error(syntheticSecret)
    if (stage === "identity") {
      const matches = identityListing === "multiple" ? 2 : identityListing === "none" ? 0 : 1
      return {
        stdout: `${Array.from({ length: matches }, (_, index) => `  ${index + 1}) ${"a".repeat(40)} "${signingIdentity}"`).join("\n")}\n  ${matches} valid identities found\n`,
        stderr: "",
      }
    }
    if (stage === "signer-display") {
      options.finalDmgExistsDuringSignerDisplay = await access(
        join(releaseRoot, "v0.1.1", "Prompter-0.1.1-mac-arm64.dmg"),
      ).then(
        () => true,
        () => false,
      )
      return displayOutput ?? { stdout: "", stderr: `Authority=${displayIdentity}\n` }
    }
    if (stage === "worktree" && failure === "candidate-race") {
      await mkdir(join(releaseRoot, "v0.1.1"))
      await writeFile(join(releaseRoot, "v0.1.1", "race"), "race")
    }
    if (stage === "worktree") await reservationBarrier?.wait(label)
    if (stage === "profile")
      candidateExistsDuringProfile = await stat(join(releaseRoot, "v0.1.1")).then(
        () => true,
        () => false,
      )
    if (stage === "app-submit" && failure === "app-timeout") {
      const error = new Error(syntheticSecret)
      error.code = "ETIMEDOUT"
      error.stdout = JSON.stringify({ id: appSubmissionId })
      throw error
    }
    if (stage === "app-submit") await appSubmissionBarrier?.wait()
    if (stage === "dmg-submit" && failure === "dmg-timeout") {
      const error = new Error(syntheticSecret)
      error.code = "ETIMEDOUT"
      error.stdout = JSON.stringify({ id: dmgSubmissionId })
      throw error
    }
    if (command === "/usr/bin/xcode-select")
      return { stdout: "/Applications/Xcode.app/Contents/Developer", stderr: "" }
    if (command === "/usr/bin/xcodebuild") return { stdout: "Xcode 16", stderr: "" }
    if (["/usr/bin/git", "/usr/bin/security", "/usr/bin/file", "/usr/bin/lipo"].includes(command))
      return {
        stdout: command === "/usr/bin/file" ? "Mach-O" : command === "/usr/bin/lipo" ? "arm64" : "",
        stderr: "",
      }
    if (command === "/usr/bin/xcrun")
      return xcrunResult(arguments_, pendingAppStatus, pendingDmgStatus, warningLog, notaryLog)
    if (command === "/usr/bin/ditto" && arguments_[0] === "-c")
      await createZipSnapshot(arguments_, options, fakeArtifacts)
    if (command === "/usr/bin/ditto" && arguments_[0] === "-x")
      await restoreSnapshot(arguments_[2], arguments_.at(-1), fakeArtifacts)
    if (command === "/usr/bin/hdiutil" && arguments_[0] === "create")
      await createDmgSnapshot(arguments_, fakeArtifacts)
    if (command === "/usr/bin/hdiutil" && arguments_[0] === "attach")
      await restoreSnapshot(arguments_.at(-1), arguments_[4], fakeArtifacts)
    if (command === "/usr/bin/shasum")
      return {
        stdout: `${"a".repeat(64)}  ${arguments_[2]}\n${"b".repeat(64)}  ${arguments_[3]}\n`,
        stderr: "",
      }
    return { stdout: "", stderr: "" }
  }
  return {
    calls,
    rawCalls,
    observedTempRoots,
    candidate: join(releaseRoot, "v0.1.1"),
    evidenceRoot,
    get candidateExistsDuringProfile() {
      return candidateExistsDuringProfile
    },
    releaseRoot,
    shared: { root, sourceRoot, releaseRoot, evidenceRoot, electron, fakeArtifacts },
    temporaryDirectories: shared === undefined ? [root, ...electron.temporaryDirectories] : [],
    run: () =>
      runMacOSRelease({
        runFile,
        platform: "darwin",
        arch: "arm64",
        signingIdentity,
        notaryProfile: "SYNTHETIC_PROFILE",
        staplerWaitFor: async () => undefined,
        paths: {
          sourceRoot,
          packageJsonPath: join(sourceRoot, "package.json"),
          electronAppPath: electron.appPath,
          releaseRoot,
          entitlementsPath: "scripts/macos/entitlements.plist",
          notarizationEvidenceRoot: evidenceRoot,
        },
      }),
  }
}

function xcrunResult(arguments_, pendingAppStatus, pendingDmgStatus, warningLog, notaryLog) {
  if (arguments_[1] === "history") return { stdout: "{}", stderr: "" }
  if (arguments_[1] === "submit")
    return {
      stdout: JSON.stringify({
        id: arguments_[2].endsWith(".dmg") ? dmgSubmissionId : appSubmissionId,
        status: "Accepted",
      }),
      stderr: "",
    }
  if (arguments_[1] === "info") {
    const isDmg = arguments_[2] === dmgSubmissionId
    return {
      stdout: JSON.stringify({
        id: isDmg ? dmgSubmissionId : appSubmissionId,
        status: isDmg ? (pendingDmgStatus ?? "Accepted") : (pendingAppStatus ?? "Accepted"),
      }),
      stderr: "",
    }
  }
  if (arguments_[1] === "log")
    return {
      stdout: JSON.stringify(
        notaryLog ?? (warningLog ? { issues: [{ severity: "warning" }] } : { issues: [] }),
      ),
      stderr: "",
    }
  return { stdout: "", stderr: "" }
}

async function createZipSnapshot(arguments_, options, fakeArtifacts) {
  const contents = `zip-${fakeArtifacts.nextId++}`
  const snapshot = join(fakeArtifacts.directory, contents)
  await cp(join(options.cwd, "Prompter.app"), snapshot, { recursive: true, verbatimSymlinks: true })
  fakeArtifacts.snapshots.set(contents, snapshot)
  await writeFile(arguments_.at(-1), contents)
}

async function createDmgSnapshot(arguments_, fakeArtifacts) {
  const contents = `dmg-${fakeArtifacts.nextId++}`
  const snapshot = join(fakeArtifacts.directory, contents)
  const stagingDirectory = arguments_[arguments_.indexOf("-srcfolder") + 1]
  await cp(join(stagingDirectory, "Prompter.app"), snapshot, {
    recursive: true,
    verbatimSymlinks: true,
  })
  fakeArtifacts.snapshots.set(contents, snapshot)
  await writeFile(arguments_.at(-1), contents)
}

async function restoreSnapshot(source, destination, fakeArtifacts) {
  const contents = await readFile(source, "utf8")
  await cp(fakeArtifacts.snapshots.get(contents), join(destination, "Prompter.app"), {
    recursive: true,
    verbatimSymlinks: true,
  })
}
