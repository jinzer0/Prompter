import assert from "node:assert/strict"
import { access, mkdir, readdir, readFile, rm } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import { validateFinalNotarizationEvidence } from "../scripts/macos/notarization-evidence.mjs"
import { createCoordinatorFixture } from "./support/macos-coordinator-fixtures.mjs"
import { notarizationAttempt, submissionCount } from "./support/macos-coordinator-support.mjs"
import { createTemporaryDirectoryTracker } from "./support/macos-package-fixtures.mjs"

const temporaryDirectories = createTemporaryDirectoryTracker()
afterEach(() => temporaryDirectories.cleanup())

async function fixture(options) {
  return temporaryDirectories.track(await createCoordinatorFixture(options))
}

test("retains final receipts through candidate removal and replaces them on a fresh clean rerun", async () => {
  const first = await fixture()
  await first.run()
  const attempts = ["app", "dmg"].map((artifactKind) => ({
    artifactKind,
    ...notarizationAttempt(first, artifactKind),
  }))

  await rm(first.candidate, { recursive: true })
  for (const attempt of attempts) {
    await validateFinalNotarizationEvidence({
      evidenceDir: attempt.evidenceDirectory,
      artifactKind: attempt.artifactKind,
    })
  }

  const second = await fixture({ shared: first.shared })
  const result = await second.run()

  assert.deepEqual(result.artifacts, [
    "Prompter-0.1.1-mac-arm64.dmg",
    "Prompter-0.1.1-mac-arm64.zip",
    "SHA256SUMS",
  ])
  assert.equal(submissionCount([first, second], "app"), 2)
  assert.equal(submissionCount([first, second], "dmg"), 2)
  for (const attempt of attempts) {
    await validateFinalNotarizationEvidence({
      evidenceDir: attempt.evidenceDirectory,
      artifactKind: attempt.artifactKind,
    })
  }
  assert.equal(await readFile(`${first.releaseRoot}/caller-sentinel`, "utf8"), "retain")
  assert.equal(await readFile(`${first.evidenceRoot}/caller-sentinel`, "utf8"), "retain")
})

test("resumes Accepted active evidence after a final receipt write failure", async () => {
  const first = await fixture()
  const app = notarizationAttempt(first, "app")
  const finalReceiptPath = join(app.evidenceDirectory, "notarization-final.json")
  await mkdir(finalReceiptPath, { recursive: true })

  await assert.rejects(first.run())
  assert.equal(submissionCount([first], "app"), 1)
  await access(app.directory)
  assert.equal(
    JSON.parse(await readFile(join(app.evidenceDirectory, "notarization-resume.json"), "utf8"))
      .status,
    "Accepted",
  )
  assert.equal((await readdir(app.evidenceDirectory)).includes("notarization-resume.json"), true)
  assert.equal(
    (await readdir(app.evidenceDirectory)).some((name) => name.startsWith("notary-")),
    true,
  )
  await rm(finalReceiptPath, { recursive: true })

  const second = await fixture({ shared: first.shared })
  await second.run()

  assert.equal(submissionCount([first, second], "app"), 1)
  assert.equal(second.calls.includes("app-info"), true)
  assert.equal(second.calls.includes("app-log"), true)
  for (const artifactKind of ["app", "dmg"]) {
    const attempt = notarizationAttempt(second, artifactKind)
    await validateFinalNotarizationEvidence({
      evidenceDir: attempt.evidenceDirectory,
      artifactKind,
    })
    await assert.rejects(access(attempt.directory))
    assert.deepEqual(await readdir(attempt.evidenceDirectory), ["notarization-final.json"])
  }
})
