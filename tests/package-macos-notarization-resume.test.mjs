import assert from "node:assert/strict"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import { submitAndWait } from "../scripts/macos/notarization.mjs"
import {
  createNotarizationArtifact as artifact,
  createNotarizationDirectoryTracker,
  createNotaryRunner,
  notarizationSubmissionId as id,
  notarizationProfile as profile,
  notarizationSecretSentinel as sentinel,
  sha256,
} from "./support/macos-notarization-fixtures.mjs"

const temporaryDirectories = createNotarizationDirectoryTracker()
afterEach(() => temporaryDirectories.cleanup())

function evidence() {
  return temporaryDirectories.create()
}

test("persists an accepted submission before log retrieval and resumes it without a second submit", async () => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.zip")
  let logFails = true
  const { calls, runFile } = createNotaryRunner({
    info: { id, status: "Accepted" },
    fail: (_command, arguments_) =>
      logFails && arguments_[1] === "log" ? new Error(sentinel) : undefined,
  })

  await assert.rejects(
    submitAndWait({ artifactPath, profile, evidenceDir: root, runFile }),
    /Notarization command failed/,
  )
  assert.deepEqual(JSON.parse(await readFile(join(root, "notarization-resume.json"), "utf8")), {
    submissionId: id,
    status: "accepted",
    artifactKind: "app",
    artifactSha256: sha256("artifact"),
  })

  logFails = false
  const accepted = await submitAndWait({ artifactPath, profile, evidenceDir: root, runFile })

  assert.equal(accepted.status, "Accepted")
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "submit").length, 1)
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "info").length, 1)
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "log").length, 2)
})

test("keeps an accepted-pending submission unresolved when refreshed Apple status is In Progress", async () => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.zip")
  let logFails = true
  const { calls, runFile } = createNotaryRunner({
    info: { id, status: "In Progress" },
    fail: (_command, arguments_) =>
      logFails && arguments_[1] === "log" ? new Error(sentinel) : undefined,
  })

  await assert.rejects(submitAndWait({ artifactPath, profile, evidenceDir: root, runFile }))
  logFails = false
  const resumed = await submitAndWait({ artifactPath, profile, evidenceDir: root, runFile })

  assert.equal(resumed.status, "accepted")
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "submit").length, 1)
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "info").length, 1)
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "log").length, 1)
})

test("rejects an accepted-pending submission when refreshed Apple status is Rejected without resubmitting", async () => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.zip")
  let logFails = true
  const { calls, runFile } = createNotaryRunner({
    info: { id, status: "Rejected" },
    fail: (_command, arguments_) =>
      logFails && arguments_[1] === "log" ? new Error(sentinel) : undefined,
  })

  await assert.rejects(submitAndWait({ artifactPath, profile, evidenceDir: root, runFile }))
  logFails = false
  await assert.rejects(
    submitAndWait({ artifactPath, profile, evidenceDir: root, runFile }),
    /Notarization submission was not accepted/,
  )

  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "submit").length, 1)
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "info").length, 1)
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "log").length, 1)
})

test("rejects accepted resume evidence with a mismatched artifact kind before notary work", async () => {
  const root = await evidence()
  const dmgPath = await artifact(root, "Prompter.dmg")
  await writeFile(
    join(root, "notarization-resume.json"),
    JSON.stringify({
      submissionId: id,
      status: "Accepted",
      logPath: `notary-${id}.json`,
      artifactKind: "app",
      artifactSha256: sha256("artifact"),
    }),
  )
  await writeFile(
    join(root, `notary-${id}.json`),
    JSON.stringify({
      submissionId: id,
      artifactKind: "app",
      artifactSha256: sha256("artifact"),
      issues: [],
    }),
  )
  const { calls, runFile } = createNotaryRunner()

  await assert.rejects(
    submitAndWait({ artifactPath: dmgPath, profile, evidenceDir: root, runFile }),
    /Notarization resume does not match artifact/,
  )
  assert.equal(calls.length, 0)
})

test("rejects accepted resume evidence with a mismatched artifact hash before notary work", async () => {
  const root = await evidence()
  const dmgPath = await artifact(root, "Prompter.dmg")
  await writeFile(
    join(root, "notarization-resume.json"),
    JSON.stringify({
      submissionId: id,
      status: "Accepted",
      logPath: `notary-${id}.json`,
      artifactKind: "dmg",
      artifactSha256: sha256("different bytes"),
    }),
  )
  const { calls, runFile } = createNotaryRunner()

  await assert.rejects(
    submitAndWait({ artifactPath: dmgPath, profile, evidenceDir: root, runFile }),
    /Notarization resume does not match artifact/,
  )
  assert.equal(calls.length, 0)
})
