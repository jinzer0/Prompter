import { syncDirectory, writeSyncedExclusive } from "./notarization-durable-storage.mjs"

export function createRecordPublisher({
  directory,
  linkRecordFile,
  openRecordFile,
  removeRecordFile,
  removeOwned,
}) {
  return async function publishRecord({ finalPath, temporaryPath, record, parser, fields }) {
    let finalLinkExists = false
    try {
      await writeSyncedExclusive(temporaryPath, record, openRecordFile)
      await linkRecordFile(temporaryPath, finalPath)
      finalLinkExists = true
      await syncDirectory(directory, openRecordFile)
    } catch (error) {
      if (finalLinkExists) await removeOwned(finalPath, record, parser, fields)
      throw error
    } finally {
      await removeRecordFile(temporaryPath, { force: true })
    }
  }
}
