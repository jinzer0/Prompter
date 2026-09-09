import assert from "node:assert/strict"
import { access, realpath } from "node:fs/promises"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { afterEach, test } from "vitest"

import {
  discoverSignableCode,
  signAppBundle,
  verifyAppSignature,
} from "../scripts/macos/signing.mjs"
import {
  createSigningFixture,
  createSigningRunner,
  frameworkDirectories,
  signingIdentity,
} from "./support/macos-signing-fixtures.mjs"

const fixtures = []
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
afterEach(() => Promise.all(fixtures.splice(0).map(({ remove }) => remove())))

async function fixture(options) {
  const created = await createSigningFixture(options)
  fixtures.push(created)
  return created.paths
}

test("accepts the complete Current-bound framework layout and inspects canonical descendants once", async () => {
  const paths = await fixture({ frameworkAliases: true })
  const calls = []
  const targets = await discoverSignableCode({
    appPath: paths.appPath,
    runFile: createSigningRunner({ calls }),
  })
  const canonicalAppPath = await realpath(paths.appPath)
  const relativeTargets = targets.map(({ path }) => relative(canonicalAppPath, path))
  assert.deepEqual(
    relativeTargets.filter((path) =>
      path.startsWith("Contents/Frameworks/Kit.framework/Versions/A/"),
    ),
    [
      "Contents/Frameworks/Kit.framework/Versions/A/Headers/headers-tool",
      "Contents/Frameworks/Kit.framework/Versions/A/Helpers/helpers-tool",
      "Contents/Frameworks/Kit.framework/Versions/A/Libraries/libnested.dylib",
      "Contents/Frameworks/Kit.framework/Versions/A/Libraries/libraries-tool",
      "Contents/Frameworks/Kit.framework/Versions/A/Modules/modules-tool",
      "Contents/Frameworks/Kit.framework/Versions/A/Modules/nested.node",
      "Contents/Frameworks/Kit.framework/Versions/A/Resources/resources-tool",
      "Contents/Frameworks/Kit.framework/Versions/A/Kit",
    ],
  )
  const inspected = calls
    .filter(({ command }) => command === "/usr/bin/file")
    .map(({ arguments_ }) => arguments_[1])
  assert.equal(new Set(inspected).size, inspected.length)
  assert.equal(inspected.filter((path) => path.includes("Kit.framework/Versions/A/")).length, 8)
})

test("rejects root framework binary aliases bound to a version other than Current", async () => {
  const paths = await fixture({ frameworkAliases: true, mixedFrameworkBinaryAlias: true })
  await assert.rejects(
    discoverSignableCode({ appPath: paths.appPath, runFile: createSigningRunner() }),
    /Signable .* alias is not allowed/,
  )
})

test.each([
  ["Versions/B/Kit", { versionedFrameworkBinaryAlias: true }],
  ["Versions/A/Kit-alias", { currentVersionBinaryAlias: true }],
])("rejects the arbitrary %s binary alias before signing mutation", async (_alias, options) => {
  const paths = await fixture({ frameworkAliases: true, ...options })
  const calls = []
  await assert.rejects(
    signAppBundle({
      appPath: paths.appPath,
      identity: signingIdentity,
      entitlementsPath: paths.entitlements,
      runFile: createSigningRunner({ calls }),
    }),
    /Signable binary alias is not allowed/,
  )
  assert.equal(
    calls.some(({ command }) => command === "/usr/bin/codesign"),
    false,
  )
})

test.each(
  frameworkDirectories,
)("rejects the %s root directory alias when it is not Current-bound", async (mixedFrameworkDirectoryAlias) => {
  const paths = await fixture({ frameworkAliases: true, mixedFrameworkDirectoryAlias })
  await assert.rejects(
    discoverSignableCode({ appPath: paths.appPath, runFile: createSigningRunner() }),
    /Signable directory alias is not allowed/,
  )
})

test("discovers the installed Electron 43 framework with only a read-only file runner", async () => {
  const appPath = join(repositoryRoot, "node_modules", "electron", "dist", "Electron.app")
  try {
    await access(appPath)
  } catch {
    throw new Error(
      "Installed Electron 43 framework is unavailable; run npm install before this test",
    )
  }
  const calls = []
  const targets = await discoverSignableCode({
    appPath,
    runFile: async (command, arguments_) => {
      calls.push({ command, arguments_ })
      assert.equal(command, "/usr/bin/file")
      assert.deepEqual(arguments_.slice(0, 1), ["-b"])
      return { stdout: "Mach-O 64-bit executable" }
    },
  })
  assert.equal(targets.length, 23)
  assert.equal(calls.length, 15)
  assert.equal(
    calls.every(({ command }) => command === "/usr/bin/file"),
    true,
  )
})

test.each([
  "before-canonical",
  "before-conventional",
])("rejects an invalid framework alias sorted %s entry", async (unexpectedFrameworkBinaryAlias) => {
  const paths = await fixture({ frameworkAliases: true, unexpectedFrameworkBinaryAlias })
  await assert.rejects(
    discoverSignableCode({ appPath: paths.appPath, runFile: createSigningRunner() }),
    /Signable binary alias is not allowed/,
  )
})

test.each([
  "AAAA",
  "Aliases",
])("rejects a signable object reached through a non-conventional framework directory alias %s", async (unexpectedFrameworkDirectoryAlias) => {
  const paths = await fixture({ frameworkAliases: true, unexpectedFrameworkDirectoryAlias })
  await assert.rejects(
    discoverSignableCode({ appPath: paths.appPath, runFile: createSigningRunner() }),
    /Signable directory alias is not allowed/,
  )
})

test("rejects a post-sign unsigned native object and suppresses the outer signature", async () => {
  const paths = await fixture()
  const calls = []
  await assert.rejects(
    signAppBundle({
      appPath: paths.appPath,
      identity: signingIdentity,
      entitlementsPath: paths.entitlements,
      runFile: createSigningRunner({ calls, unsignedAfterSigning: true }),
    }),
    /Native-code path is not a Mach-O object/,
  )
  assert.equal(
    calls.some(
      ({ command, arguments_ }) =>
        command === "/usr/bin/codesign" && arguments_.at(-1) === paths.appPath,
    ),
    false,
  )
})

test("uses strict deep verification only after discovery without mutating the bundle", async () => {
  const paths = await fixture()
  const calls = []
  await verifyAppSignature({ appPath: paths.appPath, runFile: createSigningRunner({ calls }) })
  const codesignCalls = calls.filter(({ command }) => command === "/usr/bin/codesign")
  const canonicalAppPath = await realpath(paths.appPath)
  assert.equal(
    codesignCalls.every(({ arguments_ }) => arguments_[0] === "--verify"),
    true,
  )
  assert.deepEqual(codesignCalls.at(-1).arguments_, [
    "--verify",
    "--deep",
    "--strict",
    canonicalAppPath,
  ])
  assert.equal(
    (await discoverSignableCode({ appPath: paths.appPath, runFile: createSigningRunner() })).length,
    10,
  )
})
