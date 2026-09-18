import assert from "node:assert/strict"
import { access, readFile } from "node:fs/promises"
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
  ["app", "malformed", {}, /Invalid notarization submission/],
  ["app", "service-error", { error: "synthetic failure" }, /service rejected/],
  ["dmg", "malformed", {}, /Invalid notarization submission/],
  ["dmg", "service-error", { error: "synthetic failure" }, /service rejected/],
])("retains and resumes an unknown %s attempt after zero-exit %s info", async (artifactKind, _failureKind, response, rejection) => {
  const first = await fixture({
    notaryInfo: (kind) => (kind === artifactKind ? response : undefined),
  })

  await assert.rejects(first.run(), rejection)

  const attempt = notarizationAttempt(first, artifactKind)
  const resume = JSON.parse(
    await readFile(join(attempt.evidenceDirectory, "notarization-resume.json"), "utf8"),
  )
  assert.equal(submissionCount([first], artifactKind), 1)
  assert.equal(resume.status, "unknown")
  await access(attempt.artifactPath)

  const second = await fixture({ shared: first.shared })
  await second.run()

  assert.equal(submissionCount([first, second], artifactKind), 1)
  assert.equal(second.calls.includes(`${artifactKind}-info`), true)
  assert.equal(second.calls.includes(`${artifactKind}-log`), true)
  await assert.rejects(access(attempt.directory))
})
