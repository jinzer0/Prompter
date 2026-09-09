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
    dylib: join(appPath, "Contents", "Frameworks", "libfixture.dylib"),
    native: join(appPath, "Contents", "Resources", "app", "fixture.node"),
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
  listing = identityListing(),
  calls = [],
  unsignedAfterSigning = false,
} = {}) {
  return async (command, arguments_) => {
    calls.push({ command, arguments_ })
    if (command === "/usr/bin/security") return { stdout: listing }
    if (command === "/usr/bin/plutil") return { stdout: "" }
    if (command === "/usr/bin/file") {
      const signed = calls.some(
        ({ command: entry, arguments_: args }) =>
          entry === "/usr/bin/codesign" && args[0] === "--force",
      )
      return { stdout: unsignedAfterSigning && signed ? "text" : "Mach-O 64-bit executable" }
    }
    return { stdout: "" }
  }
}
