import assert from "node:assert/strict"
import { access, mkdir, readFile, symlink, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import { createCoordinatorFixture } from "./support/macos-coordinator-fixtures.mjs"
import {
  assertNoLaterReleaseStages,
  notarizationAttempt,
  submissionCount,
} from "./support/macos-coordinator-support.mjs"
import { createTemporaryDirectoryTracker } from "./support/macos-package-fixtures.mjs"

const temporaryDirectories = createTemporaryDirectoryTracker()
afterEach(() => temporaryDirectories.cleanup())

async function fixture(options) {
  return temporaryDirectories.track(await createCoordinatorFixture(options))
}

function acceptedFailure(artifactKind) {
  return artifactKind === "app"
    ? { failure: "app-staple-exhaustion" }
    : { failure: "dmg-mutating-validate-exhaustion" }
}

function statusOption(artifactKind, status) {
  return artifactKind === "app" ? { pendingAppStatus: status } : { pendingDmgStatus: status }
}

test.each([
  "app",
  "dmg",
])("normalizes cached Accepted %s evidence when fresh Apple status is In Progress", async (artifactKind) => {
  const first = await fixture(acceptedFailure(artifactKind))
  await assert.rejects(first.run())
  const attempt = notarizationAttempt(first, artifactKind)
  const submittedBytes = await readFile(attempt.artifactPath)
  const second = await fixture({
    ...statusOption(artifactKind, "In Progress"),
    shared: first.shared,
  })

  await assert.rejects(second.run(), /Notarization submission is unresolved/)

  assert.equal(submissionCount([first, second], artifactKind), 1)
  assert.equal(second.calls.includes(`${artifactKind}-staple`), false)
  assert.equal(second.calls.includes("final-zip"), false)
  assert.equal(second.calls.includes("dmg-create"), false)
  assert.equal(second.calls.includes("checksum"), false)
  assert.deepEqual(await readFile(attempt.artifactPath), submittedBytes)
  assert.equal(
    JSON.parse(await readFile(join(attempt.evidenceDirectory, "notarization-resume.json"), "utf8"))
      .status,
    "accepted",
  )
})

test.each([
  ["warning", { pendingAppStatus: "Accepted", warningLog: true }, "app-log"],
  [
    "error",
    { pendingAppStatus: "Accepted", notaryLog: { issues: [{ severity: "error" }] } },
    "app-log",
  ],
  ["Rejected", { pendingAppStatus: "Rejected" }, "app-info"],
])("removes cached Accepted app evidence after a terminal %s outcome", async (_outcome, options, stage) => {
  const first = await fixture(acceptedFailure("app"))
  await assert.rejects(first.run())
  const attempt = notarizationAttempt(first, "app")
  const second = await fixture({ ...options, shared: first.shared })

  await assert.rejects(second.run())

  assertNoLaterReleaseStages(second.calls, stage)
  assert.equal(submissionCount([first, second], "app"), 1)
  await assert.rejects(access(attempt.directory))
})

test.each([
  ["warning", { pendingAppStatus: "Accepted", warningLog: true }, "app-log"],
  [
    "error",
    { pendingAppStatus: "Accepted", notaryLog: { issues: [{ severity: "error" }] } },
    "app-log",
  ],
  ["Rejected", { pendingAppStatus: "Rejected" }, "app-info"],
])("rebuilds after terminal %s discards cached Accepted app evidence", async (_outcome, terminalOptions, stage) => {
  const first = await fixture(acceptedFailure("app"))
  await assert.rejects(first.run())
  const attempt = notarizationAttempt(first, "app")
  assert.equal(
    JSON.parse(await readFile(join(attempt.evidenceDirectory, "notarization-resume.json"), "utf8"))
      .status,
    "Accepted",
  )

  const second = await fixture({ ...terminalOptions, shared: first.shared })
  await assert.rejects(second.run())
  assertNoLaterReleaseStages(second.calls, stage)
  assert.equal(submissionCount([first, second], "app"), 1)

  const third = await fixture({ shared: first.shared })
  const result = await third.run()

  assert.deepEqual(result.artifacts, [
    "Prompter-0.1.1-mac-arm64.dmg",
    "Prompter-0.1.1-mac-arm64.zip",
    "SHA256SUMS",
  ])
  assert.equal(submissionCount([first, second, third], "app"), 2)
  assert.equal(submissionCount([first, second, third], "dmg"), 1)
  await assert.rejects(access(attempt.directory))
  const finalResume = JSON.parse(
    await readFile(join(attempt.evidenceDirectory, "notarization-resume.json"), "utf8"),
  )
  assert.equal(finalResume.status, "Accepted")
  await access(join(attempt.evidenceDirectory, finalResume.logPath))
})

test("removes only terminal app evidence and unlinks nested symlinks", async () => {
  const first = await fixture(acceptedFailure("app"))
  await assert.rejects(first.run())
  const attempt = notarizationAttempt(first, "app")
  const versionDirectory = join(first.evidenceRoot, "v0.1.1")
  const dmgEvidenceDirectory = join(versionDirectory, "dmg")
  const outsideDirectory = join(first.shared.root, "outside-terminal-evidence")
  await Promise.all([mkdir(dmgEvidenceDirectory), mkdir(outsideDirectory)])
  await Promise.all([
    writeFile(join(versionDirectory, "version-sentinel"), "retain"),
    writeFile(join(dmgEvidenceDirectory, "dmg-sentinel"), "retain"),
    writeFile(join(outsideDirectory, "outside-sentinel"), "retain"),
  ])
  await symlink(outsideDirectory, join(attempt.evidenceDirectory, "nested-link"))

  const second = await fixture({ pendingAppStatus: "Rejected", shared: first.shared })
  await assert.rejects(second.run())

  await assert.rejects(access(attempt.evidenceDirectory))
  assert.equal(await readFile(join(versionDirectory, "version-sentinel"), "utf8"), "retain")
  assert.equal(await readFile(join(dmgEvidenceDirectory, "dmg-sentinel"), "utf8"), "retain")
  assert.equal(await readFile(join(outsideDirectory, "outside-sentinel"), "utf8"), "retain")
  assert.equal(await readFile(join(first.evidenceRoot, "caller-sentinel"), "utf8"), "retain")
})
