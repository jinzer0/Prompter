import assert from "node:assert/strict"
import { access, rm } from "node:fs/promises"

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

test.each([
  ["warning", { pendingAppStatus: "Accepted", warningLog: true }, "app-log"],
  [
    "error",
    { pendingAppStatus: "Accepted", notaryLog: { issues: [{ severity: "error" }] } },
    "app-log",
  ],
  ["Rejected", { pendingAppStatus: "Rejected" }, "app-info"],
])("blocks resumed DMG work after a fresh app %s outcome", async (_outcome, options, failureStage) => {
  const first = await fixture({ failure: "dmg-timeout" })
  await assert.rejects(first.run())
  const app = notarizationAttempt(first, "app")
  const dmg = notarizationAttempt(first, "dmg")
  const second = await fixture({ ...options, shared: first.shared })

  await assert.rejects(second.run())

  assert.equal(second.calls.includes("app-info"), true)
  assertNoLaterReleaseStages(second.calls, failureStage)
  assert.equal(second.calls.includes("dmg-info"), false)
  assert.equal(second.calls.includes("dmg-staple"), false)
  assert.equal(second.calls.includes("attach"), false)
  assert.equal(second.calls.includes("checksum"), false)
  assert.equal(submissionCount([first, second], "app"), 1)
  assert.equal(submissionCount([first, second], "dmg"), 1)
  await assert.rejects(access(second.candidate))
  await assert.rejects(access(app.evidenceDirectory))
  await assert.rejects(access(dmg.evidenceDirectory))

  const third = await fixture({ shared: first.shared })
  await third.run()
  assert.equal(submissionCount([first, second, third], "app"), 2)
  assert.equal(submissionCount([first, second, third], "dmg"), 2)
})

test("refreshes retained app acceptance before a resumed DMG without resubmission", async () => {
  const first = await fixture({ failure: "dmg-timeout" })
  await assert.rejects(first.run())
  const second = await fixture({
    pendingAppStatus: "Accepted",
    pendingDmgStatus: "Accepted",
    shared: first.shared,
  })

  const result = await second.run()

  assert.deepEqual(result.artifacts, [
    "Prompter-0.1.1-mac-arm64.dmg",
    "Prompter-0.1.1-mac-arm64.zip",
    "SHA256SUMS",
  ])
  assert.equal(second.calls.indexOf("app-info") < second.calls.indexOf("app-log"), true)
  assert.equal(second.calls.indexOf("app-log") < second.calls.indexOf("dmg-info"), true)
  assert.equal(submissionCount([first, second], "app"), 1)
  assert.equal(submissionCount([first, second], "dmg"), 1)
})

test("retains both attempts when fresh app status remains In Progress", async () => {
  const first = await fixture({ failure: "dmg-timeout" })
  await assert.rejects(first.run())
  const app = notarizationAttempt(first, "app")
  const dmg = notarizationAttempt(first, "dmg")
  const second = await fixture({
    pendingAppStatus: "In Progress",
    pendingDmgStatus: "Accepted",
    shared: first.shared,
  })

  await assert.rejects(second.run(), /Notarization submission is unresolved/)

  assertNoLaterReleaseStages(second.calls, "app-info")
  await access(app.evidenceDirectory)
  await access(dmg.evidenceDirectory)
  const third = await fixture({
    pendingAppStatus: "Accepted",
    pendingDmgStatus: "Accepted",
    shared: first.shared,
  })
  await third.run()
  assert.equal(submissionCount([first, second, third], "app"), 1)
  assert.equal(submissionCount([first, second, third], "dmg"), 1)
})

test("discards an orphan retained DMG and rebuilds both attempts", async () => {
  const first = await fixture({ failure: "dmg-timeout" })
  await assert.rejects(first.run())
  const app = notarizationAttempt(first, "app")
  const dmg = notarizationAttempt(first, "dmg")
  await rm(app.directory, { recursive: true })
  const second = await fixture({ shared: first.shared })

  await assert.rejects(second.run(), (error) => {
    assert.equal(error?.message, "Invalid retained notarization attempt")
    assert.equal(error?.artifactKind, "dmg")
    assert.equal(error?.discardEvidence, true)
    return true
  })

  assertNoLaterReleaseStages(second.calls)
  await assert.rejects(access(app.evidenceDirectory))
  await assert.rejects(access(dmg.evidenceDirectory))
  const third = await fixture({ shared: first.shared })
  await third.run()
  assert.equal(submissionCount([first, second, third], "app"), 2)
  assert.equal(submissionCount([first, second, third], "dmg"), 2)
})
