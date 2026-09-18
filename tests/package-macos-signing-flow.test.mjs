import assert from "node:assert/strict"
import { mkdir, realpath, writeFile } from "node:fs/promises"
import { dirname, join, relative } from "node:path"

import { afterEach, test } from "vitest"

import { signAppBundle } from "../scripts/macos/signing.mjs"
import {
  createSigningFixture,
  createSigningRunner,
  identityListing,
  signingIdentity,
} from "./support/macos-signing-fixtures.mjs"

const fixtures = []
afterEach(() => Promise.all(fixtures.splice(0).map(({ remove }) => remove())))

async function fixture(options) {
  const created = await createSigningFixture(options)
  fixtures.push(created)
  return created.paths
}

test("signs every nested code object deterministically before the outer app with the entitlement partition", async () => {
  const paths = await fixture()
  const calls = []
  await signAppBundle({
    appPath: paths.appPath,
    identity: signingIdentity,
    entitlementsPath: paths.entitlements,
    runFile: createSigningRunner({ calls }),
  })
  const signed = calls.filter(
    ({ command, arguments_ }) => command === "/usr/bin/codesign" && arguments_[0] === "--force",
  )
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
  assert.deepEqual(targets, [
    "Contents/Resources/app/node_modules/better-sqlite3/build/Release/better_sqlite3.node",
    "Contents/Frameworks/Prompter Helper.app/Contents/MacOS/Prompter Helper",
    "Contents/XPCServices/Worker.xpc/Contents/MacOS/Worker",
    "Contents/Frameworks/Kit.framework/Kit",
    "Contents/Resources/app/fixture.node",
    "Contents/Frameworks/Kit.framework",
    "Contents/Frameworks/Prompter Helper.app",
    "Contents/Frameworks/libfixture.dylib",
    "Contents/MacOS/Prompter",
    "Contents/MacOS/native-tool",
    "Contents/XPCServices/Worker.xpc",
    "",
  ])
  assert.deepEqual(
    targets.filter((_, index) => signed[index].arguments_.includes("--entitlements")),
    [
      "Contents/Frameworks/Prompter Helper.app/Contents/MacOS/Prompter Helper",
      "Contents/XPCServices/Worker.xpc/Contents/MacOS/Worker",
      "Contents/Frameworks/Prompter Helper.app",
      "Contents/MacOS/Prompter",
      "Contents/MacOS/native-tool",
      "Contents/XPCServices/Worker.xpc",
      "",
    ],
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

test("rejects a missing required runtime addon before first mutable codesign", async () => {
  const paths = await fixture({ missingRuntimeAddon: true })
  const calls = []
  await assert.rejects(
    signAppBundle({
      appPath: paths.appPath,
      identity: signingIdentity,
      entitlementsPath: paths.entitlements,
      runFile: createSigningRunner({ calls }),
    }),
    /Unexpected runtime native signing target/,
  )
  assert.equal(
    calls.some(
      ({ command, arguments_ }) => command === "/usr/bin/codesign" && arguments_[0] === "--force",
    ),
    false,
  )
})

test("requires exactly one well-formed signing identity before any signing mutation", async () => {
  const paths = await fixture()
  const listings = [
    identityListing([]),
    identityListing([signingIdentity, signingIdentity]),
    identityListing([`${signingIdentity} SYNTHETIC_SUFFIX`]),
    "  1) malformed\n  1 valid identities found\n",
    identityListing([signingIdentity], 2),
  ]
  for (const listing of listings) {
    const calls = []
    await assert.rejects(
      signAppBundle({
        appPath: paths.appPath,
        identity: signingIdentity,
        entitlementsPath: paths.entitlements,
        runFile: createSigningRunner({ listing, calls }),
      }),
      /Exactly one signing identity is required|Unable to validate signing identity/,
    )
    assert.equal(calls.filter(({ command }) => command === "/usr/bin/codesign").length, 0)
    assert.equal(JSON.stringify(calls).includes(signingIdentity), false)
  }
})

test("rejects escaping and duplicate canonical aliases before nested or outer signing", async () => {
  for (const options of [{ duplicate: true }, { escapingAlias: true }]) {
    const paths = await fixture(options)
    const calls = []
    await assert.rejects(
      signAppBundle({
        appPath: paths.appPath,
        identity: signingIdentity,
        entitlementsPath: paths.entitlements,
        runFile: createSigningRunner({ calls }),
      }),
    )
    assert.equal(calls.filter(({ command }) => command === "/usr/bin/codesign").length, 0)
  }
})

test("coalesces only same-framework version aliases and signs their canonical target once", async () => {
  const paths = await fixture({ frameworkAliases: true })
  const calls = []
  await signAppBundle({
    appPath: paths.appPath,
    identity: signingIdentity,
    entitlementsPath: paths.entitlements,
    runFile: createSigningRunner({ calls }),
  })
  const canonicalFrameworkBinary = await realpath(paths.framework)
  const signedFrameworks = calls.filter(
    ({ command, arguments_ }) =>
      command === "/usr/bin/codesign" &&
      arguments_[0] === "--force" &&
      arguments_.at(-1) === canonicalFrameworkBinary,
  )
  assert.equal(signedFrameworks.length, 1)
})

test.each([
  "better-sqlite3",
  "bindings",
  "file-uri-to-path",
])("rejects an unexpected signable runtime payload in %s before first mutable codesign", async (packageName) => {
  const paths = await fixture()
  const foreignPayload = join(
    paths.appPath,
    "Contents",
    "Resources",
    "app",
    "node_modules",
    packageName,
    "foreign-native",
  )
  await mkdir(dirname(foreignPayload), { recursive: true })
  await writeFile(foreignPayload, Buffer.from([0xcf, 0xfa, 0xed, 0xfe]))
  const calls = []
  const outcome = await signAppBundle({
    appPath: paths.appPath,
    identity: signingIdentity,
    entitlementsPath: paths.entitlements,
    runFile: createSigningRunner({ calls }),
  }).then(
    () => undefined,
    (error) => error,
  )

  assert.equal(
    calls.some(
      ({ command, arguments_ }) => command === "/usr/bin/codesign" && arguments_[0] === "--force",
    ),
    false,
  )
  assert.match(
    outcome instanceof Error ? outcome.message : "",
    /Unexpected runtime native signing target/,
  )
})
