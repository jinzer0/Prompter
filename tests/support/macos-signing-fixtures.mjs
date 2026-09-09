import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

export const signingIdentity = "Developer ID Application: SYNTHETIC_IDENTITY"
export const frameworkDirectories = ["Resources", "Headers", "Modules", "Helpers", "Libraries"]

const expectedEntitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
</dict>
</plist>
`

async function executable(path) {
  await mkdir(join(path, ".."), { recursive: true })
  await writeFile(path, "synthetic Mach-O")
  await chmod(path, 0o755)
}

export async function createSigningFixture(options = {}) {
  const root = await mkdtemp(join(tmpdir(), "prompter-signing-test-"))
  const appPath = join(root, "Prompter.app")
  const nativeSuffix = options.nativeSuffix ?? ".node"
  const dylibSuffix = options.dylibSuffix ?? ".dylib"
  const paths = {
    appPath,
    main: join(appPath, "Contents", "MacOS", "Prompter"),
    helper: join(
      appPath,
      "Contents",
      "Frameworks",
      "Prompter Helper.app",
      "Contents",
      "MacOS",
      "Prompter Helper",
    ),
    framework: join(appPath, "Contents", "Frameworks", "Kit.framework", "Kit"),
    dylib: join(appPath, "Contents", "Frameworks", `libfixture${dylibSuffix}`),
    native: join(appPath, "Contents", "Resources", "app", `fixture${nativeSuffix}`),
    xpc: join(appPath, "Contents", "XPCServices", "Worker.xpc", "Contents", "MacOS", "Worker"),
    tool: join(appPath, "Contents", "MacOS", "native-tool"),
    entitlements: join(root, "entitlements.plist"),
  }
  await Promise.all(
    Object.values(paths)
      .filter(
        (path) =>
          path !== paths.appPath &&
          path !== paths.entitlements &&
          (!options.frameworkAliases || path !== paths.framework),
      )
      .map(executable),
  )
  await writeFile(paths.entitlements, expectedEntitlements)
  if (options.frameworkAliases) await createFrameworkAliases(appPath, paths, options)
  if (options.duplicate)
    await symlink(paths.native, join(appPath, "Contents", "Resources", "app", "fixture-alias.node"))
  if (options.escapingAlias) {
    const outside = join(root, "outside.node")
    await executable(outside)
    await symlink(outside, join(appPath, "Contents", "Resources", "app", "escape.node"))
  }
  if (options.npmBinAlias) {
    paths.npmBinTarget = join(
      appPath,
      "Contents",
      "Resources",
      "app",
      "node_modules",
      "vite",
      "bin",
      "vite.js",
    )
    paths.npmBinAlias = join(
      appPath,
      "Contents",
      "Resources",
      "app",
      "node_modules",
      ".bin",
      "vite",
    )
    await executable(paths.npmBinTarget)
    await mkdir(join(paths.npmBinAlias, ".."), { recursive: true })
    await symlink("../vite/bin/vite.js", paths.npmBinAlias)
  }
  if (options.hiddenMachO) {
    paths.hiddenMachO = join(appPath, "Contents", "Resources", "opaque-payload")
    await mkdir(join(paths.hiddenMachO, ".."), { recursive: true })
    await writeFile(paths.hiddenMachO, Buffer.from([0xcf, 0xfa, 0xed, 0xfe]))
  }
  return { paths, remove: () => rm(root, { recursive: true, force: true }) }
}

async function createFrameworkAliases(appPath, paths, options) {
  const frameworkRoot = join(appPath, "Contents", "Frameworks", "Kit.framework")
  const versionRoot = join(frameworkRoot, "Versions", "A")
  await executable(join(versionRoot, "Kit"))
  await symlink("A", join(frameworkRoot, "Versions", "Current"))
  await symlink("Versions/Current/Kit", paths.framework)
  await Promise.all(
    frameworkDirectories.map(async (directory) => {
      await executable(join(versionRoot, directory, `${directory.toLowerCase()}-tool`))
      await symlink(`Versions/Current/${directory}`, join(frameworkRoot, directory))
    }),
  )
  await executable(join(versionRoot, "Modules", "nested.node"))
  await executable(join(versionRoot, "Libraries", "libnested.dylib"))
  if (options.mixedFrameworkBinaryAlias || options.mixedFrameworkDirectoryAlias !== undefined) {
    const otherVersionRoot = join(frameworkRoot, "Versions", "B")
    await executable(join(otherVersionRoot, "Kit"))
    await Promise.all(
      frameworkDirectories.map((directory) =>
        mkdir(join(otherVersionRoot, directory), { recursive: true }),
      ),
    )
    if (options.mixedFrameworkBinaryAlias) {
      await rm(paths.framework)
      await symlink("Versions/B/Kit", paths.framework)
    }
    if (options.mixedFrameworkDirectoryAlias !== undefined) {
      await rm(join(frameworkRoot, options.mixedFrameworkDirectoryAlias))
      await symlink(
        `Versions/B/${options.mixedFrameworkDirectoryAlias}`,
        join(frameworkRoot, options.mixedFrameworkDirectoryAlias),
      )
    }
  }
  if (options.unexpectedFrameworkBinaryAlias !== undefined) {
    const aliasDirectory =
      options.unexpectedFrameworkBinaryAlias === "before-conventional" ? "Aliases" : "Library"
    await mkdir(join(frameworkRoot, aliasDirectory), { recursive: true })
    await symlink("../Versions/A/Kit", join(frameworkRoot, aliasDirectory, "Kit"))
  }
  if (options.unexpectedFrameworkDirectoryAlias !== undefined)
    await symlink("Versions/A", join(frameworkRoot, options.unexpectedFrameworkDirectoryAlias))
  if (options.versionedFrameworkBinaryAlias) {
    const otherVersionRoot = join(frameworkRoot, "Versions", "B")
    await mkdir(otherVersionRoot, { recursive: true })
    await symlink("../A/Kit", join(otherVersionRoot, "Kit"))
  }
  if (options.currentVersionBinaryAlias) await symlink("Kit", join(versionRoot, "Kit-alias"))
}

export function identityListing(entries = [signingIdentity], count = entries.length) {
  return `${entries.map((name, index) => `  ${index + 1}) ${"a".repeat(40)} "${name}"`).join("\n")}\n  ${count} valid identities found\n`
}

export function createSigningRunner({
  architectureOutputs = new Map(),
  architectureOutputsAfterSigning = new Map(),
  listing = identityListing(),
  calls = [],
  fileDescriptions = new Map(),
  unsignedAfterSigning = false,
  textPaths = [],
  foreignPaths = [],
  foreignAfterSigningPaths = [],
  machOAfterSigningPaths = [],
} = {}) {
  return async (command, arguments_) => {
    calls.push({ command, arguments_ })
    const signed = calls.some(
      ({ command: entry, arguments_: args }) =>
        entry === "/usr/bin/codesign" && args[0] === "--force",
    )
    if (command === "/usr/bin/security") return { stdout: listing }
    if (command === "/usr/bin/plutil") return { stdout: "" }
    if (command === "/usr/bin/file") {
      if (fileDescriptions.has(arguments_[1]))
        return { stdout: fileDescriptions.get(arguments_[1]) }
      if (signed && machOAfterSigningPaths.includes(arguments_[1])) {
        return { stdout: "Mach-O 64-bit executable" }
      }
      if (
        foreignPaths.includes(arguments_[1]) ||
        (signed && foreignAfterSigningPaths.includes(arguments_[1]))
      ) {
        return { stdout: "ELF 64-bit LSB shared object" }
      }
      if (textPaths.includes(arguments_[1])) return { stdout: "JavaScript source, ASCII text" }
      return { stdout: unsignedAfterSigning && signed ? "text" : "Mach-O 64-bit executable" }
    }
    if (command === "/usr/bin/lipo") {
      const outputs = signed ? architectureOutputsAfterSigning : architectureOutputs
      return { stdout: outputs.get(arguments_[1]) ?? "arm64" }
    }
    return { stdout: "" }
  }
}
