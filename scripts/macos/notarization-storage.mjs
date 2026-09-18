import { randomUUID } from "node:crypto"
import { link, mkdir, open, readFile, rename, rm } from "node:fs/promises"
import { join } from "node:path"

import { failNotarization } from "./notarization-contract.mjs"
import { syncDirectory, writeSyncedExclusive } from "./notarization-durable-storage.mjs"

export { writeAtomicJson } from "./notarization-durable-storage.mjs"

const claimFileName = ".notarization-submit.claim"
const reclaimFileName = ".notarization-submit.reclaim"
const claimFields = ["ownerId", "pid", "phase"]
const guardFields = ["ownerId", "pid", "claimOwnerId"]
const guardPublishAttempts = 3
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

function defaultIsOwnerAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error?.code === "EPERM"
  }
}

function hasExactFields(value, fields) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Reflect.ownKeys(value).length === fields.length &&
    fields.every((field) => Object.hasOwn(value, field))
  )
}

function validOwnerId(value) {
  return typeof value === "string" && uuid.test(value)
}

function validPid(value) {
  return Number.isInteger(value) && value > 0
}

function parseClaim(value) {
  if (
    !hasExactFields(value, claimFields) ||
    !validOwnerId(value.ownerId) ||
    !validPid(value.pid) ||
    !["pre-submit", "submitting"].includes(value.phase)
  ) {
    return null
  }
  return value
}

function parseGuard(value) {
  if (
    !hasExactFields(value, guardFields) ||
    !validOwnerId(value.ownerId) ||
    !validPid(value.pid) ||
    !validOwnerId(value.claimOwnerId)
  ) {
    return null
  }
  return value
}

function parseRecordContents(contents, parser) {
  try {
    return parser(JSON.parse(contents))
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    return null
  }
}

async function readRecord(path, parser, readRecordFile) {
  try {
    return parseRecordContents(await readRecordFile(path, "utf8"), parser)
  } catch (_error) {
    return null
  }
}

function sameRecord(left, right, fields) {
  return left !== null && fields.every((field) => left[field] === right[field])
}

export function createSubmissionClaim(
  directory,
  {
    afterGuardAcquired = async () => {},
    afterReplacementClaimCreated = async () => {},
    generateOwnerId = randomUUID,
    isOwnerAlive = defaultIsOwnerAlive,
    linkClaimFile = link,
    openClaimFile = open,
    readClaimFile = readFile,
    renameClaimFile = rename,
    removeClaimFile = rm,
  } = {},
) {
  const claimPath = join(directory, claimFileName)
  const guardPath = join(directory, reclaimFileName)
  const ownerId = generateOwnerId()
  const claim = { ownerId, pid: process.pid, phase: "pre-submit" }

  const readClaim = () => readRecord(claimPath, parseClaim, readClaimFile)
  const readGuard = () => readRecord(guardPath, parseGuard, readClaimFile)

  async function removeOwned(path, expected, parser, fields) {
    const current = await readRecord(path, parser, readClaimFile)
    if (!sameRecord(current, expected, fields)) return false
    const removalPath = `${path}.${ownerId}.remove`
    try {
      await renameClaimFile(path, removalPath)
    } catch (error) {
      if (error?.code === "ENOENT") return false
      throw error
    }
    const moved = await readRecord(removalPath, parser, readClaimFile)
    if (!sameRecord(moved, expected, fields)) {
      try {
        await linkClaimFile(removalPath, path)
        await removeClaimFile(removalPath, { force: true })
      } catch (error) {
        if (error?.code !== "EEXIST") throw error
      }
      return false
    }
    await removeClaimFile(removalPath, { force: true })
    return true
  }

  function rejectClaim(current) {
    if (current !== null && isOwnerAlive(current.pid)) {
      failNotarization("Notarization submission is already in progress")
    }
    failNotarization("Notarization submission requires manual recovery")
  }

  async function writeClaim() {
    const temporaryPath = join(directory, `.${claimFileName}.${ownerId}.tmp`)
    try {
      await writeSyncedExclusive(temporaryPath, claim, openClaimFile)
      await linkClaimFile(temporaryPath, claimPath)
      await syncDirectory(directory, openClaimFile)
    } finally {
      await removeClaimFile(temporaryPath, { force: true })
    }
  }

  async function publishGuard(guard) {
    const temporaryPath = join(directory, `.${reclaimFileName}.${ownerId}.tmp`)
    try {
      await writeSyncedExclusive(temporaryPath, guard, openClaimFile)
      await linkClaimFile(temporaryPath, guardPath)
      await syncDirectory(directory, openClaimFile)
    } finally {
      await removeClaimFile(temporaryPath, { force: true })
    }
  }

  async function acquireGuard(claimOwnerId) {
    const guard = { ownerId, pid: process.pid, claimOwnerId }
    for (let attempt = 0; attempt < guardPublishAttempts; attempt += 1) {
      try {
        await publishGuard(guard)
        await afterGuardAcquired()
        return guard
      } catch (error) {
        if (error?.code !== "EEXIST") {
          if (error?.name === "NotarizationError") throw error
          failNotarization("Notarization evidence is unavailable")
        }
      }

      const existingGuard = await readGuard()
      if (existingGuard === null) {
        failNotarization("Notarization submission requires manual recovery")
      }
      if (isOwnerAlive(existingGuard.pid)) {
        failNotarization("Notarization submission is already in progress")
      }
      if (attempt === guardPublishAttempts - 1) {
        failNotarization("Notarization submission requires manual recovery")
      }
      await removeOwned(guardPath, existingGuard, parseGuard, guardFields)
    }
    failNotarization("Notarization submission requires manual recovery")
  }

  return Object.freeze({
    async acquire() {
      await mkdir(directory, { recursive: true })
      let staleClaim = await readClaim()
      if (staleClaim === null) {
        try {
          await writeClaim()
          return
        } catch (error) {
          if (error?.code !== "EEXIST") failNotarization("Notarization evidence is unavailable")
        }
        staleClaim = await readClaim()
      }

      if (
        staleClaim === null ||
        staleClaim.phase !== "pre-submit" ||
        isOwnerAlive(staleClaim.pid)
      ) {
        return rejectClaim(staleClaim)
      }

      const guard = await acquireGuard(staleClaim.ownerId)
      try {
        const currentClaim = await readClaim()
        if (
          currentClaim?.ownerId !== guard.claimOwnerId ||
          currentClaim.phase !== "pre-submit" ||
          isOwnerAlive(currentClaim.pid)
        ) {
          return rejectClaim(currentClaim)
        }
        if (!(await removeOwned(claimPath, currentClaim, parseClaim, claimFields))) {
          return rejectClaim(await readClaim())
        }
        try {
          await writeClaim()
          await afterReplacementClaimCreated()
        } catch (error) {
          if (error?.code === "EEXIST") return rejectClaim(await readClaim())
          failNotarization("Notarization evidence is unavailable")
        }
      } finally {
        await removeOwned(guardPath, guard, parseGuard, guardFields)
      }
    },
    async release() {
      const currentClaim = await readClaim()
      if (currentClaim?.ownerId !== ownerId) return
      await removeOwned(claimPath, currentClaim, parseClaim, claimFields)
    },
    async markSubmitting() {
      let handle
      try {
        handle = await openClaimFile(claimPath, "r+")
        const currentClaim = parseRecordContents(await handle.readFile("utf8"), parseClaim)
        if (currentClaim?.ownerId !== ownerId || currentClaim.pid !== process.pid) {
          failNotarization("Notarization submission requires manual recovery")
        }
        const contents = `${JSON.stringify({ ownerId, pid: process.pid, phase: "submitting" })}\n`
        await handle.write(contents, 0, "utf8")
        await handle.truncate(Buffer.byteLength(contents))
        await handle.sync()
      } finally {
        await handle?.close()
      }
    },
  })
}
