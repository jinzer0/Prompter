import { execFile } from "node:child_process"
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const runFile = promisify(execFile)

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const appName = "Prompter"
const appBundleName = "Prompter.app"
const bundleIdentifier = "com.jinzer0.prompter"
const electronHelperNames = [
  "Electron Helper",
  "Electron Helper (Renderer)",
  "Electron Helper (GPU)",
  "Electron Helper (Plugin)",
]
const electronApp = join(root, "node_modules", "electron", "dist", "Electron.app")
const outputRoot = join(root, "release")
const packageRoot = join(outputRoot, `${appName}-darwin-${process.arch}`)
const packagedApp = join(packageRoot, appBundleName)
const releaseInputNames = ["PROMPTER_SIGNING_IDENTITY", "PROMPTER_NOTARY_PROFILE"]

async function copyAppSource(resourcesPath, sourceRoot = root) {
  await mkdir(resourcesPath, { recursive: true })
  await Promise.all([
    ...["dist", "dist-electron", "drizzle", "node_modules"].map((name) =>
      cp(join(sourceRoot, name), join(resourcesPath, name), { recursive: true }),
    ),
    cp(join(sourceRoot, "package.json"), join(resourcesPath, "package.json")),
  ])
}

function setPlistString(source, key, value, insertIfMissing = false) {
  const pattern = new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`)
  if (pattern.test(source)) {
    return source.replace(pattern, `$1${value}$2`)
  }
  if (!insertIfMissing) {
    throw new Error(`Missing Info.plist string key: ${key}`)
  }

  const dictEndIndex = source.lastIndexOf("</dict>")
  if (dictEndIndex === -1) {
    throw new Error("Missing Info.plist dictionary")
  }

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

const renamedHelperName = (helperName) => helperName.replace("Electron", appName)

function renamedHelperIdentifier(currentIdentifier) {
  const helperSuffixIndex = currentIdentifier.indexOf(".helper")
  return `${bundleIdentifier}${
    helperSuffixIndex === -1 ? ".helper" : currentIdentifier.slice(helperSuffixIndex)
  }`
}

async function renameElectronHelper(frameworksPath, helperName, version) {
  const renamedName = renamedHelperName(helperName)
  const helperPath = join(frameworksPath, `${helperName}.app`)
  const renamedHelperPath = join(frameworksPath, `${renamedName}.app`)
  await rename(helperPath, renamedHelperPath)
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
      ["CFBundleIdentifier", renamedHelperIdentifier(currentIdentifier), false],
      ["CFBundleName", renamedName, false],
      ["CFBundleExecutable", renamedName, true],
      ["CFBundleDisplayName", renamedName, true],
    ],
    version,
  )
}

export async function renameElectronApp(appPath = packagedApp, version) {
  const contentsPath = join(appPath, "Contents")
  await rename(join(contentsPath, "MacOS", "Electron"), join(contentsPath, "MacOS", appName))
  await updatePlist(
    join(contentsPath, "Info.plist"),
    [
      ["CFBundleIdentifier", bundleIdentifier, false],
      ["CFBundleExecutable", appName, false],
      ["CFBundleName", appName, false],
      ["CFBundleDisplayName", appName, false],
    ],
    version,
  )

  const frameworksPath = join(contentsPath, "Frameworks")
  for (const helperName of electronHelperNames) {
    await renameElectronHelper(frameworksPath, helperName, version)
  }
}

export function resolveMacOSArchitecture(architecture = process.arch) {
  if (["arm64", "x64"].includes(architecture)) return architecture
  throw new Error(`Unsupported macOS architecture: ${architecture}`)
}

export function resolveReleaseMacOSArchitecture(architecture = process.arch) {
  if (resolveMacOSArchitecture(architecture) === "arm64") return architecture
  throw new Error(`Release packaging supports only macOS arm64: ${architecture}`)
}

async function readPackageVersion(packageJsonPath) {
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"))
  if (typeof packageJson.version !== "string" || !isSemanticVersion(packageJson.version))
    throw new Error(`Invalid package version in ${packageJsonPath}`)
  return packageJson.version
}

function isSemanticVersion(version) {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(
    version,
  )
}

export async function assembleMacOSApp({
  appPath = packagedApp,
  electronAppPath = electronApp,
  packageJsonPath = join(root, "package.json"),
  sourceRoot = root,
} = {}) {
  const version = await readPackageVersion(packageJsonPath)
  const resourcesPath = join(appPath, "Contents", "Resources", "app")

  await rm(appPath, { recursive: true, force: true })
  await mkdir(dirname(appPath), { recursive: true })
  try {
    await cp(electronAppPath, appPath, { recursive: true, verbatimSymlinks: true })
    await renameElectronApp(appPath, version)
    await copyAppSource(resourcesPath, sourceRoot)
    await access(join(appPath, "Contents", "MacOS", appName))
    return appPath
  } catch (error) {
    await rm(appPath, { recursive: true, force: true })
    throw error
  }
}

export async function createZipArchive({
  arch = process.arch,
  appPath = packagedApp,
  outputDirectory = outputRoot,
  packageJsonPath = join(root, "package.json"),
  runFile: executeFile = runFile,
} = {}) {
  const architecture = resolveMacOSArchitecture(arch)
  const version = await readPackageVersion(packageJsonPath)
  const zipPath = join(outputDirectory, `${appName}-${version}-mac-${architecture}.zip`)

  try {
    await rm(zipPath, { force: true })
    await executeFile("/usr/bin/ditto", ["-c", "-k", "--keepParent", appBundleName, zipPath], {
      cwd: dirname(appPath),
    })
    await access(zipPath)
    return zipPath
  } catch (error) {
    await rm(zipPath, { force: true })
    throw error
  }
}

export async function createDmgArchive({
  arch = process.arch,
  appPath = packagedApp,
  outputDirectory = outputRoot,
  packageJsonPath = join(root, "package.json"),
  runFile: executeFile = runFile,
} = {}) {
  const architecture = resolveMacOSArchitecture(arch)
  const version = await readPackageVersion(packageJsonPath)
  const dmgPath = join(outputDirectory, `${appName}-${version}-mac-${architecture}.dmg`)
  let stagingDirectory

  try {
    await rm(dmgPath, { force: true })
    stagingDirectory = await mkdtemp(join(tmpdir(), `${appName}-dmg-`))
    await cp(appPath, join(stagingDirectory, appBundleName), {
      recursive: true,
      verbatimSymlinks: true,
    })
    await symlink("/Applications", join(stagingDirectory, "Applications"))
    await executeFile("/usr/bin/hdiutil", [
      "create",
      "-volname",
      appName,
      "-srcfolder",
      stagingDirectory,
      "-ov",
      "-format",
      "UDZO",
      dmgPath,
    ])
    await access(dmgPath)
    return dmgPath
  } catch (error) {
    await rm(dmgPath, { force: true })
    throw error
  } finally {
    if (stagingDirectory !== undefined) await rm(stagingDirectory, { recursive: true, force: true })
  }
}

async function packageMacOSApp() {
  resolveMacOSArchitecture()
  await assembleMacOSApp()
  const zipPath = await createZipArchive()
  const dmgPath = await createDmgArchive()

  console.log(`Created unsigned local macOS app at ${packagedApp}`)
  console.log(`Created unsigned local macOS zip at ${zipPath}`)
  console.log(`Created unsigned local macOS dmg at ${dmgPath}`)
  console.log("Included better-sqlite3 native dependency through node_modules.")
  console.log("Included drizzle migrations for production startup.")
}

async function runReleasePreflight() {
  await readPackageVersion(join(root, "package.json"))
  resolveReleaseMacOSArchitecture()

  const missingInput = releaseInputNames.find(
    (name) => typeof process.env[name] !== "string" || process.env[name].trim() === "",
  )
  if (missingInput !== undefined) {
    throw new Error(`Missing required release input: ${missingInput}`)
  }

  throw new Error("Release packaging requires the Stage 3 macOS release coordinator.")
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await (process.argv[2] === "--release-preflight" ? runReleasePreflight() : packageMacOSApp())
}
