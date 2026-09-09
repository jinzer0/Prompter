import assert from "node:assert/strict"
import { realpath, writeFile } from "node:fs/promises"
import { join } from "node:path"

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

test.each([
  ["ELF .node", "native", "ELF 64-bit LSB shared object"],
  ["text .dylib", "dylib", "ASCII text"],
  ["malformed .node", "native", "data"],
])("rejects a packaged %s before target or outer codesign", async (_kind, pathKey, description) => {
  const paths = await fixture()
  const calls = []
  const nativePath = await realpath(paths[pathKey])

  await assert.rejects(
    signAppBundle({
      appPath: paths.appPath,
      identity: signingIdentity,
      entitlementsPath: paths.entitlements,
      runFile: createSigningRunner({
        calls,
        fileDescriptions: new Map([[nativePath, description]]),
      }),
    }),
    /Native-code suffix is not a Mach-O payload/,
  )
  assert.equal(
    calls.some(({ command }) => command === "/usr/bin/codesign"),
    false,
  )
  assert.equal(
    calls.some(
      ({ command, arguments_ }) => command === "/usr/bin/lipo" && arguments_[1] === nativePath,
    ),
    false,
  )
})

test.each(["native", "dylib"])("includes a valid ARM64 %s payload", async (pathKey) => {
  const paths = await fixture()
  const payloadPath = await realpath(paths[pathKey])
  const targets = await discoverSignableCode({
    appPath: paths.appPath,
    runFile: createSigningRunner(),
  })

  assert.equal(
    targets.some(({ path }) => path === payloadPath),
    true,
  )
})

test("ignores ordinary text resources, including an uppercase native-looking suffix", async () => {
  const paths = await fixture()
  const resourcePath = join(paths.appPath, "Contents", "Resources", "README.NODE")
  await writeFile(resourcePath, "ordinary package resource")
  const calls = []
  const targets = await discoverSignableCode({
    appPath: paths.appPath,
    runFile: createSigningRunner({ calls }),
  })

  assert.equal(
    targets.some(({ path }) => path === resourcePath),
    false,
  )
  assert.equal(
    calls.some(({ arguments_ }) => arguments_[1] === resourcePath),
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
