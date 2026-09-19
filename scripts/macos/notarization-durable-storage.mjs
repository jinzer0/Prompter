import { randomUUID } from "node:crypto"
import { mkdir, open, rename, rm } from "node:fs/promises"
import { join } from "node:path"

export async function writeSyncedExclusive(path, value, openFile = open) {
  let handle
  try {
    handle = await openFile(path, "wx", 0o600)
    await handle.writeFile(`${JSON.stringify(value)}\n`)
    await handle.sync()
  } finally {
    await handle?.close()
  }
}

export async function syncDirectory(directory, openDirectory = open) {
  let handle
  try {
    handle = await openDirectory(directory, "r")
    await handle.sync()
  } finally {
    await handle?.close()
  }
}

export async function writeAtomicJson({ directory, fileName, value, renameFile = rename }) {
  await mkdir(directory, { recursive: true })
  const targetPath = join(directory, fileName)
  const temporaryPath = join(directory, `.${fileName}.${randomUUID()}.tmp`)
  try {
    await writeSyncedExclusive(temporaryPath, value)
    await renameFile(temporaryPath, targetPath)
    await syncDirectory(directory)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}
