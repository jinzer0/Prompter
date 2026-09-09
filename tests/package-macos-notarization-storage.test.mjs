import assert from "node:assert/strict"
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import { createSubmissionClaim, writeAtomicJson } from "../scripts/macos/notarization-storage.mjs"
import { createNotarizationDirectoryTracker } from "./support/macos-notarization-fixtures.mjs"

const temporaryDirectories = createNotarizationDirectoryTracker()
afterEach(() => temporaryDirectories.cleanup())

test("preserves prior evidence and removes its temporary file when replacement is interrupted", async () => {
  const root = await temporaryDirectories.create()
  const resumePath = join(root, "notarization-resume.json")
  await writeFile(resumePath, '{"status":"unknown"}\n')

  await assert.rejects(
    writeAtomicJson({
      directory: root,
      fileName: "notarization-resume.json",
      value: { status: "Accepted" },
      renameFile: async () => {
        throw new Error("synthetic interruption")
      },
    }),
    /synthetic interruption/,
  )

  assert.equal(await readFile(resumePath, "utf8"), '{"status":"unknown"}\n')
  assert.deepEqual(await readdir(root), ["notarization-resume.json"])
})

test("reclaims only a dead pre-submit claim", async () => {
  const root = await temporaryDirectories.create()
  const claimPath = join(root, ".notarization-submit.claim")
  await writeFile(claimPath, '{"pid":999999,"phase":"pre-submit"}\n')
  const claim = createSubmissionClaim(root)

  await claim.acquire()
  await claim.release()
})

test("rejects live and ambiguous dead claims without reclaiming them", async () => {
  const root = await temporaryDirectories.create()
  const claimPath = join(root, ".notarization-submit.claim")
  const claim = createSubmissionClaim(root)
  await writeFile(claimPath, `${JSON.stringify({ pid: process.pid, phase: "pre-submit" })}\n`)
  await assert.rejects(claim.acquire(), /already in progress/)
  await writeFile(claimPath, '{"pid":999999,"phase":"submitting"}\n')
  await assert.rejects(claim.acquire(), /manual recovery/)
})
