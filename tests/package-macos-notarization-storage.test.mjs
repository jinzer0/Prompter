import assert from "node:assert/strict"
import { link, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import { createSubmissionClaim, writeAtomicJson } from "../scripts/macos/notarization-storage.mjs"
import { createNotarizationDirectoryTracker } from "./support/macos-notarization-fixtures.mjs"

const temporaryDirectories = createNotarizationDirectoryTracker()
const deadPid = 999999
const ownerId = (suffix) => `00000000-0000-4000-8000-${suffix.toString().padStart(12, "0")}`

afterEach(() => temporaryDirectories.cleanup())

function storagePaths(root) {
  return {
    claimPath: join(root, ".notarization-submit.claim"),
    guardPath: join(root, ".notarization-submit.reclaim"),
  }
}

async function writeState(path, value) {
  await writeFile(path, `${JSON.stringify(value)}\n`)
}

async function readState(path) {
  return JSON.parse(await readFile(path, "utf8"))
}

function createClaim(root, id, options = {}) {
  return createSubmissionClaim(root, { generateOwnerId: () => id, ...options })
}

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

test("writes owner-aware claim phases and releases only its own claim", async () => {
  const root = await temporaryDirectories.create()
  const { claimPath } = storagePaths(root)
  const id = ownerId(1)
  const claim = createClaim(root, id)

  await claim.acquire()
  assert.deepEqual(await readState(claimPath), {
    ownerId: id,
    pid: process.pid,
    phase: "pre-submit",
  })
  await claim.markSubmitting()
  assert.deepEqual(await readState(claimPath), {
    ownerId: id,
    pid: process.pid,
    phase: "submitting",
  })
  await claim.release()
  await assert.rejects(readFile(claimPath), { code: "ENOENT" })
})

test("fails closed when markSubmitting reads a malformed current claim", async () => {
  const root = await temporaryDirectories.create()
  const { claimPath } = storagePaths(root)
  const claim = createClaim(root, ownerId(1))
  await claim.acquire()
  await writeFile(claimPath, "{}\n")

  await assert.rejects(claim.markSubmitting(), /manual recovery/)

  assert.equal(await readFile(claimPath, "utf8"), "{}\n")
  await rm(claimPath)
})

test("publishes a complete owner-aware guard before reclaiming a dead claim", async () => {
  const root = await temporaryDirectories.create()
  const { claimPath } = storagePaths(root)
  const staleOwnerId = ownerId(8)
  const id = ownerId(1)
  await writeState(claimPath, { ownerId: staleOwnerId, pid: deadPid, phase: "pre-submit" })
  let publishedGuard
  const claim = createClaim(root, id, {
    isOwnerAlive: () => false,
    linkClaimFile: async (sourcePath, targetPath) => {
      publishedGuard = await readState(sourcePath)
      await assert.rejects(readFile(targetPath), { code: "ENOENT" })
      await link(sourcePath, targetPath)
    },
  })

  await claim.acquire()

  assert.deepEqual(publishedGuard, { ownerId: id, pid: process.pid, claimOwnerId: staleOwnerId })
  await claim.release()
})

test("reclaims a dead valid guard but fails closed for live and malformed guards", async () => {
  const staleOwnerId = ownerId(8)
  for (const [guard, expected] of [
    [{ ownerId: ownerId(7), pid: deadPid, claimOwnerId: staleOwnerId }, null],
    [{ ownerId: ownerId(7), pid: process.pid, claimOwnerId: staleOwnerId }, /already in progress/],
    [{ pid: deadPid, claimOwnerId: staleOwnerId }, /manual recovery/],
  ]) {
    const root = await temporaryDirectories.create()
    const { claimPath, guardPath } = storagePaths(root)
    await writeState(claimPath, { ownerId: staleOwnerId, pid: deadPid, phase: "pre-submit" })
    await writeState(guardPath, guard)
    const claim = createClaim(root, ownerId(1), {
      isOwnerAlive: (pid) => pid === process.pid,
    })

    if (expected === null) {
      await claim.acquire()
      await claim.release()
    } else {
      await assert.rejects(claim.acquire(), expected)
    }
  }
})

test("recovers an orphan left immediately after guard acquisition", async () => {
  const root = await temporaryDirectories.create()
  const { claimPath } = storagePaths(root)
  await writeState(claimPath, { ownerId: ownerId(8), pid: deadPid, phase: "pre-submit" })
  const interrupted = createClaim(root, ownerId(1), {
    afterGuardAcquired: () => {
      throw new Error("interrupted")
    },
    isOwnerAlive: () => false,
  })
  await assert.rejects(interrupted.acquire(), /evidence is unavailable/)

  const recovery = createClaim(root, ownerId(2), { isOwnerAlive: () => false })
  await recovery.acquire()
  assert.deepEqual(await readState(claimPath), {
    ownerId: ownerId(2),
    pid: process.pid,
    phase: "pre-submit",
  })
  await recovery.release()
})

test("recovers an orphan left after replacement claim creation", async () => {
  const root = await temporaryDirectories.create()
  const { claimPath, guardPath } = storagePaths(root)
  await writeState(claimPath, { ownerId: ownerId(8), pid: deadPid, phase: "pre-submit" })
  const interrupted = createClaim(root, ownerId(1), {
    afterReplacementClaimCreated: () => {
      throw new Error("interrupted")
    },
    isOwnerAlive: () => false,
    removeClaimFile: async (path, options) => (path === guardPath ? undefined : rm(path, options)),
  })
  await assert.rejects(interrupted.acquire(), /evidence is unavailable/)

  const recovery = createClaim(root, ownerId(2), { isOwnerAlive: () => false })
  await recovery.acquire()
  assert.equal((await readState(claimPath)).ownerId, ownerId(2))
  await recovery.release()
})

test("allows one concurrent reclaimer to replace a dead pre-submit claim", async () => {
  const root = await temporaryDirectories.create()
  const { claimPath } = storagePaths(root)
  await writeState(claimPath, { ownerId: ownerId(8), pid: deadPid, phase: "pre-submit" })
  let initialReads = 0
  let releaseReads
  const readsComplete = new Promise((resolve) => {
    releaseReads = resolve
  })
  const operations = {
    isOwnerAlive: (pid) => pid === process.pid,
    readClaimFile: async (...arguments_) => {
      const contents = await readFile(...arguments_)
      initialReads += 1
      if (initialReads === 2) releaseReads()
      if (initialReads <= 2) await readsComplete
      return contents
    },
  }
  const claims = [
    createClaim(root, ownerId(1), operations),
    createClaim(root, ownerId(2), operations),
  ]

  const results = await Promise.allSettled(claims.map((claim) => claim.acquire()))

  const winners = results.flatMap((result, index) => (result.status === "fulfilled" ? [index] : []))
  const losers = results.filter((result) => result.status === "rejected")
  assert.equal(winners.length, 1)
  assert.equal(losers.length, 1)
  assert.match(losers[0].reason.message, /already in progress/)
  assert.equal((await readState(claimPath)).ownerId, ownerId(winners[0] + 1))
  await claims[winners[0]].release()
})

test("stale owners cannot release or mark a replacement claim", async () => {
  const root = await temporaryDirectories.create()
  const { claimPath } = storagePaths(root)
  const replacement = { ownerId: ownerId(2), pid: process.pid, phase: "pre-submit" }
  let replaceOnRead = false
  let ownershipReads = 0
  const stale = createClaim(root, ownerId(1), {
    readClaimFile: async (...arguments_) => {
      const contents = await readFile(...arguments_)
      if (replaceOnRead && ++ownershipReads === 2) {
        replaceOnRead = false
        await writeState(claimPath, replacement)
      }
      return contents
    },
  })
  await stale.acquire()
  replaceOnRead = true

  await stale.release()
  assert.deepEqual(await readState(claimPath), replacement)
  await assert.rejects(stale.markSubmitting(), /manual recovery/)
  assert.deepEqual(await readState(claimPath), replacement)
  await rm(claimPath)
})

test("stale guard cleanup preserves a replacement guard", async () => {
  const root = await temporaryDirectories.create()
  const { claimPath, guardPath } = storagePaths(root)
  const replacementGuard = {
    ownerId: ownerId(2),
    pid: process.pid,
    claimOwnerId: ownerId(1),
  }
  let replaceOnRead = false
  await writeState(claimPath, { ownerId: ownerId(8), pid: deadPid, phase: "pre-submit" })
  const claim = createClaim(root, ownerId(1), {
    afterReplacementClaimCreated: () => {
      replaceOnRead = true
    },
    isOwnerAlive: () => false,
    readClaimFile: async (...arguments_) => {
      const contents = await readFile(...arguments_)
      if (arguments_[0] === guardPath && replaceOnRead) {
        replaceOnRead = false
        await writeState(guardPath, replacementGuard)
      }
      return contents
    },
  })

  await claim.acquire()

  assert.deepEqual(await readState(guardPath), replacementGuard)
  await claim.release()
  await rm(guardPath)
})

test("preserves ambiguous dead submitting claims for manual recovery", async () => {
  const root = await temporaryDirectories.create()
  const { claimPath } = storagePaths(root)
  await writeState(claimPath, { ownerId: ownerId(8), pid: deadPid, phase: "submitting" })

  await assert.rejects(
    createClaim(root, ownerId(1), { isOwnerAlive: () => false }).acquire(),
    /manual recovery/,
  )
})
