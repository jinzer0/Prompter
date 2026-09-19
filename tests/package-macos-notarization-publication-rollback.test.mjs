import assert from "node:assert/strict"
import { link, readFile, rename, rm, writeFile } from "node:fs/promises"
import { basename, join } from "node:path"

import { afterEach, test, vi } from "vitest"

const fsProbe = vi.hoisted(() => ({
  directories: new Set(),
  directorySyncFailure: undefined,
  events: [],
  fileCloseFailure: undefined,
  latestPublication: undefined,
}))

vi.mock("node:fs/promises", async (importOriginal) => {
  const [actual, { createFilesystemProbe }] = await Promise.all([
    importOriginal(),
    import("./support/macos-notarization-durability-probe.mjs"),
  ])
  return { ...actual, ...createFilesystemProbe(actual, fsProbe) }
})

import { createSubmissionClaim } from "../scripts/macos/notarization-storage.mjs"
import { isGeneratedNotarizationStorageRemnant } from "../scripts/macos/notarization-storage-remnants.mjs"
import { createNotarizationDirectoryTracker } from "./support/macos-notarization-fixtures.mjs"

const temporaryDirectories = createNotarizationDirectoryTracker()
const deadPid = 999999
const ownerId = (suffix) => `00000000-0000-4000-8000-${suffix.toString().padStart(12, "0")}`

afterEach(async () => {
  await temporaryDirectories.cleanup()
  fsProbe.directories.clear()
  fsProbe.directorySyncFailure = undefined
  fsProbe.events.length = 0
  fsProbe.fileCloseFailure = undefined
  fsProbe.latestPublication = undefined
})

function createClaim(directory, id, options = {}) {
  return createSubmissionClaim(directory, { generateOwnerId: () => id, ...options })
}

function failOnce(publication, failure) {
  let pending = true
  return (observed) => {
    if (!pending || observed !== publication) return undefined
    pending = false
    return failure
  }
}

function paths(root) {
  return {
    claim: join(root, ".notarization-submit.claim"),
    guard: join(root, ".notarization-submit.reclaim"),
  }
}

test("removes its published guard durably, preserves the stale claim, and reclaims once on retry", async () => {
  const root = await temporaryDirectories.create()
  const { claim: claimPath, guard: guardPath } = paths(root)
  const stale = `${JSON.stringify({ ownerId: ownerId(8), pid: deadPid, phase: "pre-submit" })}\n`
  const failure = Object.assign(new Error("synthetic final guard sync failure"), { code: "EIO" })
  await writeFile(claimPath, stale)
  fsProbe.directories.add(root)
  fsProbe.directorySyncFailure = failOnce("guard final", failure)

  await assert.rejects(
    createClaim(root, ownerId(1), { isOwnerAlive: () => false }).acquire(),
    /unavailable/,
  )

  assert.equal(await readFile(claimPath, "utf8"), stale)
  await assert.rejects(readFile(guardPath), { code: "ENOENT" })
  assert.equal(fsProbe.events.filter((entry) => entry === "directory sync").length, 2)

  let replacements = 0
  const retry = createClaim(root, ownerId(2), {
    isOwnerAlive: () => false,
    renameClaimFile: async (sourcePath, targetPath) => {
      if (sourcePath === claimPath) replacements += 1
      await rename(sourcePath, targetPath)
    },
  })
  await retry.acquire()

  assert.equal(replacements, 1)
  assert.deepEqual(JSON.parse(await readFile(claimPath, "utf8")), {
    ownerId: ownerId(2),
    pid: process.pid,
    phase: "pre-submit",
  })
  await assert.rejects(readFile(guardPath), { code: "ENOENT" })
  await retry.release()
})

test("restores and syncs a replacement guard moved by post-link rollback", async () => {
  const root = await temporaryDirectories.create()
  const { claim: claimPath, guard: guardPath } = paths(root)
  const stale = `${JSON.stringify({ ownerId: ownerId(8), pid: deadPid, phase: "pre-submit" })}\n`
  const replacement = { ownerId: ownerId(2), pid: process.pid, claimOwnerId: ownerId(8) }
  const replacementPath = join(root, "replacement-guard")
  const removalPath = `${guardPath}.${ownerId(1)}.remove`
  const temporaryGuard = join(root, `..notarization-submit.reclaim.${ownerId(1)}.tmp`)
  await writeFile(claimPath, stale)
  await writeFile(replacementPath, `${JSON.stringify(replacement)}\n`)
  fsProbe.directories.add(root)
  fsProbe.directorySyncFailure = failOnce(
    "guard final",
    Object.assign(new Error("synthetic final guard sync failure"), { code: "EIO" }),
  )

  await assert.rejects(
    createClaim(root, ownerId(1), {
      isOwnerAlive: () => false,
      linkClaimFile: async (sourcePath, targetPath) => {
        if (sourcePath === removalPath) fsProbe.events.push("replacement restore")
        await link(sourcePath, targetPath)
      },
      removeClaimFile: async (path, options) => {
        if (path === removalPath) fsProbe.events.push("replacement tombstone unlink")
        if (path === temporaryGuard) fsProbe.events.push("guard temp cleanup")
        await rm(path, options)
      },
      renameClaimFile: async (sourcePath, targetPath) => {
        if (sourcePath === guardPath) {
          fsProbe.events.push("replacement swap")
          await rename(replacementPath, guardPath)
        }
        await rename(sourcePath, targetPath)
        if (sourcePath === guardPath) fsProbe.events.push("replacement tombstone")
      },
    }).acquire(),
    /unavailable/,
  )

  assert.equal(await readFile(claimPath, "utf8"), stale)
  assert.deepEqual(JSON.parse(await readFile(guardPath, "utf8")), replacement)
  assert.deepEqual(fsProbe.events.slice(fsProbe.events.indexOf("replacement swap")), [
    "replacement swap",
    "replacement tombstone",
    "replacement restore",
    "replacement tombstone unlink",
    'directory open("r")',
    "directory sync",
    "directory close",
    "guard temp cleanup",
  ])
})

test("fails closed without retry when replacement restoration directory sync fails", async () => {
  const root = await temporaryDirectories.create()
  const { claim: claimPath, guard: guardPath } = paths(root)
  const replacement = { ownerId: ownerId(2), pid: process.pid, claimOwnerId: ownerId(8) }
  const replacementPath = join(root, "replacement-guard")
  const removalPath = `${guardPath}.${ownerId(1)}.remove`
  let syncFailures = 0
  let renameAttempts = 0
  await writeFile(
    claimPath,
    `${JSON.stringify({ ownerId: ownerId(8), pid: deadPid, phase: "pre-submit" })}\n`,
  )
  await writeFile(replacementPath, `${JSON.stringify(replacement)}\n`)
  fsProbe.directories.add(root)
  fsProbe.directorySyncFailure = (publication) => {
    if (publication !== "guard final") return undefined
    syncFailures += 1
    return Object.assign(new Error(`synthetic directory sync failure ${syncFailures}`), {
      code: "EIO",
    })
  }

  await assert.rejects(
    createClaim(root, ownerId(1), {
      isOwnerAlive: () => false,
      renameClaimFile: async (sourcePath, targetPath) => {
        if (sourcePath === guardPath) {
          renameAttempts += 1
          await rename(replacementPath, guardPath)
        }
        await rename(sourcePath, targetPath)
      },
    }).acquire(),
    /unavailable/,
  )

  assert.equal(syncFailures, 2)
  assert.equal(renameAttempts, 1)
  assert.deepEqual(JSON.parse(await readFile(guardPath, "utf8")), replacement)
  await assert.rejects(readFile(removalPath), { code: "ENOENT" })
})

test("keeps a durable claim authoritative when its temporary cleanup fails", async () => {
  const root = await temporaryDirectories.create()
  const id = ownerId(1)
  const { claim: claimPath } = paths(root)
  const temporaryClaim = join(root, `..notarization-submit.claim.${id}.tmp`)
  fsProbe.directories.add(root)
  const claim = createClaim(root, id, {
    removeClaimFile: async (path, options) => {
      if (path === temporaryClaim)
        throw Object.assign(new Error("synthetic cleanup failure"), { code: "EIO" })
      await rm(path, options)
    },
  })

  await claim.acquire()

  assert.equal(JSON.parse(await readFile(claimPath, "utf8")).ownerId, id)
  assert.equal(isGeneratedNotarizationStorageRemnant(basename(temporaryClaim)), true)
  assert.equal(JSON.parse(await readFile(temporaryClaim, "utf8")).ownerId, id)
  await claim.release()
})

test("continues reclaim after durable guard temporary cleanup fails", async () => {
  const root = await temporaryDirectories.create()
  const id = ownerId(1)
  const { claim: claimPath, guard: guardPath } = paths(root)
  const temporaryGuard = join(root, `..notarization-submit.reclaim.${id}.tmp`)
  await writeFile(
    claimPath,
    `${JSON.stringify({ ownerId: ownerId(8), pid: deadPid, phase: "pre-submit" })}\n`,
  )
  fsProbe.directories.add(root)
  const claim = createClaim(root, id, {
    isOwnerAlive: () => false,
    removeClaimFile: async (path, options) => {
      if (path === temporaryGuard)
        throw Object.assign(new Error("synthetic cleanup failure"), { code: "EIO" })
      await rm(path, options)
    },
  })

  await claim.acquire()

  assert.equal(JSON.parse(await readFile(claimPath, "utf8")).ownerId, id)
  await assert.rejects(readFile(guardPath), { code: "ENOENT" })
  assert.equal(isGeneratedNotarizationStorageRemnant(basename(temporaryGuard)), true)
  await claim.release()
})

test("fails closed when published-guard rollback cleanup fails", async () => {
  const root = await temporaryDirectories.create()
  const { claim: claimPath, guard: guardPath } = paths(root)
  const id = ownerId(1)
  const stale = `${JSON.stringify({ ownerId: ownerId(8), pid: deadPid, phase: "pre-submit" })}\n`
  const temporaryGuard = join(root, `..notarization-submit.reclaim.${id}.tmp`)
  let cleanupAttempts = 0
  await writeFile(claimPath, stale)
  fsProbe.directories.add(root)
  fsProbe.directorySyncFailure = failOnce(
    "guard final",
    Object.assign(new Error("synthetic final guard sync failure"), { code: "EIO" }),
  )

  await assert.rejects(
    createClaim(root, id, {
      isOwnerAlive: () => false,
      removeClaimFile: async (path, options) => {
        if (path !== temporaryGuard) {
          cleanupAttempts += 1
          throw Object.assign(new Error("synthetic rollback cleanup failure"), { code: "EIO" })
        }
        await rm(path, options)
      },
    }).acquire(),
    /unavailable/,
  )

  assert.equal(cleanupAttempts, 1)
  assert.equal(await readFile(claimPath, "utf8"), stale)
  await assert.rejects(readFile(guardPath), { code: "ENOENT" })
})
