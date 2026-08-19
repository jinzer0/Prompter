import assert from "node:assert/strict"
import {
  access,
  chmod,
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
import { join } from "node:path"

import { afterEach, test } from "vitest"

import {
  createDmgArchive,
  renameElectronApp,
  resolveMacOSArchitecture,
} from "../scripts/package-macos.mjs"

const temporaryDirectories = []
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
  const frameworkBinaryPath = join(frameworksPath, `${frameworkName}.framework`, frameworkName)
  await mkdir(join(frameworksPath, "Electron Framework.framework"), { recursive: true })
  await writeFile(frameworkBinaryPath, "framework binary")
  const frameworkLinkPath = join(frameworksPath, "Electron Framework")
  await symlink("Electron Framework.framework", frameworkLinkPath)

  return { appPath, frameworkBinaryPath, frameworkLinkPath }
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

  await renameElectronApp(fixture.appPath)

  const contentsPath = join(fixture.appPath, "Contents")
  const mainExecutablePath = join(contentsPath, "MacOS", "Prompter")
  assert.equal((await stat(mainExecutablePath)).mode & 0o111, 0o111)
  await assert.rejects(access(join(contentsPath, "MacOS", "Electron")))

  const appPlist = await readFile(join(contentsPath, "Info.plist"), "utf8")
  assertBundlePlist(appPlist, "com.local.prompter", "Prompter")

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
      `com.local.prompter.helper${helperSuffix(helperName)}`,
      renamedHelperName,
    )
    const nestedDictionaryEnd = helperPlist.indexOf("</dict>")
    assert.ok(helperPlist.indexOf("<key>CFBundleExecutable</key>") > nestedDictionaryEnd)
    assert.ok(helperPlist.indexOf("<key>CFBundleDisplayName</key>") > nestedDictionaryEnd)
  }

  assert.equal(await readFile(fixture.frameworkBinaryPath, "utf8"), "framework binary")
  assert.equal(await readlink(fixture.frameworkLinkPath), "Electron Framework.framework")
})

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
