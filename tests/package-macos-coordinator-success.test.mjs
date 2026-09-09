import assert from "node:assert/strict"
import { access, stat } from "node:fs/promises"

import { afterEach, test } from "vitest"

import { createCoordinatorFixture } from "./support/macos-coordinator-fixtures.mjs"
import {
  assertNoLaterReleaseStages,
  assertSanitizedReleaseFailure,
  releaseStages,
  reservationBarrier,
} from "./support/macos-coordinator-support.mjs"
import { createTemporaryDirectoryTracker } from "./support/macos-package-fixtures.mjs"

const temporaryDirectories = createTemporaryDirectoryTracker()
afterEach(() => temporaryDirectories.cleanup())

async function fixture(options) {
  return temporaryDirectories.track(await createCoordinatorFixture(options))
}

test("keeps the coordinator's two-submission ordering and cleanup boundaries explicit", async () => {
  const release = await fixture()
  const result = await release.run()
  assert.deepEqual(result.artifacts, [
    "Prompter-0.1.1-mac-arm64.dmg",
    "Prompter-0.1.1-mac-arm64.zip",
    "SHA256SUMS",
  ])
  const submitted = release.rawCalls
    .filter(({ command, arguments_ }) => command === "/usr/bin/xcrun" && arguments_[1] === "submit")
    .map(({ arguments_ }) => arguments_[2])
  assert.equal(submitted.length, 2)
  const dmgSigning = release.rawCalls.find(
    ({ command, arguments_ }) =>
      command === "/usr/bin/codesign" &&
      arguments_.at(-1).endsWith(".dmg") &&
      arguments_[0] === "--force",
  )
  assert.deepEqual(dmgSigning.arguments_.slice(0, 6), [
    "--force",
    "--timestamp",
    "--options",
    "runtime",
    "--sign",
    "Developer ID Application: SYNTHETIC_IDENTITY",
  ])
  const firstFinalZip = release.rawCalls.findIndex(
    ({ command, arguments_ }) =>
      command === "/usr/bin/ditto" &&
      arguments_[0] === "-c" &&
      arguments_.at(-1).includes("v0.1.1") &&
      !arguments_.at(-1).includes("notarization-attempt"),
  )
  const appStaple = release.rawCalls.findIndex(
    ({ command, arguments_ }) =>
      command === "/usr/bin/xcrun" &&
      arguments_[0] === "stapler" &&
      arguments_[2]?.endsWith(".app"),
  )
  const extract = release.rawCalls.findIndex(
    ({ command, arguments_ }) => command === "/usr/bin/ditto" && arguments_[0] === "-x",
  )
  const dmgCreate = release.rawCalls.findIndex(
    ({ command, arguments_ }) => command === "/usr/bin/hdiutil" && arguments_[0] === "create",
  )
  const hash = release.rawCalls.findIndex(({ command }) => command === "/usr/bin/shasum")
  assert.equal(
    appStaple < firstFinalZip && firstFinalZip < extract && extract < dmgCreate && dmgCreate < hash,
    true,
  )
})

test("rejects pre-notarization Gatekeeper and orders final artifact checks", async () => {
  const release = await fixture()
  await release.run()
  assert.equal(release.calls.indexOf("native-copied") < release.calls.indexOf("app-sign"), true)
  const firstNotarySubmission = release.rawCalls.findIndex(
    ({ command, arguments_ }) => command === "/usr/bin/xcrun" && arguments_[1] === "submit",
  )
  assert.equal(firstNotarySubmission >= 0, true)
  assert.deepEqual(
    release.rawCalls
      .slice(0, firstNotarySubmission)
      .filter(({ command }) => command.endsWith("spctl")),
    [],
  )
  assert.equal(release.calls.includes("pre-notarization-gatekeeper"), false)
  assert.equal(release.rawCalls.filter(({ command }) => command.endsWith("spctl")).length, 3)
  const ordered = releaseStages.map((stage) => release.calls.indexOf(stage))
  assert.equal(
    ordered.every((index) => index >= 0),
    true,
  )
  assert.equal(
    ordered.every((index, position) => position === 0 || ordered[position - 1] < index),
    true,
    JSON.stringify(releaseStages.map((stage, position) => [stage, ordered[position]])),
  )
  const submissions = release.rawCalls
    .filter(({ command, arguments_ }) => command === "/usr/bin/xcrun" && arguments_[1] === "submit")
    .map(({ arguments_ }) => arguments_[2])
  assert.equal(submissions.length, 2)
  assert.equal(submissions[0] === submissions[1], false)
  for (const temporaryRoot of release.observedTempRoots) await assert.rejects(access(temporaryRoot))
})

test("atomically reserves a candidate before loser assembly, Apple work, evidence, and final mutations", async () => {
  const barrier = reservationBarrier()
  const first = await fixture({ label: "first", reservationBarrier: barrier })
  const second = await fixture({
    label: "second",
    reservationBarrier: barrier,
    shared: first.shared,
  })
  const outcomes = await Promise.allSettled([first.run(), second.run()])
  const winnerIndex = outcomes.findIndex(({ status }) => status === "fulfilled")
  const loser = [first, second][winnerIndex === 0 ? 1 : 0]
  const winner = [first, second][winnerIndex]
  assert.equal(winnerIndex >= 0, true)
  assert.equal(outcomes.filter(({ status }) => status === "rejected").length, 1)
  assert.equal(winner.calls.includes("app-sign"), true)
  assert.equal((await stat(winner.candidate)).isDirectory(), true)
  assert.equal(loser.observedTempRoots.size, 0)
  assert.equal(loser.calls.includes("native-copied"), false)
  assert.equal(loser.calls.includes("profile"), true)
  assertNoLaterReleaseStages(loser.calls)
  assert.equal(
    loser.rawCalls.some(
      ({ command, arguments_ }) =>
        command === "/usr/bin/xcrun" && ["submit", "info", "log"].includes(arguments_[1]),
    ),
    false,
  )
})

test("completes every non-mutating preflight before reserving the candidate directory", async () => {
  const release = await fixture({ failure: "profile" })
  await assert.rejects(release.run(), assertSanitizedReleaseFailure)
  assert.equal(release.calls.includes("keychain"), true)
  assert.equal(release.calls.includes("identity"), true)
  assert.equal(release.calls.includes("profile"), true)
  assert.equal(release.candidateExistsDuringProfile, false)
  assertNoLaterReleaseStages(release.calls)
  await assert.rejects(access(release.candidate))
})
