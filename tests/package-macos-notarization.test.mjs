import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import {
  assessGatekeeper,
  fetchNotaryLog,
  preflightNotaryProfile,
  stapleAndValidate,
  submitAndWait,
} from "../scripts/macos/notarization.mjs"

const profile = "SYNTHETIC_PROFILE"
const id = "123e4567-e89b-42d3-a456-426614174000"
const sentinel = "SYNTHETIC_SECRET_SENTINEL"
const temporaryDirectories = []

afterEach(async () =>
  Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  ),
)

async function evidence() {
  const path = await mkdtemp(join(tmpdir(), "prompter-notary-test-"))
  temporaryDirectories.push(path)
  return path
}

function notaryRunner({
  submit = { id, status: "Accepted" },
  log = { issues: [] },
  info = { id, status: "In Progress" },
  fail,
} = {}) {
  const calls = []
  const runFile = async (command, arguments_) => {
    calls.push({ command, arguments_ })
    if (fail?.(command, arguments_, calls.length)) throw fail(command, arguments_, calls.length)
    if (command === "spctl") return { stdout: "", stderr: "" }
    if (arguments_[1] === "history") return { stdout: "{}" }
    if (arguments_[1] === "submit") return { stdout: JSON.stringify(submit) }
    if (arguments_[1] === "log") return { stdout: JSON.stringify(log) }
    if (arguments_[1] === "info") return { stdout: JSON.stringify(info) }
    return { stdout: "", stderr: "" }
  }
  return { calls, runFile }
}

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

test("requires valid profile JSON, Accepted status, and a warning-free reviewed receipt", async () => {
  const root = await evidence()
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
    const { calls, runFile } = notaryRunner({ log })
    await assert.rejects(
      submitAndWait({ artifactPath: "Prompter.zip", profile, evidenceDir: root, runFile }),
      /Notarization log blocks publication|Invalid notarization log/,
    )
    assert.equal(
      calls.some(({ arguments_ }) => arguments_[1] === "stapler"),
      false,
    )
  }
  const { calls, runFile } = notaryRunner()
  const accepted = await submitAndWait({
    artifactPath: "Prompter.zip",
    profile,
    evidenceDir: root,
    runFile,
  })
  assert.deepEqual(accepted, { submissionId: id, status: "Accepted", logPath: `notary-${id}.json` })
  assert.deepEqual(JSON.parse(await readFile(join(root, accepted.logPath), "utf8")), {
    submissionId: id,
    issues: [],
  })
  assert.equal(
    (await readFile(join(root, "notarization-resume.json"), "utf8")).includes(sentinel),
    false,
  )
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "submit").length, 1)
})

test("fails closed for malformed, unauthorized, Invalid, and Rejected submission or resume states", async () => {
  const root = await evidence()
  for (const submit of [
    "bad",
    { statusCode: 401 },
    { id, status: "Invalid" },
    { id, status: "Rejected" },
  ]) {
    const { calls, runFile } = notaryRunner({ submit })
    await assert.rejects(
      submitAndWait({ artifactPath: "Prompter.dmg", profile, evidenceDir: root, runFile }),
    )
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
      artifactPath: "Prompter.dmg",
      profile,
      evidenceDir: root,
      runFile: notaryRunner().runFile,
    }),
    /Invalid notarization submission/,
  )
})

test("stores only a UUID unknown state on a real timeout and resumes without resubmitting", async () => {
  const root = await evidence()
  let timedOut = true
  const { calls, runFile } = notaryRunner({
    fail: (_command, arguments_) => {
      if (timedOut && arguments_[1] === "submit")
        return Object.assign(new Error(sentinel), {
          code: "ETIMEDOUT",
          stdout: JSON.stringify({ id, status: sentinel }),
          stderr: sentinel,
        })
      return undefined
    },
  })
  const unknown = await submitAndWait({
    artifactPath: "Prompter.zip",
    profile,
    evidenceDir: root,
    runFile,
  })
  assert.deepEqual(unknown, { submissionId: id, status: "unknown" })
  assert.equal(
    (await readFile(join(root, "notarization-resume.json"), "utf8")).includes(sentinel),
    false,
  )
  timedOut = false
  const resumed = await submitAndWait({
    artifactPath: "Prompter.zip",
    profile,
    evidenceDir: root,
    runFile,
  })
  assert.deepEqual(resumed, unknown)
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "submit").length, 1)
  await assert.rejects(
    submitAndWait({
      artifactPath: "Prompter.zip",
      profile,
      evidenceDir: await evidence(),
      runFile: notaryRunner({
        fail: (_command, arguments_) =>
          arguments_[1] === "submit"
            ? Object.assign(new Error(sentinel), { signal: "SIGBANANA" })
            : undefined,
      }).runFile,
    }),
    /Notarization command failed/,
  )
})

test("re-fetches a tampered accepted receipt without resubmission and keeps errors redacted", async () => {
  const root = await evidence()
  await writeFile(
    join(root, "notarization-resume.json"),
    JSON.stringify({ submissionId: id, status: "Accepted", logPath: `notary-${id}.json` }),
  )
  await writeFile(
    join(root, `notary-${id}.json`),
    JSON.stringify({ submissionId: id, issues: [{ severity: "warning" }], secret: sentinel }),
  )
  const { calls, runFile } = notaryRunner()
  await submitAndWait({ artifactPath: "Prompter.dmg", profile, evidenceDir: root, runFile })
  assert.equal(
    calls.some(({ arguments_ }) => arguments_[1] === "submit"),
    false,
  )
  assert.equal(
    calls.some(({ arguments_ }) => arguments_[1] === "log"),
    true,
  )
  const failing = notaryRunner({
    fail: () =>
      Object.assign(new Error(sentinel), { stdout: sentinel, result: { stdout: sentinel } }),
  })
  await assert.rejects(
    submitAndWait({
      artifactPath: "Prompter.dmg",
      profile: sentinel,
      evidenceDir: await evidence(),
      runFile: failing.runFile,
    }),
    (error) => !JSON.stringify(error).includes(sentinel),
  )
})

test("retries stapling a bounded three times and uses Gatekeeper's app and disk-image kinds", async () => {
  let stapleAttempts = 0
  const calls = []
  const runFile = async (command, arguments_) => {
    calls.push({ command, arguments_ })
    if (arguments_[0] === "stapler" && arguments_[1] === "staple" && ++stapleAttempts < 3)
      throw new Error("synthetic retry")
    return { stdout: "", stderr: "" }
  }
  assert.deepEqual(
    await stapleAndValidate({ artifactPath: "Prompter.app", artifactKind: "app", runFile }),
    { status: "stapled", attempts: 3 },
  )
  await assessGatekeeper({ artifactPath: "Prompter.app", artifactKind: "app", runFile })
  await assessGatekeeper({ artifactPath: "Prompter.dmg", artifactKind: "dmg", runFile })
  assert.deepEqual(
    calls.slice(-2).map(({ arguments_ }) => arguments_.slice(0, 4)),
    [
      ["--assess", "--type", "execute", "--verbose=4"],
      ["--assess", "--type", "open", "--verbose=4"],
    ],
  )
})
