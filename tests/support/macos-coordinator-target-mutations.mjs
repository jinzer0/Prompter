import { chmod, mkdir, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

const frameworkPath = [
  "Contents",
  "Frameworks",
  "Electron Framework.framework",
  "Versions",
  "Current",
]

function contentsPath(appPath, ...path) {
  return join(appPath, ...path)
}

async function writeMachO(path) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, Buffer.from([0xcf, 0xfa, 0xed, 0xfe]))
  await chmod(path, 0o755)
}

export async function removeExpectedElectronTarget(appPath) {
  await rm(contentsPath(appPath, ...frameworkPath, "Libraries", "libffmpeg.dylib"))
}

export async function addSecondRuntimeNativeCandidate(appPath) {
  await writeMachO(
    contentsPath(
      appPath,
      "Contents",
      "Resources",
      "app",
      "node_modules",
      "better-sqlite3",
      "build",
      "Release",
      "unexpected.node",
    ),
  )
}

export async function addIgnoredResourceMachO(appPath) {
  await writeMachO(contentsPath(appPath, "Contents", "Resources", "ignored-resource"))
}
