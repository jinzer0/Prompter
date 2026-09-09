import { randomUUID } from "node:crypto"
import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { failNotarization } from "./notarization-contract.mjs"

const claimFileName = ".notarization-submit.claim"

function ownerAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error?.code === "EPERM"
  }
}

async function stalePreSubmitClaim(claimPath) {
  try {
    const claim = JSON.parse(await readFile(claimPath, "utf8"))
    return claim?.phase === "pre-submit" && Number.isInteger(claim.pid) && !ownerAlive(claim.pid)
  } catch {
    return false
  }
}

async function liveClaim(claimPath) {
  try {
    const claim = JSON.parse(await readFile(claimPath, "utf8"))
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

export function createSubmissionClaim(directory) {
  const claimPath = join(directory, claimFileName)
  return Object.freeze({
    async acquire() {
      await mkdir(directory, { recursive: true })
      let handle
      try {
        handle = await open(claimPath, "wx", 0o600)
        await handle.writeFile(`${JSON.stringify({ pid: process.pid, phase: "pre-submit" })}\n`)
        await handle.sync()
      } catch (error) {
        if (error?.code === "EEXIST") {
          if (await stalePreSubmitClaim(claimPath)) {
            await rm(claimPath, { force: true })
            return this.acquire()
          }
          if (await liveClaim(claimPath))
            failNotarization("Notarization submission is already in progress")
          failNotarization("Notarization submission requires manual recovery")
        }
        failNotarization("Notarization evidence is unavailable")
      } finally {
        await handle?.close()
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
