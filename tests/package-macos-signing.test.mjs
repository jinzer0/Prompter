import assert from "node:assert/strict"
import { access, chmod, mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { afterEach, test } from "vitest"

import {
  discoverSignableCode,
  signAppBundle,
  verifyAppSignature,
} from "../scripts/macos/signing.mjs"

const identity = "Developer ID Application: SYNTHETIC_IDENTITY"
const temporaryDirectories = []
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const frameworkDirectories = ["Resources", "Headers", "Modules", "Helpers", "Libraries"]
const expectedEntitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
</dict>
</plist>
`

afterEach(async () =>
  Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  ),
)

async function executable(path) {
  await mkdir(join(path, ".."), { recursive: true })
  await writeFile(path, "synthetic Mach-O")
  await chmod(path, 0o755)
}

async function fixture({
  duplicate = false,
  escapingAlias = false,
  frameworkAliases = false,
  unexpectedFrameworkDirectoryAlias,
  unexpectedFrameworkBinaryAlias,
  mixedFrameworkBinaryAlias = false,
  mixedFrameworkDirectoryAlias,
  versionedFrameworkBinaryAlias = false,
  currentVersionBinaryAlias = false,
} = {}) {
  const root = await mkdtemp(join(tmpdir(), "prompter-signing-test-"))
  temporaryDirectories.push(root)
  const appPath = join(root, "Prompter.app")
  const paths = {
    appPath,
    main: join(appPath, "Contents", "MacOS", "Prompter"),
    helper: join(
      appPath,
      "Contents",
      "Frameworks",
      "Prompter Helper.app",
      "Contents",
      "MacOS",
      "Prompter Helper",
    ),
    framework: join(appPath, "Contents", "Frameworks", "Kit.framework", "Kit"),
    dylib: join(appPath, "Contents", "Frameworks", "libfixture.dylib"),
    native: join(appPath, "Contents", "Resources", "app", "fixture.node"),
    xpc: join(appPath, "Contents", "XPCServices", "Worker.xpc", "Contents", "MacOS", "Worker"),
    tool: join(appPath, "Contents", "MacOS", "native-tool"),
    entitlements: join(root, "entitlements.plist"),
  }
  await Promise.all(
    Object.values(paths)
      .filter(
        (path) =>
          path !== paths.appPath &&
          path !== paths.entitlements &&
          (!frameworkAliases || path !== paths.framework),
      )
      .map(executable),
  )
  await writeFile(paths.entitlements, expectedEntitlements)
  if (frameworkAliases) {
    const frameworkRoot = join(appPath, "Contents", "Frameworks", "Kit.framework")
    const versionRoot = join(frameworkRoot, "Versions", "A")
    const versionBinary = join(versionRoot, "Kit")
    await executable(versionBinary)
    await symlink("A", join(frameworkRoot, "Versions", "Current"))
    await symlink("Versions/Current/Kit", paths.framework)
    await Promise.all(
      frameworkDirectories.map(async (directory) => {
        await executable(join(versionRoot, directory, `${directory.toLowerCase()}-tool`))
        await symlink(`Versions/Current/${directory}`, join(frameworkRoot, directory))
      }),
    )
    await executable(join(versionRoot, "Modules", "nested.node"))
    await executable(join(versionRoot, "Libraries", "libnested.dylib"))
    if (mixedFrameworkBinaryAlias || mixedFrameworkDirectoryAlias !== undefined) {
      const otherVersionRoot = join(frameworkRoot, "Versions", "B")
      await executable(join(otherVersionRoot, "Kit"))
      await Promise.all(
        frameworkDirectories.map((directory) =>
          mkdir(join(otherVersionRoot, directory), { recursive: true }),
        ),
      )
      if (mixedFrameworkBinaryAlias) {
        await rm(paths.framework)
        await symlink("Versions/B/Kit", paths.framework)
      }
      if (mixedFrameworkDirectoryAlias !== undefined) {
        await rm(join(frameworkRoot, mixedFrameworkDirectoryAlias))
        await symlink(
          `Versions/B/${mixedFrameworkDirectoryAlias}`,
          join(frameworkRoot, mixedFrameworkDirectoryAlias),
        )
      }
    }
    if (unexpectedFrameworkBinaryAlias !== undefined) {
      const aliasDirectory =
        unexpectedFrameworkBinaryAlias === "before-conventional" ? "Aliases" : "Library"
      await mkdir(join(frameworkRoot, aliasDirectory), { recursive: true })
      await symlink("../Versions/A/Kit", join(frameworkRoot, aliasDirectory, "Kit"))
    }
    if (unexpectedFrameworkDirectoryAlias !== undefined) {
      await symlink("Versions/A", join(frameworkRoot, unexpectedFrameworkDirectoryAlias))
    }
    if (versionedFrameworkBinaryAlias) {
      const otherVersionRoot = join(frameworkRoot, "Versions", "B")
      await mkdir(otherVersionRoot, { recursive: true })
      await symlink("../A/Kit", join(otherVersionRoot, "Kit"))
    }
    if (currentVersionBinaryAlias) {
      await symlink("Kit", join(versionRoot, "Kit-alias"))
    }
  }
  if (duplicate)
    await symlink(paths.native, join(appPath, "Contents", "Resources", "app", "fixture-alias.node"))
  if (escapingAlias) {
    const outside = join(root, "outside.node")
    await executable(outside)
    await symlink(outside, join(appPath, "Contents", "Resources", "app", "escape.node"))
  }
  return paths
}

function identityListing(entries = [identity], count = entries.length) {
  return `${entries.map((name, index) => `  ${index + 1}) ${"a".repeat(40)} "${name}"`).join("\n")}\n  ${count} valid identities found\n`
}

function runner({ listing = identityListing(), calls = [], unsignedAfterSigning = false } = {}) {
  return async (command, arguments_) => {
    calls.push({ command, arguments_ })
    if (command === "/usr/bin/security") return { stdout: listing }
    if (command === "/usr/bin/plutil") return { stdout: "" }
    if (command === "/usr/bin/file") {
      const signed = calls.some(
        ({ command: entry, arguments_: args }) =>
          entry === "/usr/bin/codesign" && args[0] === "--force",
      )
      return { stdout: unsignedAfterSigning && signed ? "text" : "Mach-O 64-bit executable" }
    }
    return { stdout: "" }
  }
}

test("signs every nested code object deterministically before the outer app with the entitlement partition", async () => {
  const paths = await fixture()
  const calls = []

  await signAppBundle({
    appPath: paths.appPath,
    identity,
    entitlementsPath: paths.entitlements,
    runFile: runner({ calls }),
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
      identity,
    ])
    assert.equal(arguments_.includes("--deep"), false)
  }
  const canonicalAppPath = await realpath(paths.appPath)
  const targets = signed.map(({ arguments_ }) => relative(canonicalAppPath, arguments_.at(-1)))
  assert.deepEqual(targets, [
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

test("requires exactly one well-formed signing identity before any signing mutation", async () => {
  const paths = await fixture()
  const listings = [
    identityListing([]),
    identityListing([identity, identity]),
    identityListing([`${identity} SYNTHETIC_SUFFIX`]),
    "  1) malformed\n  1 valid identities found\n",
    identityListing([identity], 2),
  ]

  for (const listing of listings) {
    const calls = []
    await assert.rejects(
      signAppBundle({
        appPath: paths.appPath,
        identity,
        entitlementsPath: paths.entitlements,
        runFile: runner({ listing, calls }),
      }),
      /Exactly one signing identity is required|Unable to validate signing identity/,
    )
    assert.equal(calls.filter(({ command }) => command === "/usr/bin/codesign").length, 0)
    assert.equal(JSON.stringify(calls).includes(identity), false)
  }
})

test("rejects escaping and duplicate canonical aliases before nested or outer signing", async () => {
  for (const options of [{ duplicate: true }, { escapingAlias: true }]) {
    const paths = await fixture(options)
    const calls = []
    await assert.rejects(
      signAppBundle({
        appPath: paths.appPath,
        identity,
        entitlementsPath: paths.entitlements,
        runFile: runner({ calls }),
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
    identity,
    entitlementsPath: paths.entitlements,
    runFile: runner({ calls }),
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

test("accepts the complete Current-bound framework layout and inspects canonical descendants once", async () => {
  const paths = await fixture({ frameworkAliases: true })
  const calls = []
  const targets = await discoverSignableCode({ appPath: paths.appPath, runFile: runner({ calls }) })
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
    discoverSignableCode({ appPath: paths.appPath, runFile: runner() }),
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
      identity,
      entitlementsPath: paths.entitlements,
      runFile: runner({ calls }),
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
  const paths = await fixture({
    frameworkAliases: true,
    mixedFrameworkDirectoryAlias,
  })

  await assert.rejects(
    discoverSignableCode({ appPath: paths.appPath, runFile: runner() }),
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
    discoverSignableCode({ appPath: paths.appPath, runFile: runner() }),
    /Signable binary alias is not allowed/,
  )
})

test.each([
  "AAAA",
  "Aliases",
])("rejects a signable object reached through a non-conventional framework directory alias %s", async (unexpectedFrameworkDirectoryAlias) => {
  const paths = await fixture({ frameworkAliases: true, unexpectedFrameworkDirectoryAlias })

  await assert.rejects(
    discoverSignableCode({ appPath: paths.appPath, runFile: runner() }),
    /Signable directory alias is not allowed/,
  )
})

test("rejects a post-sign unsigned native object and suppresses the outer signature", async () => {
  const paths = await fixture()
  const calls = []

  await assert.rejects(
    signAppBundle({
      appPath: paths.appPath,
      identity,
      entitlementsPath: paths.entitlements,
      runFile: runner({ calls, unsignedAfterSigning: true }),
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

  await verifyAppSignature({ appPath: paths.appPath, runFile: runner({ calls }) })
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
    (await discoverSignableCode({ appPath: paths.appPath, runFile: runner() })).length,
    10,
  )
})
