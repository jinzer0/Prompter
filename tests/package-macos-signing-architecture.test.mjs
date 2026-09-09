import assert from "node:assert/strict"
import { realpath } from "node:fs/promises"

import { afterEach, test } from "vitest"

import { discoverSignableCode, signAppBundle } from "../scripts/macos/signing.mjs"
import {
  createSigningFixture,
  createSigningRunner,
  signingIdentity,
} from "./support/macos-signing-fixtures.mjs"

const fixtures = []
afterEach(() => Promise.all(fixtures.splice(0).map(({ remove }) => remove())))

async function fixture() {
  const created = await createSigningFixture()
  fixtures.push(created)
  return created.paths
}

test.each([
  ["an x86_64-only", "x86_64"],
  ["an x86_64 with arm64e", "x86_64 arm64e"],
])("rejects %s Mach-O before target or outer codesign", async (_kind, architectures) => {
  const paths = await fixture()
  const calls = []
  const nativePath = await realpath(paths.native)

  await assert.rejects(
    signAppBundle({
      appPath: paths.appPath,
      identity: signingIdentity,
      entitlementsPath: paths.entitlements,
      runFile: createSigningRunner({
        architectureOutputs: new Map([[nativePath, architectures]]),
        calls,
      }),
    }),
    /Mach-O payload does not contain an arm64 slice/,
  )
  assert.equal(
    calls.some(({ command }) => command === "/usr/bin/codesign"),
    false,
  )
})

test.each([
  ["thin arm64", "arm64"],
  ["universal arm64", "x86_64 arm64"],
])("accepts a %s Mach-O payload", async (_kind, architectures) => {
  const paths = await fixture()
  const calls = []
  const nativePath = await realpath(paths.native)
  const targets = await discoverSignableCode({
    appPath: paths.appPath,
    runFile: createSigningRunner({
      architectureOutputs: new Map([[nativePath, architectures]]),
      calls,
    }),
  })

  assert.equal(
    targets.some(({ path }) => path === nativePath),
    true,
  )
  assert.deepEqual(
    calls.find(
      ({ command, arguments_ }) => command === "/usr/bin/lipo" && arguments_[1] === nativePath,
    ),
    { command: "/usr/bin/lipo", arguments_: ["-archs", nativePath] },
  )
})

test("does not probe ignored foreign native payload architecture", async () => {
  const paths = await fixture()
  const calls = []
  const nativePath = await realpath(paths.native)
  const targets = await discoverSignableCode({
    appPath: paths.appPath,
    runFile: createSigningRunner({ calls, foreignPaths: [nativePath] }),
  })

  assert.equal(
    targets.some(({ path }) => path === nativePath),
    false,
  )
  assert.equal(
    calls.some(
      ({ command, arguments_ }) => command === "/usr/bin/lipo" && arguments_[1] === nativePath,
    ),
    false,
  )
})

test("rejects a post-sign x86_64 mutation before outer app signing", async () => {
  const paths = await fixture()
  const calls = []
  const nativePath = await realpath(paths.native)

  await assert.rejects(
    signAppBundle({
      appPath: paths.appPath,
      identity: signingIdentity,
      entitlementsPath: paths.entitlements,
      runFile: createSigningRunner({
        architectureOutputsAfterSigning: new Map([[nativePath, "x86_64"]]),
        calls,
      }),
    }),
    /Mach-O payload does not contain an arm64 slice/,
  )
  assert.equal(
    calls.some(
      ({ command, arguments_ }) =>
        command === "/usr/bin/codesign" &&
        arguments_[0] === "--force" &&
        arguments_.at(-1) === nativePath,
    ),
    true,
  )
  assert.equal(
    calls.some(
      ({ command, arguments_ }) =>
        command === "/usr/bin/codesign" && arguments_.at(-1) === paths.appPath,
    ),
    false,
  )
})
