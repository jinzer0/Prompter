import assert from "node:assert/strict"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import { submitAndWait } from "../scripts/macos/notarization.mjs"
import {
  createNotarizationArtifact as artifact,
  createNotarizationDirectoryTracker,
  notarizationSubmissionId as id,
  notarizationProfile as profile,
  sha256,
} from "./support/macos-notarization-fixtures.mjs"

const temporaryDirectories = createNotarizationDirectoryTracker()
afterEach(() => temporaryDirectories.cleanup())

test("allows only one concurrent initial submit for shared evidence", async () => {
  const root = await temporaryDirectories.create()
  const artifactPath = await artifact(root, "Prompter.zip")
  let releaseFirstSubmit
  const firstSubmitStarted = new Promise((resolve) => {
    releaseFirstSubmit = resolve
  })
  let submitCalls = 0
  const runFile = async (_command, arguments_) => {
    if (arguments_[1] === "history") return { stdout: "{}" }
    if (arguments_[1] === "submit") {
      submitCalls += 1
      if (submitCalls === 1) {
        releaseFirstSubmit()
        await new Promise((resolve) => {
          releaseFirstSubmit = resolve
        })
      }
      return { stdout: JSON.stringify({ id, status: "Accepted" }) }
    }
    if (arguments_[1] === "info") return { stdout: JSON.stringify({ id, status: "Accepted" }) }
    return { stdout: JSON.stringify({ issues: [] }) }
  }

  const first = submitAndWait({ artifactPath, profile, evidenceDir: root, runFile })
  await firstSubmitStarted
  try {
    await assert.rejects(
      submitAndWait({ artifactPath, profile, evidenceDir: root, runFile }),
      /Notarization submission is already in progress/,
    )
  } finally {
    releaseFirstSubmit()
  }
  await first

  assert.equal(submitCalls, 1)
})

test("retains the acknowledged UUID and rejects artifact drift before polling", async () => {
  const root = await temporaryDirectories.create()
  const artifactPath = await artifact(root, "Prompter.zip", "original bytes")
  let submitCalls = 0
  let infoCalls = 0
  const runFile = async (_command, arguments_) => {
    if (arguments_[1] === "history") return { stdout: "{}" }
    if (arguments_[1] === "submit") {
      submitCalls += 1
      await writeFile(artifactPath, "changed bytes")
      return { stdout: JSON.stringify({ id, status: "Accepted" }) }
    }
    if (arguments_[1] === "info") {
      infoCalls += 1
      return { stdout: JSON.stringify({ id, status: "Accepted" }) }
    }
    return { stdout: JSON.stringify({ issues: [] }) }
  }

  await assert.rejects(
    submitAndWait({ artifactPath, profile, evidenceDir: root, runFile }),
    /Notarization artifact changed/,
  )

  assert.equal(submitCalls, 1)
  assert.equal(infoCalls, 0)
  assert.deepEqual(JSON.parse(await readFile(join(root, "notarization-resume.json"), "utf8")), {
    submissionId: id,
    status: "unknown",
    artifactKind: "app",
    artifactSha256: sha256("original bytes"),
  })
  await assert.rejects(
    submitAndWait({ artifactPath, profile, evidenceDir: root, runFile }),
    /Notarization resume does not match artifact/,
  )
  assert.equal(submitCalls, 1)
})
