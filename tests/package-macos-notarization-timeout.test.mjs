import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { readFile } from "node:fs/promises"
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

test.each([
  ["ETIMEDOUT", { code: "ETIMEDOUT" }],
  ["AbortError", { name: "AbortError" }],
  ["recognized termination", { signal: "SIGTERM" }],
])("persists a statusless timeout UUID before polling after %s", async (_label, termination) => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.zip")
  const resumePath = join(root, "notarization-resume.json")
  let persistedBeforeInfo
  const { calls, runFile } = createNotaryRunner({
    info: () => {
      persistedBeforeInfo = JSON.parse(readFileSync(resumePath, "utf8"))
      return { id, status: "Accepted" }
    },
    fail: (_command, arguments_) =>
      arguments_[1] === "submit"
        ? Object.assign(new Error(sentinel), {
            ...termination,
            stdout: JSON.stringify({ id }),
            stderr: sentinel,
          })
        : undefined,
  })

  const accepted = await submitAndWait({
    artifactPath,
    profile,
    evidenceDir: root,
    runFile,
    waitFor: async () => undefined,
  })

  assert.equal(accepted.status, "Accepted")
  assert.deepEqual(persistedBeforeInfo, {
    submissionId: id,
    status: "unknown",
    artifactKind: "app",
    artifactSha256: sha256("artifact"),
  })
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "submit").length, 1)
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "info").length, 1)
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "log").length, 1)
  assert.equal((await readFile(resumePath, "utf8")).includes(sentinel), false)
})

test("rejects an unrecognized termination signal", async () => {
  const root = await evidence()
  await assert.rejects(
    submitAndWait({
      artifactPath: await artifact(root, "Prompter.zip"),
      profile,
      evidenceDir: root,
      runFile: createNotaryRunner({
        fail: (_command, arguments_) =>
          arguments_[1] === "submit"
            ? Object.assign(new Error(sentinel), { signal: "SIGBANANA" })
            : undefined,
      }).runFile,
    }),
    /Notarization command failed/,
  )
})

test("polls In Progress status to Accepted in one invocation without resubmitting", async () => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.zip")
  const delays = []
  let infoAttempts = 0
  const { calls, runFile } = createNotaryRunner({
    submit: { id, status: "In Progress" },
    info: () => ({ id, status: ++infoAttempts === 1 ? "In Progress" : "Accepted" }),
  })

  const accepted = await submitAndWait({
    artifactPath,
    profile,
    evidenceDir: root,
    runFile,
    waitFor: async (delayMs) => delays.push(delayMs),
  })

  assert.equal(accepted.status, "Accepted")
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "submit").length, 1)
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "info").length, 2)
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "log").length, 1)
  assert.deepEqual(delays, [5_000])
})

test("keeps artifact-bound unknown evidence after bounded In Progress polling exhausts", async () => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.dmg", "pending artifact")
  const delays = []
  const { calls, runFile } = createNotaryRunner({
    submit: { id, status: "In Progress" },
    info: { id, status: "In Progress" },
  })

  const unresolved = await submitAndWait({
    artifactPath,
    profile,
    evidenceDir: root,
    runFile,
    waitFor: async (delayMs) => delays.push(delayMs),
  })

  assert.deepEqual(unresolved, {
    submissionId: id,
    status: "unknown",
    artifactKind: "dmg",
    artifactSha256: sha256("pending artifact"),
  })
  assert.deepEqual(delays, [5_000, 15_000, 30_000, 60_000])
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "submit").length, 1)
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "info").length, 5)
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "log").length, 0)
  assert.deepEqual(
    JSON.parse(await readFile(join(root, "notarization-resume.json"), "utf8")),
    unresolved,
  )
})

test("retains a persisted UUID when polling is interrupted and resumes without resubmitting", async () => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.zip", "interrupted artifact")
  const controller = new AbortController()
  let infoAttempts = 0
  const { calls, runFile } = createNotaryRunner({
    submit: { id, status: "In Progress" },
    info: () => ({ id, status: ++infoAttempts === 1 ? "In Progress" : "Accepted" }),
  })

  await assert.rejects(
    submitAndWait({
      artifactPath,
      profile,
      evidenceDir: root,
      runFile,
      signal: controller.signal,
      waitFor: async () => {
        controller.abort()
        throw new Error(sentinel)
      },
    }),
    /Notarization command failed/,
  )

  assert.deepEqual(JSON.parse(await readFile(join(root, "notarization-resume.json"), "utf8")), {
    submissionId: id,
    status: "unknown",
    artifactKind: "app",
    artifactSha256: sha256("interrupted artifact"),
  })
  const accepted = await submitAndWait({ artifactPath, profile, evidenceDir: root, runFile })

  assert.equal(accepted.status, "Accepted")
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "submit").length, 1)
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "info").length, 2)
  assert.equal(calls.filter(({ arguments_ }) => arguments_[1] === "log").length, 1)
})
