import assert from "node:assert/strict"
import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import { SigningInputError } from "../scripts/macos/signing-discovery.mjs"
import { createCoordinatorFixture } from "./support/macos-coordinator-fixtures.mjs"
import { notarizationAttempt, submissionCount } from "./support/macos-coordinator-support.mjs"
import {
  addIgnoredResourceMachO,
  addSecondRuntimeNativeCandidate,
  removeExpectedElectronTarget,
} from "./support/macos-coordinator-target-mutations.mjs"
import { createTemporaryDirectoryTracker } from "./support/macos-package-fixtures.mjs"

const temporaryDirectories = createTemporaryDirectoryTracker()
afterEach(() => temporaryDirectories.cleanup())

async function fixture(options) {
  return temporaryDirectories.track(await createCoordinatorFixture(options))
}

function manifestMismatch(error) {
  assert.ok(error instanceof SigningInputError)
  assert.equal(error.message, "App signing target manifest mismatch")
  assert.equal(error.artifactKind, "app")
  assert.equal(error.discardEvidence, true)
  return true
}

function assertAppPublicationBlocked(release) {
  for (const stage of ["app-staple", "final-zip", "dmg-create", "checksum"])
    assert.equal(release.calls.includes(stage), false)
}

test.each([
  ["missing expected target", removeExpectedElectronTarget],
  ["second runtime native candidate", addSecondRuntimeNativeCandidate],
  ["ignored-resource Mach-O", addIgnoredResourceMachO],
])("discards retained app evidence when its restored tree has a %s", async (_label, mutation) => {
  const first = await fixture({ failure: "app-timeout" })
  await assert.rejects(first.run())
  const app = notarizationAttempt(first, "app")
  const siblingDirectory = join(first.evidenceRoot, "v0.1.1", "dmg")
  await mkdir(siblingDirectory, { recursive: true })
  await writeFile(join(siblingDirectory, "sibling-sentinel"), "retain")

  const second = await fixture({
    pendingAppStatus: "Accepted",
    restoredZipAppMutation: mutation,
    shared: first.shared,
  })

  await assert.rejects(second.run(), manifestMismatch)

  assert.equal(submissionCount([first, second], "app"), 1)
  assertAppPublicationBlocked(second)
  await assert.rejects(access(app.evidenceDirectory))
  assert.equal(await readFile(join(siblingDirectory, "sibling-sentinel"), "utf8"), "retain")
  assert.equal(await readFile(join(first.releaseRoot, "caller-sentinel"), "utf8"), "retain")
  assert.equal(await readFile(join(first.evidenceRoot, "caller-sentinel"), "utf8"), "retain")

  const third = await fixture({ shared: first.shared })
  await third.run()

  assert.equal(submissionCount([first, second, third], "app"), 2)
  assert.equal(submissionCount([first, second, third], "dmg"), 1)
})

test("blocks DMG and checksum publication when the final ZIP app tree has an unexpected target", async () => {
  const release = await fixture({ finalZipAppMutation: addIgnoredResourceMachO })

  await assert.rejects(release.run(), manifestMismatch)

  assert.equal(release.calls.includes("final-zip"), true)
  assert.equal(release.calls.includes("zip-extract"), true)
  assert.equal(release.calls.includes("app-verify-2"), false)
  assert.equal(release.calls.includes("final-zip-app-gatekeeper"), false)
  assert.equal(release.calls.includes("dmg-create"), false)
  assert.equal(release.calls.includes("checksum"), false)
  await assert.rejects(access(release.candidate))
  assert.equal(await readFile(join(release.releaseRoot, "caller-sentinel"), "utf8"), "retain")
  assert.equal(await readFile(join(release.evidenceRoot, "caller-sentinel"), "utf8"), "retain")
})

test("detaches and blocks Gatekeeper and checksum when the mounted app tree has an unexpected target", async () => {
  const release = await fixture({ mountedDmgAppMutation: addIgnoredResourceMachO })

  await assert.rejects(release.run(), manifestMismatch)

  assert.equal(release.calls.includes("attach"), true)
  assert.equal(release.calls.includes("mounted-app-stapler-validate"), true)
  assert.equal(release.calls.includes("app-verify-3"), false)
  assert.equal(release.calls.includes("mounted-app-gatekeeper"), false)
  assert.equal(release.calls.includes("detach"), true)
  assert.equal(release.calls.includes("checksum"), false)
  await assert.rejects(access(release.candidate))
  assert.equal(await readFile(join(release.releaseRoot, "caller-sentinel"), "utf8"), "retain")
  assert.equal(await readFile(join(release.evidenceRoot, "caller-sentinel"), "utf8"), "retain")
})
