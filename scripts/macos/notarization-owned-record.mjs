import { syncDirectory } from "./notarization-durable-storage.mjs"

export function parseRecordContents(contents, parser) {
  try {
    return parser(JSON.parse(contents))
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    return null
  }
}

export async function readRecord(path, parser, readRecordFile) {
  try {
    return parseRecordContents(await readRecordFile(path, "utf8"), parser)
  } catch (_error) {
    return null
  }
}

function sameRecord(left, right, fields) {
  return left !== null && fields.every((field) => left[field] === right[field])
}

export function createOwnedRecordRemover({
  directory,
  ownerId,
  linkRecordFile,
  openRecordFile,
  readRecordFile,
  renameRecordFile,
  removeRecordFile,
}) {
  return async function removeOwned({ path, expected, parser, fields }) {
    const current = await readRecord(path, parser, readRecordFile)
    if (!sameRecord(current, expected, fields)) return false
    const removalPath = `${path}.${ownerId}.remove`
    try {
      await renameRecordFile(path, removalPath)
    } catch (error) {
      if (error?.code === "ENOENT") return false
      throw error
    }

    const moved = await readRecord(removalPath, parser, readRecordFile)
    if (!sameRecord(moved, expected, fields)) {
      try {
        await linkRecordFile(removalPath, path)
      } catch (error) {
        if (error?.code === "EEXIST") return false
        throw error
      }
      await removeRecordFile(removalPath, { force: true })
      await syncDirectory(directory, openRecordFile)
      return false
    }

    await removeRecordFile(removalPath, { force: true })
    await syncDirectory(directory, openRecordFile)
    return true
  }
}
