import assert from "node:assert/strict"
import { access, readFile } from "node:fs/promises"
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
