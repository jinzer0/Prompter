import assert from "node:assert/strict"
import {
  access,
  cp,
  mkdir,
  readdir,
  readFile,
  readlink,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { afterEach, test } from "vitest"

import {
  assembleMacOSApp,
  createDmgArchive,
  createZipArchive,
  renameElectronApp,
  resolveMacOSArchitecture,
  resolveReleaseMacOSArchitecture,
} from "../scripts/package-macos.mjs"
import {
  assertBundlePlist,
  createElectronAppFixture,
  createPackageFixture,
  createTemporaryDirectoryTracker,
  dmgOptions,
  electronHelperNames,
  helperSuffix,
} from "./support/macos-package-fixtures.mjs"

const temporaryDirectories = createTemporaryDirectoryTracker()
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
afterEach(() => temporaryDirectories.cleanup())

async function packageFixture() {
  return temporaryDirectories.track(await createPackageFixture())
}

async function electronFixture() {
  return temporaryDirectories.track(await createElectronAppFixture())
}

test("renames the main executable and all Electron helper bundles into a runnable Prompter app", async () => {
  const fixture = await electronFixture()
  await renameElectronApp(fixture.appPath, "0.1.1")
  const contentsPath = join(fixture.appPath, "Contents")
  const mainExecutablePath = join(contentsPath, "MacOS", "Prompter")
  assert.equal((await stat(mainExecutablePath)).mode & 0o111, 0o111)
  await assert.rejects(access(join(contentsPath, "MacOS", "Electron")))
  const appPlist = await readFile(join(contentsPath, "Info.plist"), "utf8")
  assertBundlePlist(appPlist, "com.jinzer0.prompter", "Prompter")
  assert.match(appPlist, /<key>CFBundleShortVersionString<\/key>\s*<string>0\.1\.1<\/string>/)
  assert.match(appPlist, /<key>CFBundleVersion<\/key>\s*<string>0\.1\.1<\/string>/)
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
    assert.match(helperPlist, /<key>CFBundleShortVersionString<\/key>\s*<string>0\.1\.1<\/string>/)
    assert.match(helperPlist, /<key>CFBundleVersion<\/key>\s*<string>0\.1\.1<\/string>/)
    const nestedDictionaryEnd = helperPlist.indexOf("</dict>")
    assert.ok(helperPlist.indexOf("<key>CFBundleExecutable</key>") > nestedDictionaryEnd)
    assert.ok(helperPlist.indexOf("<key>CFBundleDisplayName</key>") > nestedDictionaryEnd)
  }
  assert.equal(await readFile(fixture.frameworkBinaryPath, "utf8"), "framework binary")
  assert.equal(await readlink(fixture.frameworkLinkPath), "Versions/Current/Electron Framework")
})

test("assembleMacOSApp preserves installed npm-bin relative link text", async () => {
  const electron = await electronFixture()
  const output = await packageFixture()
  const installedLink = join(repositoryRoot, "node_modules", ".bin", "vite")
  const sourceRoot = join(output.outputDirectory, "source")
  const sourceLink = join(sourceRoot, "node_modules", ".bin", "vite")
  await Promise.all(
    ["dist", "dist-electron", "drizzle", "node_modules/.bin", "node_modules/vite/bin"].map(
      (directory) => mkdir(join(sourceRoot, directory), { recursive: true }),
    ),
  )
  await Promise.all([
    cp(installedLink, sourceLink, { verbatimSymlinks: true }),
    cp(
      join(repositoryRoot, "node_modules", "vite", "bin", "vite.js"),
      join(sourceRoot, "node_modules", "vite", "bin", "vite.js"),
    ),
    writeFile(join(sourceRoot, "package.json"), JSON.stringify({ version: "0.1.1" })),
  ])
  await assembleMacOSApp({
    appPath: output.appPath,
    electronAppPath: electron.appPath,
    packageJsonPath: join(sourceRoot, "package.json"),
    sourceRoot,
  })

  assert.equal(
    await readlink(
      join(output.appPath, "Contents", "Resources", "app", "node_modules", ".bin", "vite"),
    ),
    await readlink(sourceLink),
  )
})

test("rejects a symlinked package root before app assembly can delete external content", async () => {
  const electron = await electronFixture()
  const output = await packageFixture()
  const externalPackageRoot = join(output.temporaryDirectories[0], "external-package-root")
  const externalAppPath = join(externalPackageRoot, "Prompter.app")
  const externalSentinelPath = join(externalAppPath, "external-sentinel")
  const packageRoot = join(output.outputDirectory, `Prompter-darwin-${process.arch}`)
  await mkdir(externalAppPath, { recursive: true })
  await writeFile(externalSentinelPath, "retain")
  await symlink(externalPackageRoot, packageRoot)

  await assert.rejects(
    assembleMacOSApp({
      appPath: join(packageRoot, "Prompter.app"),
      electronAppPath: electron.appPath,
      packageJsonPath: output.packageJsonPath,
      sourceRoot: output.outputDirectory,
    }),
  )
  assert.equal(await readFile(externalSentinelPath, "utf8"), "retain")
})

test("uses versioned arm64 and x64 DMG names", async () => {
  for (const architecture of ["arm64", "x64"]) {
    const fixture = await packageFixture()
    const dmgPath = await createDmgArchive({
      ...dmgOptions(fixture, architecture),
      runFile: async (_file, arguments_) => writeFile(arguments_.at(-1), "DMG"),
    })
    assert.equal(dmgPath, join(fixture.outputDirectory, `Prompter-7.8.9-mac-${architecture}.dmg`))
  }
})

test("uses the locked 0.1.1 ZIP names while rejecting x64 release coordination", async () => {
  const fixture = await packageFixture()
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

test("rejects unsupported macOS architectures", () => {
  assert.throws(() => resolveMacOSArchitecture("ia32"), /Unsupported macOS architecture: ia32/)
})

test("stages only the app and Applications link before invoking hdiutil", async () => {
  const fixture = await packageFixture()
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
  const fixture = await packageFixture()
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
  const fixture = await packageFixture()
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
