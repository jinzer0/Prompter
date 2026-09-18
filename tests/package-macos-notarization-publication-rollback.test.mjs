import assert from "node:assert/strict"
import { readFile, rename, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"

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

test("preserves a replacement guard when post-link rollback races its owner", async () => {
  const root = await temporaryDirectories.create()
  const { claim: claimPath, guard: guardPath } = paths(root)
  const stale = `${JSON.stringify({ ownerId: ownerId(8), pid: deadPid, phase: "pre-submit" })}\n`
  const replacement = { ownerId: ownerId(2), pid: process.pid, claimOwnerId: ownerId(8) }
  let replaceOnRollback = false
  await writeFile(claimPath, stale)
  fsProbe.directories.add(root)
  fsProbe.directorySyncFailure = (publication) => {
    if (publication !== "guard final") return undefined
    replaceOnRollback = true
    return Object.assign(new Error("synthetic final guard sync failure"), { code: "EIO" })
  }

  await assert.rejects(
    createClaim(root, ownerId(1), {
      isOwnerAlive: () => false,
      readClaimFile: async (path, ...arguments_) => {
        if (path === guardPath && replaceOnRollback) {
          replaceOnRollback = false
          await writeFile(guardPath, `${JSON.stringify(replacement)}\n`)
        }
        return readFile(path, ...arguments_)
      },
    }).acquire(),
    /unavailable/,
  )

  assert.equal(await readFile(claimPath, "utf8"), stale)
  assert.deepEqual(JSON.parse(await readFile(guardPath, "utf8")), replacement)
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
