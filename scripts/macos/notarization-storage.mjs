import { randomUUID } from "node:crypto"
import { mkdir, open, rename, rm } from "node:fs/promises"
import { join } from "node:path"

import { failNotarization } from "./notarization-contract.mjs"

const claimFileName = ".notarization-submit.claim"

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
        await handle.sync()
      } catch (error) {
        if (error?.code === "EEXIST")
          failNotarization("Notarization submission is already in progress")
        failNotarization("Notarization evidence is unavailable")
      } finally {
        await handle?.close()
      }
    },
    async release() {
      await rm(claimPath, { force: true })
    },
  })
}
