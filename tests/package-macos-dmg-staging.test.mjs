import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { promisify } from "node:util"

import { afterEach, test } from "vitest"

import { createDmgArchive } from "../scripts/package-macos.mjs"
import {
  createPackageFixture,
  createTemporaryDirectoryTracker,
  dmgOptions,
} from "./support/macos-package-fixtures.mjs"

const executeFile = promisify(execFile)
const temporaryDirectories = createTemporaryDirectoryTracker()
afterEach(() => temporaryDirectories.cleanup())

test("preserves a synthetic xattr when ditto stages the app for a DMG", async () => {
  const fixture = temporaryDirectories.track(await createPackageFixture())
  const attributeName = "com.prompter.stage631"
  const attributeValue = "synthetic-xattr"
  const markerPath = join(fixture.appPath, "Contents", "xattr-marker")
  await mkdir(join(fixture.appPath, "Contents"))
  await writeFile(markerPath, "marker")
  await executeFile("/usr/bin/xattr", ["-w", attributeName, attributeValue, markerPath])
  let stagedAttribute

  await createDmgArchive({
    ...dmgOptions(fixture, "arm64"),
    runFile: async (command, arguments_) => {
      if (command === "/usr/bin/ditto") {
        await executeFile(command, arguments_)
        return
      }
      assert.equal(command, "/usr/bin/hdiutil")
      assert.equal(arguments_[0], "create")
      const stagingDirectory = arguments_[arguments_.indexOf("-srcfolder") + 1]
      stagedAttribute = (
        await executeFile("/usr/bin/xattr", [
          "-p",
          attributeName,
          join(stagingDirectory, "Prompter.app", "Contents", "xattr-marker"),
        ])
      ).stdout
      await writeFile(arguments_.at(-1), "DMG")
    },
  })

  assert.equal(stagedAttribute.trimEnd(), attributeValue)
})
