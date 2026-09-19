import { randomUUID } from "node:crypto"
import { link, mkdir, open, readFile, rename, rm } from "node:fs/promises"
import { join } from "node:path"

import { failNotarization } from "./notarization-contract.mjs"
import {
  createOwnedRecordRemover,
  parseRecordContents,
  readRecord,
} from "./notarization-owned-record.mjs"
import { createRecordPublisher } from "./notarization-publication.mjs"

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

  const removeOwned = createOwnedRecordRemover({
    directory,
    ownerId,
    linkRecordFile: linkClaimFile,
    openRecordFile: openClaimFile,
    readRecordFile: readClaimFile,
    renameRecordFile: renameClaimFile,
    removeRecordFile: removeClaimFile,
  })

  function rejectClaim(current) {
    if (current !== null && isOwnerAlive(current.pid)) {
      failNotarization("Notarization submission is already in progress")
    }
    failNotarization("Notarization submission requires manual recovery")
  }

  const publishRecord = createRecordPublisher({
    directory,
    linkRecordFile: linkClaimFile,
    openRecordFile: openClaimFile,
    removeRecordFile: removeClaimFile,
    removeOwned,
  })

  async function writeClaim() {
    await publishRecord({
      finalPath: claimPath,
      temporaryPath: join(directory, `.${claimFileName}.${ownerId}.tmp`),
      record: claim,
      parser: parseClaim,
      fields: claimFields,
    })
  }

  async function publishGuard(guard) {
    await publishRecord({
      finalPath: guardPath,
      temporaryPath: join(directory, `.${reclaimFileName}.${ownerId}.tmp`),
      record: guard,
      parser: parseGuard,
      fields: guardFields,
    })
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
      await removeOwned({
        path: guardPath,
        expected: existingGuard,
        parser: parseGuard,
        fields: guardFields,
      })
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
        if (
          !(await removeOwned({
            path: claimPath,
            expected: currentClaim,
            parser: parseClaim,
            fields: claimFields,
          }))
        ) {
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
        await removeOwned({
          path: guardPath,
          expected: guard,
          parser: parseGuard,
          fields: guardFields,
        })
      }
    },
    async release() {
      const currentClaim = await readClaim()
      if (currentClaim?.ownerId !== ownerId) return
      await removeOwned({
        path: claimPath,
        expected: currentClaim,
        parser: parseClaim,
        fields: claimFields,
      })
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
