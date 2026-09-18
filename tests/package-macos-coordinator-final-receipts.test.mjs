import assert from "node:assert/strict"
import { access, mkdir, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import { validateFinalNotarizationEvidence } from "../scripts/macos/notarization-evidence.mjs"
import { createCoordinatorFixture } from "./support/macos-coordinator-fixtures.mjs"
import {
  appSubmissionId,
  dmgSubmissionId,
  notarizationAttempt,
  submissionCount,
} from "./support/macos-coordinator-support.mjs"
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

test("removes only generated storage remnants after successful recovery", async () => {
  const first = await fixture({ failure: "app-timeout" })
  await assert.rejects(first.run())
  const ownerId = "123e4567-e89b-42d3-a456-426614174002"
  const attempts = [
    ["app", appSubmissionId],
    ["dmg", dmgSubmissionId],
  ].map(([artifactKind, submissionId]) => ({
    ...notarizationAttempt(first, artifactKind),
    artifactKind,
    submissionId,
  }))
  const externalTarget = join(first.evidenceRoot, "external-remnant-target")
  const siblingSentinel = join(
    first.evidenceRoot,
    "v0.1.1",
    `.notarization-resume.json.${ownerId}.tmpx`,
  )
  const externalSentinel = join(
    first.evidenceRoot,
    `.notarization-submit.claim.${ownerId}.remove.keep`,
  )
  await writeFile(externalTarget, "retain external")
  await writeFile(siblingSentinel, "retain sibling")
  await writeFile(externalSentinel, "retain near match")
  for (const attempt of attempts) {
    await mkdir(attempt.evidenceDirectory, { recursive: true })
    await Promise.all([
      writeFile(
        join(attempt.evidenceDirectory, `.notarization-resume.json.${ownerId}.tmp`),
        "remove resume temp",
      ),
      writeFile(
        join(attempt.evidenceDirectory, `.notarization-final.json.${ownerId}.tmp`),
        "remove final temp",
      ),
      writeFile(
        join(attempt.evidenceDirectory, `.notary-${attempt.submissionId}.json.${ownerId}.tmp`),
        "remove log temp",
      ),
      writeFile(
        join(attempt.evidenceDirectory, `..notarization-submit.reclaim.${ownerId}.tmp`),
        "remove guard temp",
      ),
      writeFile(
        join(attempt.evidenceDirectory, `.notarization-submit.claim.${ownerId}.remove`),
        "remove claim tombstone",
      ),
      symlink(
        externalTarget,
        join(attempt.evidenceDirectory, `.notarization-submit.reclaim.${ownerId}.remove`),
      ),
    ])
  }

  const second = await fixture({ shared: first.shared })
  await second.run()

  assert.equal(submissionCount([first, second], "app"), 1)
  for (const attempt of attempts) {
    await validateFinalNotarizationEvidence({
      evidenceDir: attempt.evidenceDirectory,
      artifactKind: attempt.artifactKind,
    })
    assert.deepEqual(await readdir(attempt.evidenceDirectory), ["notarization-final.json"])
  }
  assert.equal(await readFile(externalTarget, "utf8"), "retain external")
  assert.equal(await readFile(siblingSentinel, "utf8"), "retain sibling")
  assert.equal(await readFile(externalSentinel, "utf8"), "retain near match")
  assert.equal(await readFile(`${first.releaseRoot}/caller-sentinel`, "utf8"), "retain")
  assert.equal(await readFile(`${first.evidenceRoot}/caller-sentinel`, "utf8"), "retain")
})
