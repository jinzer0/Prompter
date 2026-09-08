import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import {
  access,
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import { afterEach, test } from "vitest"

import { runner } from "../scripts/macos/release-support.mjs"
import {
  createDmgArchive,
  createZipArchive,
  renameElectronApp,
  resolveMacOSArchitecture,
  resolveReleaseMacOSArchitecture,
} from "../scripts/package-macos.mjs"
import { runMacOSRelease } from "../scripts/release-macos.mjs"

const temporaryDirectories = []
const executeFile = promisify(execFile)
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const electronHelperNames = [
  "Electron Helper",
  "Electron Helper (Renderer)",
  "Electron Helper (GPU)",
  "Electron Helper (Plugin)",
]

function helperSuffix(helperName) {
  return helperName.slice(15).replaceAll(" (", ".").replaceAll(")", "").toLowerCase()
}

afterEach(() =>
  Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  ),
)

async function createFixture() {
  const directory = await mkdtemp(join(tmpdir(), "prompter-package-test-"))
  temporaryDirectories.push(directory)

  const appPath = join(directory, "Prompter.app")
  const outputDirectory = join(directory, "release")
  const packageJsonPath = join(directory, "package.json")
  await Promise.all([
    mkdir(appPath),
    mkdir(outputDirectory),
    writeFile(packageJsonPath, JSON.stringify({ version: "7.8.9" })),
  ])

  return { appPath, outputDirectory, packageJsonPath }
}

async function createReleaseEntrypointFixture(version) {
  const root = await mkdtemp(join(tmpdir(), "prompter-release-entrypoint-test-"))
  temporaryDirectories.push(root)
  await mkdir(join(root, "scripts", "macos"), { recursive: true })
  await cp(
    join(repositoryRoot, "scripts", "macos", "release-version-preflight.mjs"),
    join(root, "scripts", "macos", "release-version-preflight.mjs"),
  )
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      name: "release-entrypoint-fixture",
      private: true,
      ...(version === undefined ? {} : { version }),
      scripts: {
        build: "node build-marker.mjs",
        "package:release:macos":
          "node scripts/macos/release-version-preflight.mjs && npm run build && node downstream-marker.mjs",
      },
    }),
  )
  await Promise.all([
    writeFile(
      join(root, "build-marker.mjs"),
      'await import("node:fs/promises").then(({ writeFile }) => writeFile("build-ran", "1"))',
    ),
    writeFile(
      join(root, "downstream-marker.mjs"),
      'await import("node:fs/promises").then(({ writeFile }) => writeFile("downstream-ran", "1"))',
    ),
  ])
  return root
}

async function assertReleaseEntrypointRejectsBeforeMutation(version) {
  const root = await createReleaseEntrypointFixture(version)

  await assert.rejects(
    executeFile("npm", ["run", "package:release:macos"], { cwd: root }),
    (error) =>
      error instanceof Error &&
      `${error.stdout ?? ""}\n${error.stderr ?? ""}`.includes("Invalid package version"),
  )
  for (const path of [
    "build-ran",
    "downstream-ran",
    "release/v0.1.1",
    ".omo/evidence/release-macos",
  ]) {
    await assert.rejects(access(join(root, path)))
  }
}

function dmgOptions(fixture, arch) {
  return {
    arch,
    appPath: fixture.appPath,
    outputDirectory: fixture.outputDirectory,
    packageJsonPath: fixture.packageJsonPath,
  }
}

function createPlist({
  bundleIdentifier,
  bundleName,
  executable,
  includeDisplayName = true,
  includeExecutable = true,
}) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<plist version="1.0">',
    "<dict>",
    "<key>CFBundleIdentifier</key>",
    `<string>${bundleIdentifier}</string>`,
    ...(includeExecutable
      ? ["<key>CFBundleExecutable</key>", `<string>${executable}</string>`]
      : []),
    "<key>CFBundleName</key>",
    `<string>${bundleName}</string>`,
    ...(includeDisplayName
      ? ["<key>CFBundleDisplayName</key>", `<string>${bundleName}</string>`]
      : []),
    "<key>LSEnvironment</key>",
    "<dict>",
    "<key>NESTED_VALUE</key>",
    "<string>preserve-me</string>",
    "</dict>",
    "<key>ElectronAsarIntegrity</key>",
    "<string>preserve-me</string>",
    "</dict>",
    "</plist>",
  ].join("\n")
}

async function createElectronBundle(bundlePath, bundleName, bundleIdentifier, plistOptions) {
  const contentsPath = join(bundlePath, "Contents")
  const executablePath = join(contentsPath, "MacOS", bundleName)
  await mkdir(join(contentsPath, "MacOS"), { recursive: true })
  await writeFile(executablePath, `${bundleName} executable`)
  await writeFile(
    join(contentsPath, "Info.plist"),
    createPlist({ bundleIdentifier, bundleName, executable: bundleName, ...plistOptions }),
  )
  await chmod(executablePath, 0o755)
}

async function createElectronAppFixture() {
  const directory = await mkdtemp(join(tmpdir(), "prompter-electron-app-test-"))
  temporaryDirectories.push(directory)

  const appPath = join(directory, "Electron.app")
  const frameworksPath = join(appPath, "Contents", "Frameworks")
  await createElectronBundle(appPath, "Electron", "com.github.Electron")

  for (const helperName of electronHelperNames) {
    const helperIdentifier = `com.github.Electron.helper${helperSuffix(helperName)}`
    await createElectronBundle(
      join(frameworksPath, `${helperName}.app`),
      helperName,
      helperIdentifier,
      { includeDisplayName: false, includeExecutable: false },
    )
  }

  const frameworkName = "Electron Framework"
  const frameworkPath = join(frameworksPath, `${frameworkName}.framework`)
  const frameworkBinaryPath = join(frameworkPath, "Versions", "A", frameworkName)
  await mkdir(join(frameworkBinaryPath, ".."), { recursive: true })
  await writeFile(frameworkBinaryPath, "framework binary")
  await symlink("A", join(frameworkPath, "Versions", "Current"))
  const frameworkLinkPath = join(frameworkPath, frameworkName)
  await symlink(`Versions/Current/${frameworkName}`, frameworkLinkPath)

  return { appPath, frameworkBinaryPath, frameworkLinkPath }
}

const syntheticIdentity = "Developer ID Application: SYNTHETIC_IDENTITY"
const syntheticSecret = "SYNTHETIC_PROFILE_PASSWORD_KEY_PATH"

function commandStage(command, arguments_, counts) {
  if (command === "/usr/bin/xcode-select") return "xcode"
  if (command === "/usr/bin/xcodebuild") return "xcode-version"
  if (command === "/usr/bin/git") return "worktree"
  if (command === "/usr/bin/security" && arguments_[0] === "show-keychain-info") return "keychain"
  if (command === "/usr/bin/security") return "identity"
  if (command === "/usr/bin/plutil") return "entitlements"
  if (command === "/usr/bin/file") return "inspect-binary"
  if (command === "/usr/bin/xcrun" && arguments_[1] === "history") return "profile"
  if (command === "/usr/bin/xcrun" && arguments_[1] === "submit")
    return counts.submit === 0 ? "app-submit" : "dmg-submit"
  if (command === "/usr/bin/xcrun" && arguments_[1] === "log")
    return counts.submit === 1 ? "app-log" : "dmg-log"
  if (command === "/usr/bin/xcrun" && arguments_[0] === "stapler")
    return arguments_[2].endsWith(".dmg") ? "dmg-staple" : "app-staple"
  if (command === "/usr/bin/ditto" && arguments_[0] === "-x") return "zip-extract"
  if (command === "/usr/bin/ditto" && arguments_[0] === "-c")
    return arguments_.at(-1).includes("prompter-notary-app-") ? "temporary-zip" : "final-zip"
  if (command === "/usr/bin/hdiutil" && arguments_[0] === "create") return "dmg-create"
  if (command === "/usr/bin/hdiutil" && arguments_[0] === "verify") return "dmg-verify"
  if (command === "/usr/bin/hdiutil" && arguments_[0] === "attach") return "attach"
  if (command === "/usr/bin/hdiutil" && arguments_[0] === "detach") return "detach"
  if (command === "/usr/bin/shasum") return "checksum"
  if (
    command === "/usr/bin/codesign" &&
    arguments_.at(-1).endsWith(".dmg") &&
    arguments_.includes("--verify")
  )
    return "dmg-signature"
  if (command === "/usr/bin/codesign" && arguments_.includes("--deep")) {
    const targetPath = arguments_.at(-1)
    if (targetPath.includes("prompter-release-extract-")) return "app-verify-2"
    if (targetPath.includes("prompter-release-mount-")) return "app-verify-3"
    return "app-verify-1"
  }
  if (command === "/usr/bin/codesign" && arguments_.at(-1).endsWith(".dmg")) return "dmg-sign"
  if (command === "spctl" || command.endsWith("/spctl")) {
    counts.gatekeeper += 1
    return `gatekeeper-${counts.gatekeeper}`
  }
  return "app-sign"
}

async function createCoordinatorFixture({
  failure,
  identityListing = "one",
  warningLog = false,
} = {}) {
  const root = await mkdtemp(join(tmpdir(), "prompter-release-test-"))
  temporaryDirectories.push(root)
  const sourceRoot = join(root, "source")
  const nativeSourcePath = join(sourceRoot, "node_modules", "native", "build", "addon.node")
  const releaseRoot = join(root, "release")
  const evidenceRoot = join(root, "evidence")
  const electron = await createElectronAppFixture()
  await mkdir(sourceRoot, { recursive: true })
  await mkdir(dirname(nativeSourcePath), { recursive: true })
  await Promise.all([
    mkdir(releaseRoot, { recursive: true }),
    mkdir(evidenceRoot, { recursive: true }),
  ])
  await Promise.all([
    ...["dist", "dist-electron", "drizzle", "node_modules"].map((name) =>
      mkdir(join(sourceRoot, name), { recursive: true }),
    ),
    writeFile(join(sourceRoot, "package.json"), JSON.stringify({ version: "0.1.1" })),
    writeFile(nativeSourcePath, "native"),
    writeFile(join(releaseRoot, "caller-sentinel"), "retain"),
    writeFile(join(evidenceRoot, "caller-sentinel"), "retain"),
  ])
  if (failure === "stale-candidate") {
    await mkdir(join(releaseRoot, "v0.1.1"))
    await writeFile(join(releaseRoot, "v0.1.1", "stale"), "stale")
  }
  const calls = []
  const rawCalls = []
  const observedTempRoots = new Set()
  const counts = { gatekeeper: 0, submit: 0 }
  let packagedApp
  const runFile = async (command, arguments_, options = {}) => {
    const stage = commandStage(command, arguments_, counts)
    calls.push(stage)
    rawCalls.push({ command, arguments_ })
    for (const value of [...arguments_, options.cwd].filter((value) => typeof value === "string")) {
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
    if (stage === failure) throw new Error(syntheticSecret)
    if (stage === "identity") {
      const matches = identityListing === "multiple" ? 2 : identityListing === "none" ? 0 : 1
      return {
        stdout: `${Array.from({ length: matches }, (_, index) => `  ${index + 1}) ${"a".repeat(40)} "${syntheticIdentity}"`).join("\n")}\n  ${matches} valid identities found\n`,
        stderr: "",
      }
    }
    if (stage === "worktree" && failure === "candidate-race") {
      await mkdir(join(releaseRoot, "v0.1.1"))
      await writeFile(join(releaseRoot, "v0.1.1", "race"), "race")
    }
    if (stage === "app-submit" && failure === "app-timeout") {
      const error = new Error(syntheticSecret)
      error.code = "ETIMEDOUT"
      error.stdout = '{"id":"123e4567-e89b-42d3-a456-426614174000"}'
      throw error
    }
    if (command === "/usr/bin/xcode-select")
      return { stdout: "/Applications/Xcode.app/Contents/Developer", stderr: "" }
    if (command === "/usr/bin/xcodebuild") return { stdout: "Xcode 16", stderr: "" }
    if (
      command === "/usr/bin/git" ||
      command === "/usr/bin/security" ||
      command === "/usr/bin/file"
    )
      return { stdout: command === "/usr/bin/file" ? "Mach-O" : "", stderr: "" }
    if (command === "/usr/bin/xcrun") {
      if (arguments_[1] === "history") return { stdout: "{}", stderr: "" }
      if (arguments_[1] === "submit") {
        counts.submit += 1
        return {
          stdout: JSON.stringify({
            id:
              counts.submit === 1
                ? "123e4567-e89b-42d3-a456-426614174000"
                : "123e4567-e89b-42d3-a456-426614174001",
            status: "Accepted",
          }),
          stderr: "",
        }
      }
      if (arguments_[1] === "log")
        return {
          stdout: warningLog ? '{"issues":[{"severity":"warning"}]}' : '{"issues":[]}',
          stderr: "",
        }
      return { stdout: "", stderr: "" }
    }
    if (command === "/usr/bin/ditto" && arguments_[0] === "-c") {
      packagedApp = join(options.cwd, "Prompter.app")
      await writeFile(arguments_.at(-1), "zip")
    }
    if (command === "/usr/bin/ditto" && arguments_[0] === "-x")
      await cp(packagedApp, join(arguments_.at(-1), "Prompter.app"), {
        recursive: true,
        verbatimSymlinks: true,
      })
    if (command === "/usr/bin/hdiutil" && arguments_[0] === "create")
      await writeFile(arguments_.at(-1), "dmg")
    if (command === "/usr/bin/hdiutil" && arguments_[0] === "attach")
      await cp(packagedApp, join(arguments_[4], "Prompter.app"), {
        recursive: true,
        verbatimSymlinks: true,
      })
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
    releaseRoot,
    run: () =>
      runMacOSRelease({
        runFile,
        platform: "darwin",
        arch: "arm64",
        signingIdentity: syntheticIdentity,
        notaryProfile: "SYNTHETIC_PROFILE",
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function assertPlistValue(plist, key, value) {
  assert.match(plist, new RegExp(`<key>${key}</key>\\s*<string>${escapeRegExp(value)}</string>`))
}

function assertBundlePlist(plist, identifier, name) {
  assertPlistValue(plist, "CFBundleIdentifier", identifier)
  assertPlistValue(plist, "CFBundleExecutable", name)
  assertPlistValue(plist, "CFBundleName", name)
  assertPlistValue(plist, "CFBundleDisplayName", name)
  assertPlistValue(plist, "ElectronAsarIntegrity", "preserve-me")
}

test("renames the main executable and all Electron helper bundles into a runnable Prompter app", async () => {
  const fixture = await createElectronAppFixture()

  await renameElectronApp(fixture.appPath, "0.1.1")

  const contentsPath = join(fixture.appPath, "Contents")
  const mainExecutablePath = join(contentsPath, "MacOS", "Prompter")
  assert.equal((await stat(mainExecutablePath)).mode & 0o111, 0o111)
  await assert.rejects(access(join(contentsPath, "MacOS", "Electron")))

  const appPlist = await readFile(join(contentsPath, "Info.plist"), "utf8")
  assertBundlePlist(appPlist, "com.jinzer0.prompter", "Prompter")
  assertPlistValue(appPlist, "CFBundleShortVersionString", "0.1.1")
  assertPlistValue(appPlist, "CFBundleVersion", "0.1.1")

  const frameworksPath = join(contentsPath, "Frameworks")
  for (const helperName of electronHelperNames) {
    const renamedHelperName = helperName.replace("Electron", "Prompter")
    const helperContentsPath = join(frameworksPath, `${renamedHelperName}.app`, "Contents")
    const helperExecutablePath = join(helperContentsPath, "MacOS", renamedHelperName)
    assert.equal((await stat(helperExecutablePath)).mode & 0o111, 0o111)
    await assert.rejects(access(join(frameworksPath, `${helperName}.app`)))

    const helperPlist = await readFile(join(helperContentsPath, "Info.plist"), "utf8")
    assertBundlePlist(
      helperPlist,
      `com.jinzer0.prompter.helper${helperSuffix(helperName)}`,
      renamedHelperName,
    )
    assertPlistValue(helperPlist, "CFBundleShortVersionString", "0.1.1")
    assertPlistValue(helperPlist, "CFBundleVersion", "0.1.1")
    const nestedDictionaryEnd = helperPlist.indexOf("</dict>")
    assert.ok(helperPlist.indexOf("<key>CFBundleExecutable</key>") > nestedDictionaryEnd)
    assert.ok(helperPlist.indexOf("<key>CFBundleDisplayName</key>") > nestedDictionaryEnd)
  }

  assert.equal(await readFile(fixture.frameworkBinaryPath, "utf8"), "framework binary")
  assert.equal(await readlink(fixture.frameworkLinkPath), "Versions/Current/Electron Framework")
})

function assertSanitizedReleaseFailure(error) {
  assert.ok(error instanceof Error)
  assert.equal(error.message.includes(syntheticSecret), false)
  assert.equal(JSON.stringify(error).includes(syntheticSecret), false)
  return true
}

const releaseStages = [
  "app-sign",
  "app-verify-1",
  "gatekeeper-1",
  "temporary-zip",
  "app-submit",
  "app-log",
  "app-staple",
  "final-zip",
  "zip-extract",
  "app-verify-2",
  "gatekeeper-2",
  "dmg-create",
  "dmg-verify",
  "dmg-sign",
  "dmg-signature",
  "dmg-submit",
  "dmg-log",
  "dmg-staple",
  "gatekeeper-3",
  "attach",
  "app-verify-3",
  "gatekeeper-4",
  "detach",
  "checksum",
]

function assertNoLaterReleaseStages(calls, failure) {
  if (failure === undefined) {
    for (const stage of releaseStages)
      assert.equal(calls.includes(stage), false, `unexpected ${stage} before release execution`)
    return
  }
  const failureCallIndex = calls.lastIndexOf(failure)
  assert.notEqual(failureCallIndex, -1, `missing injected ${failure} stage`)
  const tail = calls.slice(failureCallIndex + 1)
  const beforeFailure = calls.slice(0, failureCallIndex)
  const mountActive = beforeFailure.lastIndexOf("attach") > beforeFailure.lastIndexOf("detach")
  const permitted = mountActive ? new Set(["detach"]) : new Set()
  for (const stage of tail.filter((stage) => releaseStages.includes(stage))) {
    if (!permitted.has(stage))
      assert.equal(tail.includes(stage), false, `unexpected ${stage} after ${failure}`)
  }
}

test("uses versioned arm64 and x64 DMG names", async () => {
  for (const architecture of ["arm64", "x64"]) {
    const fixture = await createFixture()
    const dmgPath = await createDmgArchive({
      ...dmgOptions(fixture, architecture),
      runFile: async (_file, arguments_) => {
        await writeFile(arguments_.at(-1), "DMG")
      },
    })

    assert.equal(dmgPath, join(fixture.outputDirectory, `Prompter-7.8.9-mac-${architecture}.dmg`))
  }
})

test("uses the locked 0.1.1 ZIP names while rejecting x64 release coordination", async () => {
  const fixture = await createFixture()
  await writeFile(fixture.packageJsonPath, JSON.stringify({ version: "0.1.1" }))
  for (const arch of ["arm64", "x64"]) {
    const zipPath = await createZipArchive({
      arch,
      appPath: fixture.appPath,
      outputDirectory: fixture.outputDirectory,
      packageJsonPath: fixture.packageJsonPath,
      runFile: async (_command, arguments_) => writeFile(arguments_.at(-1), "ZIP"),
    })
    assert.equal(zipPath, join(fixture.outputDirectory, `Prompter-0.1.1-mac-${arch}.zip`))
  }
  assert.equal(resolveReleaseMacOSArchitecture("arm64"), "arm64")
  assert.throws(() => resolveReleaseMacOSArchitecture("x64"), /only macOS arm64/)
})

test("keeps the coordinator's two-submission ordering and cleanup boundaries explicit", async () => {
  const root = await mkdtemp(join(tmpdir(), "prompter-release-test-"))
  temporaryDirectories.push(root)
  const sourceRoot = join(root, "source")
  const releaseRoot = join(root, "release")
  const evidenceRoot = join(root, "evidence")
  const electron = await createElectronAppFixture()
  await Promise.all(
    ["dist", "dist-electron", "drizzle", "node_modules"].map((name) =>
      mkdir(join(sourceRoot, name), { recursive: true }),
    ),
  )
  await writeFile(join(sourceRoot, "package.json"), JSON.stringify({ version: "0.1.1" }))
  const calls = []
  let packagedApp
  const identity = "Developer ID Application: SYNTHETIC_IDENTITY"
  const runFile = async (command, arguments_, options = {}) => {
    calls.push({ command, arguments_ })
    if (command === "/usr/bin/xcode-select")
      return { stdout: "/Applications/Xcode.app/Contents/Developer", stderr: "" }
    if (command === "/usr/bin/xcodebuild") return { stdout: "Xcode 16", stderr: "" }
    if (command === "/usr/bin/git") return { stdout: "", stderr: "" }
    if (command === "/usr/bin/security" && arguments_[0] === "find-identity")
      return {
        stdout: `  1) ${"a".repeat(40)} "${identity}"\n  1 valid identities found\n`,
        stderr: "",
      }
    if (command === "/usr/bin/security") return { stdout: "", stderr: "" }
    if (command === "/usr/bin/file") return { stdout: "Mach-O", stderr: "" }
    if (command === "/usr/bin/xcrun") {
      if (arguments_[1] === "history") return { stdout: "{}", stderr: "" }
      if (arguments_[1] === "submit")
        return {
          stdout: JSON.stringify({
            id: arguments_[2].endsWith(".dmg")
              ? "123e4567-e89b-42d3-a456-426614174001"
              : "123e4567-e89b-42d3-a456-426614174000",
            status: "Accepted",
          }),
          stderr: "",
        }
      if (arguments_[1] === "log") return { stdout: '{"issues":[]}', stderr: "" }
      return { stdout: "", stderr: "" }
    }
    if (command === "/usr/bin/ditto" && arguments_[0] === "-c") {
      packagedApp = join(options.cwd, "Prompter.app")
      await writeFile(arguments_.at(-1), "zip")
    }
    if (command === "/usr/bin/ditto" && arguments_[0] === "-x")
      await cp(packagedApp, join(arguments_.at(-1), "Prompter.app"), {
        recursive: true,
        verbatimSymlinks: true,
      })
    if (command === "/usr/bin/hdiutil" && arguments_[0] === "create")
      await writeFile(arguments_.at(-1), "dmg")
    if (command === "/usr/bin/hdiutil" && arguments_[0] === "attach")
      await cp(packagedApp, join(arguments_[4], "Prompter.app"), {
        recursive: true,
        verbatimSymlinks: true,
      })
    if (command === "/usr/bin/shasum")
      return {
        stdout: `${"a".repeat(64)}  ${arguments_[2]}\n${"b".repeat(64)}  ${arguments_[3]}\n`,
        stderr: "",
      }
    return { stdout: "", stderr: "" }
  }
  const result = await runMacOSRelease({
    runFile,
    platform: "darwin",
    arch: "arm64",
    signingIdentity: identity,
    notaryProfile: "SYNTHETIC_PROFILE",
    paths: {
      sourceRoot,
      packageJsonPath: join(sourceRoot, "package.json"),
      electronAppPath: electron.appPath,
      releaseRoot,
      entitlementsPath: "scripts/macos/entitlements.plist",
      notarizationEvidenceRoot: evidenceRoot,
    },
  })
  assert.deepEqual(result.artifacts, [
    "Prompter-0.1.1-mac-arm64.dmg",
    "Prompter-0.1.1-mac-arm64.zip",
    "SHA256SUMS",
  ])
  const submitted = calls
    .filter(({ command, arguments_ }) => command === "/usr/bin/xcrun" && arguments_[1] === "submit")
    .map(({ arguments_ }) => arguments_[2])
  assert.equal(submitted.length, 2)
  const dmgSigning = calls.find(
    ({ command, arguments_ }) =>
      command === "/usr/bin/codesign" &&
      arguments_.at(-1).endsWith(".dmg") &&
      arguments_[0] === "--force",
  )
  assert.deepEqual(dmgSigning.arguments_.slice(0, 6), [
    "--force",
    "--timestamp",
    "--options",
    "runtime",
    "--sign",
    identity,
  ])
  const firstFinalZip = calls.findIndex(
    ({ command, arguments_ }) =>
      command === "/usr/bin/ditto" &&
      arguments_[0] === "-c" &&
      arguments_.at(-1).includes("v0.1.1"),
  )
  const appStaple = calls.findIndex(
    ({ command, arguments_ }) =>
      command === "/usr/bin/xcrun" &&
      arguments_[0] === "stapler" &&
      arguments_[2]?.endsWith(".app"),
  )
  const extract = calls.findIndex(
    ({ command, arguments_ }) => command === "/usr/bin/ditto" && arguments_[0] === "-x",
  )
  const dmgCreate = calls.findIndex(
    ({ command, arguments_ }) => command === "/usr/bin/hdiutil" && arguments_[0] === "create",
  )
  const hash = calls.findIndex(({ command }) => command === "/usr/bin/shasum")
  assert.equal(
    appStaple < firstFinalZip && firstFinalZip < extract && extract < dmgCreate && dmgCreate < hash,
    true,
  )
})

test.each([
  ["stale-candidate", "app-sign"],
  ["candidate-race", "dmg-create"],
  ["keychain", "app-sign"],
  ["profile", "app-sign"],
  ["app-submit", "app-staple"],
  ["app-log", "app-staple"],
  ["app-staple", "dmg-create"],
  ["zip-extract", "dmg-create"],
  ["app-verify-2", "dmg-create"],
  ["dmg-create", "dmg-verify"],
  ["dmg-verify", "dmg-sign"],
  ["dmg-sign", "dmg-signature"],
  ["dmg-signature", "dmg-submit"],
  ["dmg-submit", "dmg-staple"],
  ["dmg-log", "dmg-staple"],
  ["dmg-staple", "gatekeeper-3"],
  ["gatekeeper-3", "attach"],
  ["attach", "checksum"],
  ["app-verify-3", "gatekeeper-4"],
  ["gatekeeper-4", "checksum"],
  ["detach", "checksum"],
  ["checksum", "post-checksum"],
])("fails closed at %s without later %s operations", async (failure, forbidden) => {
  const fixture = await createCoordinatorFixture({ failure })

  await assert.rejects(fixture.run(), assertSanitizedReleaseFailure)

  assert.equal(fixture.calls.includes(forbidden), false)
  assertNoLaterReleaseStages(
    fixture.calls,
    ["stale-candidate", "candidate-race"].includes(failure) ? undefined : failure,
  )
  if (failure === "checksum")
    assert.equal(fixture.calls.filter((stage) => stage === "checksum").length, 1)
  if (["stale-candidate", "candidate-race"].includes(failure))
    assert.equal((await stat(fixture.candidate)).isDirectory(), true)
  else await assert.rejects(access(fixture.candidate))
  assert.equal(await readFile(join(fixture.releaseRoot, "caller-sentinel"), "utf8"), "retain")
  assert.equal(await readFile(join(fixture.evidenceRoot, "caller-sentinel"), "utf8"), "retain")
  for (const temporaryPath of fixture.observedTempRoots) {
    if (failure === "detach" && temporaryPath.includes("prompter-release-mount-")) continue
    await assert.rejects(access(temporaryPath))
  }
})

test("orders the complete coordinator release flow and cleans every observed temp root", async () => {
  const fixture = await createCoordinatorFixture()

  await fixture.run()

  assert.equal(fixture.calls.indexOf("native-copied") < fixture.calls.indexOf("app-sign"), true)
  const ordered = releaseStages.map((stage) => fixture.calls.indexOf(stage))
  assert.equal(
    ordered.every((index) => index >= 0),
    true,
  )
  assert.equal(
    ordered.every((index, position) => position === 0 || ordered[position - 1] < index),
    true,
    JSON.stringify(releaseStages.map((stage, position) => [stage, ordered[position]])),
  )
  const submissions = fixture.rawCalls
    .filter(({ command, arguments_ }) => command === "/usr/bin/xcrun" && arguments_[1] === "submit")
    .map(({ arguments_ }) => arguments_[2])
  assert.equal(submissions.length, 2)
  assert.equal(submissions[0] === submissions[1], false)
  for (const temporaryRoot of fixture.observedTempRoots) await assert.rejects(access(temporaryRoot))
})

test("reserves a release candidate atomically so one concurrent invocation reaches signing", async () => {
  const fixture = await createCoordinatorFixture()

  const outcomes = await Promise.allSettled([fixture.run(), fixture.run()])

  assert.equal(outcomes.filter(({ status }) => status === "fulfilled").length, 1)
  assert.equal(outcomes.filter(({ status }) => status === "rejected").length, 1)
  assert.equal(fixture.calls.filter((stage) => stage === "app-sign").length > 0, true)
  assert.equal((await stat(fixture.candidate)).isDirectory(), true)
})

test("keeps signed Apple trust gates on absolute paths despite earlier PATH executables", async () => {
  const root = await mkdtemp(join(tmpdir(), "prompter-path-hijack-test-"))
  temporaryDirectories.push(root)
  const binDirectory = join(root, "bin")
  const markerPath = join(root, "hijacked")
  await mkdir(binDirectory)
  await Promise.all(
    ["xcrun", "spctl"].map(async (command) => {
      const fakePath = join(binDirectory, command)
      await writeFile(fakePath, `#!/bin/sh\ntouch "${markerPath}"\n`)
      await chmod(fakePath, 0o755)
    }),
  )
  const fixture = await createCoordinatorFixture()
  const originalPath = process.env.PATH
  process.env.PATH = `${binDirectory}:${originalPath ?? ""}`

  try {
    await fixture.run()
  } finally {
    process.env.PATH = originalPath
  }

  await assert.rejects(access(markerPath))
  assert.equal(
    fixture.rawCalls
      .filter(({ command }) => command.endsWith("xcrun"))
      .every(({ command }) => command === "/usr/bin/xcrun"),
    true,
  )
  assert.equal(
    fixture.rawCalls
      .filter(({ command }) => command.endsWith("spctl"))
      .every(({ command }) => command === "/usr/sbin/spctl"),
    true,
  )
})

test("detaches the mounted app after a mounted-app Gatekeeper failure", async () => {
  const fixture = await createCoordinatorFixture({ failure: "gatekeeper-4" })

  await assert.rejects(fixture.run(), assertSanitizedReleaseFailure)

  assert.equal(fixture.calls.includes("attach"), true)
  assert.equal(fixture.calls.includes("app-verify-3"), true)
  assert.equal(fixture.calls.includes("detach"), true)
  assert.equal(fixture.calls.includes("checksum"), false)
})

test("preserves a mounted image when detach cleanup fails and reports aggregate failure", async () => {
  const fixture = await createCoordinatorFixture({ failure: "detach" })

  await assert.rejects(fixture.run(), (error) => error instanceof AggregateError)

  const mountDirectory = [...fixture.observedTempRoots].find((path) =>
    path.includes("prompter-release-mount-"),
  )
  assert.ok(mountDirectory)
  await access(mountDirectory)
  await rm(mountDirectory, { recursive: true, force: true })
})

test("rejects every signed release version except 0.1.1 before the first external command", async () => {
  const fixture = await createCoordinatorFixture()
  await writeFile(
    join(fixture.releaseRoot, "..", "source", "package.json"),
    JSON.stringify({ version: "0.1.2" }),
  )

  await assert.rejects(fixture.run(), /Invalid package version/)

  assert.deepEqual(fixture.calls, [])
})

test("rejects a wrong package version at the npm release entrypoint before build or downstream mutation", async () => {
  await assertReleaseEntrypointRejectsBeforeMutation("0.1.2")
})

test("rejects a missing package version at the npm release entrypoint before build or downstream mutation", async () => {
  await assertReleaseEntrypointRejectsBeforeMutation(undefined)
})

test("maps bounded timeout and an AbortSignal to production execFile options", async () => {
  const controller = new AbortController()
  let options
  const run = runner(async (_command, _arguments, receivedOptions) => {
    options = receivedOptions
    return { stdout: "", stderr: "" }
  })

  await run("xcrun", ["notarytool"], { timeoutMs: 1000, signal: controller.signal })
  assert.deepEqual(options, { timeout: 1000, signal: controller.signal })
  await assert.rejects(
    run("xcrun", ["notarytool"], { signal: {} }),
    /Invalid macOS release command options/,
  )
})

test.each([
  "none",
  "multiple",
])("rejects %s exact signing identity before app mutation", async (identityListing) => {
  const fixture = await createCoordinatorFixture({ identityListing })

  await assert.rejects(fixture.run(), /Exactly one signing identity is required/)

  assert.equal(fixture.calls.includes("app-sign"), false)
  assertNoLaterReleaseStages(fixture.calls)
  await assert.rejects(access(fixture.candidate))
})

test("retains only sanitized unknown app resume evidence after an ambiguous timeout", async () => {
  const fixture = await createCoordinatorFixture({ failure: "app-timeout" })

  await assert.rejects(fixture.run(), /Notarization submission is unresolved/)

  assertNoLaterReleaseStages(fixture.calls, "app-submit")
  assert.equal(fixture.calls.includes("app-staple"), false)
  assert.equal(fixture.calls.includes("dmg-create"), false)
  const evidence = await readFile(
    join(fixture.evidenceRoot, "v0.1.1", "app", "notarization-resume.json"),
    "utf8",
  )
  assert.match(evidence, /123e4567-e89b-42d3-a456-426614174000/)
  assert.equal(evidence.includes(syntheticSecret), false)
  assert.equal(evidence.includes(syntheticIdentity), false)
})

test("blocks warning-bearing app receipts without leaking synthetic secrets", async () => {
  const fixture = await createCoordinatorFixture({ warningLog: true })
  let error
  try {
    await fixture.run()
  } catch (caught) {
    error = caught
  }

  assert.ok(error instanceof Error)
  assert.equal(error.message.includes(syntheticSecret), false)
  assertNoLaterReleaseStages(fixture.calls, "app-log")
  assert.equal(fixture.calls.includes("app-staple"), false)
  assert.equal(fixture.calls.includes("dmg-create"), false)
})

test("rejects unsupported macOS architectures", () => {
  assert.throws(() => resolveMacOSArchitecture("ia32"), /Unsupported macOS architecture: ia32/)
})

test("stages only the app and Applications link before invoking hdiutil", async () => {
  const fixture = await createFixture()
  await writeFile(join(fixture.appPath, "relative-target"), "target")
  await symlink("relative-target", join(fixture.appPath, "relative-link"))
  let hdiutilInvocation

  const dmgPath = await createDmgArchive({
    ...dmgOptions(fixture, "arm64"),
    runFile: async (file, arguments_) => {
      const stagingDirectory = arguments_[arguments_.indexOf("-srcfolder") + 1]
      hdiutilInvocation = { arguments_, file, stagingDirectory }

      assert.deepEqual((await readdir(stagingDirectory)).sort(), ["Applications", "Prompter.app"])
      assert.equal(await readlink(join(stagingDirectory, "Applications")), "/Applications")
      assert.equal(
        await readlink(join(stagingDirectory, "Prompter.app", "relative-link")),
        "relative-target",
      )
      await writeFile(arguments_.at(-1), "DMG")
    },
  })

  assert.equal(hdiutilInvocation.file, "/usr/bin/hdiutil")
  assert.deepEqual(hdiutilInvocation.arguments_, [
    "create",
    "-volname",
    "Prompter",
    "-srcfolder",
    hdiutilInvocation.stagingDirectory,
    "-ov",
    "-format",
    "UDZO",
    dmgPath,
  ])
  await assert.rejects(access(hdiutilInvocation.stagingDirectory))
})

test("removes stale targets and staging after successful DMG creation", async () => {
  const fixture = await createFixture()
  const staleDmgPath = join(fixture.outputDirectory, "Prompter-7.8.9-mac-arm64.dmg")
  await writeFile(staleDmgPath, "stale")
  let stagingDirectory

  await createDmgArchive({
    ...dmgOptions(fixture, "arm64"),
    runFile: async (_file, arguments_) => {
      stagingDirectory = arguments_[arguments_.indexOf("-srcfolder") + 1]
      await assert.rejects(access(staleDmgPath))
      await writeFile(arguments_.at(-1), "replacement")
    },
  })

  await assert.rejects(access(stagingDirectory))
})

test("removes partial DMGs and staging when hdiutil fails", async () => {
  const fixture = await createFixture()
  const dmgPath = join(fixture.outputDirectory, "Prompter-7.8.9-mac-x64.dmg")
  let stagingDirectory

  await assert.rejects(
    createDmgArchive({
      ...dmgOptions(fixture, "x64"),
      runFile: async (_file, arguments_) => {
        stagingDirectory = arguments_[arguments_.indexOf("-srcfolder") + 1]
        await writeFile(arguments_.at(-1), "partial")
        throw new Error("hdiutil failed")
      },
    }),
    /hdiutil failed/,
  )

  await assert.rejects(access(dmgPath))
  await assert.rejects(access(stagingDirectory))
})
