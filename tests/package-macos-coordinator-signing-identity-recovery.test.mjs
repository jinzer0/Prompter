import assert from "node:assert/strict"
import { access } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import { SigningInputError } from "../scripts/macos/signing-discovery.mjs"
import { createCoordinatorFixture } from "./support/macos-coordinator-fixtures.mjs"
import {
  assertNoLaterReleaseStages,
  notarizationAttempt,
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

function deterministicIdentityError(artifactKind) {
  return (error) => {
    assert.ok(error instanceof SigningInputError)
    assert.equal(error.message, "Recovered artifact signing identity is invalid")
    assert.equal(error.artifactKind, artifactKind)
    assert.equal(error.discardEvidence, true)
    return true
  }
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

  await assert.rejects(second.run(), deterministicIdentityError("app"))

  assert.equal(submissionCount([first, second], "app"), 1)
  assert.equal(second.calls.includes("app-staple"), false)
  assert.equal(second.calls.includes("final-zip"), false)
  assert.equal(second.calls.includes("dmg-create"), false)
  assert.equal(second.calls.includes("checksum"), false)
  assertNoLaterReleaseStages(second.calls, "signer-display")
  assert.deepEqual(displayCalls(second).at(-1).arguments_.slice(0, 2), ["--display", "--verbose=4"])
  await assert.rejects(access(second.candidate))
  await assert.rejects(access(notarizationAttempt(first, "app").evidenceDirectory))

  const third = await fixture({ shared: first.shared })
  await third.run()

  assert.equal(submissionCount([first, second, third], "app"), 2)
  assert.equal(submissionCount([first, second, third], "dmg"), 1)
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

test.each([
  ["missing", { stdout: "", stderr: "" }],
  [
    "duplicate",
    { stdout: "", stderr: `Authority=${syntheticIdentity}\nAuthority=${syntheticIdentity}\n` },
  ],
  ["malformed", { stdout: "", stderr: "Authority\n" }],
])("discards %s resumed app evidence and rebuilds on the next run", async (_kind, displayOutput) => {
  const first = await fixture({ failure: "app-timeout" })
  await assert.rejects(first.run())
  const app = notarizationAttempt(first, "app")
  const second = await fixture({
    displayOutput,
    pendingAppStatus: "Accepted",
    shared: first.shared,
  })

  await assert.rejects(second.run(), deterministicIdentityError("app"))

  assertNoLaterReleaseStages(second.calls, "signer-display")
  await assert.rejects(access(app.evidenceDirectory))
  const third = await fixture({ shared: first.shared })
  await third.run()
  assert.equal(submissionCount([first, second, third], "app"), 2)
})

test("retains resumed app evidence when codesign display fails transiently", async () => {
  const first = await fixture({ failure: "app-timeout" })
  await assert.rejects(first.run())
  const app = notarizationAttempt(first, "app")
  const second = await fixture({
    failure: "signer-display",
    pendingAppStatus: "Accepted",
    shared: first.shared,
  })

  await assert.rejects(second.run(), (error) => {
    assert.ok(error instanceof Error)
    assert.equal(error.message, "macOS release command failed")
    assert.equal(error.artifactKind, undefined)
    assert.equal(error.discardEvidence, undefined)
    return true
  })

  assertNoLaterReleaseStages(second.calls, "signer-display")
  await access(join(app.evidenceDirectory, "notarization-resume.json"))
  const third = await fixture({ pendingAppStatus: "Accepted", shared: first.shared })
  await third.run()
  assert.equal(submissionCount([first, second, third], "app"), 1)
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

  await assert.rejects(second.run(), deterministicIdentityError("dmg"))

  assert.equal(submissionCount([first, second], "dmg"), 1)
  assert.equal(second.calls.includes("dmg-staple"), false)
  assert.equal(second.calls.includes("attach"), false)
  assert.equal(second.calls.includes("final-zip"), false)
  assert.equal(second.calls.includes("checksum"), false)
  assertNoLaterReleaseStages(second.calls, "signer-display")
  assert.equal(displayCalls(second).at(-1).options.finalDmgExistsDuringSignerDisplay, false)
  assert.deepEqual(displayCalls(second).at(-1).arguments_.slice(0, 2), ["--display", "--verbose=4"])
  await assert.rejects(access(second.candidate))
  await access(
    join(notarizationAttempt(first, "app").evidenceDirectory, "notarization-resume.json"),
  )
  await assert.rejects(access(notarizationAttempt(first, "dmg").evidenceDirectory))

  const third = await fixture({ pendingAppStatus: "Accepted", shared: first.shared })
  await third.run()

  assert.equal(submissionCount([first, second, third], "app"), 1)
  assert.equal(submissionCount([first, second, third], "dmg"), 2)
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
