import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { access, mkdir, readdir, readFile, symlink, unlink, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import { createCoordinatorFixture } from "./support/macos-coordinator-fixtures.mjs"
import {
  appSubmissionId,
  notarizationAttempt,
  submissionCount,
  writeRetainedResume,
} from "./support/macos-coordinator-support.mjs"
import { createTemporaryDirectoryTracker } from "./support/macos-package-fixtures.mjs"

const temporaryDirectories = createTemporaryDirectoryTracker()
afterEach(() => temporaryDirectories.cleanup())

async function fixture(options) {
  return temporaryDirectories.track(await createCoordinatorFixture(options))
}

test.each([
  "dmg-timeout",
  "dmg-log",
])("resumes the exact retained DMG submission after %s and derives final assets from it", async (failure) => {
  const first = await fixture({ failure })
  await assert.rejects(first.run())
  const attempt = notarizationAttempt(first, "dmg")
  const submittedBytes = await readFile(attempt.artifactPath)
  const second = await fixture({ pendingDmgStatus: "Accepted", shared: first.shared })
  const result = await second.run()
  const finalDmg = join(second.candidate, "Prompter-0.1.1-mac-arm64.dmg")
  assert.equal(submissionCount([first, second], "app"), 1)
  assert.equal(submissionCount([first, second], "dmg"), 1)
  assert.equal(second.calls.includes("dmg-info"), true)
  assert.equal(second.calls.includes("dmg-log"), true)
  assert.equal(
    second.rawCalls.some(
      ({ command, arguments_ }) => command === "/usr/bin/codesign" && arguments_.includes("--sign"),
    ),
    false,
  )
  assert.equal(
    second.rawCalls.some(
      ({ command, arguments_ }) =>
        command === "/usr/bin/xcrun" &&
        arguments_[0] === "stapler" &&
        arguments_[1] === "staple" &&
        arguments_[2] === finalDmg,
    ),
    true,
  )
  assert.deepEqual(await readFile(finalDmg), submittedBytes)
  assert.equal(
    second.rawCalls.some(
      ({ command, arguments_, options }) =>
        command === "/usr/bin/ditto" &&
        arguments_[0] === "-c" &&
        arguments_.at(-1).endsWith(".zip") &&
        options.cwd?.includes("prompter-release-mount-"),
    ),
    true,
  )
  await assert.rejects(access(attempt.directory))
  assert.deepEqual((await readdir(second.candidate)).sort(), result.artifacts)
  assert.equal(second.calls.at(-1), "checksum")
})

test("preserves submitted DMG bytes when a mutating staple is followed by validate exhaustion", async () => {
  const first = await fixture({ failure: "dmg-mutating-validate-exhaustion" })
  await assert.rejects(first.run(), /Notarization command failed/)
  const attempt = notarizationAttempt(first, "dmg")
  const submittedBytes = await readFile(attempt.artifactPath)
  const acceptedEvidence = JSON.parse(
    await readFile(join(attempt.evidenceDirectory, "notarization-resume.json"), "utf8"),
  )
  assert.equal(
    acceptedEvidence.artifactSha256,
    createHash("sha256").update(submittedBytes).digest("hex"),
  )
  assert.equal(submittedBytes.includes(Buffer.from("-stapled")), false)
  assert.equal(
    first.rawCalls
      .filter(
        ({ command, arguments_ }) =>
          command === "/usr/bin/xcrun" &&
          arguments_[0] === "stapler" &&
          arguments_[1] === "staple" &&
          arguments_[2].endsWith(".dmg"),
      )
      .every(({ arguments_ }) => arguments_[2] !== attempt.artifactPath),
    true,
  )
  const second = await fixture({ pendingDmgStatus: "Accepted", shared: first.shared })

  const result = await second.run()

  assert.equal(submissionCount([first, second], "dmg"), 1)
  assert.deepEqual(
    await readFile(join(second.candidate, "Prompter-0.1.1-mac-arm64.dmg")),
    submittedBytes,
  )
  assert.equal(second.calls.includes("dmg-staple"), true)
  await assert.rejects(access(attempt.directory))
  assert.deepEqual((await readdir(second.candidate)).sort(), result.artifacts)
})

test.each([
  "stale",
  "missing",
  "malformed",
  "hash-mismatch",
  "symlinked",
  "escaped",
])("rejects a %s retained app attempt before candidate mutation or Apple recovery", async (mode) => {
  const release = await fixture()
  const attempt = notarizationAttempt(release, "app")
  const outsidePath = join(release.shared.root, `${mode}-outside.zip`)
  if (mode === "escaped") {
    const outsideDirectory = join(release.shared.root, "escaped-attempt")
    await mkdir(outsideDirectory)
    await writeFile(join(outsideDirectory, "Prompter-0.1.1-mac-arm64.zip"), "outside")
    await mkdir(attempt.evidenceDirectory, { recursive: true })
    await symlink(outsideDirectory, attempt.directory)
    await writeFile(
      join(attempt.evidenceDirectory, "notarization-resume.json"),
      JSON.stringify({
        submissionId: appSubmissionId,
        status: "unknown",
        artifactKind: "app",
        artifactSha256: createHash("sha256").update("outside").digest("hex"),
      }),
    )
    await writeFile(outsidePath, "outside-sentinel")
  } else if (mode === "stale") {
    await mkdir(attempt.directory, { recursive: true })
    await writeFile(attempt.artifactPath, "stale")
    await writeFile(outsidePath, "outside-sentinel")
  } else if (mode === "symlinked") {
    await mkdir(attempt.directory, { recursive: true })
    await writeFile(outsidePath, "outside")
    await symlink(outsidePath, attempt.artifactPath)
    await writeFile(
      join(attempt.evidenceDirectory, "notarization-resume.json"),
      JSON.stringify({
        submissionId: appSubmissionId,
        status: "unknown",
        artifactKind: "app",
        artifactSha256: createHash("sha256").update("outside").digest("hex"),
      }),
    )
  } else {
    await writeRetainedResume(release, "app", "retained")
    if (mode === "missing") await unlink(attempt.artifactPath)
    else if (mode === "malformed")
      await writeFile(join(attempt.evidenceDirectory, "notarization-resume.json"), "{}")
    else await writeFile(attempt.artifactPath, "different")
    await writeFile(outsidePath, "outside-sentinel")
  }
  await assert.rejects(release.run(), /Invalid retained notarization attempt/)
  assert.equal(release.calls.includes("native-copied"), false)
  assert.equal(
    release.rawCalls.some(
      ({ command, arguments_ }) =>
        command === "/usr/bin/xcrun" && ["submit", "info", "log"].includes(arguments_[1]),
    ),
    false,
  )
  await assert.rejects(access(release.candidate))
  await assert.rejects(access(attempt.directory))
  assert.equal(
    await readFile(outsidePath, "utf8"),
    mode === "symlinked" ? "outside" : "outside-sentinel",
  )
})
