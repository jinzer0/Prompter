import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { access, cp, mkdir, realpath, symlink, writeFile } from "node:fs/promises"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import { afterEach, test } from "vitest"

import { discoverSignableCode } from "../scripts/macos/signing.mjs"
import { assembleMacOSApp } from "../scripts/package-macos.mjs"
import {
  createElectronAppFixture,
  createPackageFixture,
  createTemporaryDirectoryTracker,
} from "./support/macos-package-fixtures.mjs"
import { copyRequiredRuntimeAddon, listFilesRecursively } from "./support/macos-package-tree.mjs"

const executeFile = promisify(execFile)
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const temporaryDirectories = createTemporaryDirectoryTracker()
const allowedCommands = new Set(["/usr/bin/file", "/usr/bin/lipo"])
const runtimePackageRoots = ["better-sqlite3", "bindings", "file-uri-to-path"]
const foreignNativePayloads = [
  "foreign.node",
  "foreign.dylib",
  "foreign.o",
  "foreign.a",
  "foreign-native",
]

afterEach(() => temporaryDirectories.cleanup())

test("assembleMacOSApp stages only the runtime native dependency allowlist", async () => {
  const electron = temporaryDirectories.track(await createElectronAppFixture())
  const output = temporaryDirectories.track(await createPackageFixture())
  const sourceRoot = join(output.outputDirectory, "source")
  const stagedModules = join(output.appPath, "Contents", "Resources", "app", "node_modules")
  await Promise.all(
    [
      "dist",
      "dist-electron",
      "drizzle",
      "node_modules/.bin",
      "node_modules/better-sqlite3/build/Release",
      "node_modules/better-sqlite3/build/Release/obj.target/better_sqlite3/src",
      "node_modules/better-sqlite3/lib",
      "node_modules/bindings",
      "node_modules/file-uri-to-path",
      "node_modules/vite",
    ].map((directory) => mkdir(join(sourceRoot, directory), { recursive: true })),
  )
  await Promise.all(
    [
      ["package.json", JSON.stringify({ version: "0.1.1" })],
      ["node_modules/.bin/vite", "tool alias"],
      ["node_modules/better-sqlite3/lib/index.js", "runtime package"],
      ["node_modules/better-sqlite3/build/Release/better_sqlite3.node", "runtime addon"],
      ["node_modules/better-sqlite3/build/Release/test_extension.node", "test addon"],
      ["node_modules/better-sqlite3/build/Release/foreign.NoDe", "foreign addon"],
      ["node_modules/better-sqlite3/build/Release/sqlite3.a", "static archive"],
      [
        "node_modules/better-sqlite3/build/Release/obj.target/better_sqlite3/src/better_sqlite3.o",
        "object file",
      ],
      ["node_modules/bindings/bindings.js", "runtime dependency"],
      ["node_modules/file-uri-to-path/index.js", "runtime dependency"],
      ["node_modules/vite/index.js", "tooling package"],
    ].map(([path, contents]) => writeFile(join(sourceRoot, path), contents)),
  )
  await assembleMacOSApp({
    appPath: output.appPath,
    electronAppPath: electron.appPath,
    packageJsonPath: join(sourceRoot, "package.json"),
    sourceRoot,
  })

  for (const path of [
    "better-sqlite3",
    "better-sqlite3/lib/index.js",
    "bindings",
    "file-uri-to-path",
    "better-sqlite3/build/Release/better_sqlite3.node",
  ])
    await access(join(stagedModules, path))
  assert.deepEqual(await listFilesRecursively(join(stagedModules, "better-sqlite3", "build")), [
    "Release/better_sqlite3.node",
  ])
  for (const path of [
    ".bin",
    "better-sqlite3/build/Release/test_extension.node",
    "better-sqlite3/build/Release/foreign.NoDe",
    "better-sqlite3/build/Release/sqlite3.a",
    "better-sqlite3/build/Release/obj.target/better_sqlite3/src/better_sqlite3.o",
    "vite",
  ])
    await assert.rejects(access(join(stagedModules, path)))
})

test("production staging contains only the SQLite native addon for read-only discovery", async () => {
  const electronAppPath = join(repositoryRoot, "node_modules", "electron", "dist", "Electron.app")
  const sqliteAddonPath = join(
    repositoryRoot,
    "node_modules",
    "better-sqlite3",
    "build",
    "Release",
    "better_sqlite3.node",
  )
  await Promise.all([access(electronAppPath), access(sqliteAddonPath)])

  const output = temporaryDirectories.track(await createPackageFixture())
  const sourceRoot = join(output.outputDirectory, "source")
  await mkdir(sourceRoot)
  await Promise.all([
    mkdir(join(sourceRoot, "dist")),
    mkdir(join(sourceRoot, "dist-electron")),
    mkdir(join(sourceRoot, "node_modules")),
    cp(join(repositoryRoot, "drizzle"), join(sourceRoot, "drizzle"), { recursive: true }),
    ...["better-sqlite3", "bindings", "file-uri-to-path"].map((packageName) =>
      cp(
        join(repositoryRoot, "node_modules", packageName),
        join(sourceRoot, "node_modules", packageName),
        { recursive: true, verbatimSymlinks: true },
      ),
    ),
    cp(join(repositoryRoot, "package.json"), join(sourceRoot, "package.json")),
  ])
  const appPath = await realpath(
    await assembleMacOSApp({
      appPath: output.appPath,
      electronAppPath,
      packageJsonPath: join(sourceRoot, "package.json"),
      sourceRoot,
    }),
  )
  await access(
    join(
      appPath,
      "Contents",
      "Resources",
      "app",
      "node_modules",
      "better-sqlite3",
      "lib",
      "index.js",
    ),
  )
  const stagedSQLiteAddon = join(
    appPath,
    "Contents",
    "Resources",
    "app",
    "node_modules",
    "better-sqlite3",
    "build",
    "Release",
    "better_sqlite3.node",
  )
  const stagedBuildPath = join(
    appPath,
    "Contents",
    "Resources",
    "app",
    "node_modules",
    "better-sqlite3",
    "build",
  )
  const stagedModules = join(appPath, "Contents", "Resources", "app", "node_modules")
  const calls = []
  const targets = await discoverSignableCode({
    appPath,
    runFile: async (command, arguments_) => {
      assert.equal(allowedCommands.has(command), true)
      calls.push({ command, arguments_ })
      return executeFile(command, arguments_)
    },
  })
  const canonicalSQLiteAddon = await realpath(stagedSQLiteAddon)
  const runtimeTargets = targets
    .filter(({ path }) => path.startsWith(stagedModules))
    .map(({ path }) => relative(stagedModules, path))

  const discoveredCommands = [...new Set(calls.map(({ command }) => command))].sort()
  assert.deepEqual(discoveredCommands, [...allowedCommands].sort())
  assert.equal(
    calls.some(
      ({ command, arguments_ }) =>
        command === "/usr/bin/file" && arguments_.at(-1) === canonicalSQLiteAddon,
    ),
    true,
  )
  assert.equal(
    targets.some(({ path }) => path === canonicalSQLiteAddon),
    true,
  )
  assert.deepEqual(await listFilesRecursively(stagedBuildPath), ["Release/better_sqlite3.node"])
  assert.deepEqual(runtimeTargets, ["better-sqlite3/build/Release/better_sqlite3.node"])
  assert.equal(
    calls.some(({ command }) => !allowedCommands.has(command)),
    false,
  )
}, 30_000)

test.each(
  runtimePackageRoots,
)("assembly excludes every foreign native payload from %s", async (packageName) => {
  const electron = temporaryDirectories.track(await createElectronAppFixture())
  const output = temporaryDirectories.track(await createPackageFixture())
  const sourceRoot = join(output.outputDirectory, "source")
  const sourcePackage = join(sourceRoot, "node_modules", packageName)
  const stagedPackage = join(
    output.appPath,
    "Contents",
    "Resources",
    "app",
    "node_modules",
    packageName,
  )
  const nativeFixture = join(
    repositoryRoot,
    "node_modules",
    "better-sqlite3",
    "build",
    "Release",
    "better_sqlite3.node",
  )
  await Promise.all([
    access(nativeFixture),
    ...["dist", "dist-electron", "drizzle"].map((path) =>
      mkdir(join(sourceRoot, path), { recursive: true }),
    ),
    ...runtimePackageRoots.map((name) =>
      mkdir(join(sourceRoot, "node_modules", name), { recursive: true }),
    ),
    copyRequiredRuntimeAddon(sourceRoot, nativeFixture),
  ])
  await Promise.all([
    writeFile(join(sourceRoot, "package.json"), JSON.stringify({ version: "0.1.1" })),
    ...runtimePackageRoots.map((name) =>
      writeFile(join(sourceRoot, "node_modules", name, "index.js"), "runtime package"),
    ),
    ...foreignNativePayloads.map((name) => cp(nativeFixture, join(sourcePackage, name))),
  ])
  await symlink("foreign.node", join(sourcePackage, "foreign-native-link"))
  await assembleMacOSApp({
    appPath: output.appPath,
    electronAppPath: electron.appPath,
    packageJsonPath: join(sourceRoot, "package.json"),
    sourceRoot,
  })

  assert.deepEqual(
    await listFilesRecursively(stagedPackage),
    packageName === "better-sqlite3"
      ? ["build/Release/better_sqlite3.node", "index.js"]
      : ["index.js"],
  )
})
