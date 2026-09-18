import assert from "node:assert/strict"
import { link, readdir, readFile, rename, writeFile } from "node:fs/promises"
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

import { submitAndWait } from "../scripts/macos/notarization.mjs"
import { createSubmissionClaim, writeAtomicJson } from "../scripts/macos/notarization-storage.mjs"
import {
  createNotarizationArtifact as artifact,
  createNotarizationDirectoryTracker,
  createNotaryRunner,
  notarizationProfile as profile,
} from "./support/macos-notarization-fixtures.mjs"

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

function observeDirectory(directory) {
  fsProbe.directories.add(directory)
}

function createClaim(directory, id, options = {}) {
  return createSubmissionClaim(directory, { generateOwnerId: () => id, ...options })
}

test("syncs the containing directory after atomically replacing JSON", async () => {
  const root = await temporaryDirectories.create()
  observeDirectory(root)

  await writeAtomicJson({
    directory: root,
    fileName: "notarization-resume.json",
    value: { status: "unknown" },
    renameFile: async (sourcePath, targetPath) => {
      fsProbe.events.push("rename")
      await rename(sourcePath, targetPath)
    },
  })

  assert.deepEqual(fsProbe.events, [
    "temp write",
    "file sync",
    "file close",
    "rename",
    'directory open("r")',
    "directory sync",
    "directory close",
  ])
})

test("fails closed and cleans the temporary file when atomic directory sync fails", async () => {
  const root = await temporaryDirectories.create()
  const resumePath = join(root, "notarization-resume.json")
  const failure = Object.assign(new Error("synthetic directory sync failure"), { code: "EIO" })
  await writeFile(resumePath, '{"status":"previous"}\n')
  observeDirectory(root)
  fsProbe.directorySyncFailure = (publication) => (publication === "temp" ? failure : undefined)

  await assert.rejects(
    writeAtomicJson({
      directory: root,
      fileName: "notarization-resume.json",
      value: { status: "unknown" },
    }),
    /synthetic directory sync failure/,
  )

  assert.deepEqual(await readdir(root), ["notarization-resume.json"])
})

test("publishes a fresh claim only after its temporary file closes", async () => {
  const root = await temporaryDirectories.create()
  observeDirectory(root)

  await createClaim(root, ownerId(1)).acquire()

  assert.deepEqual(fsProbe.events, [
    "claim temp create",
    "claim temp write",
    "claim temp sync",
    "claim temp close",
    "claim publication",
    'directory open("r")',
    "directory sync",
    "directory close",
  ])
})

test("syncs a fresh claim directory before submitting", async () => {
  const root = await temporaryDirectories.create()
  const artifactPath = await artifact(root, "Prompter.zip")
  const runner = createNotaryRunner()
  observeDirectory(root)
  const runFile = async (command, arguments_, options) => {
    if (arguments_[1] === "submit") fsProbe.events.push("submit")
    return runner.runFile(command, arguments_, options)
  }

  await submitAndWait({ artifactPath, profile, evidenceDir: root, runFile })

  assert.deepEqual(fsProbe.events.slice(0, 8), [
    "claim temp create",
    "claim temp write",
    "claim temp sync",
    "claim temp close",
    "claim publication",
    'directory open("r")',
    "directory sync",
    "directory close",
  ])
  assert.ok(fsProbe.events.indexOf("claim publication") < fsProbe.events.indexOf("submit"))
})

test("prevents submit when fresh claim directory sync fails", async () => {
  const root = await temporaryDirectories.create()
  const artifactPath = await artifact(root, "Prompter.zip")
  const runner = createNotaryRunner()
  observeDirectory(root)
  fsProbe.directorySyncFailure = (publication) =>
    publication === "claim temp"
      ? Object.assign(new Error("synthetic claim sync failure"), { code: "EIO" })
      : undefined

  await assert.rejects(
    submitAndWait({ artifactPath, profile, evidenceDir: root, runFile: runner.runFile }),
    /Notarization evidence is unavailable/,
  )

  assert.equal(runner.calls.filter(({ arguments_ }) => arguments_[1] === "submit").length, 0)
})

test("suppresses claim publication and submit when temporary claim close fails", async () => {
  const root = await temporaryDirectories.create()
  const artifactPath = await artifact(root, "Prompter.zip")
  const claimPath = join(root, ".notarization-submit.claim")
  const runner = createNotaryRunner()
  observeDirectory(root)
  fsProbe.fileCloseFailure = (publication) =>
    publication === "claim temp"
      ? Object.assign(new Error("synthetic claim temporary close failure"), { code: "EIO" })
      : undefined

  await assert.rejects(
    submitAndWait({ artifactPath, profile, evidenceDir: root, runFile: runner.runFile }),
    /Notarization evidence is unavailable/,
  )

  assert.equal(fsProbe.events.includes("claim publication"), false)
  assert.equal(fsProbe.events.includes("claim final publication"), false)
  assert.equal(runner.calls.filter(({ arguments_ }) => arguments_[1] === "submit").length, 0)
  await assert.rejects(readFile(claimPath), { code: "ENOENT" })
})

test("syncs the reclaim guard directory before replacing a stale claim", async () => {
  const root = await temporaryDirectories.create()
  const claimPath = join(root, ".notarization-submit.claim")
  const staleOwnerId = ownerId(8)
  await writeFile(
    claimPath,
    `${JSON.stringify({ ownerId: staleOwnerId, pid: deadPid, phase: "pre-submit" })}\n`,
  )
  observeDirectory(root)
  const claim = createClaim(root, ownerId(1), {
    isOwnerAlive: () => false,
    linkClaimFile: async (sourcePath, targetPath) => {
      fsProbe.events.push("guard link")
      await link(sourcePath, targetPath)
    },
    renameClaimFile: async (sourcePath, targetPath) => {
      if (sourcePath === claimPath) fsProbe.events.push("stale claim replacement")
      await rename(sourcePath, targetPath)
    },
  })

  await claim.acquire()

  assert.deepEqual(fsProbe.events.slice(0, 7), [
    "guard temp write",
    "guard temp sync",
    "guard temp close",
    "guard link",
    'directory open("r")',
    "directory sync",
    "directory close",
  ])
  assert.ok(
    fsProbe.events.indexOf("directory close") < fsProbe.events.indexOf("stale claim replacement"),
  )
})

test("retains a submitting claim when acknowledged UUID directory sync fails", async () => {
  const root = await temporaryDirectories.create()
  const artifactPath = await artifact(root, "Prompter.zip")
  const claimPath = join(root, ".notarization-submit.claim")
  const runner = createNotaryRunner()
  const failure = Object.assign(new Error("synthetic UUID sync failure"), { code: "EIO" })
  observeDirectory(root)
  fsProbe.directorySyncFailure = (publication) => (publication === "temp" ? failure : undefined)

  await assert.rejects(
    submitAndWait({ artifactPath, profile, evidenceDir: root, runFile: runner.runFile }),
    /synthetic UUID sync failure/,
  )

  assert.equal(JSON.parse(await readFile(claimPath, "utf8")).phase, "submitting")
  fsProbe.directorySyncFailure = undefined
  await submitAndWait({ artifactPath, profile, evidenceDir: root, runFile: runner.runFile })
  assert.equal(runner.calls.filter(({ arguments_ }) => arguments_[1] === "submit").length, 1)
  assert.equal(JSON.parse(await readFile(claimPath, "utf8")).phase, "submitting")
})
