import { chmod, mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

export const electronHelperNames = [
  "Electron Helper",
  "Electron Helper (Renderer)",
  "Electron Helper (GPU)",
  "Electron Helper (Plugin)",
]

const frameworkNames = ["Electron Framework", "Mantle", "ReactiveObjC", "Squirrel"]
const electronFrameworkFiles = [
  "Electron Framework",
  "Helpers/chrome_crashpad_handler",
  "Libraries/libEGL.dylib",
  "Libraries/libGLESv2.dylib",
  "Libraries/libffmpeg.dylib",
  "Libraries/libvk_swiftshader.dylib",
]

export function helperSuffix(helperName) {
  return helperName.slice(15).replaceAll(" (", ".").replaceAll(")", "").toLowerCase()
}

function createPlist({
  bundleIdentifier,
  bundleName,
  executable,
  includeDisplayName = true,
  includeExecutable = true,
}) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<plist version="1.0">',
    "<dict>",
    "<key>CFBundleIdentifier</key>",
    `<string>${bundleIdentifier}</string>`,
    ...(includeExecutable
      ? ["<key>CFBundleExecutable</key>", `<string>${executable}</string>`]
      : []),
    "<key>CFBundleName</key>",
    `<string>${bundleName}</string>`,
    ...(includeDisplayName
      ? ["<key>CFBundleDisplayName</key>", `<string>${bundleName}</string>`]
      : []),
    "<key>LSEnvironment</key>",
    "<dict>",
    "<key>NESTED_VALUE</key>",
    "<string>preserve-me</string>",
    "</dict>",
    "<key>ElectronAsarIntegrity</key>",
    "<string>preserve-me</string>",
    "</dict>",
    "</plist>",
  ].join("\n")
}

async function executable(path, contents = "framework binary") {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, contents)
  await chmod(path, 0o755)
}

async function createElectronBundle(bundlePath, bundleName, bundleIdentifier, plistOptions) {
  const contentsPath = join(bundlePath, "Contents")
  const executablePath = join(contentsPath, "MacOS", bundleName)
  await executable(executablePath, `${bundleName} executable`)
  await writeFile(
    join(contentsPath, "Info.plist"),
    createPlist({ bundleIdentifier, bundleName, executable: bundleName, ...plistOptions }),
  )
}

async function createFramework(frameworksPath, name, filePaths) {
  const frameworkPath = join(frameworksPath, `${name}.framework`)
  const versionPath = join(frameworkPath, "Versions", "A")
  await Promise.all(filePaths.map((path) => executable(join(versionPath, path))))
  await symlink("A", join(frameworkPath, "Versions", "Current"))
  await symlink(`Versions/Current/${name}`, join(frameworkPath, name))
  if (name === "Squirrel")
    await symlink("Versions/Current/Resources", join(frameworkPath, "Resources"))
  return frameworkPath
}

export async function createElectronAppFixture() {
  const root = await mkdtemp(join(tmpdir(), "prompter-electron-app-test-"))
  const appPath = join(root, "Electron.app")
  const frameworksPath = join(appPath, "Contents", "Frameworks")
  await createElectronBundle(appPath, "Electron", "com.github.Electron")
  await Promise.all(
    electronHelperNames.map((helperName) =>
      createElectronBundle(
        join(frameworksPath, `${helperName}.app`),
        helperName,
        `com.github.Electron.helper${helperSuffix(helperName)}`,
        { includeDisplayName: false, includeExecutable: false },
      ),
    ),
  )
  const frameworkPaths = await Promise.all(
    frameworkNames.map((name) =>
      createFramework(
        frameworksPath,
        name,
        name === "Electron Framework"
          ? electronFrameworkFiles
          : [name, ...(name === "Squirrel" ? ["Resources/ShipIt"] : [])],
      ),
    ),
  )
  const electronFrameworkPath = frameworkPaths[0]
  const frameworkBinaryPath = join(electronFrameworkPath, "Versions", "A", "Electron Framework")
  return {
    appPath,
    frameworkBinaryPath,
    frameworkLinkPath: join(electronFrameworkPath, "Electron Framework"),
    temporaryDirectories: [root],
  }
}
