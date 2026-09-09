import { cp, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

export function createFakeArtifacts(root) {
  return {
    directory: join(root, "fake-artifacts"),
    nextId: 0,
    snapshots: new Map(),
  }
}

export async function createZipSnapshot(arguments_, options, fakeArtifacts) {
  const contents = `zip-${fakeArtifacts.nextId++}`
  const snapshot = join(fakeArtifacts.directory, contents)
  await cp(join(options.cwd, "Prompter.app"), snapshot, { recursive: true, verbatimSymlinks: true })
  fakeArtifacts.snapshots.set(contents, snapshot)
  await writeFile(arguments_.at(-1), contents)
}

export async function createDmgSnapshot(arguments_, fakeArtifacts) {
  const contents = `dmg-${fakeArtifacts.nextId++}`
  const snapshot = join(fakeArtifacts.directory, contents)
  const stagingDirectory = arguments_[arguments_.indexOf("-srcfolder") + 1]
  await cp(join(stagingDirectory, "Prompter.app"), snapshot, {
    recursive: true,
    verbatimSymlinks: true,
  })
  fakeArtifacts.snapshots.set(contents, snapshot)
  await writeFile(arguments_.at(-1), contents)
}

export async function restoreSnapshot(source, destination, fakeArtifacts) {
  const contents = await readFile(source, "utf8")
  await cp(fakeArtifacts.snapshots.get(contents), join(destination, "Prompter.app"), {
    recursive: true,
    verbatimSymlinks: true,
  })
}
