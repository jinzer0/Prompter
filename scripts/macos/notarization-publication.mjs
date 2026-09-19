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
    let publicationIsDurable = false
    try {
      await writeSyncedExclusive(temporaryPath, record, openRecordFile)
      await linkRecordFile(temporaryPath, finalPath)
      finalLinkExists = true
      await syncDirectory(directory, openRecordFile)
      publicationIsDurable = true
    } catch (error) {
      if (finalLinkExists) {
        await removeOwned({ path: finalPath, expected: record, parser, fields })
      }
      throw error
    } finally {
      if (publicationIsDurable) {
        await Promise.allSettled([removeRecordFile(temporaryPath, { force: true })])
      } else {
        await removeRecordFile(temporaryPath, { force: true })
      }
    }
  }
}
