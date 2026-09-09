import assert from "node:assert/strict"
import { access, chmod, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

import { afterEach, test } from "vitest"

import { validateOwnedDirectory } from "../scripts/macos/owned-directory.mjs"
import { runner } from "../scripts/macos/release-support.mjs"
import { createCoordinatorFixture } from "./support/macos-coordinator-fixtures.mjs"
import {
  assertReleaseEntrypointRejectsBeforeMutation,
  createTemporaryDirectoryTracker,
} from "./support/macos-package-fixtures.mjs"

const temporaryDirectories = createTemporaryDirectoryTracker()
afterEach(() => temporaryDirectories.cleanup())

async function fixture(options) {
  return temporaryDirectories.track(await createCoordinatorFixture(options))
}

test("keeps signed Apple trust gates on absolute paths despite earlier PATH executables", async () => {
  const release = await fixture()
  const root = release.shared.root
  const binDirectory = join(root, "bin")
  const markerPath = join(root, "hijacked")
  await mkdir(binDirectory)
  await Promise.all(
    ["xcrun", "spctl"].map(async (command) => {
      const fakePath = join(binDirectory, command)
      await writeFile(fakePath, `#!/bin/sh\ntouch "${markerPath}"\n`)
      await chmod(fakePath, 0o755)
    }),
  )
  const originalPath = process.env.PATH
  process.env.PATH = `${binDirectory}:${originalPath ?? ""}`
  try {
    await release.run()
  } finally {
    process.env.PATH = originalPath
  }
  await assert.rejects(access(markerPath))
  assert.equal(
    release.rawCalls
      .filter(({ command }) => command.endsWith("xcrun"))
      .every(({ command }) => command === "/usr/bin/xcrun"),
    true,
  )
  assert.equal(
    release.rawCalls
      .filter(({ command }) => command.endsWith("spctl"))
      .every(({ command }) => command === "/usr/sbin/spctl"),
    true,
  )
})

test("rejects every signed release version except 0.1.1 before the first external command", async () => {
  const release = await fixture()
  await writeFile(
    join(release.shared.sourceRoot, "package.json"),
    JSON.stringify({ version: "0.1.2" }),
  )
  await assert.rejects(release.run(), /Invalid package version/)
  assert.deepEqual(release.calls, [])
})

test("rejects a wrong package version at the npm release entrypoint before build or downstream mutation", async () => {
  await assertReleaseEntrypointRejectsBeforeMutation({
    errorMessage: "Invalid package version",
    version: "0.1.2",
  })
})

test("rejects a missing package version at the npm release entrypoint before build or downstream mutation", async () => {
  await assertReleaseEntrypointRejectsBeforeMutation({
    errorMessage: "Invalid package version",
  })
})

test.each([
  ["missing signing identity", "PROMPTER_SIGNING_IDENTITY", undefined],
  ["blank signing identity", "PROMPTER_SIGNING_IDENTITY", "   "],
  ["missing notary profile", "PROMPTER_NOTARY_PROFILE", undefined],
  ["blank notary profile", "PROMPTER_NOTARY_PROFILE", "   "],
])("rejects a %s at the npm release entrypoint before build or downstream mutation", async (_label, inputName, inputValue) => {
  await assertReleaseEntrypointRejectsBeforeMutation({
    errorMessage: `Missing required release input: ${inputName}`,
    inputName,
    inputValue,
    version: "0.1.1",
  })
})

test("maps bounded timeout and an AbortSignal to production execFile options", async () => {
  const controller = new AbortController()
  let options
  const run = runner(async (_command, _arguments, receivedOptions) => {
    options = receivedOptions
    return { stdout: "", stderr: "" }
  })
  await run("xcrun", ["notarytool"], { timeoutMs: 1000, signal: controller.signal })
  assert.deepEqual(options, { timeout: 1000, signal: controller.signal })
  await assert.rejects(
    run("xcrun", ["notarytool"], { signal: {} }),
    /Invalid macOS release command options/,
  )
})

test("rejects a symlinked release root before external commands or outside mutation", async () => {
  const release = await fixture()
  const outsideDirectory = join(release.shared.root, "outside-release-root")
  await mkdir(outsideDirectory)
  await rm(release.releaseRoot, { recursive: true })
  await symlink(outsideDirectory, release.releaseRoot)

  await assert.rejects(release.run(), /Release root is unavailable/)

  assert.deepEqual(release.calls, [])
  await assert.rejects(access(join(outsideDirectory, "v0.1.1")))
})

test("rejects a regular release root beneath a symlinked ancestor before mutation", async () => {
  const release = await fixture()
  const outsideDirectory = join(release.shared.root, "outside-release-parent")
  const outsideRoot = join(outsideDirectory, "release")
  await mkdir(outsideRoot, { recursive: true })
  await writeFile(join(outsideRoot, "caller-sentinel"), "retain")
  await rm(dirname(release.releaseRoot), { recursive: true })
  await symlink(outsideDirectory, dirname(release.releaseRoot))

  await assert.rejects(release.run(), /Release root is unavailable/)

  assert.deepEqual(release.calls, [])
  assert.equal(await readFile(join(outsideRoot, "caller-sentinel"), "utf8"), "retain")
  await assert.rejects(access(join(outsideRoot, "v0.1.1")))
})

test("creates a missing release root only after non-mutating preflight", async () => {
  const release = await fixture()
  await rm(release.releaseRoot, { recursive: true })

  await release.run()

  assert.equal(release.calls.indexOf("profile") < release.calls.indexOf("native-copied"), true)
  await access(release.candidate)
})

test("accepts a canonical target beneath a symlinked trusted anchor", async () => {
  const release = await fixture()
  const anchorAlias = join(release.shared.root, "trusted-anchor-alias")
  await symlink(".", anchorAlias)

  assert.equal(
    await validateOwnedDirectory({
      trustedAnchor: anchorAlias,
      targetPath: join(anchorAlias, "source"),
    }),
    await realpath(release.shared.sourceRoot),
  )
})

const testEvidenceEscape = test.each(["root", "app", "dmg"])

testEvidenceEscape(
  "rejects a symlinked %s evidence directory without deleting outside data",
  async (escapedDirectory) => {
    const release = await fixture()
    const artifactKind = escapedDirectory === "dmg" ? "dmg" : "app"
    const extension = artifactKind === "app" ? "zip" : "dmg"
    const outsideDirectory = join(release.shared.root, `outside-${escapedDirectory}`)
    const outsideEvidenceDirectory =
      escapedDirectory === "root"
        ? join(outsideDirectory, "v0.1.1", artifactKind)
        : outsideDirectory
    const outsideAttemptDirectory = join(outsideEvidenceDirectory, "notarization-attempt")
    const outsideArtifact = join(outsideAttemptDirectory, `Prompter-0.1.1-mac-arm64.${extension}`)
    await mkdir(outsideAttemptDirectory, { recursive: true })
    await writeFile(outsideArtifact, "outside-sentinel")
    if (escapedDirectory === "root") {
      await rm(release.evidenceRoot, { recursive: true })
      await symlink(outsideDirectory, release.evidenceRoot)
    } else {
      const versionDirectory = join(release.evidenceRoot, "v0.1.1")
      await mkdir(versionDirectory, { recursive: true })
      await symlink(outsideDirectory, join(versionDirectory, artifactKind))
    }

    await assert.rejects(release.run())

    assert.deepEqual(release.calls, [])
    await assert.rejects(access(release.candidate))
    assert.equal(await readFile(outsideArtifact, "utf8"), "outside-sentinel")
  },
)

test("rejects a regular evidence root beneath a symlinked ancestor without outside mutation", async () => {
  const release = await fixture()
  const outsideDirectory = join(release.shared.root, "outside-evidence-parent")
  const outsideRoot = join(outsideDirectory, "evidence")
  await mkdir(outsideRoot, { recursive: true })
  await writeFile(join(outsideRoot, "caller-sentinel"), "retain")
  await rm(dirname(release.evidenceRoot), { recursive: true })
  await symlink(outsideDirectory, dirname(release.evidenceRoot))

  await assert.rejects(release.run())

  assert.deepEqual(release.calls, [])
  assert.equal(await readFile(join(outsideRoot, "caller-sentinel"), "utf8"), "retain")
  await assert.rejects(access(join(outsideRoot, "v0.1.1")))
})
