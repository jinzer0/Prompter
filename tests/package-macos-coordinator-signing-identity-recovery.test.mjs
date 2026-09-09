import assert from "node:assert/strict"
import { access } from "node:fs/promises"

import { afterEach, test } from "vitest"

import { createCoordinatorFixture } from "./support/macos-coordinator-fixtures.mjs"
import {
  assertNoLaterReleaseStages,
  submissionCount,
  syntheticIdentity,
} from "./support/macos-coordinator-support.mjs"
import { createTemporaryDirectoryTracker } from "./support/macos-package-fixtures.mjs"

const temporaryDirectories = createTemporaryDirectoryTracker()
const rotatedIdentity = "Developer ID Application: SYNTHETIC_ROTATED_IDENTITY"
afterEach(() => temporaryDirectories.cleanup())

async function fixture(options) {
  return temporaryDirectories.track(await createCoordinatorFixture(options))
}

function displayCalls(release) {
  return release.rawCalls.filter(
    ({ command, arguments_ }) => command === "/usr/bin/codesign" && arguments_[0] === "--display",
  )
}

test("rejects a resumed app signed by a rotated Developer ID before staple or final ZIP", async () => {
  const first = await fixture({ failure: "app-timeout" })
  await assert.rejects(first.run())
  const second = await fixture({
    displayIdentity: syntheticIdentity,
    pendingAppStatus: "Accepted",
    shared: first.shared,
    signingIdentity: rotatedIdentity,
  })

  await assert.rejects(second.run(), /Recovered artifact signing identity is invalid/)

  assert.equal(submissionCount([first, second], "app"), 1)
  assert.equal(second.calls.includes("app-staple"), false)
  assert.equal(second.calls.includes("final-zip"), false)
  assert.equal(second.calls.includes("dmg-create"), false)
  assert.equal(second.calls.includes("checksum"), false)
  assertNoLaterReleaseStages(second.calls, "signer-display")
  assert.deepEqual(displayCalls(second).at(-1).arguments_.slice(0, 2), ["--display", "--verbose=4"])
  await assert.rejects(access(second.candidate))
})

test("resumes an app when its Developer ID matches the current identity", async () => {
  const first = await fixture({ failure: "app-timeout" })
  await assert.rejects(first.run())
  const second = await fixture({ pendingAppStatus: "Accepted", shared: first.shared })

  await second.run()

  assert.equal(submissionCount([first, second], "app"), 1)
  assert.equal(second.calls.includes("app-staple"), true)
  assert.equal(displayCalls(second).length, 1)
})

test("rejects malformed resumed app signing metadata before later release stages", async () => {
  const first = await fixture({ failure: "app-timeout" })
  await assert.rejects(first.run())
  const second = await fixture({
    displayOutput: { stdout: "", stderr: "Authority\n" },
    pendingAppStatus: "Accepted",
    shared: first.shared,
  })

  await assert.rejects(second.run(), /Recovered artifact signing identity is invalid/)

  assert.equal(submissionCount([first, second], "app"), 1)
  assertNoLaterReleaseStages(second.calls, "signer-display")
  await assert.rejects(access(second.candidate))
})

test("rejects a resumed DMG signed by a rotated Developer ID before copy or staple", async () => {
  const first = await fixture({ failure: "dmg-timeout" })
  await assert.rejects(first.run())
  const second = await fixture({
    displayIdentity: syntheticIdentity,
    pendingDmgStatus: "Accepted",
    shared: first.shared,
    signingIdentity: rotatedIdentity,
  })

  await assert.rejects(second.run(), /Recovered artifact signing identity is invalid/)

  assert.equal(submissionCount([first, second], "dmg"), 1)
  assert.equal(second.calls.includes("dmg-staple"), false)
  assert.equal(second.calls.includes("attach"), false)
  assert.equal(second.calls.includes("final-zip"), false)
  assert.equal(second.calls.includes("checksum"), false)
  assertNoLaterReleaseStages(second.calls, "signer-display")
  assert.equal(displayCalls(second).at(-1).options.finalDmgExistsDuringSignerDisplay, false)
  assert.deepEqual(displayCalls(second).at(-1).arguments_.slice(0, 2), ["--display", "--verbose=4"])
  await assert.rejects(access(second.candidate))
})

test("resumes a DMG when its Developer ID matches the current identity", async () => {
  const first = await fixture({ failure: "dmg-timeout" })
  await assert.rejects(first.run())
  const second = await fixture({ pendingDmgStatus: "Accepted", shared: first.shared })

  await second.run()

  assert.equal(submissionCount([first, second], "dmg"), 1)
  assert.equal(second.calls.includes("dmg-staple"), true)
  assert.equal(displayCalls(second).length, 1)
})
