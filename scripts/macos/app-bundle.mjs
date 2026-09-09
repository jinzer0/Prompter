import { readFile, rename, writeFile } from "node:fs/promises"
import { join } from "node:path"

const electronHelperNames = [
  "Electron Helper",
  "Electron Helper (Renderer)",
  "Electron Helper (GPU)",
  "Electron Helper (Plugin)",
]

function setPlistString(source, key, value, insertIfMissing = false) {
  const pattern = new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`)
  if (pattern.test(source)) return source.replace(pattern, `$1${value}$2`)
  if (!insertIfMissing) throw new Error(`Missing Info.plist string key: ${key}`)

  const dictEndIndex = source.lastIndexOf("</dict>")
  if (dictEndIndex === -1) throw new Error("Missing Info.plist dictionary")
  return `${source.slice(0, dictEndIndex)}\n<key>${key}</key>\n<string>${value}</string>\n${source.slice(dictEndIndex)}`
}

async function updatePlist(plistPath, values, version) {
  let plist = await readFile(plistPath, "utf8")
  for (const [key, value, insertIfMissing] of values) {
    plist = setPlistString(plist, key, value, insertIfMissing)
  }
  if (version !== undefined) {
    plist = setPlistString(plist, "CFBundleShortVersionString", version, true)
    plist = setPlistString(plist, "CFBundleVersion", version, true)
  }
  await writeFile(plistPath, plist)
}

function readPlistString(source, key) {
  const pattern = new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`)
  const match = source.match(pattern)
  if (match === null || match[1] === undefined) {
    throw new Error(`Missing Info.plist string key: ${key}`)
  }
  return match[1]
}

function renamedHelperIdentifier(currentIdentifier, bundleIdentifier) {
  const helperSuffixIndex = currentIdentifier.indexOf(".helper")
  return `${bundleIdentifier}${
    helperSuffixIndex === -1 ? ".helper" : currentIdentifier.slice(helperSuffixIndex)
  }`
}

async function renameElectronHelper(options) {
  const { appName, bundleExecutableKey, bundleIdentifier, frameworksPath, helperName, version } =
    options
  const renamedName = helperName.replace("Electron", appName)
  const renamedHelperPath = join(frameworksPath, `${renamedName}.app`)
  await rename(join(frameworksPath, `${helperName}.app`), renamedHelperPath)
  await rename(
    join(renamedHelperPath, "Contents", "MacOS", helperName),
    join(renamedHelperPath, "Contents", "MacOS", renamedName),
  )

  const helperInfoPlist = join(renamedHelperPath, "Contents", "Info.plist")
  const currentIdentifier = readPlistString(
    await readFile(helperInfoPlist, "utf8"),
    "CFBundleIdentifier",
  )
  await updatePlist(
    helperInfoPlist,
    [
      ["CFBundleIdentifier", renamedHelperIdentifier(currentIdentifier, bundleIdentifier), false],
      ["CFBundleName", renamedName, false],
      [bundleExecutableKey, renamedName, true],
      ["CFBundleDisplayName", renamedName, true],
    ],
    version,
  )
}

export async function renameElectronApp(options) {
  const { appName, appPath, bundleExecutableKey, bundleIdentifier, version } = options
  const contentsPath = join(appPath, "Contents")
  await rename(join(contentsPath, "MacOS", "Electron"), join(contentsPath, "MacOS", appName))
  await updatePlist(
    join(contentsPath, "Info.plist"),
    [
      ["CFBundleIdentifier", bundleIdentifier, false],
      [bundleExecutableKey, appName, false],
      ["CFBundleName", appName, false],
      ["CFBundleDisplayName", appName, false],
    ],
    version,
  )
  const frameworksPath = join(contentsPath, "Frameworks")
  for (const helperName of electronHelperNames) {
    await renameElectronHelper({
      appName,
      bundleExecutableKey,
      bundleIdentifier,
      frameworksPath,
      helperName,
      version,
    })
  }
}
