import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import {
  createElectronAppFixture,
  electronHelperNames,
  helperSuffix,
} from "./macos-electron-app-fixture.mjs"

const executeFile = promisify(execFile)
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
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
  const fixturePackageJson = JSON.parse(
    await readFile(join(repositoryRoot, "package.json"), "utf8"),
  )
  if (version === undefined) delete fixturePackageJson.version
  else fixturePackageJson.version = version
  fixturePackageJson.scripts = {
    ...fixturePackageJson.scripts,
    build: "node build-marker.mjs",
  }
  await mkdir(join(root, "scripts", "macos"), { recursive: true })
  await Promise.all(
    ["release-inputs.mjs", "release-version-preflight.mjs"].map((name) =>
      cp(join(repositoryRoot, "scripts", "macos", name), join(root, "scripts", "macos", name)),
    ),
  )
  await writeFile(join(root, "package.json"), JSON.stringify(fixturePackageJson))
  await Promise.all([
    writeFile(
      join(root, "build-marker.mjs"),
      'await import("node:fs/promises").then(({ writeFile }) => writeFile("build-ran", "1"))',
    ),
    writeFile(
      join(root, "scripts", "release-macos.mjs"),
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

export { createElectronAppFixture, electronHelperNames, helperSuffix }
