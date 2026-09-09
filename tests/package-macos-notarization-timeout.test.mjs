import assert from "node:assert/strict"
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

test("stores only a UUID unknown state on a real timeout and resumes without resubmitting", async () => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.zip")
  let timedOut = true
  const { calls, runFile } = createNotaryRunner({
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

test("preserves only artifact-bound unknown evidence after a recovered AbortError", async () => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.dmg", "abort artifact")
  const controller = new AbortController()
  const { calls, runFile } = createNotaryRunner({
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
