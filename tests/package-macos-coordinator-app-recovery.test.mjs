import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { access, readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import { createCoordinatorFixture } from "./support/macos-coordinator-fixtures.mjs"
import {
  assertNoLaterReleaseStages,
  notarizationAttempt,
  submissionCount,
  syntheticIdentity,
  syntheticSecret,
} from "./support/macos-coordinator-support.mjs"
import { createTemporaryDirectoryTracker } from "./support/macos-package-fixtures.mjs"

const temporaryDirectories = createTemporaryDirectoryTracker()
afterEach(() => temporaryDirectories.cleanup())

async function fixture(options) {
  return temporaryDirectories.track(await createCoordinatorFixture(options))
}

test("retains only sanitized unknown app resume evidence after an ambiguous timeout", async () => {
  const release = await fixture({ failure: "app-timeout" })
  await assert.rejects(release.run(), /Notarization submission is unresolved/)
  assertNoLaterReleaseStages(release.calls, "app-submit")
  assert.equal(release.calls.includes("app-staple"), false)
  assert.equal(release.calls.includes("dmg-create"), false)
  const evidence = await readFile(
    join(release.evidenceRoot, "v0.1.1", "app", "notarization-resume.json"),
    "utf8",
  )
  assert.match(evidence, /123e4567-e89b-42d3-a456-426614174000/)
  assert.equal(evidence.includes(syntheticSecret), false)
  assert.equal(evidence.includes(syntheticIdentity), false)
})

test.each([
  "app-timeout",
  "app-log",
])("resumes the exact retained app submission after %s without rebuilding or resubmitting", async (failure) => {
  const first = await fixture({ failure })
  await assert.rejects(first.run())
  const attempt = notarizationAttempt(first, "app")
  const submittedBytes = await readFile(attempt.artifactPath)
  const second = await fixture({ pendingAppStatus: "Accepted", shared: first.shared })
  const result = await second.run()
  assert.deepEqual(result.artifacts, [
    "Prompter-0.1.1-mac-arm64.dmg",
    "Prompter-0.1.1-mac-arm64.zip",
    "SHA256SUMS",
  ])
  assert.equal(submissionCount([first, second], "app"), 1)
  assert.equal(submissionCount([first, second], "dmg"), 1)
  assert.equal(second.calls.includes("app-info"), true)
  assert.equal(second.calls.includes("app-log"), true)
  assert.equal(
    second.rawCalls.some(
      ({ command, arguments_ }) =>
        command === "/usr/bin/codesign" &&
        arguments_.includes("--sign") &&
        !arguments_.at(-1).endsWith(".dmg"),
    ),
    false,
  )
  assert.equal(
    second.rawCalls.some(
      ({ command, arguments_ }) =>
        command === "/usr/bin/ditto" &&
        arguments_[0] === "-x" &&
        arguments_[2] === attempt.artifactPath,
    ),
    true,
  )
  assert.equal(submittedBytes.length > 0, true)
  await assert.rejects(access(attempt.directory))
  assert.deepEqual((await readdir(second.candidate)).sort(), result.artifacts)
  assert.equal(second.calls.at(-1), "checksum")
})

test("retains an accepted app ZIP until a fresh invocation successfully retries stapling", async () => {
  const first = await fixture({ failure: "app-staple-exhaustion" })
  await assert.rejects(first.run(), /Notarization command failed/)
  const attempt = notarizationAttempt(first, "app")
  const submittedBytes = await readFile(attempt.artifactPath)
  const acceptedEvidence = JSON.parse(
    await readFile(join(attempt.evidenceDirectory, "notarization-resume.json"), "utf8"),
  )
  assert.equal(acceptedEvidence.status, "Accepted")
  assert.equal(acceptedEvidence.artifactKind, "app")
  assert.equal(
    acceptedEvidence.artifactSha256,
    createHash("sha256").update(submittedBytes).digest("hex"),
  )
  assert.equal(first.calls.indexOf("app-log") < first.calls.indexOf("app-staple"), true)
  assert.equal(first.calls.filter((stage) => stage === "app-staple").length, 3)
  assert.equal(first.calls.includes("dmg-create"), false)
  const second = await fixture({ pendingAppStatus: "Accepted", shared: first.shared })
  const result = await second.run()
  assert.deepEqual(result.artifacts, [
    "Prompter-0.1.1-mac-arm64.dmg",
    "Prompter-0.1.1-mac-arm64.zip",
    "SHA256SUMS",
  ])
  assert.equal(submissionCount([first, second], "app"), 1)
  assert.equal(second.calls.includes("temporary-zip"), false)
  assert.equal(
    second.rawCalls.some(
      ({ command, arguments_ }) =>
        command === "/usr/bin/codesign" &&
        arguments_.includes("--sign") &&
        !arguments_.at(-1).endsWith(".dmg"),
    ),
    false,
  )
  assert.equal(
    second.rawCalls.some(
      ({ command, arguments_ }) =>
        command === "/usr/bin/ditto" &&
        arguments_[0] === "-x" &&
        arguments_[2] === attempt.artifactPath,
    ),
    true,
  )
  assert.equal(second.calls.includes("app-staple"), true)
  await assert.rejects(access(attempt.directory))
})

test.each([
  "zip-extract",
  "app-verify-2",
  "final-zip-app-gatekeeper",
  "dmg-create",
])("reuses the accepted app after downstream %s failure", async (failure) => {
  const first = await fixture({ failure })
  await assert.rejects(first.run())
  const attempt = notarizationAttempt(first, "app")
  const submittedBytes = await readFile(attempt.artifactPath)
  const second = await fixture({ pendingAppStatus: "Accepted", shared: first.shared })

  await second.run()

  assert.equal(submissionCount([first, second], "app"), 1)
  assert.equal(second.calls.includes("temporary-zip"), false)
  assert.equal(
    second.rawCalls.some(
      ({ command, arguments_ }) =>
        command === "/usr/bin/codesign" &&
        arguments_.includes("--sign") &&
        !arguments_.at(-1).endsWith(".dmg"),
    ),
    false,
  )
  assert.equal(
    second.rawCalls.some(
      ({ command, arguments_ }) =>
        command === "/usr/bin/ditto" &&
        arguments_[0] === "-x" &&
        arguments_[2] === attempt.artifactPath,
    ),
    true,
  )
  assert.equal(submittedBytes.length > 0, true)
  await assert.rejects(access(attempt.directory))
})
