import assert from "node:assert/strict"
import { createHash } from "node:crypto"
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

async function artifact(root, name, contents = "artifact") {
  const path = join(root, name)
  await writeFile(path, contents)
  return path
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex")
}

function notaryRunner({
  submit = { id, status: "Accepted" },
  log = { issues: [] },
  info = { id, status: "In Progress" },
  fail,
} = {}) {
  const calls = []
  const runFile = async (command, arguments_, options) => {
    calls.push({ command, arguments_, options })
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
    const { calls, runFile } = notaryRunner({ log })
    await assert.rejects(
      submitAndWait({ artifactPath, profile, evidenceDir: root, runFile }),
      /Notarization log blocks publication|Invalid notarization log/,
    )
    assert.equal(
      calls.some(({ arguments_ }) => arguments_[1] === "stapler"),
      false,
    )
  }
  const { calls, runFile } = notaryRunner()
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

test("fails closed for malformed, unauthorized, Invalid, and Rejected submission or resume states", async () => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.dmg")
  for (const submit of [
    "bad",
    { statusCode: 401 },
    { id, status: "Invalid" },
    { id, status: "Rejected" },
  ]) {
    const { calls, runFile } = notaryRunner({ submit })
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
      runFile: notaryRunner().runFile,
    }),
    /Invalid resume state/,
  )
})

test("stores only a UUID unknown state on a real timeout and resumes without resubmitting", async () => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.zip")
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
    artifactPath,
    profile,
    evidenceDir: root,
    runFile,
  })
  assert.deepEqual(unknown, {
    submissionId: id,
    status: "unknown",
    artifactKind: "app",
    artifactSha256: sha256("artifact"),
  })
  assert.equal(
    (await readFile(join(root, "notarization-resume.json"), "utf8")).includes(sentinel),
    false,
  )
  timedOut = false
  const resumed = await submitAndWait({
    artifactPath,
    profile,
    evidenceDir: root,
    runFile,
  })
  assert.deepEqual(resumed, unknown)
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "submit").length, 1)
  await assert.rejects(
    submitAndWait({
      artifactPath: await artifact(await evidence(), "Prompter.zip"),
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

test("preserves only artifact-bound unknown evidence after a recovered AbortError", async () => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.dmg", "abort artifact")
  const controller = new AbortController()
  const { calls, runFile } = notaryRunner({
    fail: (_command, arguments_) =>
      arguments_[1] === "submit"
        ? Object.assign(new Error(sentinel), {
            name: "AbortError",
            stdout: JSON.stringify({ id, status: "In Progress" }),
          })
        : undefined,
  })

  const unknown = await submitAndWait({
    artifactPath,
    profile,
    evidenceDir: root,
    runFile,
    signal: controller.signal,
  })

  assert.deepEqual(unknown, {
    submissionId: id,
    status: "unknown",
    artifactKind: "dmg",
    artifactSha256: sha256("abort artifact"),
  })
  assert.deepEqual(calls.find(({ arguments_ }) => arguments_[1] === "submit")?.options, {
    timeoutMs: 10 * 60 * 1000,
    signal: controller.signal,
  })
  assert.equal(
    (await readFile(join(root, "notarization-resume.json"), "utf8")).includes(sentinel),
    false,
  )
})

test("re-fetches a tampered accepted receipt without resubmission and keeps errors redacted", async () => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.dmg")
  await writeFile(
    join(root, "notarization-resume.json"),
    JSON.stringify({
      submissionId: id,
      status: "Accepted",
      logPath: `notary-${id}.json`,
      artifactKind: "dmg",
      artifactSha256: sha256("artifact"),
    }),
  )
  await writeFile(
    join(root, `notary-${id}.json`),
    JSON.stringify({
      submissionId: id,
      artifactKind: "dmg",
      artifactSha256: sha256("artifact"),
      issues: [{ severity: "warning" }],
      secret: sentinel,
    }),
  )
  const { calls, runFile } = notaryRunner()
  await submitAndWait({ artifactPath, profile, evidenceDir: root, runFile })
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
      artifactPath: await artifact(await evidence(), "Prompter.dmg"),
      profile: sentinel,
      evidenceDir: await evidence(),
      runFile: failing.runFile,
    }),
    (error) => {
      if (!(error instanceof Error)) return false
      const serialized = JSON.stringify({
        name: error.name,
        message: error.message,
        fields: Object.fromEntries(Object.entries(error)),
      })
      return !error.message.includes(sentinel) && !serialized.includes(sentinel)
    },
  )
})

test("rejects accepted resume evidence whose artifact kind or bytes do not match before notary work", async () => {
  const root = await evidence()
  const zipContents = "app archive"
  const dmgPath = await artifact(root, "Prompter.dmg", "disk image")
  await writeFile(
    join(root, "notarization-resume.json"),
    JSON.stringify({
      submissionId: id,
      status: "Accepted",
      logPath: `notary-${id}.json`,
      artifactKind: "app",
      artifactSha256: sha256(zipContents),
    }),
  )
  await writeFile(
    join(root, `notary-${id}.json`),
    JSON.stringify({
      submissionId: id,
      artifactKind: "app",
      artifactSha256: sha256(zipContents),
      issues: [],
    }),
  )
  const { calls, runFile } = notaryRunner()

  await assert.rejects(
    submitAndWait({ artifactPath: dmgPath, profile, evidenceDir: root, runFile }),
    /Notarization resume does not match artifact/,
  )
  assert.equal(calls.length, 0)
})

test("binds a multi-chunk archive to a lowercase streaming SHA-256 digest", async () => {
  const root = await evidence()
  const contents = Buffer.concat([Buffer.alloc(65_536, "a"), Buffer.alloc(65_536, "b")])
  const artifactPath = await artifact(root, "Prompter.zip", contents)
  const { runFile } = notaryRunner()

  const accepted = await submitAndWait({ artifactPath, profile, evidenceDir: root, runFile })

  assert.equal(accepted.artifactSha256, sha256(contents))
  assert.match(accepted.artifactSha256, /^[0-9a-f]{64}$/u)
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
