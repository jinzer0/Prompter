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
const bundleIdentifier = "com.local.prompter"
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
const packagedExecutable = join(packagedApp, "Contents", "MacOS", appName)
const resourcesApp = join(packagedApp, "Contents", "Resources", "app")
const zipPath = join(outputRoot, `${appName}-darwin-${process.arch}.zip`)

async function copyAppSource() {
  await mkdir(resourcesApp, { recursive: true })
  await Promise.all([
    cp(join(root, "dist"), join(resourcesApp, "dist"), { recursive: true }),
    cp(join(root, "dist-electron"), join(resourcesApp, "dist-electron"), { recursive: true }),
    cp(join(root, "drizzle"), join(resourcesApp, "drizzle"), { recursive: true }),
    cp(join(root, "package.json"), join(resourcesApp, "package.json")),
    cp(join(root, "node_modules"), join(resourcesApp, "node_modules"), { recursive: true }),
  ])
}

async function updateInfoPlist(plistPath, identifier, executable, name) {
  const current = await readFile(plistPath, "utf8")
  const updated = replacePlistString(
    replacePlistString(
      replacePlistString(
        replacePlistString(current, "CFBundleIdentifier", identifier),
        "CFBundleExecutable",
        executable,
      ),
      "CFBundleName",
      name,
    ),
    "CFBundleDisplayName",
    name,
  )

  await writeFile(plistPath, updated)
}

function replacePlistString(source, key, value) {
  const pattern = new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`)

  if (!pattern.test(source)) {
    throw new Error(`Missing Info.plist string key: ${key}`)
  }

  return source.replace(pattern, `$1${value}$2`)
}

function replaceOrInsertPlistString(source, key, value) {
  const pattern = new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`)
  if (pattern.test(source)) {
    return source.replace(pattern, `$1${value}$2`)
  }

  const dictEndIndex = source.lastIndexOf("</dict>")
  if (dictEndIndex === -1) {
    throw new Error("Missing Info.plist dictionary")
  }

  return `${source.slice(0, dictEndIndex)}\n<key>${key}</key>\n<string>${value}</string>\n${source.slice(dictEndIndex)}`
}

function readPlistString(source, key) {
  const pattern = new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`)
  const match = source.match(pattern)
  if (match === null || match[1] === undefined) {
    throw new Error(`Missing Info.plist string key: ${key}`)
  }

  return match[1]
}

function renamedHelperName(helperName) {
  return helperName.replace("Electron", appName)
}

function renamedHelperIdentifier(currentIdentifier) {
  const helperSuffixIndex = currentIdentifier.indexOf(".helper")
  if (helperSuffixIndex === -1) {
    return `${bundleIdentifier}.helper`
  }

  return `${bundleIdentifier}${currentIdentifier.slice(helperSuffixIndex)}`
}

async function updateHelperInfoPlist(plistPath, identifier, executable, name) {
  const current = await readFile(plistPath, "utf8")
  const updated = replaceOrInsertPlistString(
    replaceOrInsertPlistString(
      replacePlistString(
        replacePlistString(current, "CFBundleIdentifier", identifier),
        "CFBundleName",
        name,
      ),
      "CFBundleExecutable",
      executable,
    ),
    "CFBundleDisplayName",
    name,
  )

  await writeFile(plistPath, updated)
}

async function renameElectronHelper(frameworksPath, helperName) {
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
  await updateHelperInfoPlist(
    helperInfoPlist,
    renamedHelperIdentifier(currentIdentifier),
    renamedName,
    renamedName,
  )
}

export async function renameElectronApp(appPath = packagedApp) {
  const contentsPath = join(appPath, "Contents")
  await rename(join(contentsPath, "MacOS", "Electron"), join(contentsPath, "MacOS", appName))
  await updateInfoPlist(join(contentsPath, "Info.plist"), bundleIdentifier, appName, appName)

  const frameworksPath = join(contentsPath, "Frameworks")
  for (const helperName of electronHelperNames) {
    await renameElectronHelper(frameworksPath, helperName)
  }
}

async function createZipArchive() {
  await rm(zipPath, { force: true })
  await runFile("/usr/bin/ditto", ["-c", "-k", "--keepParent", appBundleName, zipPath], {
    cwd: packageRoot,
  })
}

export function resolveMacOSArchitecture(architecture = process.arch) {
  if (architecture === "arm64" || architecture === "x64") {
    return architecture
  }

  throw new Error(`Unsupported macOS architecture: ${architecture}`)
}

async function readPackageVersion(packageJsonPath) {
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"))
  if (typeof packageJson.version !== "string") {
    throw new Error(`Missing package version in ${packageJsonPath}`)
  }

  return packageJson.version
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
    if (stagingDirectory !== undefined) {
      await rm(stagingDirectory, { recursive: true, force: true })
    }
  }
}

async function packageMacOSApp() {
  resolveMacOSArchitecture()
  await rm(packageRoot, { recursive: true, force: true })
  await mkdir(packageRoot, { recursive: true })
  await cp(electronApp, packagedApp, { recursive: true, verbatimSymlinks: true })
  await renameElectronApp()
  await copyAppSource()
  await access(packagedExecutable)
  await createZipArchive()
  await access(zipPath)
  const dmgPath = await createDmgArchive()

  console.log(`Created unsigned macOS app at ${packagedApp}`)
  console.log(`Created unsigned macOS zip at ${zipPath}`)
  console.log(`Created unsigned macOS dmg at ${dmgPath}`)
  console.log("Included better-sqlite3 native dependency through node_modules.")
  console.log("Included drizzle migrations for production startup.")
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await packageMacOSApp()
}
