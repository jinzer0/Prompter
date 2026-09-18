import { randomUUID } from "node:crypto"
import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { failNotarization } from "./notarization-contract.mjs"

const claimFileName = ".notarization-submit.claim"
const reclaimFileName = ".notarization-submit.reclaim"

function ownerAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error?.code === "EPERM"
  }
}

async function stalePreSubmitClaim(claimPath, readClaimFile = readFile) {
  try {
    const claim = JSON.parse(await readClaimFile(claimPath, "utf8"))
    return claim?.phase === "pre-submit" && Number.isInteger(claim.pid) && !ownerAlive(claim.pid)
  } catch {
    return false
  }
}

async function liveClaim(claimPath, readClaimFile = readFile) {
  try {
    const claim = JSON.parse(await readClaimFile(claimPath, "utf8"))
    return Number.isInteger(claim?.pid) && ownerAlive(claim.pid)
  } catch {
    return false
  }
}

export async function writeAtomicJson({ directory, fileName, value, renameFile = rename }) {
  await mkdir(directory, { recursive: true })
  const targetPath = join(directory, fileName)
  const temporaryPath = join(directory, `.${fileName}.${randomUUID()}.tmp`)
  try {
    const handle = await open(temporaryPath, "wx", 0o600)
    try {
      await handle.writeFile(`${JSON.stringify(value)}\n`)
      await handle.sync()
    } finally {
      await handle.close()
    }
    await renameFile(temporaryPath, targetPath)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

export function createSubmissionClaim(
  directory,
  { openClaimFile = open, readClaimFile = readFile, removeClaimFile = rm } = {},
) {
  const claimPath = join(directory, claimFileName)
  const reclaimPath = join(directory, reclaimFileName)

  async function writeClaim() {
    let handle
    try {
      handle = await openClaimFile(claimPath, "wx", 0o600)
      await handle.writeFile(`${JSON.stringify({ pid: process.pid, phase: "pre-submit" })}\n`)
      await handle.sync()
    } finally {
      await handle?.close()
    }
  }

  async function rejectExistingClaim() {
    if (await liveClaim(claimPath, readClaimFile))
      failNotarization("Notarization submission is already in progress")
    failNotarization("Notarization submission requires manual recovery")
  }

  return Object.freeze({
    async acquire() {
      await mkdir(directory, { recursive: true })
      try {
        await writeClaim()
        return
      } catch (error) {
        if (error?.code !== "EEXIST") failNotarization("Notarization evidence is unavailable")
      }
      if (!(await stalePreSubmitClaim(claimPath, readClaimFile))) {
        return rejectExistingClaim()
      }

      let reclaimHandle
      try {
        reclaimHandle = await openClaimFile(reclaimPath, "wx", 0o600)
      } catch (error) {
        if (error?.code === "EEXIST")
          failNotarization("Notarization submission is already in progress")
        failNotarization("Notarization evidence is unavailable")
      }
      try {
        if (!(await stalePreSubmitClaim(claimPath, readClaimFile))) {
          return rejectExistingClaim()
        }
        await removeClaimFile(claimPath, { force: true })
        try {
          await writeClaim()
        } catch (error) {
          if (error?.code === "EEXIST") return rejectExistingClaim()
          failNotarization("Notarization evidence is unavailable")
        }
      } finally {
        await reclaimHandle?.close()
        await removeClaimFile(reclaimPath, { force: true })
      }
    },
    async release() {
      await rm(claimPath, { force: true })
    },
    async markSubmitting() {
      await writeFile(claimPath, `${JSON.stringify({ pid: process.pid, phase: "submitting" })}\n`)
    },
  })
}
