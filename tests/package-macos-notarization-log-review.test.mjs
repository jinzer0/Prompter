import assert from "node:assert/strict"
import { writeFile } from "node:fs/promises"
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

test("refreshes Apple status and log for a forged accepted receipt before blocking downstream work", async () => {
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
  const { calls, runFile } = createNotaryRunner({
    info: { id, status: "Accepted" },
    log: { issues: [{ severity: "warning" }] },
  })
  await assert.rejects(
    submitAndWait({ artifactPath, profile, evidenceDir: root, runFile }),
    /Invalid notarization log/,
  )
  assert.equal(
    calls.some(({ arguments_ }) => arguments_[1] === "submit"),
    false,
  )
  assert.equal(
    calls.some(({ arguments_ }) => arguments_[1] === "info"),
    true,
  )
  assert.equal(
    calls.some(({ arguments_ }) => arguments_[1] === "log"),
    true,
  )
  const failing = createNotaryRunner({
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
