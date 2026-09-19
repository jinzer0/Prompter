import assert from "node:assert/strict"
import { chmod, mkdir, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { join, relative } from "node:path"

import { afterEach, test } from "vitest"

import { signAppBundle, verifyAppSignature } from "../scripts/macos/signing.mjs"
import { createSigningRunner, signingIdentity } from "./support/macos-signing-fixtures.mjs"
import {
  createElectronSigningFixture,
  electron43SigningTargets,
} from "./support/macos-signing-target-fixtures.mjs"

const fixtures = []
afterEach(() => Promise.all(fixtures.splice(0).map(({ remove }) => remove())))

async function electronFixture(options) {
  const created = await createElectronSigningFixture(options)
  fixtures.push(created)
  return created.paths
}

function mutableSignCalls(calls) {
  return calls.filter(
    ({ command, arguments_ }) => command === "/usr/bin/codesign" && arguments_[0] === "--force",
  )
}

function manifestMismatch(error, expected = {}) {
  assert.equal(error?.message, "App signing target manifest mismatch")
  assert.equal(error?.code, "APP_SIGNING_TARGET_MANIFEST_MISMATCH")
  for (const [field, value] of Object.entries(expected)) assert.deepEqual(error?.[field], value)
  return true
}

function runtimeRoot(paths, name) {
  return join(paths.appPath, "Contents", "Resources", "app", "node_modules", name)
}

test("signs the exact Electron 43 nested manifest deterministically before the outer app", async () => {
  const paths = await electronFixture()
  const calls = []
  await signAppBundle({
    appPath: paths.appPath,
    identity: signingIdentity,
    entitlementsPath: paths.entitlements,
    runFile: createSigningRunner({ calls }),
  })
  const signed = mutableSignCalls(calls)
  for (const { command, arguments_ } of signed) {
    assert.equal(command, "/usr/bin/codesign")
    assert.deepEqual(arguments_.slice(0, 6), [
      "--force",
      "--timestamp",
      "--options",
      "runtime",
      "--sign",
      signingIdentity,
    ])
    assert.equal(arguments_.includes("--deep"), false)
  }
  const canonicalAppPath = await realpath(paths.appPath)
  const targets = signed.map(({ arguments_ }) => relative(canonicalAppPath, arguments_.at(-1)))
  assert.deepEqual(
    [...targets.slice(0, -1)].sort(),
    electron43SigningTargets.map(({ path }) => path).sort(),
  )
  assert.equal(targets.at(-1), "")
  assert.deepEqual(
    targets.filter((_, index) => signed[index].arguments_.includes("--entitlements")).sort(),
    electron43SigningTargets
      .filter(({ entitlements }) => entitlements)
      .map(({ path }) => path)
      .concat("")
      .sort(),
  )
  assert.equal(
    signed.some(({ arguments_ }) => arguments_.includes("--deep")),
    false,
  )
  assert.deepEqual(calls.at(-1), {
    command: "/usr/bin/codesign",
    arguments_: ["--verify", "--deep", "--strict", canonicalAppPath],
  })
})

test.each([
  ["main", "Contents/MacOS/Prompter"],
  ["helper", "Contents/Frameworks/Prompter Helper.app/Contents/MacOS/Prompter Helper"],
  ["framework", "Contents/Frameworks/Mantle.framework"],
  [
    "runtime addon",
    "Contents/Resources/app/node_modules/better-sqlite3/build/Release/better_sqlite3.node",
  ],
])("rejects a missing %s manifest target before mutable signing", async (_name, missingPath) => {
  const paths = await electronFixture({ missingPaths: [missingPath] })
  const calls = []
  await assert.rejects(
    signAppBundle({
      appPath: paths.appPath,
      identity: signingIdentity,
      entitlementsPath: paths.entitlements,
      runFile: createSigningRunner({ calls }),
    }),
    (error) => manifestMismatch(error),
  )
  assert.deepEqual(mutableSignCalls(calls), [])
})

test("rejects discovered ignored Mach-O targets with sorted relative diagnostics", async () => {
  const paths = await electronFixture({
    extraMachOPaths: ["Contents/Resources/a-ignored", "Contents/Resources/z-ignored"],
  })
  const calls = []
  await assert.rejects(
    signAppBundle({
      appPath: paths.appPath,
      identity: signingIdentity,
      entitlementsPath: paths.entitlements,
      runFile: createSigningRunner({ calls }),
    }),
    (error) =>
      manifestMismatch(error, {
        missingTargets: [],
        unexpectedTargets: ["Contents/Resources/a-ignored", "Contents/Resources/z-ignored"],
        mismatchedTargets: [],
      }),
  )
  assert.deepEqual(mutableSignCalls(calls), [])
})

test("rejects an altered target descriptor without exposing the fixture root", async () => {
  const paths = await electronFixture()
  const main = await realpath(paths.targetPaths["Contents/MacOS/Prompter"])
  await writeFile(main, Buffer.from([0xcf, 0xfa, 0xed, 0xfe]))
  await chmod(main, 0o644)
  const calls = []
  await assert.rejects(
    signAppBundle({
      appPath: paths.appPath,
      identity: signingIdentity,
      entitlementsPath: paths.entitlements,
      runFile: createSigningRunner({
        calls,
        fileDescriptions: new Map([[main, "Mach-O 64-bit dynamically linked shared library"]]),
      }),
    }),
    (error) => {
      manifestMismatch(error, { mismatchedTargets: ["Contents/MacOS/Prompter"] })
      assert.equal(JSON.stringify(error).includes(paths.appPath), false)
      return true
    },
  )
  assert.deepEqual(mutableSignCalls(calls), [])
})

test("verification rejects a second native candidate before verify calls with discard metadata", async () => {
  const paths = await electronFixture({
    extraMachOPaths: [
      "Contents/Resources/app/node_modules/better-sqlite3/build/Release/second.node",
    ],
  })
  const calls = []
  await assert.rejects(
    verifyAppSignature({ appPath: paths.appPath, runFile: createSigningRunner({ calls }) }),
    (error) => {
      manifestMismatch(error)
      assert.equal(error?.artifactKind, "app")
      assert.equal(error?.discardEvidence, true)
      return true
    },
  )
  assert.equal(
    calls.some(({ command }) => command === "/usr/bin/codesign"),
    false,
  )
})

test.each([
  ["extra", (paths) => mkdir(runtimeRoot(paths, "pure-js-package"))],
  ["missing", (paths) => rm(runtimeRoot(paths, "bindings"), { recursive: true })],
  [
    "non-directory",
    async (paths) => {
      await rm(runtimeRoot(paths, "bindings"), { recursive: true })
      await writeFile(runtimeRoot(paths, "bindings"), "not a package root")
    },
  ],
  [
    "symlink",
    async (paths) => {
      await rm(runtimeRoot(paths, "bindings"), { recursive: true })
      await symlink("better-sqlite3", runtimeRoot(paths, "bindings"))
    },
  ],
])("rejects an %s runtime package-root closure before mutable signing", async (_kind, mutate) => {
  const paths = await electronFixture()
  await mutate(paths)
  const calls = []
  await assert.rejects(
    signAppBundle({
      appPath: paths.appPath,
      identity: signingIdentity,
      entitlementsPath: paths.entitlements,
      runFile: createSigningRunner({ calls }),
    }),
    (error) => manifestMismatch(error),
  )
  assert.deepEqual(mutableSignCalls(calls), [])
})

test("verification discards app evidence for an extra pure-JS runtime package root before verify", async () => {
  const paths = await electronFixture()
  await mkdir(runtimeRoot(paths, "pure-js-package"))
  const calls = []
  await assert.rejects(
    verifyAppSignature({ appPath: paths.appPath, runFile: createSigningRunner({ calls }) }),
    (error) => {
      manifestMismatch(error)
      assert.equal(error?.artifactKind, "app")
      assert.equal(error?.discardEvidence, true)
      return true
    },
  )
  assert.equal(
    calls.some(({ command }) => command === "/usr/bin/codesign"),
    false,
  )
})

test("does not attach discard metadata to a transient verification runner failure", async () => {
  const paths = await electronFixture()
  const transient = new Error("transient file inspection failure")
  const runner = createSigningRunner()
  await assert.rejects(
    verifyAppSignature({
      appPath: paths.appPath,
      runFile: (command, arguments_) =>
        command === "/usr/bin/file" ? Promise.reject(transient) : runner(command, arguments_),
    }),
    (error) =>
      error === transient &&
      error.artifactKind === undefined &&
      error.discardEvidence === undefined,
  )
})
