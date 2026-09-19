import assert from "node:assert/strict"
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import { createCoordinatorFixture } from "./support/macos-coordinator-fixtures.mjs"
import { notarizationAttempt, submissionCount } from "./support/macos-coordinator-support.mjs"
import { createTemporaryDirectoryTracker } from "./support/macos-package-fixtures.mjs"

const temporaryDirectories = createTemporaryDirectoryTracker()
afterEach(() => temporaryDirectories.cleanup())

async function fixture(options) {
  return temporaryDirectories.track(await createCoordinatorFixture(options))
}

test.each([
  ["fresh info", false, "info"],
  ["fresh log", false, "log"],
  ["resumed info", true, "info"],
  ["resumed log", true, "log"],
])("discards %s artifact drift before rebuilding clean artifacts", async (_label, resumed, phase) => {
  let first = await fixture()
  if (resumed) {
    first = await fixture({ failure: "app-staple-exhaustion" })
    await assert.rejects(first.run(), /Notarization command failed/)
  }
  const app = notarizationAttempt(first, "app")
  const versionDirectory = join(first.evidenceRoot, "v0.1.1")
  const siblingDirectory = join(versionDirectory, "dmg")
  const externalDirectory = join(first.shared.root, "external-artifact-drift")
  await Promise.all([mkdir(siblingDirectory, { recursive: true }), mkdir(externalDirectory)])
  await Promise.all([
    writeFile(join(siblingDirectory, "sibling-sentinel"), "retain"),
    writeFile(join(externalDirectory, "external-sentinel"), "retain"),
  ])

  const second = await fixture({
    ...(resumed ? { pendingAppStatus: "Accepted" } : {}),
    notaryMutation: async ({ artifactPath, stage }) => {
      if (stage === `app-${phase}`) await writeFile(artifactPath, "changed bytes")
    },
    shared: first.shared,
  })
  await assert.rejects(second.run(), (error) => {
    assert.ok(error instanceof Error)
    assert.equal(error.message, "Notarization artifact changed")
    assert.equal(error.artifactKind, "app")
    assert.equal(error.discardEvidence, true)
    return true
  })

  assert.equal(second.calls.includes(`app-${phase}`), true)
  if (resumed) {
    assert.equal(submissionCount([first], "app"), 1)
    assert.equal(submissionCount([second], "app"), 0)
  } else {
    assert.equal(submissionCount([second], "app"), 1)
  }
  await assert.rejects(access(app.directory))
  await assert.rejects(access(join(app.evidenceDirectory, "notarization-resume.json")))
  assert.equal(await readFile(join(siblingDirectory, "sibling-sentinel"), "utf8"), "retain")
  assert.equal(await readFile(join(externalDirectory, "external-sentinel"), "utf8"), "retain")
  assert.equal(await readFile(join(first.releaseRoot, "caller-sentinel"), "utf8"), "retain")
  assert.equal(await readFile(join(first.evidenceRoot, "caller-sentinel"), "utf8"), "retain")

  const third = await fixture({ shared: first.shared })
  const result = await third.run()

  assert.deepEqual(result.artifacts, [
    "Prompter-0.1.1-mac-arm64.dmg",
    "Prompter-0.1.1-mac-arm64.zip",
    "SHA256SUMS",
  ])
  assert.equal(submissionCount([first, second, third], "app"), 2)
  assert.equal(submissionCount([first, second, third], "dmg"), 1)
})

test.each([
  ["fresh info deletion", false, "info", "deleted"],
  ["fresh log unreadability", false, "log", "unreadable"],
  ["resumed info unreadability", true, "info", "unreadable"],
  ["resumed log deletion", true, "log", "deleted"],
])("discards %s before rebuilding clean artifacts", async (_label, resumed, phase, failure) => {
  let first = await fixture()
  if (resumed) {
    first = await fixture({ failure: "app-staple-exhaustion" })
    await assert.rejects(first.run(), /Notarization command failed/)
  }
  const app = notarizationAttempt(first, "app")

  const second = await fixture({
    ...(resumed ? { pendingAppStatus: "Accepted" } : {}),
    notaryMutation: async ({ artifactPath, stage }) => {
      if (stage !== `app-${phase}`) return
      await rm(artifactPath)
      if (failure === "unreadable") await mkdir(artifactPath)
    },
    shared: first.shared,
  })
  await assert.rejects(second.run(), (error) => {
    assert.ok(error instanceof Error)
    assert.equal(error.message, "Unsupported notarization artifact")
    assert.equal(error.message.includes(app.artifactPath), false)
    assert.equal(JSON.stringify(error).includes(app.artifactPath), false)
    assert.equal(error.artifactKind, "app")
    assert.equal(error.discardEvidence, true)
    return true
  })

  assert.equal(second.calls.includes(`app-${phase}`), true)
  if (resumed) {
    assert.equal(submissionCount([first], "app"), 1)
    assert.equal(submissionCount([second], "app"), 0)
  } else {
    assert.equal(submissionCount([second], "app"), 1)
  }
  await assert.rejects(access(app.directory))
  await assert.rejects(access(join(app.evidenceDirectory, "notarization-resume.json")))

  const third = await fixture({ shared: first.shared })
  const result = await third.run()

  assert.deepEqual(result.artifacts, [
    "Prompter-0.1.1-mac-arm64.dmg",
    "Prompter-0.1.1-mac-arm64.zip",
    "SHA256SUMS",
  ])
  assert.equal(submissionCount([first, second, third], "app"), 2)
  assert.equal(submissionCount([first, second, third], "dmg"), 1)
})
