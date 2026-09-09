import assert from "node:assert/strict"
import { access, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import {
  assessGatekeeper,
  fetchNotaryLog,
  preflightNotaryProfile,
  stapleAndValidate,
  submitAndWait,
} from "../scripts/macos/notarization.mjs"
import {
  createNotarizationArtifact as artifact,
  createNotarizationDirectoryTracker,
  createNotaryRunner,
  notarizationSubmissionId as id,
  notarizationProfile as profile,
  notarizationSecretSentinel as sentinel,
  sha256,
  unsafeIssueSets,
} from "./support/macos-notarization-fixtures.mjs"

const temporaryDirectories = createNotarizationDirectoryTracker()
afterEach(() => temporaryDirectories.cleanup())

const evidence = () => temporaryDirectories.create()

test("evaluates a notary runner failure callback once per command", async () => {
  let evaluations = 0
  const { runFile } = createNotaryRunner({
    fail: () => {
      evaluations += 1
      return new Error("synthetic failure")
    },
  })

  await assert.rejects(preflightNotaryProfile({ profile, runFile }), /Notarization command failed/)

  assert.equal(evaluations, 1)
})

test("uses exact option allowlists and rejects raw app submission or ZIP stapling before any runner call", async () => {
  const calls = []
  const runFile = async () => calls.push("called")
  const root = await evidence()
  const rejected = [
    preflightNotaryProfile({ profile, runFile, aliasProfile: sentinel }),
    fetchNotaryLog({ submissionId: id, profile, evidenceDir: root, runFile, extra: sentinel }),
    submitAndWait({ artifactPath: "Prompter.app", profile, evidenceDir: root, runFile }),
    stapleAndValidate({
      artifactPath: "Prompter-0.1.1-mac-arm64.zip",
      artifactKind: "app",
      runFile,
    }),
    assessGatekeeper({ artifactPath: "Prompter.zip", artifactKind: "dmg", runFile }),
  ]
  for (const attempt of rejected) await assert.rejects(attempt)
  assert.equal(calls.length, 0)
})

test("requires valid profile JSON and an Accepted reviewed receipt", async () => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.zip")
  for (const response of ["", "[]", '{"statusCode":401}', `{"error":"${sentinel}"}`]) {
    await assert.rejects(
      preflightNotaryProfile({ profile, runFile: async () => ({ stdout: response }) }),
      /Invalid notarization profile response|Notarization service rejected the request/,
    )
  }
  for (const log of [
    { issues: [{ severity: "warning" }] },
    { issues: [{ severity: "error" }] },
    { issues: "bad" },
  ]) {
    const { calls, runFile } = createNotaryRunner({ log })
    const logEvidence = await evidence()
    await assert.rejects(
      submitAndWait({ artifactPath, profile, evidenceDir: logEvidence, runFile }),
      /Notarization log blocks publication|Invalid notarization log/,
    )
    assert.equal(
      calls.some(({ arguments_ }) => arguments_[1] === "stapler"),
      false,
    )
  }
  const { calls, runFile } = createNotaryRunner()
  const accepted = await submitAndWait({
    artifactPath,
    profile,
    evidenceDir: root,
    runFile,
  })
  assert.deepEqual(accepted, {
    submissionId: id,
    status: "Accepted",
    logPath: `notary-${id}.json`,
    artifactKind: "app",
    artifactSha256: sha256("artifact"),
  })
  assert.deepEqual(JSON.parse(await readFile(join(root, accepted.logPath), "utf8")), {
    submissionId: id,
    artifactKind: "app",
    artifactSha256: sha256("artifact"),
    issues: [],
  })
  assert.equal(
    (await readFile(join(root, "notarization-resume.json"), "utf8")).includes(sentinel),
    false,
  )
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "submit").length, 1)
})

test.each([
  ["empty", []],
  ["lowercase info", [{ severity: "info" }]],
])("accepts %s live notarization issues", async (_label, issues) => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.zip")
  const { runFile } = createNotaryRunner({ log: { issues } })

  await submitAndWait({ artifactPath, profile, evidenceDir: root, runFile })

  assert.deepEqual(
    JSON.parse(await readFile(join(root, `notary-${id}.json`), "utf8")).issues,
    issues,
  )
})

test("accepts an Apple success log with null issues as a sanitized empty issue list", async () => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.zip")
  const { runFile } = createNotaryRunner({
    log: {
      logFormatVersion: 1,
      jobId: id,
      status: "Accepted",
      statusSummary: "Ready for distribution",
      statusCode: 0,
      archiveFilename: "Prompter.zip",
      uploadDate: "2026-09-09T00:00:00.000Z",
      sha256: sha256("artifact"),
      ticketContents: [],
      issues: null,
    },
  })

  await submitAndWait({ artifactPath, profile, evidenceDir: root, runFile })

  assert.deepEqual(JSON.parse(await readFile(join(root, `notary-${id}.json`), "utf8")), {
    submissionId: id,
    artifactKind: "app",
    artifactSha256: sha256("artifact"),
    issues: [],
  })
})

test.each(
  unsafeIssueSets,
)("rejects %s from a live notarization log before accepted evidence persists", async (_label, issues) => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.zip")
  const { calls, runFile } = createNotaryRunner({ log: { issues } })

  await assert.rejects(
    submitAndWait({ artifactPath, profile, evidenceDir: root, runFile }),
    /Invalid notarization log/,
  )

  await assert.rejects(access(join(root, `notary-${id}.json`)))
  assert.equal(
    calls.some(({ arguments_ }) => arguments_[1] === "stapler"),
    false,
  )
})

test("fails closed for malformed, unauthorized, Invalid, and Rejected submission or resume states", async () => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.dmg")
  for (const submit of [
    "bad",
    { statusCode: 401 },
    { id, status: "Invalid" },
    { id, status: "Rejected" },
  ]) {
    const { calls, runFile } = createNotaryRunner({ submit })
    await assert.rejects(submitAndWait({ artifactPath, profile, evidenceDir: root, runFile }))
    assert.equal(
      calls.some(({ arguments_ }) => arguments_[1] === "log"),
      false,
    )
  }
  await writeFile(
    join(root, "notarization-resume.json"),
    JSON.stringify({ submissionId: "not-a-uuid", status: "unknown" }),
  )
  await assert.rejects(
    submitAndWait({
      artifactPath,
      profile,
      evidenceDir: root,
      runFile: createNotaryRunner().runFile,
    }),
    /Invalid resume state/,
  )
})

test("fails closed without a receipt when submission JSON has no valid UUID", async () => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.zip")
  const { calls, runFile } = createNotaryRunner({
    submit: { diagnostic: sentinel, status: "In Progress" },
  })

  await assert.rejects(
    submitAndWait({ artifactPath, profile, evidenceDir: root, runFile }),
    (error) => error instanceof Error && error.message === "Invalid notarization submission",
  )

  await assert.rejects(access(join(root, "notarization-resume.json")))
  assert.equal(JSON.stringify(calls).includes(sentinel), false)
})
