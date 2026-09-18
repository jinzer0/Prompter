import assert from "node:assert/strict"
import { open, readdir, readFile, rm, writeFile } from "node:fs/promises"
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

test("allows only one concurrent reclaimer to replace a dead pre-submit claim", async () => {
  // Given: two reclaimers that have both classified the same claim as stale.
  const root = await temporaryDirectories.create()
  const claimPath = join(root, ".notarization-submit.claim")
  await writeFile(claimPath, '{"pid":999999,"phase":"pre-submit"}\n')
  let staleReadCount = 0
  let releaseStaleReads
  const staleReadsComplete = new Promise((resolve) => {
    releaseStaleReads = resolve
  })
  let claimRemovalCount = 0
  let releaseSecondRemoval
  const replacementOpened = new Promise((resolve) => {
    releaseSecondRemoval = resolve
  })
  const operations = {
    openClaimFile: async (...arguments_) => {
      const handle = await open(...arguments_)
      if (arguments_[0] === claimPath) releaseSecondRemoval()
      return handle
    },
    readClaimFile: async (...arguments_) => {
      const contents = await readFile(...arguments_)
      staleReadCount += 1
      if (staleReadCount === 2) releaseStaleReads()
      if (staleReadCount <= 2) await staleReadsComplete
      return contents
    },
    removeClaimFile: async (...arguments_) => {
      if (arguments_[0] === claimPath) {
        claimRemovalCount += 1
        if (claimRemovalCount === 2) await replacementOpened
      }
      return rm(...arguments_)
    },
  }
  const claims = [createSubmissionClaim(root, operations), createSubmissionClaim(root, operations)]

  // When: both stale-claim takeovers run through the forced unsafe interleaving.
  const results = await Promise.allSettled(claims.map((claim) => claim.acquire()))

  // Then: exactly one reclaimer owns the live claim path.
  const winners = results.flatMap((result, index) => (result.status === "fulfilled" ? [index] : []))
  const losers = results.filter((result) => result.status === "rejected")
  assert.equal(winners.length, 1)
  assert.equal(losers.length, 1)
  assert.match(losers[0].reason.message, /already in progress/)
  assert.deepEqual(JSON.parse(await readFile(claimPath, "utf8")), {
    pid: process.pid,
    phase: "pre-submit",
  })
  assert.equal(claimRemovalCount, 1)
  await claims[winners[0]].release()
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
