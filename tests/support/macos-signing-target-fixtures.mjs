import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const helperNames = [
  "Prompter Helper",
  "Prompter Helper (Renderer)",
  "Prompter Helper (GPU)",
  "Prompter Helper (Plugin)",
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

export const electron43SigningTargets = Object.freeze([
  { path: "Contents/MacOS/Prompter", kind: "executable-host", entitlements: true },
  ...helperNames.flatMap((name) => [
    { path: `Contents/Frameworks/${name}.app`, kind: "helper-app", entitlements: true },
    {
      path: `Contents/Frameworks/${name}.app/Contents/MacOS/${name}`,
      kind: "executable-host",
      entitlements: true,
    },
  ]),
  ...frameworkNames.map((name) => ({
    path: `Contents/Frameworks/${name}.framework`,
    kind: "framework",
    entitlements: false,
  })),
  ...electronFrameworkFiles.map((path) => ({
    path: `Contents/Frameworks/Electron Framework.framework/Versions/A/${path}`,
    kind: "dynamic-library",
    entitlements: false,
  })),
  ...["Mantle", "ReactiveObjC", "Squirrel"].map((name) => ({
    path: `Contents/Frameworks/${name}.framework/Versions/A/${name}`,
    kind: "dynamic-library",
    entitlements: false,
  })),
  {
    path: "Contents/Frameworks/Squirrel.framework/Versions/A/Resources/ShipIt",
    kind: "dynamic-library",
    entitlements: false,
  },
  {
    path: "Contents/Resources/app/node_modules/better-sqlite3/build/Release/better_sqlite3.node",
    kind: "native-module",
    entitlements: false,
  },
])

const expectedEntitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
</dict>
</plist>
`

function fixturePath(appPath, relativePath) {
  return join(appPath, ...relativePath.split("/"))
}

async function executable(path) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, "synthetic Mach-O")
  await chmod(path, 0o755)
}

async function createFrameworkAliases(appPath) {
  for (const name of frameworkNames) {
    const frameworkPath = join(appPath, "Contents", "Frameworks", `${name}.framework`)
    await symlink("A", join(frameworkPath, "Versions", "Current"))
    await symlink(`Versions/Current/${name}`, join(frameworkPath, name))
    if (name === "Squirrel")
      await symlink("Versions/Current/Resources", join(frameworkPath, "Resources"))
  }
}

export async function createElectronSigningFixture({
  missingPaths = [],
  extraExecutablePaths = [],
  extraMachOPaths = [],
} = {}) {
  const root = await mkdtemp(join(tmpdir(), "prompter-electron-signing-test-"))
  const appPath = join(root, "Prompter.app")
  const entitlements = join(root, "entitlements.plist")
  const targetPaths = Object.fromEntries(
    electron43SigningTargets.map((target) => [target.path, fixturePath(appPath, target.path)]),
  )
  await Promise.all(
    electron43SigningTargets
      .filter((target) => !["helper-app", "framework"].includes(target.kind))
      .filter((target) => !missingPaths.includes(target.path))
      .map((target) => executable(targetPaths[target.path])),
  )
  await createFrameworkAliases(appPath)
  for (const target of electron43SigningTargets) {
    if (target.kind === "framework" && missingPaths.includes(target.path))
      await rm(targetPaths[target.path], { recursive: true, force: true })
  }
  await writeFile(entitlements, expectedEntitlements)
  await Promise.all(
    ["bindings", "file-uri-to-path"].map((name) =>
      mkdir(join(appPath, "Contents", "Resources", "app", "node_modules", name), {
        recursive: true,
      }),
    ),
  )
  await Promise.all(extraExecutablePaths.map((path) => executable(fixturePath(appPath, path))))
  for (const relativePath of extraMachOPaths) {
    const path = fixturePath(appPath, relativePath)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, Buffer.from([0xcf, 0xfa, 0xed, 0xfe]))
  }
  return {
    paths: { appPath, entitlements, targetPaths },
    remove: () => rm(root, { recursive: true, force: true }),
  }
}
