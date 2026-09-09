import assert from "node:assert/strict"
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import { writeAtomicJson } from "../scripts/macos/notarization-storage.mjs"
import { createNotarizationDirectoryTracker } from "./support/macos-notarization-fixtures.mjs"

const temporaryDirectories = createNotarizationDirectoryTracker()
afterEach(() => temporaryDirectories.cleanup())

test("preserves prior evidence and removes its temporary file when replacement is interrupted", async () => {
  const root = await temporaryDirectories.create()
  const resumePath = join(root, "notarization-resume.json")
  await writeFile(resumePath, '{"status":"unknown"}\n')

  await assert.rejects(
    writeAtomicJson({
      directory: root,
      fileName: "notarization-resume.json",
      value: { status: "Accepted" },
      renameFile: async () => {
        throw new Error("synthetic interruption")
      },
    }),
    /synthetic interruption/,
  )

  assert.equal(await readFile(resumePath, "utf8"), '{"status":"unknown"}\n')
  assert.deepEqual(await readdir(root), ["notarization-resume.json"])
})
