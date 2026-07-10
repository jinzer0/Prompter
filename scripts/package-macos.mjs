import { execFile } from "node:child_process"
import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const runFile = promisify(execFile)

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const appName = "Prompter"
const appBundleName = "Prompter.app"
const bundleIdentifier = "com.local.prompter"
const electronApp = join(root, "node_modules", "electron", "dist", "Electron.app")
const outputRoot = join(root, "release")
const packageRoot = join(outputRoot, `${appName}-darwin-${process.arch}`)
const packagedApp = join(packageRoot, appBundleName)
const packagedExecutable = join(packagedApp, "Contents", "MacOS", "Electron")
const resourcesApp = join(packagedApp, "Contents", "Resources", "app")
const infoPlist = join(packagedApp, "Contents", "Info.plist")
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

async function updateInfoPlist() {
  const current = await readFile(infoPlist, "utf8")
  const updated = replaceOptionalPlistString(
    replacePlistString(
      replacePlistString(
        replacePlistString(current, "CFBundleIdentifier", bundleIdentifier),
        "CFBundleExecutable",
        "Electron",
      ),
      "CFBundleName",
      appName,
    ),
    "CFBundleDisplayName",
    appName,
  )

  await writeFile(infoPlist, updated)
}

function replacePlistString(source, key, value) {
  const pattern = new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`)

  if (!pattern.test(source)) {
    throw new Error(`Missing Info.plist string key: ${key}`)
  }

  return source.replace(pattern, `$1${value}$2`)
}

function replaceOptionalPlistString(source, key, value) {
  const pattern = new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`)
  return source.replace(pattern, `$1${value}$2`)
}

async function createZipArchive() {
  await rm(zipPath, { force: true })
  await runFile("/usr/bin/ditto", ["-c", "-k", "--keepParent", appBundleName, zipPath], {
    cwd: packageRoot,
  })
}

async function packageMacOSApp() {
  await rm(packageRoot, { recursive: true, force: true })
  await mkdir(packageRoot, { recursive: true })
  await cp(electronApp, packagedApp, { recursive: true })
  await copyAppSource()
  await updateInfoPlist()
  await access(packagedExecutable)
  await createZipArchive()
  await access(zipPath)

  console.log(`Created unsigned macOS app at ${packagedApp}`)
  console.log(`Created unsigned macOS zip at ${zipPath}`)
  console.log("Included better-sqlite3 native dependency through node_modules.")
  console.log("Included drizzle migrations for production startup.")
}

await packageMacOSApp()
