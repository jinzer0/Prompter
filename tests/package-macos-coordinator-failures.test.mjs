import assert from "node:assert/strict"
import { access, readFile, rm, stat, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import { createCoordinatorFixture } from "./support/macos-coordinator-fixtures.mjs"
import {
  assertNoLaterReleaseStages,
  assertSanitizedReleaseFailure,
  notarizationAttempt,
  syntheticSecret,
  writeRetainedResume,
} from "./support/macos-coordinator-support.mjs"
import { createTemporaryDirectoryTracker } from "./support/macos-package-fixtures.mjs"

const temporaryDirectories = createTemporaryDirectoryTracker()
afterEach(() => temporaryDirectories.cleanup())

async function fixture(options) {
  return temporaryDirectories.track(await createCoordinatorFixture(options))
}

test.each([
  ["stale-candidate", "app-sign"],
  ["candidate-race", "dmg-create"],
  ["keychain", "app-sign"],
  ["profile", "app-sign"],
  ["app-submit", "app-staple"],
  ["app-log", "app-staple"],
  ["app-staple", "dmg-create"],
  ["zip-extract", "dmg-create"],
  ["app-verify-2", "dmg-create"],
  ["dmg-create", "dmg-verify"],
  ["dmg-verify", "dmg-sign"],
  ["dmg-sign", "dmg-signature"],
  ["dmg-signature", "dmg-submit"],
  ["dmg-submit", "dmg-staple"],
  ["dmg-log", "dmg-staple"],
  ["dmg-staple", "dmg-gatekeeper"],
  ["dmg-gatekeeper", "attach"],
  ["attach", "checksum"],
  ["app-verify-3", "mounted-app-gatekeeper"],
  ["mounted-app-gatekeeper", "checksum"],
  ["detach", "checksum"],
  ["checksum", "post-checksum"],
])("fails closed at %s without later %s operations", async (failure, forbidden) => {
  const release = await fixture({ failure })
  await assert.rejects(release.run(), assertSanitizedReleaseFailure)
  assert.equal(release.calls.includes(forbidden), false)
  assertNoLaterReleaseStages(
    release.calls,
    ["stale-candidate", "candidate-race"].includes(failure) ? undefined : failure,
  )
  if (failure === "checksum")
    assert.equal(release.calls.filter((stage) => stage === "checksum").length, 1)
  if (["stale-candidate", "candidate-race"].includes(failure))
    assert.equal((await stat(release.candidate)).isDirectory(), true)
  else await assert.rejects(access(release.candidate))
  assert.equal(await readFile(join(release.releaseRoot, "caller-sentinel"), "utf8"), "retain")
  assert.equal(await readFile(join(release.evidenceRoot, "caller-sentinel"), "utf8"), "retain")
  for (const temporaryPath of release.observedTempRoots) {
    if (failure === "detach" && temporaryPath.includes("prompter-release-mount-")) continue
    await assert.rejects(access(temporaryPath))
  }
})

test.each([
  "In Progress",
  "Rejected",
])("blocks a %s accepted-pending app submission before downstream release mutation", async (pendingAppStatus) => {
  const release = await fixture({ pendingAppStatus })
  const attempt = await writeRetainedResume(release, "app", "zip")
  const resumePath = join(attempt.evidenceDirectory, "notarization-resume.json")
  const resume = JSON.parse(await readFile(resumePath, "utf8"))
  await writeFile(resumePath, JSON.stringify({ ...resume, status: "accepted" }))
  await assert.rejects(release.run())
  for (const stage of [
    "app-staple",
    "final-zip-app-gatekeeper",
    "final-zip",
    "dmg-create",
    "checksum",
  ])
    assert.equal(release.calls.includes(stage), false)
  assert.equal(
    release.calls
      .slice(release.calls.lastIndexOf("profile") + 1)
      .some((stage) => stage.startsWith("gatekeeper-")),
    false,
  )
  assert.equal(
    release.rawCalls.filter(
      ({ command, arguments_ }) => command === "/usr/bin/xcrun" && arguments_[1] === "submit",
    ).length,
    0,
  )
  if (pendingAppStatus === "In Progress") await access(attempt.artifactPath)
  else await assert.rejects(access(attempt.directory))
})

test("detaches the mounted app after a mounted-app Gatekeeper failure", async () => {
  const release = await fixture({ failure: "mounted-app-gatekeeper" })
  await assert.rejects(release.run(), assertSanitizedReleaseFailure)
  assert.equal(release.calls.includes("attach"), true)
  assert.equal(release.calls.includes("app-verify-3"), true)
  assert.equal(release.calls.includes("detach"), true)
  assert.equal(release.calls.includes("checksum"), false)
})

test("preserves a mounted image when detach cleanup fails and reports aggregate failure", async () => {
  const release = await fixture({ failure: "detach" })
  await assert.rejects(release.run(), (error) => error instanceof AggregateError)
  const mountDirectory = [...release.observedTempRoots].find((path) =>
    path.includes("prompter-release-mount-"),
  )
  assert.ok(mountDirectory)
  await access(mountDirectory)
  await rm(mountDirectory, { recursive: true, force: true })
})

test.each([
  "none",
  "multiple",
])("rejects %s exact signing identity before app mutation", async (identityListing) => {
  const release = await fixture({ identityListing })
  await assert.rejects(release.run(), /Exactly one signing identity is required/)
  assert.equal(release.calls.includes("app-sign"), false)
  assertNoLaterReleaseStages(release.calls)
  await assert.rejects(access(release.candidate))
})

test("blocks warning-bearing app receipts without leaking synthetic secrets", async () => {
  const release = await fixture({ warningLog: true })
  let error
  try {
    await release.run()
  } catch (caught) {
    error = caught
  }
  assert.ok(error instanceof Error)
  assert.equal(error.message.includes(syntheticSecret), false)
  assertNoLaterReleaseStages(release.calls, "app-log")
  assert.equal(release.calls.includes("app-staple"), false)
  assert.equal(release.calls.includes("dmg-create"), false)
  await assert.rejects(access(notarizationAttempt(release, "app").directory))
})

test("blocks an unknown live severity before downstream coordinator mutation", async () => {
  const release = await fixture({ notaryLog: { issues: [{ severity: "unexpected" }] } })
  await assert.rejects(release.run(), assertSanitizedReleaseFailure)
  assertNoLaterReleaseStages(release.calls, "app-log")
  for (const stage of [
    "app-staple",
    "final-zip-app-gatekeeper",
    "final-zip",
    "dmg-create",
    "checksum",
  ])
    assert.equal(release.calls.includes(stage), false)
  assert.equal(
    release.rawCalls.some(
      ({ command, arguments_ }) => command === "/usr/bin/xcrun" && arguments_[0] === "stapler",
    ),
    false,
  )
})

test.each([
  "profile",
  "candidate-race",
])("preserves a retained unknown app attempt when %s fails before recovery starts", async (failure) => {
  const release = await fixture({ failure })
  const attempt = await writeRetainedResume(release, "app", "retained")

  await assert.rejects(release.run())

  await access(attempt.artifactPath)
  assert.equal(
    release.rawCalls.some(
      ({ command, arguments_ }) =>
        command === "/usr/bin/xcrun" && ["submit", "info", "log"].includes(arguments_[1]),
    ),
    false,
  )
})
