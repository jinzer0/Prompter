import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { access, chmod, cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const executeFile = promisify(execFile)
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const electronHelperNames = [
  "Electron Helper",
  "Electron Helper (Renderer)",
  "Electron Helper (GPU)",
  "Electron Helper (Plugin)",
]

function helperSuffix(helperName) {
  return helperName.slice(15).replaceAll(" (", ".").replaceAll(")", "").toLowerCase()
}

export function createTemporaryDirectoryTracker() {
  const directories = new Set()
  return {
    track(fixture) {
      for (const directory of fixture.temporaryDirectories) directories.add(directory)
      return fixture
    },
    async cleanup() {
      await Promise.all(
        [...directories].map((directory) => rm(directory, { recursive: true, force: true })),
      )
      directories.clear()
    },
  }
}

export async function createPackageFixture() {
  const root = await mkdtemp(join(tmpdir(), "prompter-package-test-"))
  const appPath = join(root, "Prompter.app")
  const outputDirectory = join(root, "release")
  const packageJsonPath = join(root, "package.json")
  await Promise.all([
    mkdir(appPath),
    mkdir(outputDirectory),
    writeFile(packageJsonPath, JSON.stringify({ version: "7.8.9" })),
  ])
  return { appPath, outputDirectory, packageJsonPath, temporaryDirectories: [root] }
}

export async function createReleaseEntrypointFixture(version) {
  const root = await mkdtemp(join(tmpdir(), "prompter-release-entrypoint-test-"))
  await mkdir(join(root, "scripts", "macos"), { recursive: true })
  await Promise.all(
    ["release-inputs.mjs", "release-version-preflight.mjs"].map((name) =>
      cp(join(repositoryRoot, "scripts", "macos", name), join(root, "scripts", "macos", name)),
    ),
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
  return { root, temporaryDirectories: [root] }
}

export async function assertReleaseEntrypointRejectsBeforeMutation({
  errorMessage,
  inputName,
  inputValue,
  version,
}) {
  const fixture = await createReleaseEntrypointFixture(version)
  try {
    const environment = {
      ...process.env,
      PROMPTER_SIGNING_IDENTITY: "fixture-signing-identity",
      PROMPTER_NOTARY_PROFILE: "fixture-notary-profile",
    }
    if (inputName !== undefined) {
      if (inputValue === undefined) delete environment[inputName]
      else environment[inputName] = inputValue
    }
    let output = ""
    await assert.rejects(
      executeFile("npm", ["run", "package:release:macos"], {
        cwd: fixture.root,
        env: environment,
      }),
      (error) => {
        output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`
        return error instanceof Error && output.includes(errorMessage)
      },
    )
    assert.equal(output.includes("fixture-signing-identity"), false)
    assert.equal(output.includes("fixture-notary-profile"), false)
    for (const path of [
      "build-ran",
      "downstream-ran",
      "release/v0.1.1",
      ".omo/evidence/release-macos",
    ])
      await assert.rejects(access(join(fixture.root, path)))
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
}

export function dmgOptions(fixture, arch) {
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

export async function createElectronAppFixture() {
  const root = await mkdtemp(join(tmpdir(), "prompter-electron-app-test-"))
  const appPath = join(root, "Electron.app")
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
  return { appPath, frameworkBinaryPath, frameworkLinkPath, temporaryDirectories: [root] }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function assertBundlePlist(plist, identifier, name) {
  for (const [key, value] of [
    ["CFBundleIdentifier", identifier],
    ["CFBundleExecutable", name],
    ["CFBundleName", name],
    ["CFBundleDisplayName", name],
    ["ElectronAsarIntegrity", "preserve-me"],
  ])
    assert.match(plist, new RegExp(`<key>${key}</key>\\s*<string>${escapeRegExp(value)}</string>`))
}

export { electronHelperNames, helperSuffix }
